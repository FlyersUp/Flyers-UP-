/**
 * Server-side marketplace payment lifecycle (deposits, finals, payouts, disputes).
 * Idempotent webhook-safe helpers; keeps legacy bookings.payment_status / status in sync where required.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { stripe as stripeServer } from '@/lib/stripe/server';
import { stripe as stripeLazy } from '@/lib/stripe';
import { getOrCreateStripeCustomer } from '@/lib/stripeCustomer';
import {
  buildBookingPaymentIntentStripeFields,
  capStripeBookingPaymentMetadata,
} from '@/lib/stripe/booking-payment-intent-metadata';
import { appendLifecyclePaymentIntentMetadata } from '@/lib/stripe/booking-payment-metadata-lifecycle';
import {
  createTransfer,
  refundPaymentIntent,
  refundPaymentIntentPartial,
} from '@/lib/stripe/server';
import { isPayoutEligible } from '@/lib/bookings/state-machine';
import { resolveMilestonePayoutGate } from '@/lib/bookings/multi-day-payout';
import { resolveProPayoutTransferCents } from '@/lib/bookings/booking-payout-economics';
import { evaluatePayoutRiskForPro } from '@/lib/payoutRisk';
import type {
  BookingPaymentEventType,
  BookingPaymentStatus,
  BookingDisputeStatus,
  PayoutHoldReason,
} from '@/lib/bookings/payment-lifecycle-types';
import { assertPayoutHoldReason } from '@/lib/bookings/payment-lifecycle-types';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';

type AdminClient = SupabaseClient;

function stripeClient(): Stripe | null {
  return (stripeServer ?? stripeLazy) as Stripe | null;
}

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

export async function logBookingPaymentEvent(
  admin: AdminClient,
  input: LogBookingPaymentEventInput
): Promise<void> {
  if (input.stripePaymentIntentId) {
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

export async function syncBookingPaymentSummary(admin: AdminClient, bookingId: string): Promise<void> {
  const { data: b, error } = await admin
    .from('bookings')
    .select(
      [
        'id',
        'currency',
        'subtotal_cents',
        'platform_fee_cents',
        'amount_platform_fee',
        'deposit_amount_cents',
        'amount_deposit',
        'final_amount_cents',
        'remaining_amount_cents',
        'total_amount_cents',
        'amount_total',
        'tip_amount_cents',
        'tax_amount_cents',
        'amount_paid_cents',
        'amount_refunded_cents',
        'refunded_total_cents',
        'payout_amount_cents',
        'stripe_customer_id',
        'saved_payment_method_id',
        'payment_method_brand',
        'payment_method_last4',
        'off_session_ready',
        'payment_lifecycle_status',
        'dispute_status',
        'payout_blocked',
        'payout_hold_reason',
        'deposit_payment_intent_id',
        'stripe_payment_intent_deposit_id',
        'final_payment_intent_id',
        'payout_transfer_id',
        'stripe_transfer_id',
        'paid_deposit_at',
        'paid_remaining_at',
        'payout_eligible_at',
        'payout_released_at',
        'final_charge_retry_count',
        'final_charge_attempted_at',
        'requires_customer_action_at',
        'payment_failed_at',
        'customer_review_deadline_at',
        'payment_status',
        'final_payment_status',
      ].join(', ')
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (error || !b) return;

  const row = b as unknown as Record<string, unknown>;
  const platformFee = Number(row.platform_fee_cents ?? row.amount_platform_fee ?? 0) || 0;
  const depositCents = Number(row.deposit_amount_cents ?? row.amount_deposit ?? 0) || 0;
  const finalCents = Number(row.final_amount_cents ?? row.remaining_amount_cents ?? 0) || 0;
  const totalCents = Number(row.total_amount_cents ?? row.amount_total ?? 0) || 0;
  const paidLegacy =
    (String(row.payment_status ?? '').toUpperCase() === 'PAID' ? depositCents : 0) +
    (String(row.final_payment_status ?? '').toUpperCase() === 'PAID' ? finalCents : 0);
  const amountPaid = Number(row.amount_paid_cents ?? 0) || paidLegacy;
  const amountRefunded = Number(row.amount_refunded_cents ?? row.refunded_total_cents ?? 0) || 0;

  const lc = String(row.payment_lifecycle_status ?? 'unpaid');
  const depositPaid = String(row.payment_status ?? '').toUpperCase() === 'PAID';
  const finalPaid = String(row.final_payment_status ?? '').toUpperCase() === 'PAID';

  const depositStatus = depositPaid ? 'paid' : depositCents > 0 ? 'pending' : 'not_required';
  const finalStatus = finalPaid ? 'paid' : finalCents > 0 ? 'pending' : 'not_due';

  await admin.from('booking_payment_summary').upsert(
    {
      booking_id: bookingId,
      stripe_customer_id: (row.stripe_customer_id as string) ?? null,
      saved_payment_method_id: (row.saved_payment_method_id as string) ?? null,
      payment_method_brand: (row.payment_method_brand as string) ?? null,
      payment_method_last4: (row.payment_method_last4 as string) ?? null,
      off_session_ready: row.off_session_ready === true,
      currency: String(row.currency ?? 'usd').toLowerCase(),
      subtotal_cents: Number(row.subtotal_cents ?? 0) || 0,
      platform_fee_cents: platformFee,
      deposit_amount_cents: depositCents,
      final_amount_cents: finalCents,
      tip_amount_cents: Number(row.tip_amount_cents ?? 0) || 0,
      tax_amount_cents: Number(row.tax_amount_cents ?? 0) || 0,
      total_amount_cents: totalCents,
      amount_paid_cents: amountPaid,
      amount_refunded_cents: amountRefunded,
      payout_amount_cents: Number(row.payout_amount_cents ?? 0) || 0,
      deposit_status: depositStatus,
      final_status: finalStatus,
      overall_payment_status: lc,
      dispute_status: String(row.dispute_status ?? 'none'),
      payout_blocked: row.payout_blocked !== false,
      payout_hold_reason: String(row.payout_hold_reason ?? 'none'),
      deposit_payment_intent_id:
        (row.deposit_payment_intent_id as string) ?? (row.stripe_payment_intent_deposit_id as string) ?? null,
      final_payment_intent_id: (row.final_payment_intent_id as string) ?? null,
      payout_transfer_id: (row.payout_transfer_id as string) ?? (row.stripe_transfer_id as string) ?? null,
      deposit_paid_at: (row.paid_deposit_at as string) ?? null,
      final_paid_at: (row.paid_remaining_at as string) ?? null,
      payout_eligible_at: (row.payout_eligible_at as string) ?? null,
      payout_released_at: (row.payout_released_at as string) ?? null,
      final_charge_retry_count: Number(row.final_charge_retry_count ?? 0) || 0,
      final_charge_attempted_at: (row.final_charge_attempted_at as string) ?? null,
      requires_customer_action_at: (row.requires_customer_action_at as string) ?? null,
      payment_failed_at: (row.payment_failed_at as string) ?? null,
      customer_review_deadline_at: (row.customer_review_deadline_at as string) ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'booking_id' }
  );
}

async function paymentEventExists(
  admin: AdminClient,
  bookingId: string,
  eventType: BookingPaymentEventType,
  stripePaymentIntentId: string | null
): Promise<boolean> {
  if (!stripePaymentIntentId) return false;
  const { data } = await admin
    .from('booking_payment_events')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('event_type', eventType)
    .eq('stripe_payment_intent_id', stripePaymentIntentId)
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function finalizeDepositPaymentIntentProvisioning(admin: AdminClient, input: {
  bookingId: string;
  paymentIntentId: string;
  currency: string;
  amountDepositCents: number;
}): Promise<void> {
  const { bookingId, paymentIntentId, currency, amountDepositCents } = input;
  await admin
    .from('bookings')
    .update({
      deposit_payment_intent_id: paymentIntentId,
      payment_lifecycle_status: 'deposit_pending',
      service_status: 'deposit_pending',
    })
    .eq('id', bookingId);

  await syncBookingPaymentSummary(admin, bookingId);
  await logBookingPaymentEvent(admin, {
    bookingId,
    eventType: 'deposit_intent_created',
    phase: 'deposit',
    status: 'created',
    amountCents: amountDepositCents,
    currency,
    stripePaymentIntentId: paymentIntentId,
    metadata: { source: 'deposit_intent_provisioning' },
  });
}

export async function handleDepositPaymentFailed(
  admin: AdminClient,
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const meta = paymentIntent.metadata as Record<string, string | undefined>;
  const bookingId = meta.booking_id ?? meta.bookingId;
  if (!bookingId) return;
  if (await paymentEventExists(admin, bookingId, 'deposit_payment_failed', paymentIntent.id)) {
    return;
  }
  await admin
    .from('bookings')
    .update({
      // Keep deposit flow distinct from final auto-retry (`payment_failed`).
      payment_lifecycle_status: 'deposit_pending',
      payout_blocked: true,
      payout_hold_reason: 'charge_failed',
    })
    .eq('id', bookingId);
  await logBookingPaymentEvent(admin, {
    bookingId,
    eventType: 'deposit_payment_failed',
    phase: 'deposit',
    status: 'failed',
    stripePaymentIntentId: paymentIntent.id,
    metadata: {
      failure_code: paymentIntent.last_payment_error?.code,
      failure_message: paymentIntent.last_payment_error?.message,
    },
  });
  await syncBookingPaymentSummary(admin, bookingId);
}

export async function handleDepositPaymentSucceeded(
  admin: AdminClient,
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const meta = paymentIntent.metadata as Record<string, string | undefined>;
  const bookingId = meta.booking_id ?? meta.bookingId;
  if (!bookingId) return;

  if (await paymentEventExists(admin, bookingId, 'deposit_payment_succeeded', paymentIntent.id)) {
    return;
  }

  const pmId =
    typeof paymentIntent.payment_method === 'string'
      ? paymentIntent.payment_method
      : paymentIntent.payment_method?.id ?? null;

  let brand: string | null = null;
  let last4: string | null = null;
  if (pmId && stripeClient()) {
    try {
      const pm = await stripeClient()!.paymentMethods.retrieve(pmId);
      if (pm.type === 'card' && pm.card) {
        brand = pm.card.brand ?? null;
        last4 = pm.card.last4 ?? null;
      }
    } catch {
      // ignore
    }
  }

  const now = new Date().toISOString();
  const customerId =
    typeof paymentIntent.customer === 'string'
      ? paymentIntent.customer
      : paymentIntent.customer?.id ?? null;

  const paidCents = typeof paymentIntent.amount_received === 'number' ? paymentIntent.amount_received : paymentIntent.amount;

  await admin
    .from('bookings')
    .update({
      stripe_customer_id: customerId,
      saved_payment_method_id: pmId,
      payment_method_brand: brand,
      payment_method_last4: last4,
      off_session_ready: true,
      paid_deposit_at: now,
      deposit_payment_intent_id: paymentIntent.id,
      stripe_payment_intent_deposit_id: paymentIntent.id,
      payment_intent_id: paymentIntent.id,
      payment_status: 'PAID',
      payment_lifecycle_status: 'deposit_paid',
      service_status: 'deposit_paid',
      amount_paid_cents: paidCents,
    })
    .eq('id', bookingId);

  await syncBookingPaymentSummary(admin, bookingId);
  await logBookingPaymentEvent(admin, {
    bookingId,
    eventType: 'deposit_payment_succeeded',
    phase: 'deposit',
    status: 'succeeded',
    amountCents: paidCents,
    currency: paymentIntent.currency,
    stripePaymentIntentId: paymentIntent.id,
    metadata: { payment_method_id: pmId },
  });
}

export async function markBookingCompleted(admin: AdminClient, input: {
  bookingId: string;
  completedByUserId: string;
}): Promise<void> {
  const { data: b } = await admin
    .from('bookings')
    .select(
      'id, status, dispute_status, admin_hold, final_amount_cents, remaining_amount_cents, amount_remaining, payment_lifecycle_status'
    )
    .eq('id', input.bookingId)
    .maybeSingle();

  if (!b) return;

  const row = b as Record<string, unknown>;
  if (row.admin_hold === true) {
    await admin.from('bookings').update({ service_status: 'completed' }).eq('id', input.bookingId);
    await syncBookingPaymentSummary(admin, input.bookingId);
    return;
  }
  if (String(row.dispute_status ?? 'none') !== 'none') {
    await admin.from('bookings').update({ service_status: 'completed' }).eq('id', input.bookingId);
    await syncBookingPaymentSummary(admin, input.bookingId);
    return;
  }

  const finalAmt =
    Number(row.final_amount_cents ?? row.remaining_amount_cents ?? row.amount_remaining ?? 0) || 0;
  const reviewDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const patch: Record<string, unknown> = {
    service_status: 'completed',
  };

  if (finalAmt > 0) {
    patch.payment_lifecycle_status = 'final_pending';
    patch.customer_review_deadline_at = reviewDeadline;
  } else {
    patch.payment_lifecycle_status = 'final_paid';
  }

  await admin.from('bookings').update(patch).eq('id', input.bookingId);

  await syncBookingPaymentSummary(admin, input.bookingId);

  if (finalAmt > 0) {
    await logBookingPaymentEvent(admin, {
      bookingId: input.bookingId,
      eventType: 'final_charge_scheduled',
      phase: 'final',
      status: 'scheduled',
      metadata: { completed_by: input.completedByUserId, review_deadline_at: reviewDeadline },
    });
  } else {
    const ev = await evaluatePayoutEligibility(admin, input.bookingId);
    if (ev.eligible) {
      await admin
        .from('bookings')
        .update({
          payment_lifecycle_status: 'payout_ready',
          payout_blocked: false,
          payout_hold_reason: 'none',
          payout_eligible_at: new Date().toISOString(),
        })
        .eq('id', input.bookingId);
      await syncBookingPaymentSummary(admin, input.bookingId);
      await logBookingPaymentEvent(admin, {
        bookingId: input.bookingId,
        eventType: 'payout_ready',
        phase: 'payout',
        status: 'ready',
        metadata: { reason: 'zero_final' },
      });
    }
  }
}

export async function attemptFinalCharge(
  admin: AdminClient,
  input: { bookingId: string; initiatedByAdmin?: boolean; actorUserId?: string | null }
): Promise<{ ok: boolean; code?: string }> {
  const s = stripeClient();
  if (!s) return { ok: false, code: 'no_stripe' };

  const { data: b } = await admin
    .from('bookings')
    .select(
      [
        'id',
        'customer_id',
        'pro_id',
        'status',
        'service_status',
        'payment_lifecycle_status',
        'dispute_status',
        'admin_hold',
        'off_session_ready',
        'saved_payment_method_id',
        'stripe_customer_id',
        'final_amount_cents',
        'remaining_amount_cents',
        'amount_remaining',
        'currency',
        'final_payment_intent_id',
        'final_payment_status',
        'stripe_payment_intent_remaining_id',
        'pricing_version',
        'subtotal_cents',
        'platform_fee_cents',
        'amount_platform_fee',
        'deposit_amount_cents',
        'amount_deposit',
        'total_amount_cents',
        'amount_total',
        'deposit_payment_intent_id',
        'stripe_payment_intent_deposit_id',
        'customer_review_deadline_at',
      ].join(', ')
    )
    .eq('id', input.bookingId)
    .maybeSingle();

  if (!b) return { ok: false, code: 'not_found' };

  const row = b as unknown as Record<string, unknown>;
  if (row.admin_hold === true) return { ok: false, code: 'admin_hold' };
  if (String(row.dispute_status ?? 'none') !== 'none') return { ok: false, code: 'dispute' };

  const lc = String(row.payment_lifecycle_status ?? '');
  const allowedLc: BookingPaymentStatus[] = ['final_pending', 'payment_failed', 'requires_customer_action'];
  if (!allowedLc.includes(lc as BookingPaymentStatus)) {
    return { ok: false, code: 'bad_lifecycle' };
  }

  const ss = String(row.service_status ?? '');
  const st = String(row.status ?? '');
  const workDone =
    ss === 'completed' ||
    [
      'awaiting_remaining_payment',
      'awaiting_customer_confirmation',
      'completed',
      'customer_confirmed',
      'auto_confirmed',
      'completed_pending_payment',
      'awaiting_payment',
    ].includes(st);
  if (!workDone && !input.initiatedByAdmin) {
    return { ok: false, code: 'not_completed' };
  }

  if (String(row.final_payment_status ?? '').toUpperCase() === 'PAID') {
    return { ok: false, code: 'already_paid' };
  }

  const finalCents =
    Number(row.final_amount_cents ?? row.remaining_amount_cents ?? row.amount_remaining ?? 0) || 0;
  if (finalCents <= 0) return { ok: false, code: 'zero_final' };

  const stripeCustomer = (row.stripe_customer_id as string) ?? null;
  const pm = (row.saved_payment_method_id as string) ?? null;
  if (!stripeCustomer || !pm) {
    await admin
      .from('bookings')
      .update({
        payment_lifecycle_status: 'requires_customer_action',
        payout_blocked: true,
        payout_hold_reason: 'missing_payment_method',
      })
      .eq('id', input.bookingId);
    await syncBookingPaymentSummary(admin, input.bookingId);
    await logBookingPaymentEvent(admin, {
      bookingId: input.bookingId,
      eventType: 'payout_blocked',
      phase: 'final',
      status: 'blocked',
      metadata: { reason: 'missing_payment_method' },
    });
    return { ok: false, code: 'missing_payment_method' };
  }

  const deadline = row.customer_review_deadline_at as string | null;
  if (deadline && new Date(deadline).getTime() > Date.now() && !input.initiatedByAdmin) {
    return { ok: false, code: 'review_window' };
  }

  const depositPi =
    (row.deposit_payment_intent_id as string) ?? (row.stripe_payment_intent_deposit_id as string) ?? '';

  const meta = appendLifecyclePaymentIntentMetadata(
    {
      booking_id: input.bookingId,
      customer_id: String(row.customer_id ?? ''),
      pro_id: String(row.pro_id ?? ''),
      pricing_version: (row.pricing_version as string) ?? '',
      subtotal_cents: Number(row.subtotal_cents ?? 0) || 0,
      platform_fee_cents: Number(row.platform_fee_cents ?? row.amount_platform_fee ?? 0) || 0,
      deposit_amount_cents: Number(row.deposit_amount_cents ?? row.amount_deposit ?? 0) || 0,
      final_amount_cents: finalCents,
      total_amount_cents: Number(row.total_amount_cents ?? row.amount_total ?? 0) || 0,
      linked_deposit_payment_intent_id: depositPi,
      review_deadline_at: deadline ?? '',
    },
    'final'
  );

  const now = new Date().toISOString();
  await admin
    .from('bookings')
    .update({
      payment_lifecycle_status: 'final_processing',
      final_charge_attempted_at: now,
    })
    .eq('id', input.bookingId);

  try {
    const pi = await s.paymentIntents.create(
      {
        amount: finalCents,
        currency: String(row.currency ?? 'usd').toLowerCase(),
        customer: stripeCustomer,
        payment_method: pm,
        off_session: true,
        confirm: true,
        payment_method_types: ['card'],
        metadata: meta,
      },
      { idempotencyKey: `final-offsession-${input.bookingId}-${finalCents}` }
    );

    await admin
      .from('bookings')
      .update({
        final_payment_intent_id: pi.id,
        stripe_payment_intent_remaining_id: pi.id,
      })
      .eq('id', input.bookingId);

    await logBookingPaymentEvent(admin, {
      bookingId: input.bookingId,
      eventType: 'final_intent_created',
      phase: 'final',
      status: pi.status,
      amountCents: finalCents,
      stripePaymentIntentId: pi.id,
      actorType: input.initiatedByAdmin ? 'admin' : 'system',
      actorUserId: input.actorUserId ?? null,
    });

    if (pi.status === 'succeeded') {
      await handleFinalPaymentSucceeded(admin, pi);
      return { ok: true };
    }
    if (pi.status === 'requires_action') {
      await admin
        .from('bookings')
        .update({
          payment_lifecycle_status: 'requires_customer_action',
          requires_customer_action_at: now,
          payout_blocked: true,
          payout_hold_reason: 'requires_customer_action',
        })
        .eq('id', input.bookingId);
      await syncBookingPaymentSummary(admin, input.bookingId);
      await logBookingPaymentEvent(admin, {
        bookingId: input.bookingId,
        eventType: 'final_payment_requires_action',
        phase: 'final',
        status: 'requires_action',
        stripePaymentIntentId: pi.id,
      });
      return { ok: false, code: 'requires_action' };
    }

    await handleFinalPaymentFailed(admin, {
      paymentIntentId: pi.id,
      failureCode: pi.last_payment_error?.code ?? 'unknown',
      failureMessage: pi.last_payment_error?.message ?? pi.status,
    });
    return { ok: false, code: 'failed' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await handleFinalPaymentFailed(admin, {
      paymentIntentId: '',
      failureCode: 'exception',
      failureMessage: msg,
    });
    return { ok: false, code: 'exception' };
  }
}

export async function handleFinalPaymentSucceeded(
  admin: AdminClient,
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const meta = paymentIntent.metadata as Record<string, string | undefined>;
  const bookingId = meta.booking_id ?? meta.bookingId;
  if (!bookingId) return;

  if (await paymentEventExists(admin, bookingId, 'final_payment_succeeded', paymentIntent.id)) {
    return;
  }

  const now = new Date().toISOString();
  const prevRow = await admin
    .from('bookings')
    .select('amount_paid_cents, deposit_amount_cents, amount_deposit')
    .eq('id', bookingId)
    .maybeSingle();
  const pr = prevRow.data as Record<string, unknown> | null;
  const depositPaid =
    Number(pr?.amount_paid_cents ?? 0) ||
    Number(pr?.deposit_amount_cents ?? pr?.amount_deposit ?? 0) ||
    0;
  const finalAmt = paymentIntent.amount;
  const newPaid = depositPaid + finalAmt;

  await admin
    .from('bookings')
    .update({
      final_payment_intent_id: paymentIntent.id,
      stripe_payment_intent_remaining_id: paymentIntent.id,
      final_payment_status: 'PAID',
      paid_remaining_at: now,
      fully_paid_at: now,
      amount_paid_cents: newPaid,
      payment_lifecycle_status: 'final_paid',
    })
    .eq('id', bookingId);

  await logBookingPaymentEvent(admin, {
    bookingId,
    eventType: 'final_payment_succeeded',
    phase: 'final',
    status: 'succeeded',
    amountCents: finalAmt,
    currency: paymentIntent.currency,
    stripePaymentIntentId: paymentIntent.id,
  });

  const ev = await evaluatePayoutEligibility(admin, bookingId);
  if (ev.eligible) {
    await admin
      .from('bookings')
      .update({
        payment_lifecycle_status: 'payout_ready',
        payout_blocked: false,
        payout_hold_reason: 'none',
        payout_eligible_at: now,
      })
      .eq('id', bookingId);
    await logBookingPaymentEvent(admin, {
      bookingId,
      eventType: 'payout_ready',
      phase: 'payout',
      status: 'ready',
      metadata: { after: 'final_payment_succeeded' },
    });
  } else {
    await admin
      .from('bookings')
      .update({
        payment_lifecycle_status: 'payout_on_hold',
        payout_blocked: true,
        payout_hold_reason: ev.holdReason,
      })
      .eq('id', bookingId);
    await logBookingPaymentEvent(admin, {
      bookingId,
      eventType: 'payout_blocked',
      phase: 'payout',
      status: 'blocked',
      metadata: { reason: ev.holdReason },
    });
  }

  await syncBookingPaymentSummary(admin, bookingId);
}

export async function handleFinalPaymentFailed(
  admin: AdminClient,
  input: { paymentIntentId: string; failureCode: string; failureMessage: string }
): Promise<void> {
  if (!input.paymentIntentId) return;

  let bookingId: string | null = null;
  if (stripeClient()) {
    try {
      const pi = await stripeClient()!.paymentIntents.retrieve(input.paymentIntentId);
      const meta = pi.metadata as Record<string, string | undefined>;
      bookingId = meta.booking_id ?? meta.bookingId ?? null;
    } catch {
      bookingId = null;
    }
  }
  if (!bookingId) return;

  if (await paymentEventExists(admin, bookingId, 'final_payment_failed', input.paymentIntentId)) {
    return;
  }

  const { data: row } = await admin
    .from('bookings')
    .select('final_charge_retry_count')
    .eq('id', bookingId)
    .maybeSingle();
  const nextRetry = Number((row as { final_charge_retry_count?: number } | null)?.final_charge_retry_count ?? 0) + 1;
  const now = new Date().toISOString();

  await admin
    .from('bookings')
    .update({
      final_charge_retry_count: nextRetry,
      payment_failed_at: now,
      payout_blocked: true,
      payout_hold_reason: 'charge_failed',
      payment_lifecycle_status: 'payment_failed',
      final_payment_status: 'FAILED',
    })
    .eq('id', bookingId);

  await logBookingPaymentEvent(admin, {
    bookingId,
    eventType: 'final_payment_failed',
    phase: 'final',
    status: 'failed',
    stripePaymentIntentId: input.paymentIntentId || null,
    metadata: {
      failure_code: input.failureCode,
      failure_message: input.failureMessage,
      retry_count: nextRetry,
    },
  });

  if (nextRetry < 3) {
    await logBookingPaymentEvent(admin, {
      bookingId,
      eventType: 'retry_scheduled',
      phase: 'final',
      status: 'scheduled',
      metadata: { attempt: nextRetry },
    });
  }

  await syncBookingPaymentSummary(admin, bookingId);
}

export async function evaluatePayoutEligibility(
  admin: AdminClient,
  bookingId: string
): Promise<{ eligible: boolean; holdReason: PayoutHoldReason }> {
  const { data: b, error } = await admin
    .from('bookings')
    .select(
      [
        'id',
        'status',
        'arrived_at',
        'started_at',
        'completed_at',
        'customer_confirmed',
        'auto_confirm_at',
        'dispute_open',
        'cancellation_reason',
        'paid_deposit_at',
        'paid_remaining_at',
        'refund_status',
        'suspicious_completion',
        'is_multi_day',
        'payout_released',
        'admin_hold',
        'dispute_status',
        'payment_lifecycle_status',
        'final_payment_status',
        'payout_blocked',
        'payout_hold_reason',
        'stripe_destination_account_id',
        'service_pros(stripe_account_id, user_id)',
      ].join(', ')
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (error || !b) {
    return { eligible: false, holdReason: 'missing_final_payment' };
  }

  const row = b as unknown as Record<string, unknown>;
  if (row.payout_released === true) {
    return { eligible: false, holdReason: 'none' };
  }
  if (row.admin_hold === true) {
    return { eligible: false, holdReason: 'admin_hold' };
  }
  if (String(row.dispute_status ?? 'none') !== 'none' || row.dispute_open === true) {
    return { eligible: false, holdReason: 'dispute_open' };
  }

  const lc = String(row.payment_lifecycle_status ?? '');
  const finalPaidLegacy =
    String((row as { final_payment_status?: string }).final_payment_status ?? '').toUpperCase() === 'PAID';
  const paidFinal =
    ['final_paid', 'payout_ready', 'payout_sent'].includes(lc) || finalPaidLegacy;
  if (!paidFinal) {
    return { eligible: false, holdReason: 'missing_final_payment' };
  }

  const isMultiFlag = row.is_multi_day === true;
  const gate = await resolveMilestonePayoutGate(admin, bookingId, isMultiFlag);
  if (gate.fetchError) {
    return { eligible: false, holdReason: 'insufficient_completion_evidence' };
  }

  const base = isPayoutEligible({
    status: String(row.status ?? ''),
    arrived_at: (row.arrived_at as string) ?? null,
    started_at: (row.started_at as string) ?? null,
    completed_at: (row.completed_at as string) ?? null,
    customer_confirmed: row.customer_confirmed === true,
    auto_confirm_at: (row.auto_confirm_at as string) ?? null,
    dispute_open: row.dispute_open === true,
    cancellation_reason: (row.cancellation_reason as string) ?? null,
    paid_deposit_at: (row.paid_deposit_at as string) ?? null,
    paid_remaining_at: (row.paid_remaining_at as string) ?? null,
    refund_status: (row.refund_status as string) ?? null,
    suspicious_completion: row.suspicious_completion === true,
    is_multi_day: gate.enforceMilestoneGate,
    multi_day_schedule_ok: gate.scheduleOk,
  });

  if (!base.eligible) {
    const r = base.reason ?? '';
    if (r.includes('not arrived')) return { eligible: false, holdReason: 'insufficient_completion_evidence' };
    if (r.includes('Dispute')) return { eligible: false, holdReason: 'dispute_open' };
    if (r.includes('no-show')) return { eligible: false, holdReason: 'no_show_review' };
    if (r.includes('Suspicious')) return { eligible: false, holdReason: 'fraud_review' };
    if (r.includes('Payment not complete')) return { eligible: false, holdReason: 'missing_final_payment' };
    if (r.includes('confirm')) return { eligible: false, holdReason: 'insufficient_completion_evidence' };
    return { eligible: false, holdReason: 'insufficient_completion_evidence' };
  }

  const { data: jc } = await admin
    .from('job_completions')
    .select('after_photo_urls, booking_id')
    .eq('booking_id', bookingId)
    .maybeSingle();
  const rawUrls = (jc as { after_photo_urls?: string[] } | null)?.after_photo_urls ?? [];
  const validUrls = rawUrls.filter(
    (u): u is string =>
      typeof u === 'string' &&
      u.trim().length > 5 &&
      !/^(placeholder|n\/a|none|null|undefined)$/i.test(u.trim())
  );
  if (validUrls.length < 2) {
    return { eligible: false, holdReason: 'insufficient_completion_evidence' };
  }

  const dest =
    (row.stripe_destination_account_id as string) ??
    ((row.service_pros as { stripe_account_id?: string })?.stripe_account_id ?? '');
  if (!dest) {
    return { eligible: false, holdReason: 'missing_payment_method' };
  }

  const proUser = (row.service_pros as { user_id?: string })?.user_id;
  if (proUser) {
    const risk = await evaluatePayoutRiskForPro(proUser);
    if (risk.payoutsOnHold) {
      return { eligible: false, holdReason: 'fraud_review' };
    }
  }

  return { eligible: true, holdReason: 'none' };
}

export async function releasePayout(
  admin: AdminClient,
  input: { bookingId: string; initiatedByAdmin?: boolean; actorUserId?: string | null }
): Promise<{ ok: boolean; code?: string; transferId?: string | null }> {
  const ev = await evaluatePayoutEligibility(admin, input.bookingId);
  if (!ev.eligible) {
    return { ok: false, code: ev.holdReason };
  }

  const { data: holdRow } = await admin
    .from('bookings')
    .select('payout_blocked, payout_hold_reason')
    .eq('id', input.bookingId)
    .maybeSingle();
  const h = holdRow as { payout_blocked?: boolean; payout_hold_reason?: string | null } | null;
  const hardHolds = new Set([
    'charge_failed',
    'requires_customer_action',
    'missing_payment_method',
    'dispute_open',
    'admin_hold',
    'fraud_review',
    'no_show_review',
  ]);
  if (
    !input.initiatedByAdmin &&
    h?.payout_blocked &&
    hardHolds.has(String(h.payout_hold_reason ?? ''))
  ) {
    return { ok: false, code: 'payout_blocked' };
  }

  try {
    const { data: bpGuard } = await admin
      .from('booking_payouts')
      .select('stripe_transfer_id, status')
      .eq('booking_id', input.bookingId)
      .maybeSingle();
    const bg = bpGuard as { stripe_transfer_id?: string | null; status?: string | null } | null;
    if (bg?.stripe_transfer_id != null && String(bg.stripe_transfer_id).trim() !== '') {
      return { ok: false, code: 'already_released' };
    }
    if (bg?.status === 'released') {
      return { ok: false, code: 'already_released' };
    }
  } catch {
    // booking_payouts optional in some environments
  }

  const { data: b } = await admin
    .from('bookings')
    .select(
      [
        'id',
        'pro_id',
        'total_amount_cents',
        'amount_total',
        'amount_subtotal',
        'customer_fees_retained_cents',
        'amount_platform_fee',
        'refunded_total_cents',
        'amount_refunded_cents',
        'currency',
        'stripe_destination_account_id',
        'final_payment_intent_id',
        'payout_released',
        'service_pros(stripe_account_id, user_id)',
      ].join(', ')
    )
    .eq('id', input.bookingId)
    .maybeSingle();

  if (!b || (b as unknown as { payout_released?: boolean }).payout_released) {
    return { ok: false, code: 'already_released' };
  }

  const row = b as unknown as Record<string, unknown>;
  const dest =
    (row.stripe_destination_account_id as string) ??
    ((row.service_pros as { stripe_account_id?: string })?.stripe_account_id ?? '');
  if (!dest) return { ok: false, code: 'no_destination' };

  const subtotalCents = Number(row.amount_subtotal ?? 0) || 0;
  const { payoutCents: netToPro } = resolveProPayoutTransferCents({
    total_amount_cents: row.total_amount_cents as number | null,
    amount_total: row.amount_total as number | null,
    customer_fees_retained_cents: row.customer_fees_retained_cents as number | null,
    amount_platform_fee: row.amount_platform_fee as number | null,
    refunded_total_cents: (row.amount_refunded_cents ?? row.refunded_total_cents) as number | null,
    amount_subtotal: subtotalCents > 0 ? subtotalCents : null,
  });

  if (netToPro <= 0) return { ok: false, code: 'zero_amount' };

  const currency = String(row.currency ?? 'usd').toLowerCase();
  const finalPi = (row.final_payment_intent_id as string) ?? '';

  const transferId = await createTransfer({
    amount: netToPro,
    currency,
    destinationAccountId: dest,
    bookingId: input.bookingId,
    metadata: {
      booking_id: input.bookingId,
      payout_phase: 'transfer',
      linked_final_payment_intent_id: finalPi,
      payout_amount_cents: String(netToPro),
      pro_id: String(row.pro_id ?? ''),
    },
    idempotencyKey: `payout-booking-${input.bookingId}`,
  });

  if (!transferId) return { ok: false, code: 'transfer_failed' };

  const now = new Date().toISOString();

  try {
    await admin.from('booking_payouts').upsert(
      {
        booking_id: input.bookingId,
        amount_cents: netToPro,
        currency,
        status: 'released',
        stripe_transfer_id: transferId,
        idempotency_key: `payout-booking-${input.bookingId}`,
        updated_at: now,
      },
      { onConflict: 'booking_id' }
    );
  } catch (e) {
    console.warn('[releasePayout] booking_payouts upsert failed', input.bookingId, e);
  }

  await admin
    .from('bookings')
    .update({
      payout_released: true,
      payout_status: 'succeeded',
      payout_timestamp: now,
      payout_released_at: now,
      stripe_transfer_id: transferId,
      payout_transfer_id: transferId,
      transferred_total_cents: netToPro,
      payout_amount_cents: netToPro,
      payment_lifecycle_status: 'payout_sent',
    })
    .eq('id', input.bookingId);

  await syncBookingPaymentSummary(admin, input.bookingId);
  await logBookingPaymentEvent(admin, {
    bookingId: input.bookingId,
    eventType: 'payout_sent',
    phase: 'payout',
    status: 'sent',
    amountCents: netToPro,
    stripeTransferId: transferId,
    actorType: input.initiatedByAdmin ? 'admin' : 'system',
    actorUserId: input.actorUserId ?? null,
  });

  return { ok: true, transferId };
}

export async function openDispute(
  admin: AdminClient,
  input: { bookingId: string; reportedByUserId: string; customerClaim: string }
): Promise<{ disputeId: string | null }> {
  const summary = input.customerClaim.trim().slice(0, 2000);
  const now = new Date().toISOString();

  const { data: ins, error } = await admin
    .from('booking_disputes')
    .insert({
      booking_id: input.bookingId,
      status: 'issue_reported',
      customer_claim: input.customerClaim,
      reported_by_user_id: input.reportedByUserId,
    })
    .select('id')
    .single();

  if (error || !ins) {
    return { disputeId: null };
  }

  await admin
    .from('bookings')
    .update({
      dispute_status: 'issue_reported',
      dispute_open: true,
      issue_reported_at: now,
      issue_summary: summary,
      payout_blocked: true,
      payout_hold_reason: 'dispute_open',
      payment_lifecycle_status: 'payout_on_hold',
    })
    .eq('id', input.bookingId);

  await syncBookingPaymentSummary(admin, input.bookingId);
  await logBookingPaymentEvent(admin, {
    bookingId: input.bookingId,
    eventType: 'dispute_opened',
    phase: 'dispute',
    status: 'issue_reported',
    actorType: 'customer',
    actorUserId: input.reportedByUserId,
    metadata: { dispute_id: (ins as { id: string }).id },
  });

  return { disputeId: (ins as { id: string }).id };
}

export async function resolveDispute(
  admin: AdminClient,
  input: {
    disputeId: string;
    adminUserId: string;
    resolution: 'customer_favor' | 'pro_favor' | 'split';
    refundAmountCents?: number;
    adjustedFinalAmountCents?: number;
    adjustedPayoutAmountCents?: number;
    resolutionNotes?: string;
  }
): Promise<void> {
  const { data: d0 } = await admin.from('booking_disputes').select('booking_id').eq('id', input.disputeId).maybeSingle();
  const bookingId = (d0 as { booking_id?: string } | null)?.booking_id;
  if (!bookingId) return;

  const disputeStatus: BookingDisputeStatus =
    input.resolution === 'customer_favor'
      ? 'resolved_customer_favor'
      : input.resolution === 'pro_favor'
        ? 'resolved_pro_favor'
        : 'split_resolution';

  await admin
    .from('booking_disputes')
    .update({
      status: disputeStatus,
      resolution: input.resolution,
      resolution_notes: input.resolutionNotes ?? null,
      assigned_admin_user_id: input.adminUserId,
      refund_amount_cents: input.refundAmountCents ?? 0,
      adjusted_final_amount_cents: input.adjustedFinalAmountCents ?? null,
      adjusted_payout_amount_cents: input.adjustedPayoutAmountCents ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', input.disputeId);

  const patch: Record<string, unknown> = {
    dispute_status: disputeStatus,
    dispute_open: false,
  };
  if (typeof input.adjustedFinalAmountCents === 'number') {
    patch.final_amount_cents = input.adjustedFinalAmountCents;
    patch.remaining_amount_cents = input.adjustedFinalAmountCents;
  }
  if (typeof input.adjustedPayoutAmountCents === 'number') {
    patch.payout_amount_cents = input.adjustedPayoutAmountCents;
  }

  await admin.from('bookings').update(patch).eq('id', bookingId);

  if (input.refundAmountCents && input.refundAmountCents > 0) {
    const { data: b } = await admin
      .from('bookings')
      .select('final_payment_intent_id, stripe_payment_intent_remaining_id, payment_intent_id, stripe_payment_intent_deposit_id')
      .eq('id', bookingId)
      .maybeSingle();
    const br = b as Record<string, string | null> | null;
    const piRefund =
      br?.final_payment_intent_id ?? br?.stripe_payment_intent_remaining_id ?? br?.payment_intent_id ?? null;
    if (piRefund) {
      await refundPaymentIntentPartial(piRefund, input.refundAmountCents, {
        metadata: {
          booking_id: bookingId,
          payment_phase: 'refund',
          refund_scope: 'partial',
          resolution_type: input.resolution,
          dispute_id: input.disputeId,
        },
        idempotencyKey: `dispute-partial-refund-${input.disputeId}-${piRefund}-${input.refundAmountCents}`,
      });
    }
  }

  const ev = await evaluatePayoutEligibility(admin, bookingId);
  await admin
    .from('bookings')
    .update({
      payout_blocked: !ev.eligible,
      payout_hold_reason: ev.eligible ? 'none' : assertPayoutHoldReason(ev.holdReason),
    })
    .eq('id', bookingId);

  await syncBookingPaymentSummary(admin, bookingId);
  await logBookingPaymentEvent(admin, {
    bookingId,
    eventType: 'dispute_resolved',
    phase: 'dispute',
    status: input.resolution,
    actorType: 'admin',
    actorUserId: input.adminUserId,
    metadata: {
      dispute_id: input.disputeId,
      refund_amount_cents: input.refundAmountCents ?? 0,
    },
  });
}

/** Server/admin replay: creates a deposit PaymentIntent using frozen booking amounts (narrow path). */
export async function createDepositPaymentIntent(input: {
  bookingId: string;
  customerUserId: string;
  customerEmail?: string | null;
}): Promise<
  | { ok: true; clientSecret: string | null; paymentIntentId: string }
  | { ok: false; code: string; message?: string }
> {
  const s = stripeClient();
  if (!s) return { ok: false, code: 'no_stripe' };

  const admin = createSupabaseAdmin();
  const { data: booking, error } = await admin
    .from('bookings')
    .select('id, customer_id, pro_id, status, address, service_date, service_time, pricing_version, subtotal_cents, deposit_amount_cents, amount_deposit')
    .eq('id', input.bookingId)
    .maybeSingle();

  if (error || !booking) return { ok: false, code: 'not_found' };
  if ((booking as { customer_id?: string }).customer_id !== input.customerUserId) {
    return { ok: false, code: 'forbidden' };
  }

  const amountDeposit =
    Number((booking as { deposit_amount_cents?: number }).deposit_amount_cents ?? 0) ||
    Number((booking as { amount_deposit?: number }).amount_deposit ?? 0);
  if (!Number.isFinite(amountDeposit) || amountDeposit <= 0) {
    return { ok: false, code: 'bad_amount' };
  }

  const cust = await getOrCreateStripeCustomer(input.customerUserId, input.customerEmail ?? null);
  if ('error' in cust) return { ok: false, code: 'stripe_customer', message: cust.error };

  const stripeFields = buildBookingPaymentIntentStripeFields({
    bookingId: input.bookingId,
    customerId: input.customerUserId,
    proId: String((booking as { pro_id: string }).pro_id),
    paymentPhase: 'deposit',
    serviceTitle: 'Service',
    pricing: {
      pricing_version: (booking as { pricing_version?: string }).pricing_version ?? undefined,
      subtotal_cents: Number((booking as { subtotal_cents?: number }).subtotal_cents ?? 0) || undefined,
    },
  });
  const meta = appendLifecyclePaymentIntentMetadata(
    {
      booking_id: input.bookingId,
      customer_id: input.customerUserId,
      pro_id: String((booking as { pro_id: string }).pro_id),
      booking_service_status: String((booking as { status?: string }).status ?? ''),
      pricing_version: String((booking as { pricing_version?: string }).pricing_version ?? ''),
      subtotal_cents: Number((booking as { subtotal_cents?: number }).subtotal_cents ?? 0) || 0,
      platform_fee_cents: 0,
      deposit_amount_cents: amountDeposit,
      final_amount_cents: 0,
      total_amount_cents: amountDeposit,
    },
    'deposit'
  );
  const metadata = capStripeBookingPaymentMetadata({ ...stripeFields.metadata, ...meta });

  const pi = await s.paymentIntents.create(
    {
      amount: amountDeposit,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      customer: cust.stripeCustomerId,
      setup_future_usage: 'off_session',
      metadata,
      description: stripeFields.description,
      statement_descriptor_suffix: stripeFields.statement_descriptor_suffix,
    },
    { idempotencyKey: `deposit-lifecycle-${input.bookingId}` }
  );

  await finalizeDepositPaymentIntentProvisioning(admin, {
    bookingId: input.bookingId,
    paymentIntentId: pi.id,
    currency: 'usd',
    amountDepositCents: amountDeposit,
  });

  return { ok: true, clientSecret: pi.client_secret ?? null, paymentIntentId: pi.id };
}
