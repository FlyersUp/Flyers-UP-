import { DateTime } from 'luxon';
import { DEFAULT_BOOKING_TIMEZONE } from './constants';

/** YYYY-MM-DD for "today" in the booking calendar (not server UTC midnight). */
export function todayIsoInBookingTimezone(zone: string = DEFAULT_BOOKING_TIMEZONE): string {
  return DateTime.now().setZone(zone).toISODate() ?? '';
}

/** Widen service_date SQL filter for reminder crons (interpretation zone = booking zone). */
export function serviceDatePrefetchRange(
  zone: string = DEFAULT_BOOKING_TIMEZONE
): { min: string; max: string } {
  const now = DateTime.now().setZone(zone);
  return {
    min: now.minus({ days: 1 }).toISODate() ?? '',
    max: now.plus({ days: 2 }).toISODate() ?? '',
  };
}
