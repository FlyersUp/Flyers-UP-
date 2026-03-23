/**
 * Generate .ics (iCalendar) file content for a booking.
 * Standards-compliant for Google Calendar, Apple Calendar, Outlook.
 */

import type { CalendarEvent } from './event-from-booking';

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function formatIcsDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${day}T${h}${min}${s}`;
}

export function generateIcs(event: CalendarEvent, baseUrl: string): string {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
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

  const tz = event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Flyers Up//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDateLocal(new Date())}`,
    `DTSTART;TZID=${tz}:${formatIcsDateLocal(start)}`,
    `DTEND;TZID=${tz}:${formatIcsDateLocal(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${location}`,
    `URL:${baseUrl}${event.detailHref}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

/** Google Calendar add URL (opens pre-filled event in Google Calendar). */
export function googleCalendarAddUrl(event: CalendarEvent, baseUrl: string): string {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.serviceTitle,
    dates: `${start.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z/${end.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    details: `Booking: ${event.bookingId}\n${event.address || ''}`,
    location: event.address || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
