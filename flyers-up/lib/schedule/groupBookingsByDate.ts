import type { CalendarEvent } from '@/lib/calendar/event-from-booking';

/** Group events by wall `serviceDate` (YYYY-MM-DD), each group sorted by start instant ascending. */
export function groupCalendarEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const date = e.serviceDate;
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(e);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }
  return map;
}

export function getEventsForDate(events: CalendarEvent[], ymd: string): CalendarEvent[] {
  return groupCalendarEventsByDate(events).get(ymd) ?? [];
}
