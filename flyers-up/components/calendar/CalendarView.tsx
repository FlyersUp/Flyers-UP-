'use client';

import { useMemo } from 'react';
import { DateTime } from 'luxon';
import { CalendarEventCard } from './CalendarEventCard';
import type { CalendarEvent } from '@/lib/calendar/event-from-booking';
import { DEFAULT_BOOKING_TIMEZONE } from '@/lib/datetime';

type ViewMode = 'agenda' | 'day' | 'week' | 'month';

type Props = {
  events: CalendarEvent[];
  viewMode: ViewMode;
  focusDate: string;
  mode: 'pro' | 'customer';
};

const Z = DEFAULT_BOOKING_TIMEZONE;

function getDaysInRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = DateTime.fromISO(from, { zone: Z });
  const end = DateTime.fromISO(to, { zone: Z });
  if (!cur.isValid || !end.isValid) return out;
  while (cur <= end) {
    out.push(cur.toISODate() ?? from);
    cur = cur.plus({ days: 1 });
  }
  return out;
}

function groupEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
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

export function CalendarView({ events, viewMode, focusDate, mode }: Props) {
  const byDate = useMemo(() => groupEventsByDate(events), [events]);

  const { datesToShow } = useMemo(() => {
    const focus = DateTime.fromISO(focusDate, { zone: Z });
    if (!focus.isValid) return { datesToShow: [focusDate] };
    if (viewMode === 'agenda') {
      const start = focus.minus({ days: 7 });
      const end = focus.plus({ days: 60 });
      const range = getDaysInRange(start.toISODate() ?? focusDate, end.toISODate() ?? focusDate);
      const withEvents = range.filter((d) => byDate.has(d));
      return { datesToShow: withEvents.length > 0 ? withEvents : range.slice(0, 14) };
    }
    if (viewMode === 'day') {
      return { datesToShow: [focusDate] };
    }
    if (viewMode === 'week') {
      const daysBack = focus.weekday % 7;
      const sun = focus.minus({ days: daysBack });
      const sat = sun.plus({ days: 6 });
      return {
        datesToShow: getDaysInRange(sun.toISODate() ?? focusDate, sat.toISODate() ?? focusDate),
      };
    }
    const first = focus.startOf('month');
    const last = focus.endOf('month');
    return {
      datesToShow: getDaysInRange(first.toISODate() ?? focusDate, last.toISODate() ?? focusDate),
    };
  }, [viewMode, focusDate, byDate]);

  const filteredEvents = useMemo(() => {
    const set = new Set(datesToShow);
    return events.filter((e) => set.has(e.serviceDate));
  }, [events, datesToShow]);

  const formatDateHeader = (d: string) => {
    const date = DateTime.fromISO(d, { zone: Z });
    if (!date.isValid) return d;
    const today = DateTime.now().setZone(Z).startOf('day');
    if (date.hasSame(today, 'day')) return 'Today';
    if (date.hasSame(today.plus({ days: 1 }), 'day')) return 'Tomorrow';
    return date.setLocale('en-US').toFormat('ccc, MMM d');
  };

  if (filteredEvents.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="text-sm font-medium text-text">No bookings</div>
        <div className="text-sm text-muted mt-1">
          {viewMode === 'agenda'
            ? 'No upcoming bookings in this range'
            : `No bookings for ${formatDateHeader(focusDate)}`}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {datesToShow.map((d) => {
        const dayEvents = byDate.get(d);
        if (!dayEvents || dayEvents.length === 0) return null;
        return (
          <div key={d}>
            <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              {formatDateHeader(d)}
            </div>
            <div className="space-y-2">
              {dayEvents.map((e) => (
                <CalendarEventCard
                  key={e.id}
                  event={e}
                  mode={mode}
                  compact={viewMode === 'month'}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
