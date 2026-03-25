/**
 * Canonical wall-clock zone for interpreting booking service_date + service_time.
 * All booking appointments are stored as calendar date + time-of-day in this zone,
 * then converted to UTC for absolute instants (calendar export, comparisons).
 */
export const DEFAULT_BOOKING_TIMEZONE = 'America/New_York';
