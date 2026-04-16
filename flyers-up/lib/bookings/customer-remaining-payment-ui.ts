/**
 * Customer-facing remaining-balance UI state (deposit paid, final not settled).
 * Driven by bookings.payment_lifecycle_status, final_payment_status, deadlines, workflow status.
 *
 * ---------------------------------------------------------------------------
 * Convention — customer money UI (`BookingPaymentStatusCard`, callouts, etc.)
 * ---------------------------------------------------------------------------
 * Do not hand-shape `CustomerRemainingPaymentUiInput` at call sites (no ad-hoc
 * object literals mapping booking fields) unless there is a **documented
 * exception** in PR review (e.g. an isolated test fixture, or a new approved
 * mapper added next to {@link customerRemainingPaymentUiInputFromBookingSlice}).
 * Use {@link customerRemainingPaymentUiInputFromBookingSlice} from booking/API
 * slices so new booking columns propagate consistently to countdown, timeline,
 * and refund or payout presentation.
 * ---------------------------------------------------------------------------
 */

/**
 * Normalized input for customer remaining-balance components.
 * @see customerRemainingPaymentUiInputFromBookingSlice — preferred construction path
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
  /** Alias of {@link finalPaymentIntentStripeStatus} for API payloads that use this name. */
  finalPaymentIntentStatus?: string | null;
  /** True only after server ran a Stripe retrieve for this booking payload (final_processing + PI id). */
  finalPaymentIntentStripeLiveChecked?: boolean;
  /** Drive payout phase on customer track (same as pro money input). */
  payoutReleased?: boolean | null;
  requiresAdminReview?: boolean | null;
  payoutTransferId?: string | null;
  /** For refund vs paid inference on Track (see {@link getMoneyState}). */
  refundedTotalCents?: number | null;
  amountPaidCents?: number | null;
  /** bookings.refund_after_payout */
  refundAfterPayout?: boolean | null;
};

/**
 * CamelCase booking slice accepted by {@link customerRemainingPaymentUiInputFromBookingSlice}.
 * Extend this type (and the mapper) when the API gains fields that affect money UI.
 */
export type CustomerRemainingPaymentUiBookingSlice = {
  status: string;
  paymentStatus?: string | null;
  finalPaymentStatus?: string | null;
  paymentLifecycleStatus?: string | null;
  paidDepositAt?: string | null;
  paidAt?: string | null;
  paidRemainingAt?: string | null;
  fullyPaidAt?: string | null;
  completedAt?: string | null;
  /** When only nested completion exists (e.g. job-complete page). */
  completion?: { completedAt?: string } | null;
  remainingDueAt?: string | null;
  customerReviewDeadlineAt?: string | null;
  amountRemaining?: number | null;
  finalPaymentIntentId?: string | null;
  finalPaymentIntentStripeStatus?: string | null;
  finalPaymentIntentStatus?: string | null;
  finalPaymentIntentStripeLiveChecked?: boolean;
  payoutReleased?: boolean | null;
  requiresAdminReview?: boolean | null;
  payoutTransferId?: string | null;
  refundedTotalCents?: number | null;
  amountPaidCents?: number | null;
  refundAfterPayout?: boolean | null;
};

/**
 * Single mapper for customer remaining-payment semantics. Prefer this over
 * inline `CustomerRemainingPaymentUiInput` literals everywhere except tests
 * or explicitly documented exceptions.
 */
export function customerRemainingPaymentUiInputFromBookingSlice(
  b: CustomerRemainingPaymentUiBookingSlice
): CustomerRemainingPaymentUiInput {
  return {
    status: b.status,
    paymentStatus: b.paymentStatus ?? null,
    finalPaymentStatus: b.finalPaymentStatus ?? null,
    paymentLifecycleStatus: b.paymentLifecycleStatus ?? null,
    paidDepositAt: b.paidDepositAt ?? null,
    paidAt: b.paidAt ?? null,
    paidRemainingAt: b.paidRemainingAt ?? null,
    fullyPaidAt: b.fullyPaidAt ?? null,
    completedAt: b.completedAt ?? b.completion?.completedAt ?? null,
    remainingDueAt: b.remainingDueAt ?? null,
    customerReviewDeadlineAt: b.customerReviewDeadlineAt ?? null,
    amountRemaining: b.amountRemaining ?? null,
    finalPaymentIntentId: b.finalPaymentIntentId ?? null,
    finalPaymentIntentStatus: b.finalPaymentIntentStatus ?? null,
    finalPaymentIntentStripeStatus:
      b.finalPaymentIntentStripeStatus ?? b.finalPaymentIntentStatus ?? null,
    finalPaymentIntentStripeLiveChecked: b.finalPaymentIntentStripeLiveChecked === true,
    payoutReleased: b.payoutReleased ?? null,
    requiresAdminReview: b.requiresAdminReview ?? null,
    payoutTransferId: b.payoutTransferId ?? null,
    refundedTotalCents: b.refundedTotalCents ?? null,
    amountPaidCents: b.amountPaidCents ?? null,
    refundAfterPayout: b.refundAfterPayout ?? null,
  };
}

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
  /** Post-remainder workflow (replaces legacy `fully_paid` where allowed). */
  'paid',
  'fully_paid',
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

  if (lc === 'final_paid' || lc === 'payout_ready' || lc === 'payout_sent' || lc === 'payout_on_hold') {
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
