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
      className={`rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] ${className}`}
      aria-labelledby="track-trust"
    >
      <h2 id="track-trust" className="sr-only">
        Protection & support
      </h2>
      <ul className="space-y-2">
        {TRUST_ITEMS.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-text2">
            <span className="mt-0.5 text-accentGreen" aria-hidden>✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-border pt-4">
        <Link
          href={`/customer/bookings/${bookingId}/issues/new`}
          className="text-sm font-medium text-text hover:text-text2"
        >
          Report issue / Get help
        </Link>
      </div>
    </section>
  );
}
