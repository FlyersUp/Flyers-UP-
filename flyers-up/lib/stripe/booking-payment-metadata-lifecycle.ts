/**
 * Extends Stripe PaymentIntent metadata for marketplace lifecycle (additive; legacy keys preserved).
 */

export type LifecycleMetadataBase = {
  booking_id: string;
  customer_id: string;
  pro_id: string;
  booking_service_status?: string;
  pricing_version: string;
  subtotal_cents: number;
  platform_fee_cents: number;
  deposit_amount_cents: number;
  final_amount_cents: number;
  total_amount_cents: number;
  linked_deposit_payment_intent_id?: string;
  review_deadline_at?: string;
};

export function appendLifecyclePaymentIntentMetadata(
  base: LifecycleMetadataBase,
  phase: 'deposit' | 'final' | 'refund'
): Record<string, string> {
  const out: Record<string, string> = {
    subtotal_cents: String(Math.round(base.subtotal_cents)),
    platform_fee_cents: String(Math.round(base.platform_fee_cents)),
    deposit_amount_cents: String(Math.round(base.deposit_amount_cents)),
    final_amount_cents: String(Math.round(base.final_amount_cents)),
    total_amount_cents: String(Math.round(base.total_amount_cents)),
    pricing_version: base.pricing_version || 'unknown',
  };
  if (base.booking_service_status) {
    out.booking_service_status = base.booking_service_status;
  }
  if (phase === 'deposit') {
    out.payment_phase = 'deposit';
  } else if (phase === 'final') {
    out.payment_phase = 'final';
    if (base.linked_deposit_payment_intent_id) {
      out.linked_deposit_payment_intent_id = base.linked_deposit_payment_intent_id;
    }
    if (base.review_deadline_at) {
      out.review_deadline_at = base.review_deadline_at;
    }
  } else {
    out.payment_phase = 'refund';
  }
  return out;
}

export function refundLifecycleMetadata(input: {
  booking_id: string;
  refund_scope: string;
  resolution_type: string;
  dispute_id?: string;
}): Record<string, string> {
  return {
    booking_id: input.booking_id,
    payment_phase: 'refund',
    refund_scope: input.refund_scope,
    resolution_type: input.resolution_type,
    ...(input.dispute_id ? { dispute_id: input.dispute_id } : {}),
  };
}
