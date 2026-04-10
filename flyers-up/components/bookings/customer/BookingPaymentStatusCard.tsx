'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { CustomerRemainingPaymentUiState } from '@/lib/bookings/customer-remaining-payment-ui';
import { bookingFinalCheckoutPath } from '@/lib/bookings/booking-routes';
import { DEFAULT_BOOKING_TIMEZONE, formatBookingDateTimeInZone } from '@/lib/datetime';
import { timelineForRemainingPaymentState } from '@/lib/bookings/payment-timeline';
import { PaymentCountdown } from '@/components/bookings/customer/PaymentCountdown';
import { PaymentTimeline } from '@/components/bookings/customer/PaymentTimeline';

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

const cardBase = 'rounded-2xl border text-sm dark:border-white/10';
const titleClass = 'font-semibold text-[#111111] dark:text-[#F5F7FA]';
const bodyClass = 'mt-1 text-[#6A6A6A] dark:text-[#A1A8B3]';
const primaryBtn =
  'flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 transition-all';
const secondaryBtn =
  'flex h-10 w-full items-center justify-center rounded-full text-sm font-medium border border-[#E5E7EB] dark:border-white/15 text-[#2d3436] dark:text-white/90 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors';
const payNowBtn =
  'flex h-10 w-full items-center justify-center rounded-full text-sm font-medium border border-[#E5E7EB] dark:border-white/15 text-[#2d3436] dark:text-white/90 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors';
const linkSubtle =
  'text-sm font-medium text-[#4A69BD] dark:text-[#6b8fd4] hover:underline underline-offset-2';

function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'scheduled' | 'processing' | 'paid' | 'action' | 'pending';
}) {
  const map = {
    scheduled:
      'bg-amber-100/90 text-amber-950 dark:text-amber-100 border-amber-300/60 dark:border-amber-700/50',
    processing:
      'bg-[#4A69BD]/12 text-[#1e3a5f] dark:text-[#b8c9f0] border-[#4A69BD]/25',
    paid: 'bg-emerald-500/12 text-emerald-900 dark:text-emerald-100 border-emerald-500/25',
    action: 'bg-amber-500/15 text-amber-950 dark:text-amber-50 border-amber-500/30',
    pending: 'bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 border-zinc-500/20',
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${map[tone]}`}
    >
      {children}
    </span>
  );
}

function ProcessingPulse() {
  return (
    <div className="flex items-center gap-2 mt-2" aria-hidden>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4A69BD]/40 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4A69BD]" />
      </span>
      <span className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3]">Working on it…</span>
    </div>
  );
}

export type BookingPaymentStatusCardProps = {
  bookingId: string;
  state: CustomerRemainingPaymentUiState;
  variant?: 'default' | 'compact';
  className?: string;
  /** Same precedence as payment derive: review deadline first */
  customerReviewDeadlineAt?: string | null;
  remainingDueAt?: string | null;
  bookingTimezone?: string | null;
  paidRemainingAt?: string | null;
  fullyPaidAt?: string | null;
};

export function BookingPaymentStatusCard({
  bookingId,
  state,
  variant = 'default',
  className = '',
  customerReviewDeadlineAt = null,
  remainingDueAt = null,
  bookingTimezone = null,
  paidRemainingAt = null,
  fullyPaidAt = null,
}: BookingPaymentStatusCardProps) {
  if (state.kind === 'none') return null;

  const checkoutHref = bookingFinalCheckoutPath(bookingId);
  const methodsHref = '/customer/settings/payments/methods';
  const issueHref = `/customer/bookings/${bookingId}/issues/new`;
  const supportHref = '/customer/settings/help-support';
  const receiptHref = `/api/customer/bookings/${bookingId}/receipt?format=html`;

  const tz = bookingTimezone?.trim() || DEFAULT_BOOKING_TIMEZONE;
  const timeline = timelineForRemainingPaymentState(state);
  const pad = variant === 'compact' ? 'p-3.5' : 'p-4';
  const wrap = `${className} ${pad}`.trim();

  const deadlineIso = (customerReviewDeadlineAt || remainingDueAt || '').trim() || null;
  const finalCollectedIso = (paidRemainingAt || fullyPaidAt || '').trim() || null;

  if (state.kind === 'before_completion') {
    return (
      <div className={`${cardBase} border-[#E8EAED] bg-[#F9FAFB] dark:bg-white/[0.04] ${wrap} space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="pending">Pending</Badge>
        </div>
        <div>
          <p className={titleClass}>Remaining balance pending completion</p>
          <p className={bodyClass}>Your final payment will be scheduled after the service is completed.</p>
          {state.remainingCents > 0 ? (
            <p className={`${bodyClass} mt-1`}>Estimated remaining: {formatCents(state.remainingCents)}</p>
          ) : null}
        </div>
        {timeline && <PaymentTimeline {...timeline} compact={variant === 'compact'} />}
      </div>
    );
  }

  if (state.kind === 'review_window_auto') {
    return (
      <div className={`${cardBase} border-[#E8EAED] bg-white dark:bg-[#171A20] ${wrap} space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="scheduled">Scheduled</Badge>
        </div>
        <div>
          <p className={titleClass}>Remaining payment scheduled</p>
          <p className={bodyClass}>Will auto-charge after the review window unless you report an issue.</p>
        </div>
        {deadlineIso ? (
          <PaymentCountdown deadlineIso={deadlineIso} className="pt-0.5" />
        ) : null}
        {timeline && <PaymentTimeline {...timeline} compact={variant === 'compact'} />}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center pt-1">
          <Link href={issueHref} className={`${linkSubtle} text-center sm:text-left`}>
            Report issue
          </Link>
          <span className="hidden sm:inline text-[#D1D5DB] dark:text-white/20" aria-hidden>
            ·
          </span>
          <Link href={supportHref} className={`${linkSubtle} text-center sm:text-left`}>
            Contact support
          </Link>
        </div>
        <Link href={checkoutHref} className={payNowBtn}>
          Pay now
        </Link>
      </div>
    );
  }

  if (state.kind === 'post_review_auto_pending') {
    return (
      <div className={`${cardBase} border-[#E8EAED] bg-white dark:bg-[#171A20] ${wrap} space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="processing">Processing</Badge>
        </div>
        <div>
          <p className={titleClass}>Processing remaining payment</p>
          <p className={bodyClass}>We&apos;re charging your saved payment method now.</p>
          <ProcessingPulse />
        </div>
        {timeline && <PaymentTimeline {...timeline} compact={variant === 'compact'} />}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href={supportHref} className={linkSubtle}>
            Contact support
          </Link>
        </div>
      </div>
    );
  }

  if (state.kind === 'processing') {
    return (
      <div className={`${cardBase} border-[#E8EAED] bg-white dark:bg-[#171A20] ${wrap} space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="processing">Processing</Badge>
        </div>
        <div>
          <p className={titleClass}>Processing remaining payment</p>
          <p className={bodyClass}>We&apos;re charging your saved payment method now.</p>
          <ProcessingPulse />
        </div>
        {timeline && <PaymentTimeline {...timeline} compact={variant === 'compact'} />}
      </div>
    );
  }

  if (state.kind === 'success') {
    const when = finalCollectedIso
      ? formatBookingDateTimeInZone(finalCollectedIso, tz) || new Date(finalCollectedIso).toLocaleString()
      : null;
    return (
      <div
        className={`${cardBase} border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-800/50 dark:bg-emerald-950/25 ${wrap} space-y-3`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="paid">Paid</Badge>
        </div>
        <div>
          <p className={`${titleClass} text-emerald-950 dark:text-emerald-100`}>Payment complete</p>
          <p className={`${bodyClass} text-emerald-900/85 dark:text-emerald-100/80`}>
            Your final payment has been collected successfully.
          </p>
          {when ? (
            <p className={`text-xs mt-2 text-emerald-900/80 dark:text-emerald-100/75`}>
              Final payment collected on {when}
            </p>
          ) : null}
        </div>
        {timeline && <PaymentTimeline {...timeline} compact={variant === 'compact'} />}
        <p className="pt-1">
          <a
            href={receiptHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 hover:underline"
          >
            View receipt
          </a>
        </p>
      </div>
    );
  }

  if (state.kind === 'failed' || state.kind === 'requires_action') {
    return (
      <div
        className={`${cardBase} border-amber-200/90 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/35 ${wrap} space-y-3`}
        role="alert"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="action">Action needed</Badge>
        </div>
        <div>
          <p className={`${titleClass} text-amber-950 dark:text-amber-50`}>Payment failed</p>
          <p className={`${bodyClass} text-amber-900/90 dark:text-amber-100/85`}>
            We couldn&apos;t process your remaining payment.
            {state.kind === 'requires_action'
              ? ' Your bank may need you to confirm the charge, or your card needs updating.'
              : ' Your saved card was declined or the charge could not be completed.'}{' '}
            {state.remainingCents > 0 ? `Amount due: ${formatCents(state.remainingCents)}.` : ''}
          </p>
        </div>
        {timeline && <PaymentTimeline {...timeline} compact={variant === 'compact'} />}
        <Link href={checkoutHref} className={primaryBtn}>
          Retry payment
        </Link>
        <Link href={methodsHref} className={secondaryBtn}>
          Update payment method
        </Link>
        <Link href={supportHref} className={`${linkSubtle} block text-center pt-0.5`}>
          Contact support
        </Link>
      </div>
    );
  }

  return null;
}
