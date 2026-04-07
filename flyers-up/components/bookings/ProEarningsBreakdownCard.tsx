'use client';

import { useEffect, useState } from 'react';
import type { UnifiedBookingReceipt } from '@/lib/bookings/unified-receipt';
import {
  buildProEarningsViewFromReceipt,
  buildProEarningsViewFromBookingFallback,
  type ProEarningsView,
} from '@/lib/bookings/pricing-view-models';

function fmt(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export interface ProEarningsBreakdownCardProps {
  bookingId: string;
  amountTotalCents?: number | null;
  platformFeeCents?: number | null;
  /** customer_fees_retained — only used in fallback math to infer your rate, never shown as fee lines. */
  amountSubtotalCents?: number | null;
  priceDollars?: number | null;
  refundedTotalCents?: number | null;
  className?: string;
}

function EarningsBody({ view }: { view: ProEarningsView }) {
  const [showDetails, setShowDetails] = useState(false);
  const showPlatformDeduct =
    view.platformFeeDeductedFromProCents != null && view.platformFeeDeductedFromProCents > 0;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between gap-3">
        <span className="text-muted shrink-0">Your rate</span>
        <span className="text-text tabular-nums text-right font-medium">{fmt(view.yourRateCents)}</span>
      </div>
      {view.addonLineItems.length > 0 && (
        <div className="pl-2 space-y-1 border-l-2 border-border/70">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Included in your rate</p>
          {view.addonLineItems.map((line, idx) => (
            <div key={`${line.title}-${idx}`} className="flex justify-between gap-3 text-xs">
              <span className="text-muted shrink-0">{line.title}</span>
              <span className="text-text tabular-nums text-right">{fmt(line.priceCents)}</span>
            </div>
          ))}
        </div>
      )}
      {view.refundedTotalCents > 0 && (
        <div className="flex justify-between gap-3">
          <span className="text-muted shrink-0">Refunds (adjusted)</span>
          <span className="text-text tabular-nums text-right">−{fmt(view.refundedTotalCents)}</span>
        </div>
      )}
      <div className="flex justify-between gap-3 font-semibold mt-2 pt-2 border-t border-border">
        <span className="text-text">Net payout (est.)</span>
        <span className="text-text tabular-nums">{fmt(view.estimatedNetCents)}</span>
      </div>
      <p className="text-xs text-muted pt-1">
        Customers pay marketplace fees separately — those fees are not deducted from your rate.
      </p>
      <button
        type="button"
        className="text-xs font-medium text-accent hover:underline pt-1"
        onClick={() => setShowDetails((v) => !v)}
        aria-expanded={showDetails}
      >
        {showDetails ? 'Hide' : 'View'} earning details
      </button>
      {showDetails && (
        <div className="rounded-lg border border-border/80 bg-surface2/40 p-3 space-y-2 text-xs">
          <div className="flex justify-between gap-3">
            <span className="text-muted">Your rate</span>
            <span className="text-text tabular-nums">{fmt(view.yourRateCents)}</span>
          </div>
          {showPlatformDeduct ? (
            <div className="flex justify-between gap-3">
              <span className="text-muted">Platform fee</span>
              <span className="text-text tabular-nums">−{fmt(view.platformFeeDeductedFromProCents!)}</span>
            </div>
          ) : (
            <p className="text-muted">No platform fee is taken from your rate for this booking.</p>
          )}
          {view.refundedTotalCents > 0 ? (
            <div className="flex justify-between gap-3">
              <span className="text-muted">Refunds</span>
              <span className="text-text tabular-nums">−{fmt(view.refundedTotalCents)}</span>
            </div>
          ) : null}
          <div className="flex justify-between gap-3 font-semibold pt-2 border-t border-border">
            <span className="text-text">Net payout (est.)</span>
            <span className="text-text tabular-nums">{fmt(view.estimatedNetCents)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Pro-facing earnings only — does not surface customer convenience/protection/demand/total.
 * Prefer booking receipt for add-on lines; falls back to booking row subtotal.
 */
export function ProEarningsBreakdownCard({
  bookingId,
  amountTotalCents,
  platformFeeCents,
  amountSubtotalCents,
  priceDollars,
  refundedTotalCents,
  className = '',
}: ProEarningsBreakdownCardProps) {
  const [receipt, setReceipt] = useState<UnifiedBookingReceipt | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/customer/bookings/${encodeURIComponent(bookingId)}/receipt`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { receipt?: UnifiedBookingReceipt } | null) => {
        if (!cancelled && data?.receipt) setReceipt(data.receipt);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  if (receipt && (receipt.serviceSubtotalCents > 0 || receipt.totalBookingCents > 0)) {
    const view = buildProEarningsViewFromReceipt(receipt);
    return (
      <div className={className}>
        <EarningsBody view={view} />
      </div>
    );
  }

  const fallback = buildProEarningsViewFromBookingFallback({
    amountSubtotalCents,
    amountTotalCents: amountTotalCents ?? 0,
    customerFeesRetainedCents: platformFeeCents,
    refundedTotalCents,
    priceDollars,
  });

  if (fallback && (fallback.yourRateCents > 0 || (amountTotalCents ?? 0) > 0)) {
    return (
      <div className={className}>
        <EarningsBody view={fallback} />
        <p className="text-xs text-muted pt-2">
          Detailed add-on lines appear here once the booking receipt is available.
        </p>
      </div>
    );
  }

  if (priceDollars != null && priceDollars > 0) {
    return (
      <p className={`text-sm text-muted ${className}`}>
        Your listed service amount is <span className="font-medium text-text">${Number(priceDollars).toFixed(2)}</span>.
        Full earnings detail appears after checkout.
      </p>
    );
  }

  return <p className={`text-sm font-semibold text-text ${className}`}>TBD</p>;
}

/** @deprecated Use ProEarningsBreakdownCard */
export const ProCustomerPricingBreakdown = ProEarningsBreakdownCard;
