'use client';

/**
 * Sticky pay bar — Uber/Apple style
 * Full-width CTA, clean typography, safe area
 */

import Link from 'next/link';
import { bottomChrome } from '@/lib/layout/bottomChrome';

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
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
  /** When the page also shows FloatingBottomNav, sit above it */
  aboveBottomNav?: boolean;
}

export function DepositPayBar({
  amountCents,
  disabled,
  loading,
  onSubmit,
  label = 'Pay deposit',
  backHref,
  showBookingRulesLink = true,
  aboveBottomNav = true,
}: DepositPayBarProps) {
  const displayAmount = formatCents(amountCents);

  return (
    <div
      className={`fixed left-0 right-0 z-40 bg-white dark:bg-[#0d0d0f] border-t border-[#ebebeb] dark:border-white/10 p-4 ${
        aboveBottomNav
          ? `${bottomChrome.fixedAboveNav} pb-3`
          : 'bottom-0 pb-[max(1rem,env(safe-area-inset-bottom,0px))]'
      }`}
      role="region"
      aria-label="Payment"
    >
      <div className="max-w-lg md:max-w-xl mx-auto">
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || loading}
          className="w-full h-14 rounded-[14px] text-base font-semibold text-white bg-[#058954] hover:bg-[#047a48] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#058954]/40 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#0d0d0f] active:scale-[0.99]"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing…
            </>
          ) : (
            `${label} ${displayAmount}`
          )}
        </button>
        <div className="flex items-center justify-center gap-6 mt-3">
          {backHref && (
            <Link
              href={backHref}
              className="text-sm text-[#717171] dark:text-white/60 hover:text-[#222] dark:hover:text-white transition-colors"
            >
              Edit details
            </Link>
          )}
          {showBookingRulesLink && (
            <Link
              href="/booking-rules"
              className="text-sm text-[#717171] dark:text-white/60 hover:text-[#222] dark:hover:text-white transition-colors"
            >
              Booking Rules
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
