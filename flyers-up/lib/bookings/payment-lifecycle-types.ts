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
  /** Customer cancelled while final was still pending inside the post-completion review window. */
  | 'cancelled_during_review'
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
  /** Version B: job / milestone prerequisites not satisfied (replaces broad insufficient_completion_evidence for new writes). */
  | 'booking_not_completed'
  | 'admin_hold'
  | 'waiting_post_completion_review'
  | 'payout_blocked'
  | 'already_released'
  | 'refund_pending'
  /** Legacy / ops queue label — not a Version B automatic payout gate; use `admin_hold` for a real pause. */
  | 'admin_review_required'
  /** Customer was fully refunded; payout must not run. */
  | 'customer_refunded';

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
  /** Stripe `charge.refunded` (delta) — deduped per Stripe event id in metadata. */
  | 'webhook_charge_refunded'
  | 'refund_succeeded'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'admin_hold_applied'
  | 'admin_hold_released'
  /** Admin clicked approve payout; precedes Stripe transfer when successful. */
  | 'admin_payout_approve_attempted'
  /** Admin chose keep on hold — no transfer; booking stays in review. */
  | 'admin_payout_keep_on_hold'
  /** Admin refunded the customer from payout review (full refund + queue resolved). */
  | 'admin_refund_customer'
  /** Post–payout refund: clawback / Connect recovery workflow opened (deduped per remediation idempotency). */
  | 'post_payout_refund_remediation_opened'
  /** Admin marked pro clawback remediation resolved or waived. */
  | 'pro_clawback_remediation_resolved'
  /** Multi-PI admin refund batch: started (before Stripe legs). */
  | 'refund_batch_started'
  /** One leg of a multi-PI refund returned a Stripe refund id. */
  | 'refund_leg_succeeded'
  /** One leg did not yield a refund id (metadata/Stripe). */
  | 'refund_leg_failed'
  /** Expected legs > succeeded legs — booking must not be marked fully refunded. */
  | 'refund_batch_partial_failure'
  /** Ops explicitly flagged or system flagged manual review on money movement. */
  | 'admin_review_required'
  /** Post–payout refund triggered clawback / Connect recovery tracking (companion to remediation_session). */
  | 'remediation_required';

const PAYMENT_STATUSES: ReadonlySet<string> = new Set<BookingPaymentStatus>([
  'unpaid',
  'deposit_pending',
  'deposit_paid',
  'final_pending',
  'cancelled_during_review',
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
    'booking_not_completed',
    'admin_hold',
    'waiting_post_completion_review',
    'payout_blocked',
    'already_released',
    'refund_pending',
    'admin_review_required',
    'customer_refunded',
  ]);
  return (allowed.has(v) ? v : 'none') as PayoutHoldReason;
}
