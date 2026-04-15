'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  buildUnifiedBookingReceipt,
  type UnifiedBookingReceipt,
  type UnifiedReceiptOverallStatus,
} from '@/lib/bookings/unified-receipt';
import { DEFAULT_BOOKING_TIMEZONE, formatBookingDateTimeInZone } from '@/lib/datetime';
import { labelDynamicPricingReason } from '@/lib/bookings/dynamic-pricing-reason-labels';
import { StayOnPlatformTrustCallout } from '@/components/retention/StayOnPlatformTrustCallout';
import { CUSTOMER_PAYMENT_PLATFORM_HOLD_SHORT } from '@/lib/bookings/customer-payment-platform-hold-copy';

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function statusBadgeClass(status: UnifiedReceiptOverallStatus): string {
  switch (status) {
    case 'fully_paid':
      return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/25';
    case 'deposit_paid':
    case 'partially_paid':
      return 'bg-amber-500/15 text-amber-900 dark:text-amber-100 border-amber-500/25';
    case 'refunded':
    case 'partially_refunded':
      return 'bg-zinc-500/15 text-zinc-800 dark:text-zinc-200 border-zinc-500/25';
    default:
      return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border-zinc-500/20';
  }
}

function statusLabel(status: UnifiedReceiptOverallStatus): string {
  switch (status) {
    case 'fully_paid':
      return 'Paid in full';
    case 'deposit_paid':
      return 'Deposit paid';
    case 'partially_paid':
      return 'Partially paid';
    case 'refunded':
      return 'Refunded';
    case 'partially_refunded':
      return 'Partially refunded';
    default:
      return 'Payment pending';
  }
}

export interface TrackBookingPaymentSummaryProps {
  bookingId: string;
  /** For deposit deadline / receipt lines — avoids SSR toLocaleString drift. */
  bookingTimezone?: string | null;
  status: string;
  paymentStatus?: string;
  finalPaymentStatus?: string | null;
  paymentDueAt?: string | null;
  amountDeposit?: number | null;
  amountRemaining?: number | null;
  amountTotal?: number | null;
  paidAt?: string | null;
  paidDepositAt?: string | null;
  paidRemainingAt?: string | null;
  fullyPaidAt?: string | null;
  refundStatus?: string | null;
  refundedTotalCents?: number | null;
  serviceSubtotalCents?: number | null;
  serviceFeeCents?: number | null;
  convenienceFeeCents?: number | null;
  protectionFeeCents?: number | null;
  demandFeeCents?: number | null;
  feeTotalCents?: number | null;
  promoDiscountCents?: number | null;
  platformFeeCents?: number | null;
  customerTotalCents?: number | null;
  depositChargeCents?: number | null;
  finalChargeCents?: number | null;
  serviceName?: string;
  proName?: string;
  address?: string;
  serviceDate?: string;
  serviceTime?: string;
  /** Primary CTA (e.g. Pay deposit, Pay remaining) — rendered above summary */
  primaryAction?: React.ReactNode;
  /** Lifecycle-driven line for split final payment (auto-charge, processing, success, failure). */
  finalPaymentCustomerNote?: string | null;
  /** Compact "Payment summary" layout for booking detail (fewer line items). */
  layoutVariant?: 'full' | 'compact';
  /** Completed jobs — informational on-platform trust copy near receipt. */
  showOnPlatformReceiptTrust?: boolean;
  className?: string;
}

export function TrackBookingPaymentSummary({
  bookingId,
  bookingTimezone = null,
  status,
  paymentStatus = 'UNPAID',
  finalPaymentStatus = null,
  paymentDueAt,
  amountDeposit = 0,
  amountRemaining = 0,
  amountTotal,
  paidAt,
  paidDepositAt,
  paidRemainingAt,
  fullyPaidAt,
  refundStatus = null,
  refundedTotalCents = null,
  serviceSubtotalCents = null,
  serviceFeeCents = null,
  convenienceFeeCents = null,
  protectionFeeCents = null,
  demandFeeCents = null,
  feeTotalCents = null,
  promoDiscountCents = null,
  platformFeeCents = null,
  customerTotalCents = null,
  depositChargeCents = null,
  finalChargeCents = null,
  serviceName = 'Service',
  proName = 'Provider',
  address,
  serviceDate,
  serviceTime,
  primaryAction,
  finalPaymentCustomerNote = null,
  layoutVariant = 'full',
  showOnPlatformReceiptTrust = false,
  className = '',
}: TrackBookingPaymentSummaryProps) {
  const tz = bookingTimezone?.trim() || DEFAULT_BOOKING_TIMEZONE;
  const [computedDeposit, setComputedDeposit] = useState<number | null>(null);
  const [apiReceipt, setApiReceipt] = useState<UnifiedBookingReceipt | null>(null);

  const isExpired = status === 'expired_unpaid';
  const needsDeposit =
    ['payment_required', 'accepted', 'accepted_pending_payment', 'awaiting_deposit_payment'].includes(status) &&
    !paidAt;
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

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/customer/bookings/${bookingId}/receipt`, { cache: 'no-store', credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { receipt?: UnifiedBookingReceipt } | null) => {
        if (cancelled || !data?.receipt) return;
        setApiReceipt(data.receipt);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const displayDeposit = amountDeposit ?? computedDeposit;
  const totalForReceipt = amountTotal ?? (displayDeposit ?? 0) + (amountRemaining ?? 0);
  const rem = amountRemaining ?? 0;

  const clientReceipt = useMemo(
    () =>
      buildUnifiedBookingReceipt({
        bookingId,
        status,
        paymentStatus,
        finalPaymentStatus,
        paidAt,
        paidDepositAt,
        paidRemainingAt,
        fullyPaidAt,
        amountDeposit: displayDeposit,
        amountRemaining: rem,
        amountTotal: totalForReceipt,
        totalAmountCents: amountTotal ?? undefined,
        refundedTotalCents,
        refundStatus,
        serviceSubtotalCents,
        serviceFeeCents,
        convenienceFeeCents,
        protectionFeeCents,
        demandFeeCents,
        feeTotalCents,
        promoDiscountCents,
        platformFeeTotalCents: platformFeeCents,
        customerTotalCents,
        depositChargeCents,
        finalChargeCents,
        serviceTitle: serviceName,
        proName,
        serviceDate: serviceDate ?? null,
        serviceTime: serviceTime ?? null,
        address: address ?? null,
      }),
    [
      bookingId,
      status,
      paymentStatus,
      finalPaymentStatus,
      paidAt,
      paidDepositAt,
      paidRemainingAt,
      fullyPaidAt,
      displayDeposit,
      rem,
      totalForReceipt,
      amountTotal,
      refundedTotalCents,
      refundStatus,
      serviceSubtotalCents,
      serviceFeeCents,
      convenienceFeeCents,
      protectionFeeCents,
      demandFeeCents,
      feeTotalCents,
      promoDiscountCents,
      platformFeeCents,
      customerTotalCents,
      depositChargeCents,
      finalChargeCents,
      serviceName,
      proName,
      serviceDate,
      serviceTime,
      address,
    ]
  );

  const receipt = apiReceipt ?? clientReceipt;

  /** When we have a quoted customer total (or API receipt), show full breakdown including $0.00 lines. */
  const showFullFeeBreakdown =
    Boolean(apiReceipt) ||
    receipt.customerTotalCents > 0 ||
    receipt.totalBookingCents > 0 ||
    receipt.serviceSubtotalCents > 0 ||
    receipt.feeTotalCents > 0;

  const lineMoney = (cents: number) => {
    if (!showFullFeeBreakdown) return cents > 0 ? formatCents(cents) : '—';
    return formatCents(cents);
  };

  const serviceFeesAggregateCents = Math.max(
    0,
    receipt.customerTotalCents - receipt.serviceSubtotalCents + receipt.promoDiscountCents
  );

  if (isExpired) {
    return (
      <section
        className={`rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm ${className}`}
        aria-labelledby="track-receipt"
      >
        <h2 id="track-receipt" className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-3">
          {layoutVariant === 'compact' ? 'Payment summary' : 'Receipt'}
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

  if (layoutVariant === 'compact') {
    const feesShown =
      receipt.feeTotalCents > 0 ? receipt.feeTotalCents : serviceFeesAggregateCents;
    const depositPaidCents =
      receipt.depositPhaseStatus === 'paid' ? receipt.depositScheduledCents : 0;

    return (
      <section
        className={`rounded-2xl border border-sky-200/40 dark:border-sky-800/35 bg-gradient-to-b from-sky-50/90 to-white dark:from-sky-950/25 dark:to-[#171A20] p-5 shadow-sm ${className}`}
        aria-labelledby="track-payment-summary"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 id="track-payment-summary" className="text-base font-semibold text-[#111111] dark:text-[#F5F7FA]">
            Payment summary
          </h2>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(receipt.overallStatus)}`}
          >
            {statusLabel(receipt.overallStatus)}
          </span>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-3 min-w-0">
            <span className="text-[#6A6A6A] dark:text-[#A1A8B3] shrink-0">Subtotal (pro rate)</span>
            <span className="font-medium text-[#111111] dark:text-[#F5F7FA] tabular-nums text-right">
              {lineMoney(receipt.serviceSubtotalCents)}
            </span>
          </div>
          <div className="flex justify-between gap-3 min-w-0">
            <span className="text-[#6A6A6A] dark:text-[#A1A8B3] shrink-0">Marketplace fees</span>
            <span className="font-medium text-[#111111] dark:text-[#F5F7FA] tabular-nums text-right">
              {feesShown > 0 ? formatCents(feesShown) : '—'}
            </span>
          </div>
          {receipt.promoDiscountCents > 0 && (
            <div className="flex justify-between gap-3 min-w-0">
              <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Discount</span>
              <span className="font-medium text-[#111111] dark:text-[#F5F7FA] tabular-nums">
                -{formatCents(receipt.promoDiscountCents)}
              </span>
            </div>
          )}
          <div className="flex justify-between gap-3 min-w-0 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
            <span className="font-semibold text-[#111111] dark:text-[#F5F7FA]">Total</span>
            <span className="font-bold text-[#111111] dark:text-[#F5F7FA] tabular-nums">
              {showFullFeeBreakdown || receipt.customerTotalCents > 0
                ? formatCents(receipt.customerTotalCents)
                : '—'}
            </span>
          </div>

          {receipt.isSplitPayment && (
            <>
              {depositPaidCents > 0 && (
                <div className="flex justify-between gap-3 min-w-0 pt-1">
                  <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Deposit paid</span>
                  <span className="font-semibold text-[#058954] tabular-nums">
                    -{formatCents(depositPaidCents)}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-3 min-w-0">
                <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Remaining due</span>
                <span className="font-bold text-[#4A69BD] dark:text-[#7BA3E8] tabular-nums">
                  {formatCents(Math.max(0, receipt.remainingDueCents))}
                </span>
              </div>
            </>
          )}

          {receipt.isSplitPayment && finalPaymentCustomerNote && (
            <p className="text-xs text-[#111111] dark:text-[#F5F7FA] leading-relaxed rounded-xl bg-white/70 dark:bg-white/[0.06] px-3 py-2.5 border border-black/[0.06] dark:border-white/[0.08]">
              {finalPaymentCustomerNote}
            </p>
          )}
          {receipt.isSplitPayment &&
            !finalPaymentCustomerNote &&
            receipt.overallStatus === 'deposit_paid' && (
              <p className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3] leading-relaxed">
                Balance is collected after your service per booking terms.
              </p>
            )}

          {receipt.refundedTotalCents > 0 && (
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Refunded</span>
              <span className="font-medium text-[#111111] dark:text-[#F5F7FA] tabular-nums">
                {formatCents(receipt.refundedTotalCents)}
              </span>
            </div>
          )}
        </div>

        <a
          href={`/api/customer/bookings/${bookingId}/receipt?format=html`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 dark:border-white/15 bg-white/80 dark:bg-white/[0.06] py-3 text-sm font-medium text-[#111111] dark:text-[#F5F7FA] hover:bg-white dark:hover:bg-white/[0.09] transition-colors"
        >
          View printable receipt
        </a>

        {needsDeposit && paymentDueAt && (
          <p className="text-xs text-amber-800/90 dark:text-amber-200/90 mt-3">
            Complete deposit before {formatBookingDateTimeInZone(paymentDueAt, tz) || paymentDueAt}.
          </p>
        )}
      </section>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm ${className}`}
      aria-labelledby="track-receipt"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <h2 id="track-receipt" className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3]">
          Receipt
        </h2>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(receipt.overallStatus)}`}
        >
          {statusLabel(receipt.overallStatus)}
        </span>
      </div>

      {primaryAction && <div className="mb-4">{primaryAction}</div>}

      <p className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3] mb-3">
        Booking #{receipt.bookingReference}
        {receipt.isSplitPayment ? ' · Deposit now, balance after service' : null}
      </p>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Subtotal (pro rate)</span>
          <span className="font-medium text-[#111111] dark:text-[#F5F7FA] tabular-nums">
            {lineMoney(receipt.serviceSubtotalCents)}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Service fee</span>
          <span className="font-medium text-[#111111] dark:text-[#F5F7FA] tabular-nums">
            {lineMoney(receipt.serviceFeeCents)}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Convenience fee</span>
          <span className="font-medium text-[#111111] dark:text-[#F5F7FA] tabular-nums">
            {lineMoney(receipt.convenienceFeeCents)}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Protection</span>
          <span className="font-medium text-[#111111] dark:text-[#F5F7FA] tabular-nums">
            {lineMoney(receipt.protectionFeeCents)}
          </span>
        </div>

        {receipt.demandFeeCents > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Busy-time fee</span>
            <span className="font-medium text-[#111111] dark:text-[#F5F7FA] tabular-nums">
              {formatCents(receipt.demandFeeCents)}
            </span>
          </div>
        )}

        <div className="flex justify-between gap-4">
          <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Fee total</span>
          <span className="font-medium text-[#111111] dark:text-[#F5F7FA] tabular-nums">
            {showFullFeeBreakdown
              ? lineMoney(
                  receipt.feeTotalCents > 0 ? receipt.feeTotalCents : receipt.platformFeeCents
                )
              : receipt.feeTotalCents > 0
                ? formatCents(receipt.feeTotalCents)
                : receipt.platformFeeCents > 0
                  ? formatCents(receipt.platformFeeCents)
                  : '—'}
          </span>
        </div>

        {receipt.promoDiscountCents > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Discount</span>
            <span className="font-medium text-[#111111] dark:text-[#F5F7FA] tabular-nums">
              -{formatCents(receipt.promoDiscountCents)}
            </span>
          </div>
        )}

        {receipt.dynamicPricingReasons.length > 0 && (
          <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2.5">
            <p className="text-xs font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-1.5">
              What affected your price
            </p>
            <ul className="list-disc pl-4 space-y-1 text-xs text-[#111111] dark:text-[#F5F7FA]">
              {receipt.dynamicPricingReasons.map((code: string) => (
                <li key={code}>{labelDynamicPricingReason(code)}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-between gap-4">
          <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Total</span>
          <span className="font-semibold text-[#111111] dark:text-[#F5F7FA] tabular-nums">
            {showFullFeeBreakdown
              ? formatCents(receipt.customerTotalCents)
              : receipt.customerTotalCents > 0
                ? formatCents(receipt.customerTotalCents)
                : '—'}
          </span>
        </div>

        {receipt.isSplitPayment && (
          <>
            <div className="flex justify-between gap-4">
              <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Deposit</span>
              <span
                className={`font-medium tabular-nums ${
                  receipt.depositPhaseStatus === 'paid'
                    ? 'text-[#058954]'
                    : 'text-[#111111] dark:text-[#F5F7FA]'
                }`}
              >
                {receipt.depositScheduledCents > 0
                  ? `${formatCents(receipt.depositScheduledCents)}${receipt.depositPhaseStatus === 'paid' ? ' (paid)' : ''}`
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Final payment</span>
              <span className="font-medium text-[#111111] dark:text-[#F5F7FA] tabular-nums">
                {receipt.remainingDueCents > 0 || receipt.remainingScheduledCents > 0
                  ? formatCents(
                      receipt.overallStatus === 'fully_paid'
                        ? receipt.remainingPaidCents
                        : Math.max(receipt.remainingDueCents, receipt.remainingScheduledCents)
                    )
                  : '—'}
              </span>
            </div>
          </>
        )}

        <div className="flex justify-between gap-4">
          <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Remaining due</span>
          <span className="font-semibold text-[#111111] dark:text-[#F5F7FA] tabular-nums">
            {receipt.remainingDueCents > 0 ? formatCents(receipt.remainingDueCents) : formatCents(0)}
          </span>
        </div>

        <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2.5 space-y-2">
          <p className="text-xs font-medium text-[#6A6A6A] dark:text-[#A1A8B3]">Timeline</p>
          {receipt.paidDepositAt && (
            <div className="flex justify-between gap-2 text-xs">
              <span className="text-[#111111] dark:text-[#F5F7FA]">
                {receipt.isSplitPayment ? 'Deposit paid' : 'Paid in full'}
              </span>
              <span className="text-[#6A6A6A] dark:text-[#A1A8B3] shrink-0">
                {formatBookingDateTimeInZone(receipt.paidDepositAt, tz) || receipt.paidDepositAt}
              </span>
            </div>
          )}
          {receipt.isSplitPayment && receipt.paidRemainingAt && (
            <div className="flex justify-between gap-2 text-xs">
              <span className="text-[#111111] dark:text-[#F5F7FA]">Paid in full</span>
              <span className="text-[#6A6A6A] dark:text-[#A1A8B3] shrink-0">
                {formatBookingDateTimeInZone(receipt.paidRemainingAt, tz) || receipt.paidRemainingAt}
              </span>
            </div>
          )}
          {!receipt.paidDepositAt && !receipt.paidRemainingAt && (
            <p className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3]">Nothing recorded yet.</p>
          )}
        </div>

        {receipt.refundedTotalCents > 0 && (
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Refunded to you</span>
            <span className="font-medium text-[#111111] dark:text-[#F5F7FA] tabular-nums">
              {formatCents(receipt.refundedTotalCents)}
            </span>
          </div>
        )}

        {receipt.isSplitPayment && finalPaymentCustomerNote && (
          <p className="text-xs text-[#111111] dark:text-[#F5F7FA] leading-relaxed rounded-xl bg-black/[0.04] dark:bg-white/[0.06] px-3 py-2.5 border border-black/[0.06] dark:border-white/[0.08]">
            {finalPaymentCustomerNote}
          </p>
        )}
        {receipt.isSplitPayment &&
          !finalPaymentCustomerNote &&
          receipt.overallStatus === 'deposit_paid' && (
            <p className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3] leading-relaxed">
              Remaining due after completion is collected after your service. We will email you a full summary when the
              booking is paid in full.
            </p>
          )}

        {showOnPlatformReceiptTrust ? (
          <div className="pt-1">
            <StayOnPlatformTrustCallout variant="compact" />
          </div>
        ) : null}

        <p className="pt-3 mt-1 border-t border-black/[0.06] dark:border-white/[0.08] text-xs leading-relaxed text-[#6A6A6A] dark:text-[#A1A8B3]">
          {CUSTOMER_PAYMENT_PLATFORM_HOLD_SHORT}
        </p>

        <p className="pt-2">
          <a
            href={`/api/customer/bookings/${bookingId}/receipt?format=html`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-[#058954] hover:underline"
          >
            View printable receipt
          </a>
        </p>

        {needsDeposit && paymentDueAt && (
          <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
            Complete deposit before {formatBookingDateTimeInZone(paymentDueAt, tz) || paymentDueAt}.
          </p>
        )}
      </div>
    </section>
  );
}
