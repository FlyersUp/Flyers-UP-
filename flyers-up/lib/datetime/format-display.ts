import { DateTime } from 'luxon';
import { DEFAULT_BOOKING_TIMEZONE } from './constants';
import { normalizeBookingTimeZone } from './booking-instant';

export function formatBookingDateInZone(
  startUtcIso: string,
  timeZone: string = DEFAULT_BOOKING_TIMEZONE
): string {
  const z = normalizeBookingTimeZone(timeZone);
  const dt = DateTime.fromISO(startUtcIso, { zone: 'utc' }).setZone(z);
  if (!dt.isValid) return '';
  return dt.toLocaleString({ month: 'numeric', day: 'numeric', year: '2-digit' });
}

export function formatBookingTimeInZone(
  startUtcIso: string,
  timeZone: string = DEFAULT_BOOKING_TIMEZONE
): string {
  const z = normalizeBookingTimeZone(timeZone);
  const dt = DateTime.fromISO(startUtcIso, { zone: 'utc' }).setZone(z);
  if (!dt.isValid) return '';
  return dt.toLocaleString({
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** e.g. "3/25/26, 3:00 PM" in the booking zone (mobile-friendly). */
export function formatBookingDateTimeInZone(
  startUtcIso: string,
  timeZone: string = DEFAULT_BOOKING_TIMEZONE
): string {
  const z = normalizeBookingTimeZone(timeZone);
  const dt = DateTime.fromISO(startUtcIso, { zone: 'utc' }).setZone(z);
  if (!dt.isValid) return '';
  return dt.toLocaleString({
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
