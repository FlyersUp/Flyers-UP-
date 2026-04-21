/**
 * ## Field roles after successful final (remaining) payment
 *
 * **Customer confirmation UX** (job outcome / release-of-funds trust), not money settlement:
 * - `bookings.customer_confirmed` — explicit customer tap to confirm completion.
 * - `bookings.confirmed_by_customer_at` — when they confirmed (if used in your schema).
 * - `bookings.auto_confirm_at` + `bookings.completed_at` — auto-confirm deadline vs when the job was marked complete.
 * - `bookings.customer_review_deadline_at` — final auto-charge / review window for off-session final.
 * - `bookings.status` (workflow): e.g. `awaiting_customer_confirmation` means “money is settled; please confirm
 *   the job outcome” on the **standard** path after `awaiting_remaining_payment`. It must **not** be used as the
 *   source of truth for whether the **remainder** was charged — use payment fields below.
 *
 * **Payment / money truth** (what Stripe + ledger say about funds):
 * - `bookings.payment_lifecycle_status` — canonical marketplace pipeline (`payout_ready`, `payout_on_hold`, …).
 * - `bookings.final_payment_status` — legacy/explicit remainder column (`PAID` / …).
 * - `bookings.paid_remaining_at`, `bookings.fully_paid_at`, `bookings.amount_paid_cents`
 * - `bookings.final_payment_intent_id` / `stripe_payment_intent_remaining_id`
 * - `bookings.payment_status` (deposit) remains distinct on the deposit PI.
 *
 * **Payout / Connect truth** (platform → pro transfer):
 * - `bookings.payment_lifecycle_status` again: `payout_ready` vs `payout_on_hold` vs `payout_sent`.
 * - `bookings.payout_released`, `bookings.stripe_transfer_id`, `bookings.payout_transfer_id`, `bookings.payout_status`
 * - `booking_payouts` row
 *
 * Cron and payout eligibility prefer **`payment_lifecycle_status`** + payout columns; they do not branch on
 * `bookings.status` for “is remainder paid?”.
 */

import type { PayoutHoldReason } from '@/lib/bookings/payment-lifecycle-types';

/**
 * Workflow `bookings.status` immediately after remainder PI succeeds.
 * - Standard completion flow: was `awaiting_remaining_payment` → customer still owes confirmation →
 *   `awaiting_customer_confirmation`.
 * - All other prior statuses: converge on `paid` (money-complete workflow label; avoids legacy `fully_paid`
 *   which may not exist on newer DB constraints).
 */
export function getBookingWorkflowStatusAfterFinalPayment(prevWorkflowStatus: string): string {
  return prevWorkflowStatus === 'awaiting_remaining_payment'
    ? 'awaiting_customer_confirmation'
    : 'paid';
}

export type PayoutLifecyclePatch = {
  payment_lifecycle_status: 'payout_ready' | 'payout_on_hold';
  payout_blocked: boolean;
  payout_hold_reason: PayoutHoldReason;
};

/**
 * Maps post-final payout snapshot / eligibility to the lifecycle write after remainder succeeds.
 * Keeps `payout_ready` when the only blockers are **time-based cooling** or **admin review flags**
 * so Option A cron continues to scan the booking while transfer stays gated in
 * {@link evaluatePayoutTransferEligibility}.
 */
export function resolvePayoutLifecyclePatchAfterFinalPayment(ev: {
  eligible: boolean;
  holdReason: PayoutHoldReason;
  missingRequirements?: string[];
}): PayoutLifecyclePatch {
  if (ev.eligible) {
    return {
      payment_lifecycle_status: 'payout_ready',
      payout_blocked: false,
      payout_hold_reason: 'none',
    };
  }
  const coolingOnly =
    ev.holdReason === 'booking_not_completed' &&
    Boolean(ev.missingRequirements?.includes('payout_completion_cooling_period'));
  if (coolingOnly) {
    return {
      payment_lifecycle_status: 'payout_ready',
      payout_blocked: false,
      payout_hold_reason: 'none',
    };
  }
  if (ev.holdReason === 'admin_review_required') {
    return {
      payment_lifecycle_status: 'payout_ready',
      payout_blocked: false,
      payout_hold_reason: 'none',
    };
  }
  return {
    payment_lifecycle_status: 'payout_on_hold',
    payout_blocked: true,
    payout_hold_reason: ev.holdReason,
  };
}
