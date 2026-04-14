/**
 * Persist Stripe's actual processing fee per PaymentIntent and sync booking aggregates.
 * Idempotent: safe across payment_intent.succeeded + charge.succeeded and webhook retries.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { computeContributionMarginCents } from '@/lib/pricing/fees';
import { normalizeBookingPaymentMetadata } from '@/lib/stripe/booking-payment-intent-metadata';
import { retrieveStripeBalancePartsForPaymentIntent } from '@/lib/stripe/server';

export type RecordBookingStripeFeeSnapshotParams = {
  bookingId: string;
  paymentIntentId: string;
  /** When true, recompute contribution_margin_cents (split flow: final payment; legacy: full pay). */
  finalizeContributionMargin: boolean;
  metadata: Record<string, string | undefined>;
};

async function sumStripeFeesForBooking(
  admin: SupabaseClient,
  bookingId: string
): Promise<number> {
  const { data: rows, error } = await admin
    .from('booking_payment_intent_stripe_fees')
    .select('stripe_fee_cents')
    .eq('booking_id', bookingId);
  if (error) {
    console.warn('[bookingStripeFee] sumStripeFeesForBooking failed', { bookingId, error });
    return 0;
  }
  return (rows ?? []).reduce((acc, r) => acc + Math.max(0, Number(r.stripe_fee_cents) || 0), 0);
}

async function sumStripeNetForBooking(
  admin: SupabaseClient,
  bookingId: string
): Promise<number> {
  const { data: rows, error } = await admin
    .from('booking_payment_intent_stripe_fees')
    .select('stripe_net_cents')
    .eq('booking_id', bookingId);
  if (error) {
    console.warn('[bookingStripeFee] sumStripeNetForBooking failed', { bookingId, error });
    return 0;
  }
  return (rows ?? []).reduce((acc, r) => {
    const n = r.stripe_net_cents;
    if (n == null || !Number.isFinite(Number(n))) return acc;
    return acc + Math.round(Number(n));
  }, 0);
}

/**
 * Record BalanceTransaction fee for this PI (if not already), refresh bookings.stripe_actual_fee_cents,
 * and optionally set contribution_margin_cents after the last customer charge.
 */
export async function recordBookingStripeFeeSnapshot(
  admin: SupabaseClient,
  params: RecordBookingStripeFeeSnapshotParams
): Promise<void> {
  const { bookingId, paymentIntentId, finalizeContributionMargin, metadata } = params;

  const parts = await retrieveStripeBalancePartsForPaymentIntent(paymentIntentId);
  if (parts == null || !Number.isFinite(parts.feeCents)) {
    console.warn('[bookingStripeFee] no Stripe balance transaction yet for PI', { bookingId, paymentIntentId });
    return;
  }

  const { error: insErr } = await admin.from('booking_payment_intent_stripe_fees').insert({
    payment_intent_id: paymentIntentId,
    booking_id: bookingId,
    stripe_fee_cents: Math.round(parts.feeCents),
    stripe_net_cents: Math.round(parts.netCents),
  });

  if (insErr) {
    const code = (insErr as { code?: string }).code;
    if (code === '23505') {
      return;
    }
    console.warn('[bookingStripeFee] ledger insert failed', {
      bookingId,
      paymentIntentId,
      insErr,
    });
    return;
  }

  const stripeTotal = await sumStripeFeesForBooking(admin, bookingId);
  const stripeNetTotal = await sumStripeNetForBooking(admin, bookingId);

  const bookingPatch: Record<string, unknown> = {
    stripe_actual_fee_cents: stripeTotal,
    stripe_net_cents: stripeNetTotal,
  };

  if (finalizeContributionMargin) {
    const { data: row, error: selErr } = await admin
      .from('bookings')
      .select('fee_total_cents, amount_platform_fee, refunded_total_cents')
      .eq('id', bookingId)
      .maybeSingle();

    if (selErr || !row) {
      console.warn('[bookingStripeFee] could not load booking for margin', { bookingId, selErr });
    } else {
      const b = row as {
        fee_total_cents?: number | null;
        amount_platform_fee?: number | null;
        refunded_total_cents?: number | null;
      };
      const feeTotalCents = Math.max(
        0,
        Number(b.amount_platform_fee ?? 0) || 0,
        Number(b.fee_total_cents ?? 0) || 0
      );
      const { financial } = normalizeBookingPaymentMetadata(metadata);
      const promoCreditsCents = Math.max(0, financial.promoDiscountCents ?? 0);
      const refundsCents = Math.max(0, Number(b.refunded_total_cents ?? 0) || 0);

      bookingPatch.contribution_margin_cents = computeContributionMarginCents({
        feeTotalCents,
        stripeFeeCents: stripeTotal,
        refundsCents,
        promoCreditsCents,
      });
    }
  }

  const { error: updErr } = await admin.from('bookings').update(bookingPatch).eq('id', bookingId);
  if (updErr) {
    console.warn('[bookingStripeFee] booking update failed', { bookingId, updErr });
  }
}
