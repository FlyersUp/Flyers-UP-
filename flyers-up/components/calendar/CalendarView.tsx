'use client';

import { useMemo } from 'react';
import { CalendarEventCard } from './CalendarEventCard';
import type { CalendarEvent } from '@/lib/calendar/event-from-booking';

type ViewMode = 'agenda' | 'day' | 'week' | 'month';

type Props = {
  events: CalendarEvent[];
  viewMode: ViewMode;
  focusDate: string;
  mode: 'pro' | 'customer';
};

function getDaysInRange(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
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
    const focus = new Date(focusDate + 'T12:00:00');
    if (viewMode === 'agenda') {
      const start = new Date(focus);
      start.setDate(start.getDate() - 7);
      const end = new Date(focus);
      end.setDate(end.getDate() + 60);
      const range = getDaysInRange(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));
      const withEvents = range.filter((d) => byDate.has(d));
      return { datesToShow: withEvents.length > 0 ? withEvents : range.slice(0, 14) };
    }
    if (viewMode === 'day') {
      return { datesToShow: [focusDate] };
    }
    if (viewMode === 'week') {
      const day = focus.getDay();
      const sun = new Date(focus);
      sun.setDate(focus.getDate() - day);
      const sat = new Date(sun);
      sat.setDate(sun.getDate() + 6);
      const from = sun.toISOString().slice(0, 10);
      const to = sat.toISOString().slice(0, 10);
      return { datesToShow: getDaysInRange(from, to) };
    }
    // month
    const y = focus.getFullYear();
    const m = focus.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const from = first.toISOString().slice(0, 10);
    const to = last.toISOString().slice(0, 10);
    return { datesToShow: getDaysInRange(from, to) };
  }, [viewMode, focusDate, byDate]);

  const filteredEvents = useMemo(() => {
    const set = new Set(datesToShow);
    return events.filter((e) => set.has(e.serviceDate));
  }, [events, datesToShow]);

  const formatDateHeader = (d: string) => {
    const date = new Date(d + 'T12:00:00');
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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
