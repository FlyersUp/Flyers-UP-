'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import type { CalendarEvent } from '@/lib/calendar/event-from-booking';
import { isProCommittedScheduleStatus } from '@/lib/bookings/pro-dashboard-bookings';

type Props = {
  events: CalendarEvent[];
  mode: 'pro' | 'customer';
  detailHref: string;
};

function formatDate(d: string) {
  const date = new Date(d + 'T12:00:00');
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatStatus(s: string): string {
  const lower = (s || '').toLowerCase();
  if (lower === 'deposit_paid') return 'Deposit paid';
  if (lower === 'in_progress') return 'In progress';
  if (lower === 'accepted' || lower === 'scheduled') return 'Scheduled';
  return s.replace(/_/g, ' ');
}

export function MiniScheduleWidget({ events, mode, detailHref }: Props) {
  const nextEvent = events
    .filter((e) => isProCommittedScheduleStatus(e.status))
    .filter((e) => new Date(e.startAt) >= new Date())
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];

  if (!nextEvent) {
    return (
      <Link href={detailHref}>
        <Card className="block hover:shadow-[var(--shadow-card-hover)] transition-all">
          <div className="p-4">
            <div className="text-sm font-semibold text-text">Upcoming schedule</div>
            <div className="text-sm text-muted mt-1">No upcoming bookings</div>
            <div className="text-xs text-accent mt-2 font-medium">View calendar →</div>
          </div>
        </Card>
      </Link>
    );
  }

  const otherParty = mode === 'pro' ? nextEvent.customerName : nextEvent.proDisplayName;

  return (
    <Card className="block hover:shadow-[var(--shadow-card-hover)] transition-all border-l-4 border-l-accent">
      <Link href={nextEvent.detailHref} className="block p-4">
        <div className="text-sm font-semibold text-text">Next booking</div>
        <div className="mt-1 font-medium text-text truncate">
          {nextEvent.serviceTitle} {otherParty ? `• ${otherParty}` : ''}
        </div>
        <div className="text-sm text-muted mt-0.5">
          {formatDate(nextEvent.serviceDate)} at {nextEvent.startTime}
        </div>
        <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-surface2 text-text2">
          {formatStatus(nextEvent.status)}
        </span>
      </Link>
      <div className="px-4 pb-3">
        <Link href={detailHref} className="text-xs font-medium text-accent hover:underline">
          View calendar →
        </Link>
      </div>
    </Card>
  );
}
