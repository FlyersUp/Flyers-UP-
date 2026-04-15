/**
 * Append-only refund ledger (`booking_refund_events`) + helpers.
 * Connect reality: refunding a charge credits the customer from the platform balance; outbound
 * Transfers to a connected account are not reversed automatically — see `requires_clawback`.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type BookingRefundEventRefundType = 'before_payout' | 'after_payout';

export type AppendBookingRefundEventInput = {
  bookingId: string;
  refundType: BookingRefundEventRefundType;
  amountCents: number;
  stripeRefundId?: string | null;
  stripeChargeId?: string | null;
  paymentIntentId?: string | null;
  /** When set, unique partial index prevents double-apply from webhook retries. */
  stripeEventId?: string | null;
  requiresClawback: boolean;
  source: 'webhook' | 'admin' | 'cron' | 'dispute' | 'system';
};

type Admin = SupabaseClient;

/** Minimal shape for Stripe Charge.refunds on `charge.refunded` webhooks. */
export type StripeChargeRefundsShape = {
  refunds?: { data?: Array<{ id: string; created?: number; amount?: number }> } | null;
};

/**
 * Best-effort: newest refund on the charge (Stripe lists refunds on the charge object).
 */
export function pickLatestStripeRefundIdFromCharge(
  charge: StripeChargeRefundsShape,
  _deltaCents: number // reserved for matching a specific refund leg when Stripe lists multiple
): string | null {
  const list = charge.refunds?.data;
  if (!list?.length) return null;
  const sorted = [...list].sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
  return sorted[0]?.id ?? null;
}

export async function appendBookingRefundEvent(
  admin: Admin,
  input: AppendBookingRefundEventInput
): Promise<{ ok: true; id: string } | { ok: false; duplicate: true } | { ok: false; error: string }> {
  const evId = input.stripeEventId?.trim() || null;
  if (evId) {
    const { data: existing } = await admin
      .from('booking_refund_events')
      .select('id')
      .eq('stripe_event_id', evId)
      .maybeSingle();
    if (existing) return { ok: false, duplicate: true };
  }

  const { data, error } = await admin
    .from('booking_refund_events')
    .insert({
      booking_id: input.bookingId,
      refund_type: input.refundType,
      stripe_refund_id: input.stripeRefundId ?? null,
      stripe_charge_id: input.stripeChargeId ?? null,
      payment_intent_id: input.paymentIntentId ?? null,
      amount_cents: Math.max(0, Math.round(input.amountCents)),
      requires_clawback: input.requiresClawback,
      stripe_event_id: evId,
      source: input.source,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    if (String(error.code) === '23505') return { ok: false, duplicate: true };
    return { ok: false, error: error.message };
  }
  if (!data?.id) return { ok: false, error: 'insert_returned_no_row' };
  return { ok: true, id: data.id as string };
}

export async function bookingRefundEventExistsForStripeEvent(
  admin: Admin,
  stripeEventId: string
): Promise<boolean> {
  const se = stripeEventId.trim();
  if (!se) return false;
  const { data } = await admin.from('booking_refund_events').select('id').eq('stripe_event_id', se).maybeSingle();
  return !!data;
}

/** Pre-migration idempotency: `booking_payment_events` already logged this Stripe event. */
export async function legacyWebhookChargeRefundLedgerDup(
  admin: Admin,
  bookingId: string,
  stripeEventId: string
): Promise<boolean> {
  const se = stripeEventId.trim();
  if (!se) return false;
  const { data } = await admin
    .from('booking_payment_events')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('event_type', 'webhook_charge_refunded')
    .filter('metadata->>stripe_event_id', 'eq', se)
    .maybeSingle();
  return !!data;
}
