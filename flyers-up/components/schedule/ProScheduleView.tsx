'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DateTime } from 'luxon';
import { ScheduleCalendar } from './ScheduleCalendar';
import { ProDayJobsList } from './ProDayJobsList';
import type { CalendarEvent } from '@/lib/calendar/event-from-booking';
import { datesWithBookings } from '@/lib/schedule/bookingDateMarkers';
import { getDefaultProSelectedDate } from '@/lib/schedule/defaultProSelectedDate';
import { getEventsForDate } from '@/lib/schedule/groupBookingsByDate';
import { DEFAULT_BOOKING_TIMEZONE, todayIsoInBookingTimezone } from '@/lib/datetime';

const Z = DEFAULT_BOOKING_TIMEZONE;

type Props = {
  events: CalendarEvent[];
  loading: boolean;
};

export function ProScheduleView({ events, loading }: Props) {
  const todayIso = todayIsoInBookingTimezone(Z);
  const [monthAnchor, setMonthAnchor] = useState(() =>
    DateTime.now().setZone(Z).startOf('month').toISODate() ?? todayIso
  );
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const defaultedRef = useRef(false);

  const marked = useMemo(() => datesWithBookings(events), [events]);
  const dayEvents = useMemo(() => getEventsForDate(events, selectedDate), [events, selectedDate]);

  useEffect(() => {
    if (loading || defaultedRef.current) return;
    defaultedRef.current = true;
    const d = getDefaultProSelectedDate(events, todayIso);
    setSelectedDate(d);
    const m = DateTime.fromISO(d, { zone: Z });
    if (m.isValid) {
      const first = m.startOf('month').toISODate();
      if (first) setMonthAnchor(first);
    }
  }, [loading, events, todayIso]);

  const handleSelectDate = (ymd: string) => {
    setSelectedDate(ymd);
    const m = DateTime.fromISO(ymd, { zone: Z });
    if (m.isValid) setMonthAnchor(m.startOf('month').toISODate() ?? monthAnchor);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-72 animate-pulse rounded-2xl bg-surface2" />
        <div className="h-48 animate-pulse rounded-2xl bg-surface2" />
      </div>
    );
  }

  const emptyAll = events.length === 0;

  return (
    <div className="mx-auto min-w-0 max-w-4xl">
      {emptyAll ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-12 text-center dark:bg-white/5">
          <p className="text-base font-semibold text-text">No scheduled jobs yet</p>
          <p className="mt-1 text-sm text-muted">When customers book you, they will appear on your calendar.</p>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
          <ScheduleCalendar
            monthAnchorIso={monthAnchor}
            onMonthAnchorChange={(iso) => {
              const m = DateTime.fromISO(iso, { zone: Z });
              if (m.isValid) {
                const first = m.startOf('month').toISODate();
                if (first) setMonthAnchor(first);
              }
            }}
            selectedDateIso={selectedDate}
            onSelectDate={handleSelectDate}
            markedDates={marked}
          />
          <div className="mt-6 lg:mt-0">
            <ProDayJobsList selectedDateIso={selectedDate} events={dayEvents} />
          </div>
        </div>
      )}
    </div>
  );
}
