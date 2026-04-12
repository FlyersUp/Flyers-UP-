/**
 * Marketplace booking payment lifecycle string unions (DB: bookings.payment_lifecycle_status, booking_payment_summary.overall_payment_status).
 * Legacy bookings.payment_status remains UNPAID | PAID | … for the deposit PaymentIntent.
 *
 * For reads, prefer `resolveEffectivePaymentLifecycle()` in `payment-lifecycle-read.ts` so UI and new code use one mapping.
 */

export type BookingServiceStatus =
  | 'requested'
  | 'accepted'
  | 'deposit_pending'
  | 'deposit_paid'
  | 'pro_en_route'
  | 'in_progress'
  | 'completed'
  | 'canceled'
  | 'closed';

export type BookingPaymentStatus =
  | 'unpaid'
  | 'deposit_pending'
  | 'deposit_paid'
  | 'final_pending'
  | 'final_processing'
  | 'final_paid'
  | 'requires_customer_action'
  | 'payment_failed'
  | 'refund_pending'
  | 'partially_refunded'
  | 'refunded'
  | 'payout_on_hold'
  | 'payout_ready'
  | 'payout_sent';

export type BookingDisputeStatus =
  | 'none'
  | 'issue_reported'
  | 'under_review'
  | 'resolved_customer_favor'
  | 'resolved_pro_favor'
  | 'split_resolution'
  | 'escalated_external';

export type PayoutHoldReason =
  | 'none'
  | 'missing_final_payment'
  | 'missing_payment_method'
  | 'requires_customer_action'
  | 'charge_failed'
  | 'dispute_open'
  | 'fraud_review'
  | 'no_show_review'
  | 'insufficient_completion_evidence'
  | 'admin_hold'
  | 'waiting_post_completion_review'
  | 'payout_blocked'
  | 'already_released'
  | 'refund_pending'
  /** Cron/safety: booking flagged for manual review — no auto-release until admin clears or approves payout. */
  | 'admin_review_required';

export type BookingPaymentEventType =
  | 'deposit_intent_created'
  | 'deposit_payment_succeeded'
  | 'deposit_payment_failed'
  | 'final_charge_scheduled'
  | 'final_intent_created'
  | 'final_payment_succeeded'
  | 'final_payment_failed'
  | 'final_payment_requires_action'
  | 'retry_scheduled'
  | 'manual_payment_link_sent'
  | 'payout_blocked'
  | 'payout_ready'
  | 'payout_sent'
  | 'payout_released'
  | 'refund_created'
  | 'refund_succeeded'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'admin_hold_applied'
  | 'admin_hold_released'
  /** Admin clicked approve payout; precedes Stripe transfer when successful. */
  | 'admin_payout_approve_attempted';

const PAYMENT_STATUSES: ReadonlySet<string> = new Set<BookingPaymentStatus>([
  'unpaid',
  'deposit_pending',
  'deposit_paid',
  'final_pending',
  'final_processing',
  'final_paid',
  'requires_customer_action',
  'payment_failed',
  'refund_pending',
  'partially_refunded',
  'refunded',
  'payout_on_hold',
  'payout_ready',
  'payout_sent',
]);

export function isBookingPaymentStatus(v: string): v is BookingPaymentStatus {
  return PAYMENT_STATUSES.has(v);
}

export function assertPayoutHoldReason(v: string): PayoutHoldReason {
  const allowed: ReadonlySet<string> = new Set([
    'none',
    'missing_final_payment',
    'missing_payment_method',
    'requires_customer_action',
    'charge_failed',
    'dispute_open',
    'fraud_review',
    'no_show_review',
    'insufficient_completion_evidence',
    'admin_hold',
    'waiting_post_completion_review',
    'payout_blocked',
    'already_released',
    'refund_pending',
    'admin_review_required',
  ]);
  return (allowed.has(v) ? v : 'none') as PayoutHoldReason;
}
