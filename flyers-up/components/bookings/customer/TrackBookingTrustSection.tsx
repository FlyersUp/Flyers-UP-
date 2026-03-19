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
      className={`rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm ${className}`}
      aria-labelledby="track-trust"
    >
      <h2 id="track-trust" className="sr-only">
        Protection & support
      </h2>
      <ul className="space-y-2">
        {TRUST_ITEMS.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[#3A3A3A] dark:text-[#A1A8B3]">
            <span className="text-[#058954] mt-0.5" aria-hidden>✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10">
        <Link
          href={`/customer/bookings/${bookingId}/issues/new`}
          className="text-sm font-medium text-[#058954] hover:text-[#047a48] dark:hover:text-[#2dd68a]"
        >
          Report issue / Get help
        </Link>
      </div>
    </section>
  );
}
