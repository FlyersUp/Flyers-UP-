/**
 * Customer-facing remaining-balance UI state (deposit paid, final not settled).
 * Driven by bookings.payment_lifecycle_status, final_payment_status, deadlines, workflow status.
 */

export type CustomerRemainingPaymentUiInput = {
  status: string;
  paymentStatus?: string | null;
  finalPaymentStatus?: string | null;
  /** bookings.payment_lifecycle_status */
  paymentLifecycleStatus?: string | null;
  paidDepositAt?: string | null;
  paidAt?: string | null;
  paidRemainingAt?: string | null;
  fullyPaidAt?: string | null;
  completedAt?: string | null;
  remainingDueAt?: string | null;
  /** bookings.customer_review_deadline_at — aligns with auto-charge cron */
  customerReviewDeadlineAt?: string | null;
  amountRemaining?: number | null;
  /**
   * bookings.final_payment_intent_id (or legacy remaining PI column). When provided and empty while
   * lifecycle is final_processing, UI must not claim an in-flight Stripe charge.
   */
  finalPaymentIntentId?: string | null;
  /** Live Stripe PaymentIntent.status from server when final_processing + PI id (see verify-final-payment-intent-status). */
  finalPaymentIntentStripeStatus?: string | null;
  /** True only after server ran a Stripe retrieve for this booking payload (final_processing + PI id). */
  finalPaymentIntentStripeLiveChecked?: boolean;
};

export type CustomerRemainingPaymentUiState =
  | { kind: 'none' }
  | { kind: 'before_completion'; remainingCents: number }
  | { kind: 'review_window_auto'; remainingCents: number; deadlineMs: number }
  | { kind: 'post_review_auto_pending'; remainingCents: number }
  | { kind: 'processing'; remainingCents: number }
  | { kind: 'success' }
  | { kind: 'failed'; remainingCents: number }
  | { kind: 'requires_action'; remainingCents: number };

const POST_COMPLETION_STATUSES = new Set([
  'awaiting_remaining_payment',
  'awaiting_customer_confirmation',
  'completed_pending_payment',
  'awaiting_payment',
]);

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

function moneyFullySettled(
  input: CustomerRemainingPaymentUiInput,
  remainingCents: number
): boolean {
  if (remainingCents <= 0) return true;
  if (String(input.finalPaymentStatus ?? '').toUpperCase() === 'PAID') return true;
  if (input.paidRemainingAt || input.fullyPaidAt) return true;
  return false;
}

/**
 * @param nowMs — inject for tests; defaults to Date.now() in wrapper
 */
export function deriveCustomerRemainingPaymentUiState(
  input: CustomerRemainingPaymentUiInput,
  nowMs: number
): CustomerRemainingPaymentUiState {
  if (!depositPaid(input)) return { kind: 'none' };

  const remainingCents = Math.max(0, Math.round(Number(input.amountRemaining ?? 0)));

  const lcRaw = String(input.paymentLifecycleStatus ?? '').trim();
  const lc = lcRaw.toLowerCase();

  if (['fully_paid', 'paid'].includes(input.status) && remainingCents <= 0) {
    return { kind: 'success' };
  }

  if (moneyFullySettled(input, remainingCents)) return { kind: 'success' };

  if (lc === 'final_paid' || lc === 'payout_ready' || lc === 'payout_sent') {
    return { kind: 'success' };
  }

  const finalFailed = String(input.finalPaymentStatus ?? '').toUpperCase() === 'FAILED';
  if (finalFailed || lc === 'payment_failed') {
    return { kind: 'failed', remainingCents };
  }

  if (lc === 'final_processing') {
    return { kind: 'processing', remainingCents };
  }

  if (lc === 'requires_customer_action') {
    return { kind: 'requires_action', remainingCents };
  }

  if (!jobMarkedComplete(input)) {
    return { kind: 'before_completion', remainingCents };
  }

  const deadlineIso = input.customerReviewDeadlineAt || input.remainingDueAt || null;
  const deadlineMs = deadlineIso ? new Date(deadlineIso).getTime() : NaN;

  if (Number.isFinite(deadlineMs)) {
    if (nowMs < deadlineMs) {
      return { kind: 'review_window_auto', remainingCents, deadlineMs };
    }
    return { kind: 'post_review_auto_pending', remainingCents };
  }

  return { kind: 'post_review_auto_pending', remainingCents };
}

export function deriveCustomerRemainingPaymentUiStateNow(
  input: CustomerRemainingPaymentUiInput
): CustomerRemainingPaymentUiState {
  return deriveCustomerRemainingPaymentUiState(input, Date.now());
}
