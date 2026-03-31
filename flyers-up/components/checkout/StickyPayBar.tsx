'use client';

import Link from 'next/link';
import { bottomChrome } from '@/lib/layout/bottomChrome';

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

/**
 * Sticky bottom bar with Confirm & Pay button.
 */
export function StickyPayBar({
  amountTotal,
  currency,
  disabled,
  loading,
  onSubmit,
  label = 'Confirm & Pay',
  showBookingRulesLink,
  aboveBottomNav = true,
}: {
  amountTotal: number;
  currency: string;
  disabled: boolean;
  loading: boolean;
  onSubmit: () => void;
  label?: string;
  /** Show "Booking Rules" link under the button */
  showBookingRulesLink?: boolean;
  /** When the page also shows FloatingBottomNav, sit above it */
  aboveBottomNav?: boolean;
}) {
  const displayAmount = currency === 'usd' ? formatCents(amountTotal) : `${(amountTotal / 100).toFixed(2)} ${currency.toUpperCase()}`;

  return (
    <div
      className={`fixed left-0 right-0 z-40 border-t border-border bg-surface/95 dark:bg-surface/95 backdrop-blur-sm p-4 ${
        aboveBottomNav
          ? `${bottomChrome.fixedAboveNav} pb-3`
          : 'bottom-0 pb-[max(1rem,env(safe-area-inset-bottom,0px))]'
      }`}
    >
      <div className="max-w-lg mx-auto">
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || loading}
          className="w-full h-12 rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 disabled:opacity-60 transition-all flex items-center justify-center"
        >
          {loading ? 'Processing…' : `${label} ${displayAmount}`}
        </button>
        <p className="text-xs text-muted text-center mt-2">
          Payment held until job completion
        </p>
        {showBookingRulesLink && (
          <Link
            href="/booking-rules"
            className="block text-center text-xs text-muted hover:text-text hover:underline mt-1"
          >
            Booking Rules
          </Link>
        )}
      </div>
    </div>
  );
}
