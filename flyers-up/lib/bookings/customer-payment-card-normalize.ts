/**
 * Normalizes legacy + new booking payment signals into one customer payment-card UI model.
 * Legacy: post-completion balance due without payment_lifecycle_status / customer_review_deadline_at.
 *
 * Core lifecycle resolution is delegated to {@link getMoneyState}.
 */

import type { CustomerRemainingPaymentUiInput } from '@/lib/bookings/customer-remaining-payment-ui';
import type { CustomerRemainingPaymentUiState } from '@/lib/bookings/customer-remaining-payment-ui';
import { isStripeFinalPaymentIntentInFlightStatus } from '@/lib/bookings/final-payment-intent-stripe-gate';
import {
  customerRemainingUiToMoneyStateBooking,
  getMoneyState,
  moneyStripeSnapshotFromCustomerFinalIntent,
  type MoneyState,
} from '@/lib/bookings/money-state';

const POST_COMPLETION_STATUSES = new Set([
  'awaiting_remaining_payment',
  'awaiting_customer_confirmation',
  'completed_pending_payment',
  'awaiting_payment',
]);

export type CustomerPaymentCardKind =
  | 'none'
  | 'before_completion'
  | 'scheduled'
  /** Review window ended; balance still due — not the same as an active Stripe off-session charge. */
  | 'post_review_due'
  | 'processing'
  | 'action_required'
  | 'pending_manual'
  | 'paid'
  | 'unknown';

export type CustomerPaymentCardNormalized = {
  kind: CustomerPaymentCardKind;
  /** Identifies which normalization branch ran (log / support). */
  normalizeBranch: string;
  remainingCents: number;
  /** ISO timestamp for countdown (scheduled only). */
  countdownDeadlineIso: string | null;
  /** Raw derive output for debugging. */
  raw: CustomerRemainingPaymentUiState;
};

function depositPaid(input: CustomerRemainingPaymentUiInput): boolean {
  return (
    !!(input.paidDepositAt || input.paidAt) ||
    String(input.paymentStatus ?? '').toUpperCase() === 'PAID'
  );
}

function jobMarkedComplete(input: CustomerRemainingPaymentUiInput): boolean {
  if (input.completedAt) return true;
  return POST_COMPLETION_STATUSES.has(input.status);
}

function moneyFullySettled(input: CustomerRemainingPaymentUiInput, remainingCents: number): boolean {
  if (remainingCents <= 0) return true;
  if (String(input.finalPaymentStatus ?? '').toUpperCase() === 'PAID') return true;
  if (input.paidRemainingAt || input.fullyPaidAt) return true;
  return false;
}

/**
 * Final payment already succeeded (or lifecycle says post-final). Used to suppress “Processing” when
 * webhook/booking row has moved on but a stale payload still has final_processing.
 */
function isFinalPaymentAlreadySucceeded(
  input: CustomerRemainingPaymentUiInput,
  remainingCents: number
): boolean {
  if (moneyFullySettled(input, remainingCents)) return true;
  const lc = String(input.paymentLifecycleStatus ?? '').trim().toLowerCase();
  if (lc === 'final_paid' || lc === 'payout_ready' || lc === 'payout_sent') return true;
  const st = String(input.status ?? '').trim().toLowerCase();
  if (st === 'fully_paid' || st === 'payout_released') return true;
  return false;
}

/**
 * New 24h flow populates lifecycle status and/or customer_review_deadline_at.
 * Legacy rows often omit both while still owing remaining balance after completion.
 */
export function hasExplicitNewLifecycleColumns(input: CustomerRemainingPaymentUiInput): boolean {
  return (
    String(input.paymentLifecycleStatus ?? '').trim().length > 0 ||
    String(input.customerReviewDeadlineAt ?? '').trim().length > 0
  );
}

function resolvePaidNormalizeBranch(
  money: MoneyState,
  input: CustomerRemainingPaymentUiInput,
  remainingCents: number
): string {
  if (money.raw.kind === 'success') return 'derive:success';
  if (money.raw.kind === 'processing') {
    if (isFinalPaymentAlreadySucceeded(input, remainingCents)) return 'guard:processing_suppressed_already_paid';
    return 'guard:stripe_pi_succeeded';
  }
  return 'derive:success';
}

/**
 * Map derive + legacy heuristics → single payment card model.
 */
export function normalizeCustomerPaymentCard(
  input: CustomerRemainingPaymentUiInput,
  nowMs: number
): CustomerPaymentCardNormalized {
  const stripe = moneyStripeSnapshotFromCustomerFinalIntent(input);
  const booking = customerRemainingUiToMoneyStateBooking(input);
  const money = getMoneyState(booking, stripe, nowMs);
  const { raw } = money;
  const remainingCents = money.remainingCents;
  const deadlineIso =
    money.reviewDeadlineIso ||
    (input.customerReviewDeadlineAt || input.remainingDueAt || '').trim() ||
    null;

  if (
    raw.kind === 'none' &&
    depositPaid(input) &&
    jobMarkedComplete(input) &&
    remainingCents > 0 &&
    !moneyFullySettled(input, remainingCents)
  ) {
    return {
      kind: 'unknown',
      normalizeBranch: 'guard:none_with_balance_post_complete',
      remainingCents,
      countdownDeadlineIso: deadlineIso || null,
      raw,
    };
  }

  if (raw.kind === 'none') {
    return {
      kind: 'none',
      normalizeBranch: 'derive:none',
      remainingCents,
      countdownDeadlineIso: null,
      raw,
    };
  }

  if (money.final === 'final_processing') {
    return {
      kind: 'processing',
      normalizeBranch: 'derive:final_processing_stripe_confirmed',
      remainingCents,
      countdownDeadlineIso: null,
      raw,
    };
  }

  if (money.final === 'final_paid') {
    return {
      kind: 'paid',
      normalizeBranch: resolvePaidNormalizeBranch(money, input, remainingCents),
      remainingCents,
      countdownDeadlineIso: null,
      raw,
    };
  }

  if (money.final === 'final_failed') {
    return {
      kind: 'action_required',
      normalizeBranch: 'derive:failed',
      remainingCents,
      countdownDeadlineIso: null,
      raw,
    };
  }

  if (money.final === 'final_requires_action') {
    return {
      kind: 'action_required',
      normalizeBranch: 'derive:requires_action',
      remainingCents,
      countdownDeadlineIso: null,
      raw,
    };
  }

  if (money.final === 'before_completion') {
    return {
      kind: 'before_completion',
      normalizeBranch: 'derive:before_completion',
      remainingCents,
      countdownDeadlineIso: null,
      raw,
    };
  }

  if (money.final === 'final_review_window') {
    return {
      kind: 'scheduled',
      normalizeBranch: 'derive:review_window_auto',
      remainingCents,
      countdownDeadlineIso: deadlineIso,
      raw,
    };
  }

  if (money.final === 'final_due') {
    if (raw.kind === 'processing') {
      const pi = String(input.finalPaymentIntentId ?? '').trim();
      if (!pi) {
        return {
          kind: 'post_review_due',
          normalizeBranch: 'guard:final_processing_without_payment_intent',
          remainingCents,
          countdownDeadlineIso: deadlineIso || null,
          raw,
        };
      }
      if (input.finalPaymentIntentStripeLiveChecked !== true) {
        return {
          kind: 'post_review_due',
          normalizeBranch: 'guard:stripe_live_check_missing',
          remainingCents,
          countdownDeadlineIso: deadlineIso || null,
          raw,
        };
      }
      const stripeStatus = input.finalPaymentIntentStripeStatus ?? null;
      if (!isStripeFinalPaymentIntentInFlightStatus(stripeStatus)) {
        return {
          kind: 'post_review_due',
          normalizeBranch: 'guard:stripe_pi_not_in_flight',
          remainingCents,
          countdownDeadlineIso: deadlineIso || null,
          raw,
        };
      }
      return {
        kind: 'processing',
        normalizeBranch: 'derive:final_processing_stripe_confirmed',
        remainingCents,
        countdownDeadlineIso: null,
        raw,
      };
    }

    if (hasExplicitNewLifecycleColumns(input)) {
      return {
        kind: 'post_review_due',
        normalizeBranch: 'derive:post_review_balance_due',
        remainingCents,
        countdownDeadlineIso: null,
        raw,
      };
    }
    return {
      kind: 'pending_manual',
      normalizeBranch: 'legacy:post_review_no_lifecycle_columns',
      remainingCents,
      countdownDeadlineIso: null,
      raw,
    };
  }

  return {
    kind: 'unknown',
    normalizeBranch: 'fallback:unhandled_raw_kind',
    remainingCents,
    countdownDeadlineIso: deadlineIso || null,
    raw,
  };
}

export function normalizeCustomerPaymentCardNow(
  input: CustomerRemainingPaymentUiInput
): CustomerPaymentCardNormalized {
  return normalizeCustomerPaymentCard(input, Date.now());
}
