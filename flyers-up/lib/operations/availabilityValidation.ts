/**
 * Availability + Travel Radius Enforcement
 * Validates pro availability before allowing deposit payment.
 * Returns: instant_book_allowed | request_only_allowed | unavailable
 */

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
}

const DEFAULT_LEAD_TIME_MINUTES = 60;
const DEFAULT_BUFFER_MINUTES = 30;
const GRACE_WINDOW_MINUTES = 15;

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
    durationMinutes = 60,
  } = input;

  if (!proActive) {
    return { allowed: 'unavailable', rejectionReason: 'Pro is not currently active' };
  }

  const proposedStart = new Date(`${serviceDate}T${serviceTime}`);
  const now = new Date();

  // Lead time: cannot book too soon
  const minutesFromNow = (proposedStart.getTime() - now.getTime()) / (1000 * 60);
  const leadMin = leadTimeMinutes ?? DEFAULT_LEAD_TIME_MINUTES;
  if (minutesFromNow < leadMin) {
    if (!sameDayEnabled || !isSameCalendarDay(proposedStart, now)) {
      return {
        allowed: 'unavailable',
        rejectionReason: `Pro requires at least ${leadMin} minutes lead time`,
      };
    }
  }

  // Same-day: if disabled and date is today
  if (!sameDayEnabled && isSameCalendarDay(proposedStart, now)) {
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
  for (const range of ranges) {
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

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
