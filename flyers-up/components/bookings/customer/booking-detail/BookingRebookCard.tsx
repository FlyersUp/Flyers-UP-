'use client';

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';

export interface BookingRebookCardProps {
  proName: string;
  proId: string;
  bookingId: string;
  className?: string;
}

export function BookingRebookCard({ proName, proId, bookingId, className = '' }: BookingRebookCardProps) {
  return (
    <section
      className={`rounded-2xl border border-orange-200/50 dark:border-orange-900/40 bg-gradient-to-r from-orange-50/95 to-amber-50/80 dark:from-orange-950/35 dark:to-amber-950/25 p-4 sm:p-5 shadow-sm ${className}`}
      aria-labelledby="rebook-heading"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-200/70 dark:bg-orange-900/50 text-orange-900 dark:text-orange-100">
            <RefreshCw className="h-5 w-5" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="rebook-heading" className="text-base font-semibold text-[#7c2d12] dark:text-orange-100">
              Book again with {proName}?
            </h2>
            <p className="text-xs text-[#9a3412]/90 dark:text-orange-200/80 mt-0.5">
              Same great service — pick a new time in a tap.
            </p>
          </div>
        </div>
        <Link
          href={`/book/${proId}?rebook=${bookingId}`}
          prefetch={false}
          className="shrink-0 inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold bg-[#92400e] text-white hover:bg-[#78350f] transition-colors w-full sm:w-auto"
        >
          Book now
        </Link>
      </div>
    </section>
  );
}
