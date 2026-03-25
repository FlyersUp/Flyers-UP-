import { DateTime } from 'luxon';
import { DEFAULT_BOOKING_TIMEZONE } from './constants';
import { parseServiceTime } from './service-time-parse';

/** Validate IANA zone; fall back if Luxon does not recognize it. */
export function normalizeBookingTimeZone(tz: string | null | undefined): string {
  if (!tz || typeof tz !== 'string' || !tz.trim()) return DEFAULT_BOOKING_TIMEZONE;
  const z = tz.trim();
  if (!DateTime.now().setZone(z).isValid) return DEFAULT_BOOKING_TIMEZONE;
  return z;
}

/**
 * Interpret YYYY-MM-DD + wall time in `timeZone` as one absolute instant → UTC ISO-8601.
 * This is the only place that should combine booking date + time for storage semantics.
 */
export function bookingWallTimeToUtcIso(
  serviceDate: string,
  serviceTime: string,
  timeZone: string = DEFAULT_BOOKING_TIMEZONE
): string | null {
  const zone = normalizeBookingTimeZone(timeZone);
  const parts = parseServiceTime(serviceTime);
  if (!parts) return null;

  const ymd = serviceDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!ymd) return null;
  const y = parseInt(ymd[1], 10);
  const mo = parseInt(ymd[2], 10);
  const d = parseInt(ymd[3], 10);

  const dt = DateTime.fromObject(
    {
      year: y,
      month: mo,
      day: d,
      hour: parts.hours,
      minute: parts.minutes,
      second: 0,
      millisecond: 0,
    },
    { zone }
  );

  if (!dt.isValid) return null;
  return dt.toUTC().toISO();
}

export function addHoursToUtcIso(startUtcIso: string, hours: number): string | null {
  const dt = DateTime.fromISO(startUtcIso, { zone: 'utc' });
  if (!dt.isValid) return null;
  return dt.plus({ hours }).toISO();
}

/** Back-compat: JS Date at the correct UTC instant (use UTC getters for audits). */
export function bookingWallTimeToUtcDate(
  serviceDate: string,
  serviceTime: string,
  timeZone?: string
): Date | null {
  const iso = bookingWallTimeToUtcIso(serviceDate, serviceTime, timeZone);
  if (!iso) return null;
  return new Date(iso);
}
