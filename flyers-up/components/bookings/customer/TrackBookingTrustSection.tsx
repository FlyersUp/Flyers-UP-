'use client';

import Link from 'next/link';

const TRUST_ITEMS = [
  'Covered by satisfaction guarantee',
  'Reschedule or cancel within policy',
  'Support available if anything goes wrong',
];

export interface TrackBookingTrustSectionProps {
  bookingId: string;
  className?: string;
}

export function TrackBookingTrustSection({ bookingId, className = '' }: TrackBookingTrustSectionProps) {
  return (
    <section
      className={`rounded-2xl border border-border bg-[hsl(var(--card-neutral))] p-5 shadow-[var(--shadow-card)] ${className}`}
      aria-labelledby="track-trust"
    >
      <h2 id="track-trust" className="sr-only">
        Protection & support
      </h2>
      <p className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--accent-customer))] mb-3">
        <span aria-hidden>✔</span> Protected by Flyers Up
      </p>
      <ul className="space-y-2">
        {TRUST_ITEMS.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-text2">
            <span className="mt-0.5 text-[hsl(var(--accent-customer))]" aria-hidden>✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-border pt-4 flex justify-between items-center">
        <span className="text-xs text-muted">Need help?</span>
        <Link
          href={`/customer/bookings/${bookingId}/issues/new`}
          className="text-xs text-muted hover:text-text transition-colors"
        >
          Report an issue
        </Link>
      </div>
    </section>
  );
}
