'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DateTime } from 'luxon';
import { Plus } from 'lucide-react';
import { ScheduleCalendar } from './ScheduleCalendar';
import { CustomerNextBookingCard } from './CustomerNextBookingCard';
import type { CalendarEvent } from '@/lib/calendar/event-from-booking';
import { datesWithBookings } from '@/lib/schedule/bookingDateMarkers';
import { getNextUpcomingBooking } from '@/lib/schedule/getNextUpcomingBooking';
import { getEventsForDate } from '@/lib/schedule/groupBookingsByDate';
import { formatCalendarEventStatus } from '@/lib/schedule/formatEventStatus';
import { DEFAULT_BOOKING_TIMEZONE, todayIsoInBookingTimezone } from '@/lib/datetime';

const Z = DEFAULT_BOOKING_TIMEZONE;

type Props = {
  events: CalendarEvent[];
  loading: boolean;
};

function CompactDayBookingRow({ event }: { event: CalendarEvent }) {
  const timeLine = [event.startTime, event.endTime && event.endTime !== event.startTime ? event.endTime : null]
    .filter(Boolean)
    .join(' – ');
  const title =
    `${event.serviceName ?? event.serviceTitle ?? 'Service'} · ${event.proDisplayName ?? 'Pro'}`;
  return (
    <Link
      href={event.detailHref}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white px-3 py-2.5 text-left transition-colors hover:bg-hover/50 dark:border-white/10 dark:bg-[#14161c]"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{title}</p>
        <p className="text-xs text-muted">{timeLine}</p>
      </div>
      <span className="shrink-0 rounded-full bg-surface2 px-2 py-0.5 text-[10px] font-medium text-text2 dark:bg-white/10">
        {formatCalendarEventStatus(event.status)}
      </span>
    </Link>
  );
}

export function CustomerScheduleView({ events, loading }: Props) {
  const todayIso = todayIsoInBookingTimezone(Z);
  const [monthAnchor, setMonthAnchor] = useState(
    () => DateTime.now().setZone(Z).startOf('month').toISODate() ?? todayIso
  );
  const [selectedDate, setSelectedDate] = useState(todayIso);

  const marked = useMemo(() => datesWithBookings(events), [events]);
  const nextBooking = useMemo(() => getNextUpcomingBooking(events), [events]);
  const selectedDayEvents = useMemo(() => getEventsForDate(events, selectedDate), [events, selectedDate]);

  /** Avoid duplicating the hero “next booking” row when that’s the only item on the picked day. */
  const showSelectedDayList =
    selectedDayEvents.length > 0 &&
    !(
      selectedDayEvents.length === 1 &&
      nextBooking &&
      selectedDayEvents[0].id === nextBooking.id
    );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-72 animate-pulse rounded-2xl bg-surface2" />
        <div className="h-40 animate-pulse rounded-2xl bg-surface2" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-4xl">
      {/*
        Mobile: calendar → next → CTA → day list → view all.
        lg: col1 = calendar + CTA, col2 = next + list + link.
      */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start lg:gap-8">
        <ScheduleCalendar
          monthAnchorIso={monthAnchor}
          onMonthAnchorChange={(iso) => {
            const m = DateTime.fromISO(iso, { zone: Z });
            setMonthAnchor(m.isValid ? m.startOf('month').toISODate() ?? monthAnchor : monthAnchor);
          }}
          selectedDateIso={selectedDate}
          onSelectDate={(ymd) => {
            setSelectedDate(ymd);
            const m = DateTime.fromISO(ymd, { zone: Z });
            if (m.isValid) setMonthAnchor(m.startOf('month').toISODate() ?? monthAnchor);
          }}
          markedDates={marked}
        />

        {nextBooking ? (
          <CustomerNextBookingCard event={nextBooking} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-5 py-10 text-center dark:bg-white/5">
            <p className="text-base font-semibold text-text">No upcoming bookings yet</p>
            <p className="mt-1 text-sm text-muted">When you book a pro, it will show up here.</p>
            <Link
              href="/occupations"
              className="mt-5 inline-flex rounded-full bg-[#FFB347] px-5 py-2.5 text-sm font-bold text-[#2d3436] shadow-sm transition-all hover:brightness-[1.03]"
            >
              Book a service
            </Link>
          </div>
        )}

        <div className="rounded-2xl bg-[hsl(var(--accent-customer))] p-5 text-white shadow-[0_8px_28px_rgba(74,105,189,0.35)]">
          <h3 className="text-lg font-bold">Book something new</h3>
          <p className="mt-1 text-sm text-white/90">
            Need a hand around the house or a walk for your pet? Browse local pros and request a time.
          </p>
          <Link
            href="/occupations"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#FFB347] px-5 py-3 text-sm font-bold text-[#2d3436] shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all hover:brightness-[1.03] active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            Schedule new service
          </Link>
        </div>

        <div className="space-y-5">
          {showSelectedDayList ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {DateTime.fromISO(selectedDate, { zone: Z }).setLocale('en-US').toFormat('ccc, MMM d')}
              </p>
              <div className="space-y-2">
                {selectedDayEvents.map((e) => (
                  <CompactDayBookingRow key={e.id} event={e} />
                ))}
              </div>
            </div>
          ) : null}

          <div className="text-center lg:text-left">
            <Link
              href="/customer/bookings"
              className="text-sm font-semibold text-[hsl(var(--accent-customer))] hover:underline"
            >
              View all & history
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
