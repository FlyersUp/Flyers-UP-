/**
 * Append-only booking_payment_events writes (idempotent where applicable).
 * Lives in its own module so admin refund instrumentation can log without importing the full lifecycle service.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { BookingPaymentEventType } from '@/lib/bookings/payment-lifecycle-types';

type AdminClient = SupabaseClient;

export type LogBookingPaymentEventInput = {
  bookingId: string;
  eventType: BookingPaymentEventType;
  phase: string;
  status: string;
  amountCents?: number;
  currency?: string;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  stripeTransferId?: string | null;
  stripeRefundId?: string | null;
  actorType?: string;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
};

const BOOKING_PAYMENT_EVENT_NO_PI_DEDUPE: ReadonlySet<BookingPaymentEventType> = new Set([
  'refund_batch_started',
  'refund_leg_succeeded',
  'refund_leg_failed',
  'refund_batch_partial_failure',
  'admin_review_required',
  'remediation_required',
]);

export async function logBookingPaymentEvent(
  admin: AdminClient,
  input: LogBookingPaymentEventInput
): Promise<void> {
  if (input.eventType === 'webhook_charge_refunded') {
    const se =
      input.metadata && typeof input.metadata.stripe_event_id === 'string'
        ? input.metadata.stripe_event_id.trim()
        : '';
    if (se) {
      const { data: dup } = await admin
        .from('booking_payment_events')
        .select('id')
        .eq('booking_id', input.bookingId)
        .eq('event_type', 'webhook_charge_refunded')
        .filter('metadata->>stripe_event_id', 'eq', se)
        .maybeSingle();
      if (dup) return;
    }
  } else if (input.stripePaymentIntentId && !BOOKING_PAYMENT_EVENT_NO_PI_DEDUPE.has(input.eventType)) {
    const { data: existingPi } = await admin
      .from('booking_payment_events')
      .select('id')
      .eq('booking_id', input.bookingId)
      .eq('event_type', input.eventType)
      .eq('stripe_payment_intent_id', input.stripePaymentIntentId)
      .maybeSingle();
    if (existingPi) return;
  }
  if (input.stripeTransferId) {
    const { data: existingT } = await admin
      .from('booking_payment_events')
      .select('id')
      .eq('booking_id', input.bookingId)
      .eq('event_type', input.eventType)
      .eq('stripe_transfer_id', input.stripeTransferId)
      .maybeSingle();
    if (existingT) return;
  }

  const dedupeKey = input.stripePaymentIntentId ?? input.stripeTransferId ?? input.stripeRefundId;
  const meta = { ...input.metadata, dedupe: dedupeKey ?? undefined };
  await admin.from('booking_payment_events').insert({
    booking_id: input.bookingId,
    event_type: input.eventType,
    phase: input.phase,
    status: input.status,
    amount_cents: input.amountCents ?? 0,
    currency: input.currency ?? 'usd',
    stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
    stripe_charge_id: input.stripeChargeId ?? null,
    stripe_transfer_id: input.stripeTransferId ?? null,
    stripe_refund_id: input.stripeRefundId ?? null,
    actor_type: input.actorType ?? 'system',
    actor_user_id: input.actorUserId ?? null,
    metadata: meta,
  });
}
