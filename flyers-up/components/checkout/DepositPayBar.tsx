'use client';

/**
 * Sticky pay bar for deposit step.
 * Mobile-first: fixed bottom, safe area, single primary CTA.
 * Customer accent (pastel green) for trust.
 */

import Link from 'next/link';

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export interface DepositPayBarProps {
  amountCents: number;
  disabled: boolean;
  loading: boolean;
  onSubmit: () => void;
  /** "Pay deposit" or "Pay remaining" */
  label?: string;
  /** Show "Edit details" / back link */
  backHref?: string;
  /** Show "Booking Rules" link */
  showBookingRulesLink?: boolean;
}

export function DepositPayBar({
  amountCents,
  disabled,
  loading,
  onSubmit,
  label = 'Pay deposit',
  backHref,
  showBookingRulesLink = true,
}: DepositPayBarProps) {
  const displayAmount = formatCents(amountCents);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/5 dark:border-white/10 bg-white/95 dark:bg-[#171A20]/95 backdrop-blur-sm p-4 pb-[env(safe-area-inset-bottom)]"
      role="region"
      aria-label="Payment"
    >
      <div className="max-w-lg md:max-w-xl mx-auto">
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || loading}
          className="w-full h-12 rounded-full text-sm font-semibold text-white bg-[#058954] hover:bg-[#047a48] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#058954]/50 focus:ring-offset-2"
        >
          {loading ? 'Processing…' : `${label} ${displayAmount}`}
        </button>
        <p className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3] text-center mt-2">
          Payment held until job completion
        </p>
        <div className="flex items-center justify-center gap-4 mt-2">
          {backHref && (
            <Link
              href={backHref}
              className="text-xs font-medium text-[#6A6A6A] dark:text-[#A1A8B3] hover:text-[#111111] dark:hover:text-[#F5F7FA] transition-colors"
            >
              Edit details
            </Link>
          )}
          {showBookingRulesLink && (
            <Link
              href="/booking-rules"
              className="text-xs font-medium text-[#6A6A6A] dark:text-[#A1A8B3] hover:text-[#111111] dark:hover:text-[#F5F7FA] transition-colors"
            >
              Booking Rules
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
