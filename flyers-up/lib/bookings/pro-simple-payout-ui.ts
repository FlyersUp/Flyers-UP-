/**
 * Pro-facing “when do I get paid?” UI — six states only, no raw lifecycle strings in copy.
 * Backend fields map here; see {@link buildSimplePayoutStateInputFromProBooking}.
 */

import type { BookingDetails } from '@/lib/api';
import type { MoneyState } from '@/lib/bookings/money-state';
import type { ProPayoutStripeSnapshot } from '@/lib/bookings/pro-payout-display';

export type ProSimplePayoutUiState = 'not_ready' | 'ready' | 'processing' | 'paid' | 'held' | 'failed';

/** True payout holds (dispute / refund / admin / fraud) — not “job not done” or “final not paid”. */
export type ProPayoutHoldUiKey =
  | 'open_dispute'
  | 'refund_pending'
  | 'admin_hold'
  | 'fraud_hold'
  | 'generic';

/** Why payout has not started yet — distinct from {@link ProPayoutHoldUiKey} (“on hold”). */
export type ProPayoutNotReadyReason =
  | 'final_payment_pending'
  | 'booking_not_completed'
  | 'pro_not_ready_for_payout'
  | 'generic';

export type SimplePayoutStateInput = {
  finalPaid: boolean;
  bookingCompleted: boolean;
  /** True when a Connect transfer id exists (booking row or server-confirmed presence). */
  transferIdPresent: boolean;
  transferStatus?: string | null;
  payoutReleased: boolean;
  payoutBlocked: boolean;
  holdReasonRaw?: string | null;
  hasDispute: boolean;
  refundPending: boolean;
  failed: boolean;
  /** True when {@link MoneyState} already resolved payout to `payout_held` (e.g. admin review queue). */
  moneyPayoutHeld: boolean;
};

const POST_COMPLETION_STATUSES = new Set([
  'awaiting_remaining_payment',
  'awaiting_customer_confirmation',
  'completed_pending_payment',
  'awaiting_payment',
  'paid',
  'fully_paid',
]);

export function isProBookingCompleted(booking: Pick<BookingDetails, 'status' | 'completedAt'>): boolean {
  if (booking.completedAt && String(booking.completedAt).trim()) return true;
  return POST_COMPLETION_STATUSES.has(String(booking.status ?? ''));
}

export function isProFinalPaid(
  booking: Pick<
    BookingDetails,
    | 'paidRemainingAt'
    | 'fullyPaidAt'
    | 'finalPaymentStatus'
    | 'paymentLifecycleStatus'
    | 'amountRemaining'
  >,
  moneyState: Pick<MoneyState, 'final'>
): boolean {
  if (moneyState.final === 'final_paid') return true;
  if (booking.paidRemainingAt || booking.fullyPaidAt) return true;
  if (String(booking.finalPaymentStatus ?? '').toUpperCase() === 'PAID') return true;
  const lc = String(booking.paymentLifecycleStatus ?? '').toLowerCase();
  if (['final_paid', 'payout_ready', 'payout_sent', 'payout_on_hold'].includes(lc)) return true;
  const remaining = Math.round(Number(booking.amountRemaining ?? 0) || 0);
  if (remaining <= 0 && (booking.paidRemainingAt || booking.fullyPaidAt)) return true;
  return false;
}

function meaningfulHoldReason(raw: string | null | undefined): boolean {
  const t = String(raw ?? '').trim().toLowerCase();
  return t.length > 0 && t !== 'none';
}

/** Maps payout_hold_reason-style strings that mean “not ready yet”, not a true hold. */
export function payoutNotReadyReasonFromHoldRaw(raw: string | null | undefined): ProPayoutNotReadyReason | null {
  if (!meaningfulHoldReason(raw)) return null;
  const s = String(raw).trim().toLowerCase();
  switch (s) {
    /** Legacy ops flag on `payout_hold_reason` — Version B does not treat as a funds hold. */
    case 'admin_review_required':
      return 'generic';
    case 'booking_not_completed':
    case 'insufficient_completion_evidence':
    case 'waiting_post_completion_review':
      return 'booking_not_completed';
    case 'missing_final_payment':
      return 'final_payment_pending';
    case 'missing_payment_method':
    case 'requires_customer_action':
    case 'charge_failed':
      return 'pro_not_ready_for_payout';
    default:
      return null;
  }
}

/** Maps DB strings to true hold copy keys only (dispute / refund / admin / fraud). */
export function trueHoldUiKeyFromRaw(raw: string | null | undefined): ProPayoutHoldUiKey | null {
  if (!meaningfulHoldReason(raw)) return null;
  const s = String(raw).trim().toLowerCase();
  switch (s) {
    case 'dispute_open':
      return 'open_dispute';
    case 'refund_pending':
      return 'refund_pending';
    case 'admin_hold':
    case 'payout_blocked':
      return 'admin_hold';
    case 'fraud_review':
    case 'no_show_review':
      return 'fraud_hold';
    default:
      return null;
  }
}

/**
 * @deprecated Prefer {@link trueHoldUiKeyFromRaw} + {@link payoutNotReadyReasonFromHoldRaw} via {@link deriveSimplePayoutState}.
 */
export function normalizeHoldReasonKey(raw: string | null | undefined): ProPayoutHoldUiKey | null {
  return trueHoldUiKeyFromRaw(raw);
}

export type DeriveSimplePayoutStateResult = {
  state: ProSimplePayoutUiState;
  /** Meaningful only when `state === 'held'`. */
  holdUiKey: ProPayoutHoldUiKey | null;
  /** Meaningful only when `state === 'not_ready'`. */
  notReadyReason: ProPayoutNotReadyReason | null;
};

/**
 * Single branching order: failed → not-ready (job / final / setup / evidence) → true held →
 * paid → processing → ready. “Hold” copy is only for dispute / refund / admin / fraud.
 */
export function deriveSimplePayoutState(input: SimplePayoutStateInput): DeriveSimplePayoutStateResult {
  const empty = { holdUiKey: null as ProPayoutHoldUiKey | null, notReadyReason: null as ProPayoutNotReadyReason | null };

  if (input.failed) {
    return { state: 'failed', ...empty };
  }

  if (!input.bookingCompleted) {
    return { state: 'not_ready', holdUiKey: null, notReadyReason: 'booking_not_completed' };
  }

  if (!input.finalPaid) {
    return { state: 'not_ready', holdUiKey: null, notReadyReason: 'final_payment_pending' };
  }

  const effectiveHoldRaw = input.refundPending ? 'refund_pending' : input.holdReasonRaw;

  if (input.refundPending || String(effectiveHoldRaw ?? '').trim().toLowerCase() === 'refund_pending') {
    return { state: 'held', holdUiKey: 'refund_pending', notReadyReason: null };
  }

  if (input.hasDispute || String(effectiveHoldRaw ?? '').trim().toLowerCase() === 'dispute_open') {
    return { state: 'held', holdUiKey: 'open_dispute', notReadyReason: null };
  }

  const notReadyFromHold = payoutNotReadyReasonFromHoldRaw(effectiveHoldRaw);
  if (notReadyFromHold) {
    return { state: 'not_ready', holdUiKey: null, notReadyReason: notReadyFromHold };
  }

  const trueKey = trueHoldUiKeyFromRaw(effectiveHoldRaw);
  if (trueKey) {
    return { state: 'held', holdUiKey: trueKey, notReadyReason: null };
  }

  const ambiguousBlock = input.payoutBlocked || input.moneyPayoutHeld;
  if (ambiguousBlock) {
    return { state: 'held', holdUiKey: 'admin_hold', notReadyReason: null };
  }

  if (input.payoutReleased) {
    return { state: 'paid', ...empty };
  }

  const ts = String(input.transferStatus ?? '').trim().toLowerCase();
  if (input.transferIdPresent) {
    if (ts === 'paid' || ts === 'succeeded') {
      return { state: 'paid', ...empty };
    }
    return { state: 'processing', ...empty };
  }

  return { state: 'ready', ...empty };
}

/** Public copy helper — keys match {@link ProPayoutHoldUiKey}. */
export function mapProPayoutHoldDescription(holdUiKey: ProPayoutHoldUiKey | null | undefined): string {
  switch (holdUiKey) {
    case 'open_dispute':
      return 'On hold due to a customer dispute.';
    case 'refund_pending':
      return 'On hold while a refund is being processed.';
    case 'admin_hold':
      return 'On hold for review.';
    case 'fraud_hold':
      return 'Temporarily on hold for verification.';
    case 'generic':
    default:
      return 'Temporarily on hold.';
  }
}

/** Copy when {@link ProSimplePayoutUiState} is `not_ready` — never “payout on hold”. */
export function mapProPayoutNotReadyDescription(reason: ProPayoutNotReadyReason | null | undefined): string {
  switch (reason) {
    case 'final_payment_pending':
      return 'You’ll be paid once the customer completes the remaining balance.';
    case 'booking_not_completed':
      return 'Payout starts after the job is fully marked complete in the app (arrival, start, and completion).';
    case 'pro_not_ready_for_payout':
      return 'Finish your payout setup (for example Stripe Connect) so we can send your earnings.';
    case 'generic':
      return 'A quick internal review or automated check is still clearing — you have not been put on a dispute-style hold. If nothing moves after a day, contact support.';
    default:
      return 'Your payout will start automatically once a few booking checks are satisfied.';
  }
}

export function buildSimplePayoutStateInputFromProBooking(
  booking: BookingDetails,
  moneyState: MoneyState,
  stripe: ProPayoutStripeSnapshot
): SimplePayoutStateInput {
  const jobComplete = isProBookingCompleted(booking);
  const finalPaid = isProFinalPaid(booking, moneyState);

  const transferIdPresent =
    String(booking.payoutTransferId ?? '').trim().length > 0 || stripe.payoutTransferIdPresent === true;

  const ts =
    stripe.payoutTransferStripeLiveChecked === true ? (stripe.payoutTransferStripeStatus ?? null) : null;

  const failed =
    moneyState.payout === 'payout_failed' || String(booking.payoutStatus ?? '').toLowerCase() === 'failed';

  const holdRaw = booking.payoutHoldReason ?? null;
  const hasDispute = String(holdRaw ?? '').toLowerCase() === 'dispute_open';
  const refundPending = String(booking.refundStatus ?? '').toLowerCase() === 'pending';

  const payoutBlocked =
    String(booking.paymentLifecycleStatus ?? '').toLowerCase() === 'payout_on_hold' || booking.adminHold === true;

  const holdReasonForUi =
    booking.suspiciousCompletion === true && !meaningfulHoldReason(holdRaw ?? undefined)
      ? 'fraud_review'
      : holdRaw;

  return {
    finalPaid,
    bookingCompleted: jobComplete,
    transferIdPresent,
    transferStatus: ts,
    payoutReleased: booking.payoutReleased === true,
    payoutBlocked,
    holdReasonRaw: holdReasonForUi,
    hasDispute,
    refundPending,
    failed,
    moneyPayoutHeld: moneyState.payout === 'payout_held',
  };
}
