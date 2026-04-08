import type { CalendarEvent } from '@/lib/calendar/event-from-booking';
import { groupCalendarEventsByDate } from './groupBookingsByDate';

/**
 * Pro calendar default selection: today if it has jobs, else earliest future date with a job,
 * else earliest date with a job, else `todayIso`.
 */
export function getDefaultProSelectedDate(events: CalendarEvent[], todayIso: string): string {
  const byDate = groupCalendarEventsByDate(events);
  if (byDate.size === 0) return todayIso;
  if (byDate.has(todayIso)) return todayIso;
  const sorted = [...byDate.keys()].sort();
  const next = sorted.find((d) => d >= todayIso);
  if (next) return next;
  /* All job dates are in the past — land on today so the list shows “no jobs” rather than stale dates. */
  return todayIso;
}
