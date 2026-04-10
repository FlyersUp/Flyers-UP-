'use client';

import type { ReactNode } from 'react';

export interface BookingTimelineCardProps {
  children: ReactNode;
  className?: string;
}

export function BookingTimelineCard({ children, className = '' }: BookingTimelineCardProps) {
  return (
    <section
      className={`rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#171A20] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] ${className}`}
      aria-labelledby="booking-timeline-heading"
    >
      <h2 id="booking-timeline-heading" className="text-base font-semibold text-[#111111] dark:text-[#F5F7FA] mb-4">
        Timeline
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
