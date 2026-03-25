/**
 * Canonical booking date/time handling for Flyers Up.
 *
 * Rules:
 * - Bookings store service_date (YYYY-MM-DD) + service_time (wall clock string) in booking_timezone.
 * - Absolute instants for APIs/exports are derived only via bookingWallTimeToUtcIso (Luxon, explicit zone).
 * - Google Calendar + .ics use the same UTC instants (YYYYMMDDTHHmmssZ).
 * - UI display for a booking uses formatBooking*InZone with that booking's timezone.
 */

export { DEFAULT_BOOKING_TIMEZONE } from './constants';
export { parseServiceTime } from './service-time-parse';
export {
  normalizeBookingTimeZone,
  bookingWallTimeToUtcIso,
  addHoursToUtcIso,
  bookingWallTimeToUtcDate,
} from './booking-instant';
export {
  formatBookingDateInZone,
  formatBookingTimeInZone,
  formatBookingDateTimeInZone,
} from './format-display';
export {
  formatGoogleCalendarDatesParam,
  formatIcsUtcDateTime,
  formatIcsUtcStampNow,
} from './calendar-export';
export { todayIsoInBookingTimezone, serviceDatePrefetchRange } from './today';
export { localCalendarDateToYmd } from './local-calendar';
