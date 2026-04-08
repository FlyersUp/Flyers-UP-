'use client';

import Link from 'next/link';
import { DateTime } from 'luxon';
import { MapPin, User } from 'lucide-react';
import type { CalendarEvent } from '@/lib/calendar/event-from-booking';
import { formatCalendarEventStatus } from '@/lib/schedule/formatEventStatus';
import { DEFAULT_BOOKING_TIMEZONE } from '@/lib/datetime';

const Z = DEFAULT_BOOKING_TIMEZONE;

type Props = {
  selectedDateIso: string;
  events: CalendarEvent[];
};

export function ProDayJobsList({ selectedDateIso, events }: Props) {
  const header = DateTime.fromISO(selectedDateIso, { zone: Z }).setLocale('en-US').toLocaleString({
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-4 py-10 text-center dark:bg-white/5">
        <p className="text-sm font-medium text-text">No jobs for this date</p>
        <p className="mt-1 text-xs text-muted">{header}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-text">{header}</h2>
      <ul className="space-y-2">
        {events.map((e) => {
          const timeLine = [e.startTime, e.endTime && e.endTime !== e.startTime ? e.endTime : null]
            .filter(Boolean)
            .join(' – ');
          const customer = e.customerName ?? 'Customer';
          return (
            <li key={e.id}>
              <Link
                href={e.detailHref}
                className="block rounded-2xl border border-[#E8EAED] bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition-all hover:border-[hsl(var(--accent-customer)/0.35)] hover:shadow-md dark:border-white/10 dark:bg-[#1a1d24]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold tabular-nums text-[hsl(var(--accent-customer))]">{timeLine}</p>
                    <p className="mt-1 font-semibold text-text">{e.serviceTitle}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                      <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{customer}</span>
                    </p>
                    {e.address ? (
                      <p className="mt-2 flex items-start gap-1.5 text-sm text-muted">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="min-w-0 leading-snug">{e.address}</span>
                      </p>
                    ) : null}
                    <span className="mt-3 inline-flex rounded-full bg-surface2 px-2.5 py-0.5 text-xs font-medium text-text2 dark:bg-white/10">
                      {formatCalendarEventStatus(e.status)}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
