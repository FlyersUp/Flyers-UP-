import type { CalendarEvent } from '@/lib/calendar/event-from-booking';

/** Every `serviceDate` that has at least one event (for calendar dot markers). */
export function datesWithBookings(events: CalendarEvent[]): Set<string> {
  return new Set(events.map((e) => e.serviceDate));
}
