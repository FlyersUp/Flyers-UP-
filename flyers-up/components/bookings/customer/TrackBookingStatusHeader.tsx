'use client';

import { BookingStatusPill } from '@/components/bookings/BookingStatusPill';
import { getStatusConfig } from './trackBookingStatusConfig';

export interface TrackBookingStatusHeaderProps {
  status: string;
  lastUpdatedAt?: string | null;
  className?: string;
}

function formatRelativeTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const now = Date.now();
    const diff = now - d.getTime();
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3600_000);
    const days = Math.floor(diff / 86400_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}

export function TrackBookingStatusHeader({
  status,
  lastUpdatedAt,
  className = '',
}: TrackBookingStatusHeaderProps) {
  const config = getStatusConfig(status);

  return (
    <section
      className={`rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm ${className}`}
      aria-labelledby="track-status-headline"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 id="track-status-headline" className="text-lg font-semibold text-[#111111] dark:text-[#F5F7FA] tracking-tight">
          {config.headline}
        </h2>
        <BookingStatusPill status={status} />
      </div>
      <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3] leading-relaxed">
        {config.explanation}
      </p>
      {lastUpdatedAt && (
        <p className="mt-2 text-xs text-[#8A8A8A] dark:text-[#7A8490]">
          Updated {formatRelativeTime(lastUpdatedAt)}
        </p>
      )}
    </section>
  );
}
