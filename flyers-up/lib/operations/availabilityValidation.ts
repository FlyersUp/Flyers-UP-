/**
 * Availability + Travel Radius Enforcement
 * Validates pro availability before allowing deposit payment.
 * Returns: instant_book_allowed | request_only_allowed | unavailable
 */

import { DateTime } from 'luxon';
import { bookingWallTimeToUtcDate, normalizeBookingTimeZone } from '@/lib/datetime/booking-instant';
import { DEFAULT_BOOKING_TIMEZONE } from '@/lib/datetime/constants';
import { MIN_SAME_DAY_LEAD_MINUTES } from '@/lib/availability/lead-time';
import { bookingStatusBlocksCustomerSlots } from '@/lib/availability/booking-occupancy';

export type AvailabilityResult =
  | { allowed: 'instant_book_allowed' }
  | { allowed: 'request_only_allowed'; reason?: string }
  | { allowed: 'unavailable'; rejectionReason: string };

export interface AvailabilityValidationInput {
  proId: string;
  proUserId: string;
  serviceDate: string;
  serviceTime: string;
  addressZip?: string | null;
  addressLat?: number | null;
  addressLng?: number | null;
  durationMinutes?: number;
  proActive: boolean;
  travelRadiusMiles?: number | null;
  serviceAreaMode?: 'radius' | 'boroughs' | 'zip_codes' | null;
  serviceAreaValues?: string[] | null;
  leadTimeMinutes?: number | null;
  bufferBetweenJobsMinutes?: number | null;
  sameDayEnabled?: boolean | null;
  blockedDates?: string[] | null;
  existingBookingRanges?: { startAt: Date; endAt: Date }[];
  /** Extra busy windows (UTC instants), e.g. approved recurring holds without a firm booking row. */
  extraBusyRangesUtc?: { startAt: Date; endAt: Date }[] | null;
  /** IANA zone for interpreting service_date + service_time (pro calendar / booking wall clock). */
  bookingTimeZone?: string | null;
  /** When set (unit tests), used instead of Date.now() for lead-time and same-day checks. */
  clockNowMs?: number;
}

const DEFAULT_LEAD_TIME_MINUTES = 60;
const DEFAULT_BUFFER_MINUTES = 30;

/**
 * Operations layer uses `service_pros.same_day_enabled`; discovery uses `same_day_available`.
 * Settings only wrote `same_day_available` until sync was added — coalesce so both stay equivalent.
 */
export function resolveSameDayEnabledFromServicePro(row: {
  same_day_enabled?: boolean | null;
  same_day_available?: boolean | null;
}): boolean {
  return Boolean(row.same_day_enabled) || Boolean(row.same_day_available);
}

export type OverlapBookingRow = {
  id: string;
  service_date: string;
  service_time?: string | null;
  booking_timezone?: string | null;
  status: string;
  duration_hours?: number | null;
  estimated_duration_minutes?: number | null;
  scheduled_start_at?: string | null;
  scheduled_end_at?: string | null;
  completed_at?: string | null;
};

/**
 * Build UTC overlap intervals for validateProAvailability, using wall-clock + timezone when scheduled_* is missing.
 * Only rows in {@link bookingStatusBlocksCustomerSlots} are included.
 */
export function buildExistingBookingRangesForOverlap(
  rows: OverlapBookingRow[],
  options: { excludeBookingId?: string; defaultTimeZone: string }
): { startAt: Date; endAt: Date }[] {
  const out: { startAt: Date; endAt: Date }[] = [];
  for (const b of rows) {
    if (options.excludeBookingId && b.id === options.excludeBookingId) continue;
    if (!bookingStatusBlocksCustomerSlots(b.status)) continue;
    if (b.scheduled_start_at && b.scheduled_end_at) {
      const s = new Date(b.scheduled_start_at);
      const e = new Date(b.scheduled_end_at);
      if (e > s) out.push({ startAt: s, endAt: e });
      continue;
    }
    const tz = normalizeBookingTimeZone(b.booking_timezone ?? options.defaultTimeZone);
    const start = bookingWallTimeToUtcDate(b.service_date, String(b.service_time ?? '09:00'), tz);
    if (!start) continue;
    const durMin =
      Math.round(Number(b.estimated_duration_minutes ?? 0)) ||
      Math.round(Number(b.duration_hours ?? 0) * 60) ||
      90;
    const end = b.completed_at
      ? new Date(b.completed_at)
      : new Date(start.getTime() + Math.max(30, durMin) * 60 * 1000);
    out.push({ startAt: start, endAt: end });
  }
  return out;
}

export function validateProAvailability(input: AvailabilityValidationInput): AvailabilityResult {
  const {
    proActive,
    serviceDate,
    serviceTime,
    addressZip,
    travelRadiusMiles,
    serviceAreaMode,
    serviceAreaValues,
    leadTimeMinutes = DEFAULT_LEAD_TIME_MINUTES,
    bufferBetweenJobsMinutes = DEFAULT_BUFFER_MINUTES,
    sameDayEnabled = false,
    blockedDates = [],
    existingBookingRanges = [],
    extraBusyRangesUtc = [],
    durationMinutes = 60,
    bookingTimeZone,
    clockNowMs,
  } = input;

  if (!proActive) {
    return { allowed: 'unavailable', rejectionReason: 'Pro is not currently active' };
  }

  const tz = normalizeBookingTimeZone(bookingTimeZone ?? DEFAULT_BOOKING_TIMEZONE);
  const proposedStart = bookingWallTimeToUtcDate(serviceDate, serviceTime, tz);
  if (!proposedStart) {
    return { allowed: 'unavailable', rejectionReason: 'Invalid date or time for booking.' };
  }

  const nowMs = clockNowMs ?? Date.now();
  const minutesFromNow = (proposedStart.getTime() - nowMs) / (1000 * 60);
  const leadMin = leadTimeMinutes ?? DEFAULT_LEAD_TIME_MINUTES;
  const serviceDay = DateTime.fromISO(serviceDate, { zone: tz });
  const todayInProTz = DateTime.fromMillis(nowMs, { zone: 'utc' }).setZone(tz);
  const sameCalendarDayInProTz = serviceDay.isValid && serviceDay.hasSame(todayInProTz, 'day');
  const effectiveLeadMinutes = sameCalendarDayInProTz
    ? Math.max(leadMin, MIN_SAME_DAY_LEAD_MINUTES)
    : leadMin;

  if (minutesFromNow < effectiveLeadMinutes) {
    return {
      allowed: 'unavailable',
      rejectionReason: sameCalendarDayInProTz
        ? `Same-day bookings need at least ${MIN_SAME_DAY_LEAD_MINUTES} minutes before start (or this pro's longer lead time).`
        : `Pro requires at least ${effectiveLeadMinutes} minutes lead time`,
    };
  }

  if (!sameDayEnabled && sameCalendarDayInProTz) {
    return {
      allowed: 'unavailable',
      rejectionReason: 'Pro does not accept same-day bookings',
    };
  }

  // Blocked dates
  const dateStr = serviceDate;
  const blocked = blockedDates ?? [];
  if (blocked.includes(dateStr)) {
    return { allowed: 'unavailable', rejectionReason: 'Pro has blocked this date' };
  }

  // Travel radius / service area
  if (serviceAreaMode === 'zip_codes' && serviceAreaValues?.length) {
    if (!addressZip || !serviceAreaValues.includes(addressZip)) {
      return {
        allowed: 'unavailable',
        rejectionReason: 'Address is outside Pro service area',
      };
    }
  }
  if (serviceAreaMode === 'radius' && travelRadiusMiles != null && travelRadiusMiles > 0) {
    // Distance check would need address lat/lng vs pro location - caller should validate
    // For now we pass through; API layer can add haversine check
  }

  // Overlap with existing bookings (with buffer)
  const proposedEnd = new Date(proposedStart.getTime() + durationMinutes * 60 * 1000);
  const bufferMin = bufferBetweenJobsMinutes ?? DEFAULT_BUFFER_MINUTES;
  const bufferMs = bufferMin * 60 * 1000;
  const ranges = existingBookingRanges ?? [];
  const extra = extraBusyRangesUtc ?? [];
  for (const range of [...ranges, ...extra]) {
    const rangeStart = range.startAt.getTime();
    const rangeEnd = range.endAt.getTime();
    const propStart = proposedStart.getTime();
    const propEnd = proposedEnd.getTime();
    // Overlap if: proposed starts before range ends + buffer AND proposed ends after range starts - buffer
    if (propStart < rangeEnd + bufferMs && propEnd > rangeStart - bufferMs) {
      return {
        allowed: 'unavailable',
        rejectionReason: 'Pro has another booking at this time',
      };
    }
  }

  // Default: request allowed (instant book would need payment intent ready)
  return { allowed: 'request_only_allowed' };
}
