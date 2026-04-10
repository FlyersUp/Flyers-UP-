'use client';

import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';

export interface BookingDetailHeaderProps {
  /** When true, show a minimal menu affordance (placeholder for future sheet). */
  showMenuAffordance?: boolean;
  className?: string;
}

export function BookingDetailHeader({ showMenuAffordance = false, className = '' }: BookingDetailHeaderProps) {
  return (
    <header
      className={`flex items-center justify-between gap-3 min-w-0 mb-5 ${className}`}
      role="banner"
    >
      <Link
        href="/customer/bookings"
        className="flex items-center gap-1 text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] hover:text-[#111111] dark:hover:text-[#F5F7FA] transition-colors shrink-0 min-w-0"
        aria-label="Back to bookings"
      >
        <span aria-hidden className="text-base leading-none">
          ←
        </span>
        <span className="truncate">Bookings</span>
      </Link>
      <h1 className="text-base sm:text-lg font-semibold text-[#111111] dark:text-[#F5F7FA] text-center flex-1 truncate px-2">
        Booking detail
      </h1>
      {showMenuAffordance ? (
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#6A6A6A] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
          aria-label="More options"
        >
          <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
        </button>
      ) : (
        <span className="w-10 shrink-0" aria-hidden />
      )}
    </header>
  );
}
