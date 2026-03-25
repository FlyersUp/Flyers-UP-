/**
 * Generate .ics (iCalendar) and Google Calendar URLs for a booking-derived event.
 * DTSTART/DTEND use UTC (Z) so Apple/Google/Outlook agree with the same instants as the DB-derived ISO fields.
 */

import type { CalendarEvent } from './event-from-booking';
import {
  formatGoogleCalendarDatesParam,
  formatIcsUtcDateTime,
  formatIcsUtcStampNow,
} from '@/lib/datetime/calendar-export';

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function generateIcs(event: CalendarEvent, baseUrl: string): string {
  const uid = `flyersup-${event.bookingId}@flyersup.com`;
  const title = escapeIcsText(event.serviceTitle);
  const desc = [
    `Booking reference: ${event.bookingId}`,
    event.address ? `Address: ${event.address}` : '',
    event.notes ? `Notes: ${event.notes}` : '',
  ]
    .filter(Boolean)
    .join('\\n');
  const location = escapeIcsText(event.address);
  const dtStart = formatIcsUtcDateTime(event.startAt);
  const dtEnd = formatIcsUtcDateTime(event.endAt);
  if (!dtStart || !dtEnd) {
    return '';
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Flyers Up//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsUtcStampNow()}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${location}`,
    `URL:${baseUrl}${event.detailHref}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

/** Google Calendar add URL (opens pre-filled event). Dates are UTC Z to match .ics. */
export function googleCalendarAddUrl(event: CalendarEvent, baseUrl: string): string {
  const dates = formatGoogleCalendarDatesParam(event.startAt, event.endAt);
  const details = [`Booking: ${event.bookingId}`, event.address || '', `${baseUrl}${event.detailHref}`]
    .filter(Boolean)
    .join('\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.serviceTitle,
    dates,
    details,
    location: event.address || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
