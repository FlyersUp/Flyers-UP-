'use client';

import { DateTime } from 'luxon';
import { DEFAULT_BOOKING_TIMEZONE } from '@/lib/datetime';

function formatDateTime(serviceDate?: string, serviceTime?: string): string {
  if (!serviceDate) return '—';
  try {
    const dt = DateTime.fromISO(serviceDate, { zone: DEFAULT_BOOKING_TIMEZONE });
    if (!dt.isValid) return serviceDate;
    // toFormat (not toLocaleString) keeps SSR and browser output identical.
    const dateStr = dt.toFormat('cccc, MMMM d, yyyy');
    return serviceTime ? `${dateStr} at ${serviceTime}` : dateStr;
  } catch {
    return serviceDate;
  }
}

export interface TrackBookingSummaryCardProps {
  proName: string;
  proPhotoUrl?: string | null;
  serviceName: string;
  categoryName?: string | null;
  serviceDate?: string;
  serviceTime?: string;
  /** Shown when a reschedule is pending (booking row still shows current slot above). */
  pendingRescheduleSummary?: string | null;
  address?: string | null;
  scopeSummary?: string | null;
  className?: string;
}

export function TrackBookingSummaryCard({
  proName,
  proPhotoUrl,
  serviceName,
  categoryName,
  serviceDate,
  serviceTime,
  pendingRescheduleSummary,
  address,
  scopeSummary,
  className = '',
}: TrackBookingSummaryCardProps) {
  return (
    <section
      className={`rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm ${className}`}
      aria-labelledby="track-summary"
    >
      <h2 id="track-summary" className="sr-only">
        Booking summary
      </h2>
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          {proPhotoUrl ? (
            <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-[#F7F6F4] dark:bg-[#1D2128]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proPhotoUrl} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#F7F6F4] dark:bg-[#1D2128] text-xs text-[#6A6A6A] dark:text-[#A1A8B3]"
              aria-hidden
            >
              —
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#111111] dark:text-[#F5F7FA]">{proName}</p>
          <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
            {serviceName}
            {categoryName ? ` · ${categoryName}` : ''}
          </p>
          <p className="mt-1 text-sm text-[#3A3A3A] dark:text-[#A1A8B3]">
            {pendingRescheduleSummary ? (
              <span className="block text-xs uppercase tracking-wide text-[#6A6A6A] dark:text-[#A1A8B3] mb-0.5">
                Currently scheduled
              </span>
            ) : null}
            {formatDateTime(serviceDate, serviceTime)}
          </p>
          {pendingRescheduleSummary ? (
            <p className="mt-2 text-sm font-medium text-amber-900 dark:text-amber-200">
              Requested new time: {pendingRescheduleSummary}
            </p>
          ) : null}
          {address && address.trim() && (
            <p className="mt-0.5 text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">{address}</p>
          )}
          {scopeSummary && scopeSummary.trim() && (
            <p className="mt-2 text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">{scopeSummary}</p>
          )}
        </div>
      </div>
    </section>
  );
}
