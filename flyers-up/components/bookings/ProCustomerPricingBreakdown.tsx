'use client';

import { useEffect, useState } from 'react';
import type { UnifiedBookingReceipt } from '@/lib/bookings/unified-receipt';

function fmt(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export interface ProCustomerPricingBreakdownProps {
  bookingId: string;
  amountTotalCents?: number | null;
  platformFeeCents?: number | null;
  amountSubtotalCents?: number | null;
  priceDollars?: number | null;
  className?: string;
}

/**
 * Pro-facing mirror of the customer receipt fee model: prefers GET …/receipt (canonical),
 * then stored booking totals without re-deriving a flat 15% protection fee.
 */
export function ProCustomerPricingBreakdown({
  bookingId,
  amountTotalCents,
  platformFeeCents,
  amountSubtotalCents,
  priceDollars,
  className = '',
}: ProCustomerPricingBreakdownProps) {
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

  const total = amountTotalCents ?? 0;
  const subFromRow = amountSubtotalCents ?? 0;
  const feeFromRow = platformFeeCents ?? 0;
  const hasStoredTotal = total > 0;

  if (receipt && (receipt.customerTotalCents > 0 || receipt.totalBookingCents > 0)) {
    const r = receipt;
    const showFullFeeBreakdown =
      r.customerTotalCents > 0 ||
      r.totalBookingCents > 0 ||
      r.serviceSubtotalCents > 0 ||
      r.feeTotalCents > 0;
    const lineMoney = (cents: number) => {
      if (!showFullFeeBreakdown) return cents > 0 ? fmt(cents) : '—';
      return fmt(cents);
    };

    return (
      <div className={`space-y-2 text-sm ${className}`}>
        <div className="flex justify-between gap-3">
          <span className="text-muted shrink-0">Subtotal (your rate)</span>
          <span className="text-text tabular-nums text-right">{lineMoney(r.serviceSubtotalCents)}</span>
        </div>
        {r.addonLineItems && r.addonLineItems.length > 0 && (
          <div className="pl-2 space-y-1 border-l-2 border-border/70">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Add-ons (in subtotal)</p>
            {r.addonLineItems.map((line, idx) => (
              <div key={`${line.title}-${idx}`} className="flex justify-between gap-3 text-xs">
                <span className="text-muted shrink-0">{line.title}</span>
                <span className="text-text tabular-nums text-right">{fmt(line.priceCents)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between gap-3">
          <span className="text-muted shrink-0">Service fee</span>
          <span className="text-text tabular-nums text-right">{lineMoney(r.serviceFeeCents)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted shrink-0">Convenience fee</span>
          <span className="text-text tabular-nums text-right">{lineMoney(r.convenienceFeeCents)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted shrink-0">Protection & guarantee</span>
          <span className="text-text tabular-nums text-right">{lineMoney(r.protectionFeeCents)}</span>
        </div>
        {r.demandFeeCents > 0 && (
          <div className="flex justify-between gap-3">
            <span className="text-muted shrink-0">High-demand fee</span>
            <span className="text-text tabular-nums text-right">{fmt(r.demandFeeCents)}</span>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <span className="text-muted shrink-0">Fee total</span>
          <span className="text-text tabular-nums text-right">
            {lineMoney(r.feeTotalCents > 0 ? r.feeTotalCents : r.platformFeeCents)}
          </span>
        </div>
        <div className="flex justify-between gap-3 font-semibold mt-2 pt-2 border-t border-border">
          <span className="text-text">Total (customer pays)</span>
          <span className="text-text tabular-nums">{fmt(r.customerTotalCents)}</span>
        </div>
      </div>
    );
  }

  if (hasStoredTotal) {
    const sub = subFromRow > 0 ? subFromRow : Math.max(0, total - feeFromRow);
    const aggregateFee = Math.max(0, total - sub);
    return (
      <div className={`space-y-2 text-sm ${className}`}>
        <div className="flex justify-between gap-3">
          <span className="text-muted shrink-0">Subtotal (your rate)</span>
          <span className="text-text tabular-nums text-right">{fmt(sub)}</span>
        </div>
        {aggregateFee > 0 && (
          <div className="flex justify-between gap-3">
            <span className="text-muted shrink-0">Marketplace & protection fees (customer-paid)</span>
            <span className="text-text tabular-nums text-right">{fmt(aggregateFee)}</span>
          </div>
        )}
        <div className="flex justify-between gap-3 font-semibold mt-2 pt-2 border-t border-border">
          <span className="text-text">Total (customer pays)</span>
          <span className="text-text tabular-nums">{fmt(total)}</span>
        </div>
        <p className="text-xs text-muted pt-1">
          Full fee lines match the customer receipt once loaded; refresh if you just completed checkout setup.
        </p>
      </div>
    );
  }

  if (priceDollars != null && priceDollars > 0) {
    return (
      <p className={`text-sm text-muted ${className}`}>
        The customer-facing total is finalized at checkout. Your listed service amount is{' '}
        <span className="font-medium text-text">${Number(priceDollars).toFixed(2)}</span>.
      </p>
    );
  }

  return <p className={`text-sm font-semibold text-text ${className}`}>TBD</p>;
}
