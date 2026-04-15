/**
 * Extends Stripe PaymentIntent metadata for marketplace lifecycle (additive; legacy keys preserved).
 */

import { capStripeBookingPaymentMetadata } from '@/lib/stripe/booking-payment-intent-metadata';
import {
  assertRefundOrTransferBookingStripeMoneyMetadata,
  assertUnifiedBookingPaymentIntentMetadata,
  buildUnifiedBookingPaymentIntentMoneyMetadata,
  type UnifiedBookingPaymentPhase,
} from '@/lib/stripe/payment-intent-metadata-unified';

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
  phase: UnifiedBookingPaymentPhase
): Record<string, string> {
  const out: Record<string, string> = {
    ...buildUnifiedBookingPaymentIntentMoneyMetadata({
      bookingId: base.booking_id,
      paymentPhase: phase,
      subtotalCents: base.subtotal_cents,
      totalAmountCents: base.total_amount_cents,
      platformFeeCents: base.platform_fee_cents,
      depositAmountCents: base.deposit_amount_cents,
      finalAmountCents: base.final_amount_cents,
      pricingVersion: base.pricing_version,
    }),
  };
  if (base.booking_service_status) {
    out.booking_service_status = base.booking_service_status;
  }
  if (phase === 'final') {
    if (base.linked_deposit_payment_intent_id) {
      out.linked_deposit_payment_intent_id = base.linked_deposit_payment_intent_id;
    }
    if (base.review_deadline_at) {
      out.review_deadline_at = base.review_deadline_at;
    }
  }
  assertUnifiedBookingPaymentIntentMetadata(out);
  return out;
}

export function refundLifecycleMetadata(input: {
  booking_id: string;
  refund_scope: string;
  resolution_type: string;
  dispute_id?: string;
  /** Optional booking snapshot; omitted fields default to 0 / `unknown`. */
  subtotal_cents?: number | null;
  total_amount_cents?: number | null;
  platform_fee_cents?: number | null;
  deposit_amount_cents?: number | null;
  final_amount_cents?: number | null;
  pricing_version?: string | null;
  /** Merged after canonical keys (e.g. legacy `reason` string). */
  extra?: Record<string, string>;
}): Record<string, string> {
  const sub = Number(input.subtotal_cents ?? 0) || 0;
  const total = Number(input.total_amount_cents ?? 0) || 0;
  const fee = Number(input.platform_fee_cents ?? 0) || 0;
  const dep = Number(input.deposit_amount_cents ?? 0) || 0;
  const fin = Number(input.final_amount_cents ?? 0) || 0;
  const merged: Record<string, string> = {
    ...buildUnifiedBookingPaymentIntentMoneyMetadata({
      bookingId: input.booking_id,
      paymentPhase: 'refund',
      subtotalCents: sub,
      totalAmountCents: total,
      platformFeeCents: fee,
      depositAmountCents: dep,
      finalAmountCents: fin,
      pricingVersion: input.pricing_version,
    }),
    refund_scope: input.refund_scope,
    resolution_type: input.resolution_type,
    ...(input.dispute_id ? { dispute_id: input.dispute_id } : {}),
    ...(input.extra ?? {}),
  };
  const capped = capStripeBookingPaymentMetadata(merged);
  assertRefundOrTransferBookingStripeMoneyMetadata(capped);
  return capped;
}

export function transferLifecycleStripeMetadata(input: {
  booking_id: string;
  linked_final_payment_intent_id: string;
  payout_amount_cents: number;
  pro_id: string;
  subtotal_cents?: number | null;
  total_amount_cents?: number | null;
  platform_fee_cents?: number | null;
  deposit_amount_cents?: number | null;
  final_amount_cents?: number | null;
  pricing_version?: string | null;
  extra?: Record<string, string>;
}): Record<string, string> {
  const sub = Number(input.subtotal_cents ?? 0) || 0;
  const total = Number(input.total_amount_cents ?? 0) || 0;
  const fee = Number(input.platform_fee_cents ?? 0) || 0;
  const dep = Number(input.deposit_amount_cents ?? 0) || 0;
  const fin = Number(input.final_amount_cents ?? 0) || 0;
  const merged: Record<string, string> = {
    ...buildUnifiedBookingPaymentIntentMoneyMetadata({
      bookingId: input.booking_id,
      paymentPhase: 'transfer',
      subtotalCents: sub,
      totalAmountCents: total,
      platformFeeCents: fee,
      depositAmountCents: dep,
      finalAmountCents: fin,
      pricingVersion: input.pricing_version,
    }),
    linked_final_payment_intent_id: input.linked_final_payment_intent_id,
    payout_amount_cents: String(Math.round(Number(input.payout_amount_cents) || 0)),
    pro_id: input.pro_id,
    ...(input.extra ?? {}),
  };
  const capped = capStripeBookingPaymentMetadata(merged);
  assertRefundOrTransferBookingStripeMoneyMetadata(capped);
  return capped;
}
