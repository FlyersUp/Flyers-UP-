'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export interface TrackBookingPaymentSummaryProps {
  bookingId: string;
  status: string;
  paymentStatus?: string;
  paymentDueAt?: string | null;
  amountDeposit?: number | null;
  amountRemaining?: number | null;
  amountTotal?: number | null;
  paidAt?: string | null;
  fullyPaidAt?: string | null;
  /** Primary CTA (e.g. Pay deposit, Pay remaining) — rendered above summary */
  primaryAction?: React.ReactNode;
  className?: string;
}

export function TrackBookingPaymentSummary({
  bookingId,
  status,
  paymentStatus = 'UNPAID',
  paymentDueAt,
  amountDeposit = 0,
  amountRemaining = 0,
  amountTotal,
  paidAt,
  fullyPaidAt,
  primaryAction,
  className = '',
}: TrackBookingPaymentSummaryProps) {
  const [computedDeposit, setComputedDeposit] = useState<number | null>(null);

  const isExpired = status === 'expired_unpaid';
  const isFullyPaid = status === 'fully_paid' || status === 'paid' || fullyPaidAt;
  const isDepositPaid = paidAt && !isFullyPaid;
  const needsDeposit =
    ['payment_required', 'accepted', 'accepted_pending_payment', 'awaiting_deposit_payment'].includes(status) &&
    !paidAt;
  const needsRemaining =
    ['completed_pending_payment', 'awaiting_payment', 'awaiting_remaining_payment'].includes(status) &&
    !fullyPaidAt;

  // When amountDeposit is null but we need deposit, fetch computed quote so user sees the amount.
  useEffect(() => {
    if (!needsDeposit || (amountDeposit != null && amountDeposit > 0)) return;
    let cancelled = false;
    fetch(`/api/bookings/${bookingId}/checkout-quote`, { cache: 'no-store', credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const dep = data?.quote?.quote?.amountDeposit ?? data?.quote?.amountDeposit;
        if (typeof dep === 'number' && dep > 0) setComputedDeposit(dep);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [bookingId, needsDeposit, amountDeposit]);

  const displayDeposit = amountDeposit ?? computedDeposit;
  const total = amountTotal ?? (displayDeposit ?? 0) + (amountRemaining ?? 0);
  const rem = amountRemaining ?? 0;

  if (isExpired) {
    return (
      <section
        className={`rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm ${className}`}
        aria-labelledby="track-payment"
      >
        <h2 id="track-payment" className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-3">
          Payment
        </h2>
        <p className="text-sm font-medium text-[#111111] dark:text-[#F5F7FA]">Expired — not paid</p>
        <p className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3] mt-1">The payment window has passed.</p>
        <Link
          href="/customer/bookings"
          className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-medium text-black bg-[#FFC067] hover:brightness-95 mt-3"
        >
          Request again
        </Link>
      </section>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm ${className}`}
      aria-labelledby="track-payment"
    >
      <h2 id="track-payment" className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-3">
        Payment
      </h2>
      {primaryAction && <div className="mb-4">{primaryAction}</div>}
      <div className="space-y-2 text-sm">
        {isFullyPaid && (
          <div className="flex justify-between">
            <span className="text-[#058954] font-medium">Paid</span>
            <span className="font-semibold text-[#058954]">
              {total > 0 ? formatCents(total) : '—'}
            </span>
          </div>
        )}
        {isDepositPaid && (
          <>
            <div className="flex justify-between">
              <span className="text-[#058954] font-medium">Deposit paid</span>
              <span className="font-semibold text-[#058954]">
                {displayDeposit ? formatCents(displayDeposit) : '—'}
              </span>
            </div>
            {rem > 0 && (
              <div className="flex justify-between">
                <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Remaining (due after service)</span>
                <span className="text-[#111111] dark:text-[#F5F7FA]">{formatCents(rem)}</span>
              </div>
            )}
          </>
        )}
        {needsDeposit && (
          <>
            <div className="flex justify-between">
              <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Deposit</span>
              <span className="text-[#111111] dark:text-[#F5F7FA]">
                {displayDeposit ? formatCents(displayDeposit) : '—'}
              </span>
            </div>
            {rem > 0 && (
              <div className="flex justify-between">
                <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Remaining (after service)</span>
                <span className="text-[#111111] dark:text-[#F5F7FA]">{formatCents(rem)}</span>
              </div>
            )}
          </>
        )}
        {needsRemaining && (
          <>
            <div className="flex justify-between">
              <span className="text-[#058954] font-medium">Deposit paid</span>
              <span className="font-semibold text-[#058954]">
                {displayDeposit ? formatCents(displayDeposit) : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Remaining due</span>
              <span className="text-[#111111] dark:text-[#F5F7FA]">{formatCents(rem)}</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
