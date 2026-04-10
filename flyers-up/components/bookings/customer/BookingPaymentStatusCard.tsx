'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import Link from 'next/link';
import type { CustomerRemainingPaymentUiInput } from '@/lib/bookings/customer-remaining-payment-ui';
import {
  normalizeCustomerPaymentCard,
  type CustomerPaymentCardKind,
} from '@/lib/bookings/customer-payment-card-normalize';
import { bookingFinalCheckoutPath } from '@/lib/bookings/booking-routes';
import { DEFAULT_BOOKING_TIMEZONE, formatBookingDateTimeInZone } from '@/lib/datetime';
import { timelineForPaymentCardKind } from '@/lib/bookings/payment-timeline';
import { PaymentCountdown } from '@/components/bookings/customer/PaymentCountdown';
import { PaymentTimeline } from '@/components/bookings/customer/PaymentTimeline';

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

const cardShell =
  'rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#171A20] text-sm shadow-[0_1px_3px_rgba(0,0,0,0.05)]';
const cardMuted = 'rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-[#F9FAFB] dark:bg-white/[0.04] text-sm';
const titleClass = 'font-semibold text-[#111111] dark:text-[#F5F7FA]';
const bodyClass = 'mt-1 text-sm text-[#6A6A6A] dark:text-[#A1A8B3] leading-relaxed';
const primaryBtn =
  'flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 transition-all';
const secondaryBtn =
  'flex h-10 w-full items-center justify-center rounded-full text-sm font-medium border border-black/10 dark:border-white/15 text-[#111111] dark:text-[#F5F7FA] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors';
const payNowSecondary =
  'flex h-10 w-full items-center justify-center rounded-full text-sm font-medium border border-black/10 dark:border-white/15 text-[#111111] dark:text-[#F5F7FA] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors';
const linkAccent =
  'text-sm font-medium text-[#058954] dark:text-[#2dd68a] hover:underline underline-offset-2';

function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'scheduled' | 'processing' | 'paid' | 'action' | 'pending' | 'unknown';
}) {
  const map = {
    scheduled:
      'bg-amber-100/90 text-amber-950 dark:text-amber-100 border-amber-300/60 dark:border-amber-700/50',
    processing:
      'bg-[#058954]/12 text-[#065f3a] dark:text-[#86efac] border-[#058954]/30 dark:border-[#058954]/40',
    paid: 'bg-emerald-500/12 text-emerald-900 dark:text-emerald-100 border-emerald-500/25',
    action: 'bg-amber-500/15 text-amber-950 dark:text-amber-50 border-amber-500/30',
    pending: 'bg-black/[0.04] dark:bg-white/[0.06] text-[#374151] dark:text-[#E5E7EB] border-black/[0.08] dark:border-white/10',
    unknown:
      'bg-amber-50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 border-amber-200/80 dark:border-amber-800/50',
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
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#058954]/40 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#058954]" />
      </span>
      <span className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3]">Working on it…</span>
    </div>
  );
}

function TimelineBlock({
  kind,
  compact,
}: {
  kind: CustomerPaymentCardKind;
  compact: boolean;
}) {
  const timeline = timelineForPaymentCardKind(kind);
  if (!timeline) return null;
  return (
    <div className="pt-1">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6A6A6A] dark:text-[#A1A8B3] mb-2">
        Deposit → Completed → Auto-charge → Paid
      </p>
      <PaymentTimeline {...timeline} compact={compact} />
    </div>
  );
}

export type BookingPaymentStatusCardProps = {
  bookingId: string;
  paymentInput: CustomerRemainingPaymentUiInput;
  bookingTimezone?: string | null;
  variant?: 'default' | 'compact';
  className?: string;
  /** When false, skip `console.info` for normalization branch (e.g. tests). */
  logNormalization?: boolean;
};

export function BookingPaymentStatusCard({
  bookingId,
  paymentInput,
  bookingTimezone = null,
  variant = 'default',
  className = '',
  logNormalization = true,
}: BookingPaymentStatusCardProps) {
  const normalized = normalizeCustomerPaymentCard(paymentInput, Date.now());

  useEffect(() => {
    if (!logNormalization || normalized.kind === 'none') return;
    console.info('[FlyersUp][customer-payment-card]', {
      bookingId,
      kind: normalized.kind,
      normalizeBranch: normalized.normalizeBranch,
      rawKind: normalized.raw.kind,
    });
  }, [bookingId, logNormalization, normalized.kind, normalized.normalizeBranch, normalized.raw.kind]);

  if (normalized.kind === 'none') return null;

  const checkoutHref = bookingFinalCheckoutPath(bookingId);
  const methodsHref = '/customer/settings/payments/methods';
  const issueHref = `/customer/bookings/${bookingId}/issues/new`;
  const supportHref = '/customer/settings/help-support';
  const receiptHref = `/api/customer/bookings/${bookingId}/receipt?format=html`;

  const tz = bookingTimezone?.trim() || DEFAULT_BOOKING_TIMEZONE;

  const pad = variant === 'compact' ? 'p-3.5' : 'p-4';
  const wrap = `${className} ${pad}`.trim();
  const compact = variant === 'compact';

  const finalCollectedIso = (() => {
    const b = paymentInput;
    return (b.paidRemainingAt || b.fullyPaidAt || '').trim() || null;
  })();

  const countdownIso = normalized.countdownDeadlineIso;

  if (normalized.kind === 'before_completion') {
    return (
      <div className={`${cardMuted} ${wrap} space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="pending">Pending</Badge>
        </div>
        <div>
          <p className={titleClass}>Remaining balance pending completion</p>
          <p className={bodyClass}>Your final payment will be scheduled after the service is completed.</p>
          {normalized.remainingCents > 0 ? (
            <p className={`${bodyClass} mt-1`}>Estimated remaining: {formatCents(normalized.remainingCents)}</p>
          ) : null}
        </div>
        <TimelineBlock kind="before_completion" compact={compact} />
      </div>
    );
  }

  if (normalized.kind === 'post_review_due') {
    return (
      <div className={`${cardShell} ${wrap} space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="scheduled">Due</Badge>
        </div>
        <div>
          <p className={titleClass}>Remaining balance due</p>
          <p className={bodyClass}>
            The review window has ended. Pay the remaining balance now, or wait while we attempt to charge your saved
            payment method automatically.
          </p>
          {normalized.remainingCents > 0 ? (
            <p className={`${bodyClass} mt-1 font-medium text-[#111111] dark:text-[#F5F7FA]`}>
              Amount due: {formatCents(normalized.remainingCents)}
            </p>
          ) : null}
        </div>
        <TimelineBlock kind="post_review_due" compact={compact} />
        <Link href={checkoutHref} className={primaryBtn}>
          Pay remaining now
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center pt-1">
          <Link href={issueHref} className={`${linkAccent} text-center sm:text-left`}>
            Report issue
          </Link>
          <span className="hidden sm:inline text-[#D1D5DB] dark:text-white/20" aria-hidden>
            ·
          </span>
          <Link href={supportHref} className={`${linkAccent} text-center sm:text-left`}>
            Contact support
          </Link>
        </div>
      </div>
    );
  }

  if (normalized.kind === 'scheduled') {
    return (
      <div className={`${cardShell} ${wrap} space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="scheduled">Scheduled</Badge>
        </div>
        <div>
          <p className={titleClass}>Remaining payment scheduled</p>
          <p className={bodyClass}>Will auto-charge after the 24-hour review window.</p>
        </div>
        {countdownIso ? <PaymentCountdown deadlineIso={countdownIso} className="pt-0.5" /> : null}
        <TimelineBlock kind="scheduled" compact={compact} />
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center pt-1">
          <Link href={issueHref} className={`${linkAccent} text-center sm:text-left`}>
            Report issue
          </Link>
          <span className="hidden sm:inline text-[#D1D5DB] dark:text-white/20" aria-hidden>
            ·
          </span>
          <Link href={supportHref} className={`${linkAccent} text-center sm:text-left`}>
            Contact support
          </Link>
        </div>
        <Link href={checkoutHref} className={payNowSecondary}>
          Pay now
        </Link>
      </div>
    );
  }

  if (normalized.kind === 'processing') {
    return (
      <div className={`${cardShell} ${wrap} space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="processing">Processing</Badge>
        </div>
        <div>
          <p className={titleClass}>Processing remaining payment</p>
          <p className={bodyClass}>We&apos;re charging your saved payment method now.</p>
          <ProcessingPulse />
        </div>
        <TimelineBlock kind="processing" compact={compact} />
        <Link href={supportHref} className={linkAccent}>
          Contact support
        </Link>
      </div>
    );
  }

  if (normalized.kind === 'paid') {
    const when = finalCollectedIso
      ? formatBookingDateTimeInZone(finalCollectedIso, tz) || new Date(finalCollectedIso).toLocaleString()
      : null;
    return (
      <div
        className={`rounded-2xl border border-emerald-200/70 dark:border-emerald-800/45 bg-emerald-50/70 dark:bg-emerald-950/25 ${wrap} space-y-3`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="paid">Paid</Badge>
        </div>
        <div>
          <p className={`${titleClass} text-emerald-950 dark:text-emerald-100`}>Payment complete</p>
          {when ? (
            <p className={`text-xs mt-2 text-emerald-900/80 dark:text-emerald-100/75`}>
              Final payment collected on {when}
            </p>
          ) : (
            <p className={`${bodyClass} text-emerald-900/85 dark:text-emerald-100/80`}>
              Your final payment has been collected successfully.
            </p>
          )}
        </div>
        <TimelineBlock kind="paid" compact={compact} />
        <p className="pt-1">
          <a
            href={receiptHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-[#058954] dark:text-emerald-200 hover:underline"
          >
            View receipt
          </a>
        </p>
      </div>
    );
  }

  if (normalized.kind === 'action_required') {
    return (
      <div
        className={`rounded-2xl border border-amber-200/90 dark:border-amber-800/55 bg-amber-50/90 dark:bg-amber-950/30 ${wrap} space-y-3`}
        role="alert"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="action">Action needed</Badge>
        </div>
        <div>
          <p className={`${titleClass} text-amber-950 dark:text-amber-50`}>Final payment failed</p>
          <p className={`${bodyClass} text-amber-950/90 dark:text-amber-100/85`}>
            Please retry your remaining payment.
            {normalized.raw.kind === 'requires_action'
              ? ' Your bank may need you to confirm the charge, or your card needs updating.'
              : ''}{' '}
            {normalized.remainingCents > 0 ? `Amount due: ${formatCents(normalized.remainingCents)}.` : ''}
          </p>
        </div>
        <TimelineBlock kind="action_required" compact={compact} />
        <Link href={checkoutHref} className={primaryBtn}>
          Pay remaining now
        </Link>
        <Link href={methodsHref} className={secondaryBtn}>
          Update payment method
        </Link>
        <Link href={supportHref} className={`${linkAccent} block text-center pt-0.5`}>
          Contact support
        </Link>
      </div>
    );
  }

  if (normalized.kind === 'pending_manual') {
    return (
      <div className={`${cardShell} ${wrap} space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="pending">Pending</Badge>
        </div>
        <div>
          <p className={titleClass}>Remaining payment pending</p>
          <p className={bodyClass}>
            This booking was created before the new review-window flow. You can finish payment now.
          </p>
          {normalized.remainingCents > 0 ? (
            <p className={`${bodyClass} mt-1 font-medium text-[#111111] dark:text-[#F5F7FA]`}>
              Amount due: {formatCents(normalized.remainingCents)}
            </p>
          ) : null}
        </div>
        <TimelineBlock kind="pending_manual" compact={compact} />
        <Link href={checkoutHref} className={primaryBtn}>
          Send remaining payment
        </Link>
        <Link href={supportHref} className={linkAccent}>
          Contact support
        </Link>
      </div>
    );
  }

  if (normalized.kind === 'unknown') {
    return (
      <div className={`${cardShell} ${wrap} space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="unknown">Update</Badge>
        </div>
        <div>
          <p className={titleClass}>Payment status</p>
          <p className={bodyClass}>
            We couldn&apos;t confirm the automatic payment schedule for this booking. If you still owe a balance, you
            can pay now or contact support for help.
          </p>
          {normalized.remainingCents > 0 ? (
            <p className={`${bodyClass} mt-1 font-medium text-[#111111] dark:text-[#F5F7FA]`}>
              Possible balance: {formatCents(normalized.remainingCents)}
            </p>
          ) : null}
        </div>
        <TimelineBlock kind="unknown" compact={compact} />
        {normalized.remainingCents > 0 ? (
          <Link href={checkoutHref} className={primaryBtn}>
            Pay remaining now
          </Link>
        ) : null}
        <Link href={supportHref} className={linkAccent}>
          Contact support
        </Link>
      </div>
    );
  }

  return null;
}
