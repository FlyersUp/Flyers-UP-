'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { CustomerRemainingPaymentUiInput } from '@/lib/bookings/customer-remaining-payment-ui';
import {
  customerRemainingUiToMoneyStateBooking,
  getMoneyState,
  moneyStripeSnapshotFromCustomerFinalIntent,
  type MoneyState,
} from '@/lib/bookings/money-state';
import { getMoneyPresentation } from '@/lib/bookings/money-presentation';
import { bookingFinalCheckoutPath } from '@/lib/bookings/booking-routes';
import { DEFAULT_BOOKING_TIMEZONE, formatBookingDateTimeInZone } from '@/lib/datetime';
import { paymentTimelineFromMoneyState } from '@/lib/bookings/payment-timeline';
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

function TimelineMoneyBlock({ money, compact }: { money: MoneyState; compact: boolean }) {
  const timeline = paymentTimelineFromMoneyState(money);
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

function cardWrapClass(money: MoneyState): string {
  if (money.final === 'before_completion') return cardMuted;
  if (money.final === 'final_paid') {
    return 'rounded-2xl border border-emerald-200/70 dark:border-emerald-800/45 bg-emerald-50/70 dark:bg-emerald-950/25 text-sm';
  }
  if (money.final === 'final_failed' || money.final === 'final_requires_action') {
    return 'rounded-2xl border border-amber-200/90 dark:border-amber-800/55 bg-amber-50/90 dark:bg-amber-950/30 text-sm';
  }
  return cardShell;
}

export type BookingPaymentStatusCardProps = {
  bookingId: string;
  paymentInput: CustomerRemainingPaymentUiInput;
  bookingTimezone?: string | null;
  variant?: 'default' | 'compact';
  className?: string;
  /** When false, skip `console.info` for money state (e.g. tests). */
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
  const money = useMemo(() => {
    const booking = customerRemainingUiToMoneyStateBooking(paymentInput);
    const stripe = moneyStripeSnapshotFromCustomerFinalIntent(paymentInput);
    return getMoneyState(booking, stripe, Date.now());
  }, [paymentInput]);

  const pres = useMemo(() => getMoneyPresentation(money, 'customer'), [money]);

  useEffect(() => {
    if (!logNormalization || (money.final === 'none' && !money.customerCardVariant)) return;
    console.info('[FlyersUp][customer-payment-card]', {
      bookingId,
      paymentLifecycleStatus: paymentInput.paymentLifecycleStatus ?? null,
      finalPaymentIntentId: paymentInput.finalPaymentIntentId ?? null,
      finalPaymentIntentStripeLiveChecked: paymentInput.finalPaymentIntentStripeLiveChecked === true,
      finalPaymentIntentStripeStatus: paymentInput.finalPaymentIntentStripeStatus ?? null,
      finalPaymentIntentStatus: paymentInput.finalPaymentIntentStatus ?? null,
      final: money.final,
      payout: money.payout,
      customerCardVariant: money.customerCardVariant ?? null,
      rawKind: money.raw.kind,
    });
  }, [
    bookingId,
    logNormalization,
    money.final,
    money.payout,
    money.customerCardVariant,
    money.raw.kind,
    paymentInput.paymentLifecycleStatus,
    paymentInput.finalPaymentIntentId,
    paymentInput.finalPaymentIntentStripeLiveChecked,
    paymentInput.finalPaymentIntentStripeStatus,
    paymentInput.finalPaymentIntentStatus,
  ]);

  if (money.final === 'none' && !money.customerCardVariant) return null;
  if (money.payout === 'payout_held') return null;

  const checkoutHref = bookingFinalCheckoutPath(bookingId);
  const methodsBase = '/customer/settings/payments/methods';
  const methodsHref =
    money.final === 'final_failed' || money.final === 'final_requires_action'
      ? `${methodsBase}?add=1`
      : methodsBase;
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

  const countdownIso = money.reviewDeadlineIso;
  const remaining = money.remainingCents;
  const base = cardWrapClass(money);

  const titleCls =
    money.final === 'final_paid'
      ? `${titleClass} text-emerald-950 dark:text-emerald-100`
      : money.final === 'final_failed' || money.final === 'final_requires_action'
        ? `${titleClass} text-amber-950 dark:text-amber-50`
        : titleClass;

  const bodyCls =
    money.final === 'final_paid'
      ? `${bodyClass} text-emerald-900/85 dark:text-emerald-100/80`
      : money.final === 'final_failed' || money.final === 'final_requires_action'
        ? `${bodyClass} text-amber-950/90 dark:text-amber-100/85`
        : bodyClass;

  return (
    <div className={`${base} ${wrap} space-y-3`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={pres.badgeTone}>{pres.badge}</Badge>
      </div>
      <div>
        <p className={titleCls}>{pres.title}</p>
        {money.final === 'final_paid' && finalCollectedIso ? (
          <p className={`text-xs mt-2 text-emerald-900/80 dark:text-emerald-100/75`}>
            Final payment collected on{' '}
            {formatBookingDateTimeInZone(finalCollectedIso, tz) || new Date(finalCollectedIso).toLocaleString()}
          </p>
        ) : (
          <p className={bodyCls}>{pres.subtitle}</p>
        )}
        {money.final === 'before_completion' && remaining > 0 ? (
          <p className={`${bodyClass} mt-1`}>Estimated remaining: {formatCents(remaining)}</p>
        ) : null}
        {(money.final === 'final_due' ||
          money.customerCardVariant === 'legacy_pending_manual' ||
          money.customerCardVariant === 'unknown_balance') &&
        remaining > 0 ? (
          <p className={`${bodyClass} mt-1 font-medium text-[#111111] dark:text-[#F5F7FA]`}>
            {money.customerCardVariant === 'unknown_balance' ? 'Possible balance: ' : 'Amount due: '}
            {formatCents(remaining)}
          </p>
        ) : null}
      </div>

      {(money.final === 'final_review_window' || money.final === 'final_due') && countdownIso ? (
        <PaymentCountdown deadlineIso={countdownIso} className="pt-0.5" />
      ) : null}

      {money.final === 'final_processing' ? <ProcessingPulse /> : null}

      <TimelineMoneyBlock money={money} compact={compact} />

      {money.final === 'final_due' && !money.customerCardVariant && pres.ctaPrimary ? (
        <>
          <Link href={checkoutHref} className={primaryBtn}>
            {pres.ctaPrimary}
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
        </>
      ) : null}

      {money.customerCardVariant === 'unknown_balance' ? (
        <>
          {remaining > 0 && pres.ctaPrimary ? (
            <Link href={checkoutHref} className={primaryBtn}>
              {pres.ctaPrimary}
            </Link>
          ) : null}
          <Link href={supportHref} className={linkAccent}>
            Contact support
          </Link>
        </>
      ) : null}

      {money.customerCardVariant === 'legacy_pending_manual' && pres.ctaPrimary ? (
        <>
          <Link href={checkoutHref} className={primaryBtn}>
            {pres.ctaPrimary}
          </Link>
          <Link href={supportHref} className={linkAccent}>
            Contact support
          </Link>
        </>
      ) : null}

      {money.final === 'final_review_window' ? (
        <>
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
          {pres.ctaPrimary ? (
            <Link href={checkoutHref} className={payNowSecondary}>
              {pres.ctaPrimary}
            </Link>
          ) : null}
        </>
      ) : null}

      {money.final === 'final_processing' ? (
        <Link href={supportHref} className={linkAccent}>
          Contact support
        </Link>
      ) : null}

      {money.final === 'final_paid' ? (
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
      ) : null}

      {(money.final === 'final_failed' || money.final === 'final_requires_action') && pres.ctaPrimary ? (
        <>
          <Link href={checkoutHref} className={primaryBtn}>
            {pres.ctaPrimary}
          </Link>
          <Link href={methodsHref} className={secondaryBtn}>
            Add or replace card
          </Link>
          <Link href={supportHref} className={`${linkAccent} block text-center pt-0.5`}>
            Contact support
          </Link>
        </>
      ) : null}
    </div>
  );
}
