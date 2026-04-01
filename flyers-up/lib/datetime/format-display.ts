import { DateTime } from 'luxon';
import { DEFAULT_BOOKING_TIMEZONE } from './constants';
import { normalizeBookingTimeZone } from './booking-instant';

/**
 * Use Luxon `toFormat` (not `toLocaleString`) so server and browser produce identical
 * strings — avoids React hydration mismatches (Node vs client ICU/locale).
 */
export function formatBookingDateInZone(
  startUtcIso: string,
  timeZone: string = DEFAULT_BOOKING_TIMEZONE
): string {
  const z = normalizeBookingTimeZone(timeZone);
  const dt = DateTime.fromISO(startUtcIso, { zone: 'utc' }).setZone(z);
  if (!dt.isValid) return '';
  return dt.toFormat('M/d/yy');
}

export function formatBookingTimeInZone(
  startUtcIso: string,
  timeZone: string = DEFAULT_BOOKING_TIMEZONE
): string {
  const z = normalizeBookingTimeZone(timeZone);
  const dt = DateTime.fromISO(startUtcIso, { zone: 'utc' }).setZone(z);
  if (!dt.isValid) return '';
  return dt.toFormat('h:mm a');
}

/** e.g. "3/25/26, 3:00 PM" in the booking zone (mobile-friendly). */
export function formatBookingDateTimeInZone(
  startUtcIso: string,
  timeZone: string = DEFAULT_BOOKING_TIMEZONE
): string {
  const z = normalizeBookingTimeZone(timeZone);
  const dt = DateTime.fromISO(startUtcIso, { zone: 'utc' }).setZone(z);
  if (!dt.isValid) return '';
  return dt.toFormat('M/d/yy, h:mm a');
}

/**
 * Status timeline stamps, e.g. "Apr 1, 9:43 AM" in the booking zone.
 * Uses toFormat (not toLocaleString) so SSR and browser match.
 */
export function formatTimelineTimestampInZone(
  raw: string,
  timeZone: string = DEFAULT_BOOKING_TIMEZONE
): string {
  const z = normalizeBookingTimeZone(timeZone);
  let dt = DateTime.fromISO(raw, { zone: 'utc' });
  if (!dt.isValid) {
    const js = new Date(raw);
    if (Number.isNaN(js.getTime())) return raw;
    dt = DateTime.fromJSDate(js, { zone: 'utc' });
  }
  if (!dt.isValid) return raw;
  return dt.setZone(z).toFormat('MMM d, h:mm a');
}
