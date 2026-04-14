/**
 * Shared helpers for POST /api/bookings/[bookingId]/pay/final (customer remaining balance).
 */

import type { MoneyFinalPhase, MoneyState, MoneyStateBookingInput } from '@/lib/bookings/money-state';
import type { BookingFinalPaymentIntentIdRow } from '@/lib/bookings/money-state';
import type { UnifiedBookingPaymentAmounts } from '@/lib/bookings/unified-receipt';

export const CUSTOMER_FINAL_PAYMENT_ROUTE_LOG_PREFIX = '[customer-final-payment-route]';

export function logCustomerFinalPaymentRoute(message: string, meta?: Record<string, unknown>): void {
  const payload = { ...meta, ts: new Date().toISOString() };
  console.info(`${CUSTOMER_FINAL_PAYMENT_ROUTE_LOG_PREFIX} ${message}`, payload);
}

export function logCustomerFinalPaymentRouteError(message: string, meta?: Record<string, unknown>): void {
  const payload = { ...meta, ts: new Date().toISOString() };
  console.error(`${CUSTOMER_FINAL_PAYMENT_ROUTE_LOG_PREFIX} ${message}`, payload);
}

/** Safe deposit fraction for {@link computeBookingPricing} (never NaN / outside [0,1]). */
export function safeDepositPercentFromAmounts(amountDepositCents: number, amountTotalCents: number): number {
  const t = Math.max(0, Math.round(Number(amountTotalCents) || 0));
  const d = Math.max(0, Math.round(Number(amountDepositCents) || 0));
  if (t <= 0) return 0;
  const r = d / t;
  if (!Number.isFinite(r)) return 0;
  return Math.max(0, Math.min(1, r));
}

export type FinalPayCheckoutState =
  | 'ready'
  | 'already_paid'
  | 'processing'
  | 'not_eligible'
  | 'no_remaining_balance';

export function bookingRowToFinalPaymentIntentRow(
  booking: Record<string, unknown>
): BookingFinalPaymentIntentIdRow {
  return {
    final_payment_intent_id: booking.final_payment_intent_id as string | null | undefined,
    stripe_payment_intent_remaining_id: booking.stripe_payment_intent_remaining_id as
      | string
      | null
      | undefined,
    payment_intent_id: booking.payment_intent_id as string | null | undefined,
    stripe_payment_intent_deposit_id: booking.stripe_payment_intent_deposit_id as string | null | undefined,
    deposit_payment_intent_id: booking.deposit_payment_intent_id as string | null | undefined,
  };
}

export function buildMoneyStateInputForFinalRoute(params: {
  booking: Record<string, unknown>;
  paymentAmounts: UnifiedBookingPaymentAmounts;
  coalescedFinalPaymentIntentId: string | null;
}): MoneyStateBookingInput {
  const { booking, paymentAmounts, coalescedFinalPaymentIntentId } = params;
  return {
    id: String(booking.id ?? ''),
    status: String(booking.status ?? ''),
    paymentStatus: (booking.payment_status as string | null) ?? null,
    paymentLifecycleStatus: (booking.payment_lifecycle_status as string | null) ?? null,
    finalPaymentStatus: (booking.final_payment_status as string | null) ?? null,
    paidDepositAt: (booking.paid_deposit_at as string | null) ?? null,
    paidAt: (booking.paid_at as string | null) ?? null,
    paidRemainingAt: (booking.paid_remaining_at as string | null) ?? null,
    fullyPaidAt: (booking.fully_paid_at as string | null) ?? null,
    completedAt: (booking.completed_at as string | null) ?? null,
    amountRemaining: paymentAmounts.remainingAmountCents,
    remainingDueAt: (booking.remaining_due_at as string | null) ?? null,
    customerReviewDeadlineAt: (booking.customer_review_deadline_at as string | null) ?? null,
    requiresAdminReview: (booking.requires_admin_review as boolean | null) ?? null,
    payoutReleased: (booking.payout_released as boolean | null) ?? null,
    payoutStatus: (booking.payout_status as string | null) ?? null,
    payoutTransferId: (booking.payout_transfer_id as string | null) ?? null,
    finalPaymentIntentId: coalescedFinalPaymentIntentId,
    refundedTotalCents: (booking.refunded_total_cents as number | null) ?? null,
    amountPaidCents: (booking.amount_paid_cents as number | null) ?? null,
  };
}

/**
 * Phases where POST /pay/final may create or confirm a remaining-balance PaymentIntent.
 * Includes {@link MoneyFinalPhase} `final_review_window` so customers can pay early during the
 * post-completion review countdown (otherwise UI showed NOT_PAYABLE until the deadline passed).
 */
const PAYABLE_FINAL: ReadonlySet<MoneyFinalPhase> = new Set([
  'final_due',
  'final_failed',
  'final_requires_action',
  'final_review_window',
]);

export function finalCheckoutPayable(money: MoneyState): boolean {
  if (money.remainingCents <= 0) return false;
  return PAYABLE_FINAL.has(money.final);
}
