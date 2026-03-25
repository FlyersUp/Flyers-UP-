/**
 * Booking date/time helpers used by legacy call sites.
 * Canonical parsing lives in @/lib/datetime (Luxon + explicit America/New_York default).
 */

import {
  DEFAULT_BOOKING_TIMEZONE,
  parseServiceTime,
  bookingWallTimeToUtcDate,
  addHoursToUtcIso,
} from '@/lib/datetime';

export { parseServiceTime };

/**
 * Absolute instant for the booking start (UTC internally).
 * @param timeZone IANA zone for interpreting date + time (default America/New_York).
 */
export function parseBookingStart(
  dateISO: string,
  time: string,
  timeZone: string = DEFAULT_BOOKING_TIMEZONE
): Date | null {
  return bookingWallTimeToUtcDate(dateISO, time, timeZone);
}

/** Add duration in hours using UTC timeline (DST-safe). */
export function addDurationHours(start: Date, hours: number): Date {
  const endIso = addHoursToUtcIso(start.toISOString(), hours);
  if (!endIso) return new Date(start.getTime() + hours * 60 * 60 * 1000);
  return new Date(endIso);
}

/** Format a Date as YYYY-MM-DD in UTC (use only for UTC-calendar slices, not booking wall dates). */
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
