import type { CalendarEvent } from '@/lib/calendar/event-from-booking';

/** Chronologically first event whose start is at or after `nowMs` (UTC comparison on `startAt`). */
export function getNextUpcomingBooking(
  events: CalendarEvent[],
  nowMs: number = Date.now()
): CalendarEvent | null {
  const upcoming = events
    .filter((e) => new Date(e.startAt).getTime() >= nowMs)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  return upcoming[0] ?? null;
}
