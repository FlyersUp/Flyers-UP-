/**
 * Rebuild canonical Stripe metadata shapes from a frozen `bookings` row (same builders as PI create / refund / transfer).
 * Used by admin debug UI and integration tests — not for live Stripe API calls.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { resolveProPayoutTransferCents } from '@/lib/bookings/booking-payout-economics';
import {
  appendLifecyclePaymentIntentMetadata,
  refundLifecycleMetadata,
  transferLifecycleStripeMetadata,
} from '@/lib/stripe/booking-payment-metadata-lifecycle';
import {
  buildBookingPaymentIntentStripeFields,
  capStripeBookingPaymentMetadata,
} from '@/lib/stripe/booking-payment-intent-metadata';
import { CANONICAL_BOOKING_STRIPE_MONEY_METADATA_KEYS } from '@/lib/stripe/payment-metadata';

const BOOKING_SELECT = [
  'id',
  'customer_id',
  'pro_id',
  'subtotal_cents',
  'amount_subtotal',
  'total_amount_cents',
  'platform_fee_cents',
  'amount_platform_fee',
  'deposit_amount_cents',
  'final_amount_cents',
  'remaining_amount_cents',
  'pricing_version',
  'deposit_payment_intent_id',
  'final_payment_intent_id',
  'stripe_payment_intent_remaining_id',
  'customer_review_deadline_at',
  'amount_refunded_cents',
  'refunded_total_cents',
] as const;

export type BookingCanonicalStripeSummary = {
  /** Canonical keys: {@link CANONICAL_BOOKING_STRIPE_MONEY_METADATA_KEYS} */
  depositPaymentIntentMetadata: Record<string, string>;
  finalPaymentIntentMetadata: Record<string, string>;
  connectTransferMetadata: Record<string, string>;
  /**
   * Illustrative refund metadata for a full refund against the **final** PI before payout — not a live Stripe object.
   */
  exampleRefundOnFinalPaymentIntentMetadata: Record<string, string>;
};

function rowToParts(row: Record<string, unknown>, fallbackDepositPi: string, fallbackFinalPi: string) {
  const customerId = String(row.customer_id ?? '');
  const proId = String(row.pro_id ?? '');
  const sub = Number(row.subtotal_cents ?? row.amount_subtotal ?? 0) || 0;
  const total = Number(row.total_amount_cents ?? 0) || 0;
  const plat = Number(row.platform_fee_cents ?? row.amount_platform_fee ?? 0) || 0;
  const dep = Number(row.deposit_amount_cents ?? 0) || 0;
  const fin = Number(row.final_amount_cents ?? row.remaining_amount_cents ?? 0) || 0;
  const pv =
    typeof row.pricing_version === 'string' && row.pricing_version.trim()
      ? String(row.pricing_version)
      : 'unknown';
  const bookingId = String(row.id ?? '');
  const reviewDeadline =
    row.customer_review_deadline_at != null ? String(row.customer_review_deadline_at) : undefined;
  const linkedDepPi = String(row.deposit_payment_intent_id ?? fallbackDepositPi);
  const finalPi = fallbackFinalPi;

  return {
    bookingId,
    customerId,
    proId,
    sub,
    total,
    plat,
    dep,
    fin,
    pv,
    reviewDeadline,
    linkedDepPi,
    finalPi,
  };
}

/**
 * Pure: build the same metadata records production would stamp, given PI ids (placeholders ok for summaries).
 */
export function buildBookingCanonicalStripeSummaryFromRow(
  row: Record<string, unknown>,
  opts: { depositPaymentIntentId: string; finalPaymentIntentId: string; serviceTitle?: string }
): BookingCanonicalStripeSummary {
  const title = opts.serviceTitle ?? 'Flyers Up booking';
  const p = rowToParts(row, opts.depositPaymentIntentId, opts.finalPaymentIntentId);

  const depStripe = buildBookingPaymentIntentStripeFields({
    bookingId: p.bookingId,
    customerId: p.customerId,
    proId: p.proId,
    paymentPhase: 'deposit',
    serviceTitle: title,
    pricing: { subtotal_cents: p.sub, pricing_version: p.pv },
  });
  Object.assign(
    depStripe.metadata,
    appendLifecyclePaymentIntentMetadata(
      {
        booking_id: p.bookingId,
        customer_id: p.customerId,
        pro_id: p.proId,
        pricing_version: p.pv,
        subtotal_cents: p.sub,
        platform_fee_cents: p.plat,
        deposit_amount_cents: p.dep,
        final_amount_cents: p.fin,
        total_amount_cents: p.total,
      },
      'deposit'
    )
  );

  const finStripe = buildBookingPaymentIntentStripeFields({
    bookingId: p.bookingId,
    customerId: p.customerId,
    proId: p.proId,
    paymentPhase: 'remaining',
    serviceTitle: title,
    pricing: { subtotal_cents: p.sub, pricing_version: p.pv },
  });
  Object.assign(
    finStripe.metadata,
    appendLifecyclePaymentIntentMetadata(
      {
        booking_id: p.bookingId,
        customer_id: p.customerId,
        pro_id: p.proId,
        pricing_version: p.pv,
        subtotal_cents: p.sub,
        platform_fee_cents: p.plat,
        deposit_amount_cents: p.dep,
        final_amount_cents: p.fin,
        total_amount_cents: p.total,
        linked_deposit_payment_intent_id: p.linkedDepPi,
        ...(p.reviewDeadline ? { review_deadline_at: p.reviewDeadline } : {}),
      },
      'final'
    )
  );

  const { payoutCents } = resolveProPayoutTransferCents({
    total_amount_cents: p.total,
    amount_platform_fee: p.plat,
    refunded_total_cents: (row.amount_refunded_cents ?? row.refunded_total_cents) as number | null,
    amount_subtotal: p.sub,
  });

  const transferMeta = transferLifecycleStripeMetadata({
    booking_id: p.bookingId,
    linked_final_payment_intent_id: opts.finalPaymentIntentId,
    payout_amount_cents: payoutCents,
    pro_id: p.proId,
    subtotal_cents: p.sub,
    total_amount_cents: p.total,
    platform_fee_cents: p.plat,
    deposit_amount_cents: p.dep,
    final_amount_cents: p.fin,
    pricing_version: p.pv,
  });

  const exampleRefund = refundLifecycleMetadata({
    booking_id: p.bookingId,
    refund_scope: 'full',
    resolution_type: 'summary_example',
    refunded_amount_cents: p.fin > 0 ? p.fin : 0,
    refund_type: 'before_payout',
    refund_source_payment_phase: 'final',
    subtotal_cents: p.sub,
    total_amount_cents: p.total,
    platform_fee_cents: p.plat,
    deposit_amount_cents: p.dep,
    final_amount_cents: p.fin,
    pricing_version: p.pv,
  });

  return {
    depositPaymentIntentMetadata: capStripeBookingPaymentMetadata(depStripe.metadata),
    finalPaymentIntentMetadata: capStripeBookingPaymentMetadata(finStripe.metadata),
    connectTransferMetadata: transferMeta,
    exampleRefundOnFinalPaymentIntentMetadata: exampleRefund,
  };
}

/** Every canonical money key present on capped PI metadata. */
export function assertAllCanonicalMoneyKeysOnPaymentIntentMetadata(
  metadata: Record<string, string>,
  label: string
): void {
  for (const k of CANONICAL_BOOKING_STRIPE_MONEY_METADATA_KEYS) {
    const v = metadata[k];
    if (v === undefined || v === null || String(v).trim() === '') {
      throw new Error(`${label}: missing canonical PI metadata key ${k}`);
    }
  }
}

export async function getBookingCanonicalStripeSummary(
  admin: SupabaseClient,
  bookingId: string,
  opts?: { depositPaymentIntentId?: string; finalPaymentIntentId?: string }
): Promise<BookingCanonicalStripeSummary | null> {
  const { data: b, error } = await admin
    .from('bookings')
    .select(BOOKING_SELECT.join(', '))
    .eq('id', bookingId)
    .maybeSingle();
  if (error || !b) return null;
  const row = b as unknown as Record<string, unknown>;
  const depPi =
    opts?.depositPaymentIntentId ??
    (typeof row.deposit_payment_intent_id === 'string' ? row.deposit_payment_intent_id : 'pi_unknown_deposit');
  const finPi =
    opts?.finalPaymentIntentId ??
    (typeof (row as { final_payment_intent_id?: string }).final_payment_intent_id === 'string'
      ? (row as { final_payment_intent_id: string }).final_payment_intent_id
      : typeof (row as { stripe_payment_intent_remaining_id?: string }).stripe_payment_intent_remaining_id ===
          'string'
        ? (row as { stripe_payment_intent_remaining_id: string }).stripe_payment_intent_remaining_id
        : 'pi_unknown_final');
  return buildBookingCanonicalStripeSummaryFromRow(row, {
    depositPaymentIntentId: depPi,
    finalPaymentIntentId: finPi,
  });
}
