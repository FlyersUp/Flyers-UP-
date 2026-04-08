'use client';

import Link from 'next/link';
import { DateTime } from 'luxon';
import { Calendar, MapPin } from 'lucide-react';
import type { CalendarEvent } from '@/lib/calendar/event-from-booking';
import { formatCalendarEventStatus } from '@/lib/schedule/formatEventStatus';

type Props = {
  event: CalendarEvent;
};

export function CustomerNextBookingCard({ event }: Props) {
  const tz = event.timezone;
  const dateLabel = DateTime.fromISO(event.serviceDate, { zone: tz }).setLocale('en-US').toLocaleString({
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeLine = [event.startTime, event.endTime && event.endTime !== event.startTime ? event.endTime : null]
    .filter(Boolean)
    .join(' – ');

  const serviceLabel = event.serviceName ?? event.serviceTitle ?? 'Service';
  const proName = event.proDisplayName ?? 'Your pro';

  return (
    <Link href={event.detailHref} className="block">
      <div className="rounded-2xl border border-[#E8EAED] bg-white p-5 shadow-[0_6px_28px_rgba(74,105,189,0.1)] transition-all hover:shadow-[0_8px_32px_rgba(74,105,189,0.14)] dark:border-white/10 dark:bg-[#1a1d24]">
        <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--accent-customer))]">
          Next booking
        </p>
        <h3 className="mt-2 text-lg font-bold text-[#2d3436] dark:text-white">{serviceLabel}</h3>
        <p className="mt-0.5 text-sm font-medium text-[#6B7280] dark:text-white/65">{proName}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#2d3436] dark:text-white">
          <span className="inline-flex items-center gap-1.5 text-[#6B7280] dark:text-white/65">
            <Calendar className="h-4 w-4 shrink-0 text-[hsl(var(--accent-customer))]" aria-hidden />
            <span>{dateLabel}</span>
          </span>
          <span className="font-semibold text-[#2d3436] dark:text-white">{timeLine}</span>
        </div>

        {event.address ? (
          <p className="mt-3 flex items-start gap-2 text-sm text-[#6B7280] dark:text-white/60">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent-customer))]" aria-hidden />
            <span className="min-w-0 leading-snug">{event.address}</span>
          </p>
        ) : null}

        <span className="mt-4 inline-flex rounded-full bg-surface2 px-3 py-1 text-xs font-semibold text-text2 dark:bg-white/10 dark:text-white/85">
          {formatCalendarEventStatus(event.status)}
        </span>
      </div>
    </Link>
  );
}
