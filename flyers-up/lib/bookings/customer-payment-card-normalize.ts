/**
 * Normalizes legacy + new booking payment signals into one customer payment-card UI model.
 * Legacy: post-completion balance due without payment_lifecycle_status / customer_review_deadline_at.
 */

import type { CustomerRemainingPaymentUiInput } from '@/lib/bookings/customer-remaining-payment-ui';
import {
  deriveCustomerRemainingPaymentUiState,
  type CustomerRemainingPaymentUiState,
} from '@/lib/bookings/customer-remaining-payment-ui';

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
 * New 24h flow populates lifecycle status and/or customer_review_deadline_at.
 * Legacy rows often omit both while still owing remaining balance after completion.
 */
export function hasExplicitNewLifecycleColumns(input: CustomerRemainingPaymentUiInput): boolean {
  return (
    String(input.paymentLifecycleStatus ?? '').trim().length > 0 ||
    String(input.customerReviewDeadlineAt ?? '').trim().length > 0
  );
}

/**
 * Map derive + legacy heuristics → single payment card model.
 */
export function normalizeCustomerPaymentCard(
  input: CustomerRemainingPaymentUiInput,
  nowMs: number
): CustomerPaymentCardNormalized {
  const remainingCents = Math.max(0, Math.round(Number(input.amountRemaining ?? 0)));
  const deadlineIso =
    (input.customerReviewDeadlineAt || input.remainingDueAt || '').trim() || null;

  const raw = deriveCustomerRemainingPaymentUiState(input, nowMs);

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

  if (raw.kind === 'success') {
    return {
      kind: 'paid',
      normalizeBranch: 'derive:success',
      remainingCents,
      countdownDeadlineIso: null,
      raw,
    };
  }

  if (raw.kind === 'before_completion') {
    return {
      kind: 'before_completion',
      normalizeBranch: 'derive:before_completion',
      remainingCents,
      countdownDeadlineIso: null,
      raw,
    };
  }

  if (raw.kind === 'review_window_auto') {
    return {
      kind: 'scheduled',
      normalizeBranch: 'derive:review_window_auto',
      remainingCents,
      countdownDeadlineIso: deadlineIso,
      raw,
    };
  }

  if (raw.kind === 'processing') {
    return {
      kind: 'processing',
      normalizeBranch: 'derive:final_processing',
      remainingCents,
      countdownDeadlineIso: null,
      raw,
    };
  }

  if (raw.kind === 'failed') {
    return {
      kind: 'action_required',
      normalizeBranch: 'derive:failed',
      remainingCents,
      countdownDeadlineIso: null,
      raw,
    };
  }

  if (raw.kind === 'requires_action') {
    return {
      kind: 'action_required',
      normalizeBranch: 'derive:requires_action',
      remainingCents,
      countdownDeadlineIso: null,
      raw,
    };
  }

  if (raw.kind === 'post_review_auto_pending') {
    if (hasExplicitNewLifecycleColumns(input)) {
      return {
        kind: 'processing',
        normalizeBranch: 'derive:post_review_with_lifecycle_columns',
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
