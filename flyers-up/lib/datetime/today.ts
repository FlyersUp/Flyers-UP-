import { DateTime } from 'luxon';
import { DEFAULT_BOOKING_TIMEZONE } from './constants';

/** YYYY-MM-DD for "today" in the booking calendar (not server UTC midnight). */
export function todayIsoInBookingTimezone(zone: string = DEFAULT_BOOKING_TIMEZONE): string {
  return DateTime.now().setZone(zone).toISODate() ?? '';
}

/**
 * Earliest calendar date (YYYY-MM-DD) allowed in the customer booking date input.
 * When the pro allows same-day bookings, min is today in `zone`; otherwise tomorrow in `zone`.
 * Too-soon times on that day are filtered by slot APIs + `assertSlotBookable` (lead time), not by this min.
 */
export function earliestCustomerBookableDateIso(
  sameDayEnabled: boolean,
  zone: string = DEFAULT_BOOKING_TIMEZONE,
  nowInZone?: DateTime
): string {
  const local = (nowInZone ?? DateTime.now()).setZone(zone);
  if (!local.isValid) return '';
  return (sameDayEnabled ? local : local.plus({ days: 1 })).toISODate() ?? '';
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
