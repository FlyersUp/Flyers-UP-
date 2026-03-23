'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import type { CalendarEvent } from '@/lib/calendar/event-from-booking';

type Props = {
  event: CalendarEvent;
  mode: 'pro' | 'customer';
  compact?: boolean;
};

function formatStatus(s: string): string {
  const lower = (s || '').toLowerCase();
  if (lower === 'deposit_paid') return 'Deposit paid';
  if (lower === 'in_progress') return 'In progress';
  if (lower === 'accepted' || lower === 'scheduled') return 'Scheduled';
  if (lower.includes('awaiting')) return 'Awaiting';
  return s.replace(/_/g, ' ');
}

export function CalendarEventCard({ event, mode, compact }: Props) {
  const otherParty = mode === 'pro' ? event.customerName : event.proDisplayName;
  const title = mode === 'pro' ? `${event.serviceTitle} • ${otherParty || 'Customer'}` : `${event.serviceTitle} • ${otherParty || 'Pro'}`;

  return (
    <Link href={event.detailHref}>
      <Card className="block border-l-4 border-l-accent hover:shadow-[var(--shadow-card-hover)] transition-all">
        <div className={compact ? 'p-3' : 'p-4'}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-text truncate">{title}</div>
              <div className="text-sm text-muted mt-0.5">
                {event.startTime}
                {event.endTime && event.endTime !== event.startTime ? ` – ${event.endTime}` : ''}
              </div>
              {!compact && event.address && (
                <div className="text-sm text-muted mt-1 truncate">{event.address}</div>
              )}
              <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-surface2 text-text2">
                {formatStatus(event.status)}
              </span>
            </div>
            {event.price != null && event.price > 0 && (
              <div className="shrink-0 text-right text-sm font-semibold text-amber-600 dark:text-amber-400">
                ${Number(event.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
