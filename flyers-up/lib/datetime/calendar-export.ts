import { DateTime } from 'luxon';

/**
 * Google Calendar `dates` param: UTC floating format YYYYMMDDTHHmmssZ (both ends Z).
 * https://calendar.google.com/calendar/render?action=TEMPLATE&...
 */
export function formatGoogleCalendarDatesParam(startUtcIso: string, endUtcIso: string): string {
  const s = DateTime.fromISO(startUtcIso, { zone: 'utc' });
  const e = DateTime.fromISO(endUtcIso, { zone: 'utc' });
  if (!s.isValid || !e.isValid) return '';
  const a = s.toFormat("yyyyMMdd'T'HHmmss") + 'Z';
  const b = e.toFormat("yyyyMMdd'T'HHmmss") + 'Z';
  return `${a}/${b}`;
}

/** ICS DTSTART/DTEND in UTC (RFC5545). */
export function formatIcsUtcDateTime(utcIso: string): string {
  const dt = DateTime.fromISO(utcIso, { zone: 'utc' });
  if (!dt.isValid) return '';
  return dt.toFormat("yyyyMMdd'T'HHmmss") + 'Z';
}

export function formatIcsUtcStampNow(): string {
  return DateTime.utc().toFormat("yyyyMMdd'T'HHmmss") + 'Z';
}
