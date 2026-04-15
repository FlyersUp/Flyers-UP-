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
import {
  appendLifecyclePaymentIntentMetadata,
  refundLifecycleMetadata,
  transferLifecycleStripeMetadata,
} from '@/lib/stripe/booking-payment-metadata-lifecycle';
import { assertUnifiedBookingPaymentIntentMetadata } from '@/lib/stripe/payment-intent-metadata-unified';
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
import { getPayoutReleaseEligibilitySnapshot } from '@/lib/bookings/payout-release-eligibility-snapshot';
import {
  getBookingWorkflowStatusAfterFinalPayment,
  resolvePayoutLifecyclePatchAfterFinalPayment,
} from '@/lib/bookings/final-payment-post-success-model';
import { assertPayoutHoldReason } from '@/lib/bookings/payment-lifecycle-types';
import {
  coalesceBookingDepositPaymentIntentId,
  coalesceBookingFinalPaymentIntentId,
  type BookingFinalPaymentIntentIdRow,
} from '@/lib/bookings/money-state';
import {
  finalPaymentAutoRetryCountCeiling,
  hoursBeforeNextFinalPaymentCronAttempt,
  mapStripeFailureCodeToFinalPaymentRetryReason,
} from '@/lib/bookings/final-payment-retry-reason';
import {
  appendBookingRefundEvent,
  bookingRefundEventExistsForStripeEvent,
  legacyWebhookChargeRefundLedgerDup,
} from '@/lib/bookings/booking-refund-ledger';
import { recordRefundAfterPayoutRemediation } from '@/lib/bookings/refund-remediation';
import { PAYOUT_REVIEW_QUEUE_OPEN_STATUSES } from '@/lib/admin/payout-review-queue-status';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

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
  // Incremental refunds fire many `charge.refunded` events for the same PI; dedupe on Stripe event id.
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
  } else if (input.stripePaymentIntentId) {
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
        'stripe_payment_intent_remaining_id',
        'payment_intent_id',
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
      deposit_payment_intent_id: coalesceBookingDepositPaymentIntentId(row as BookingFinalPaymentIntentIdRow),
      final_payment_intent_id: coalesceBookingFinalPaymentIntentId(row as BookingFinalPaymentIntentIdRow),
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
  if (String(row.payment_lifecycle_status ?? '').trim() === 'cancelled_during_review') {
    return { ok: false, code: 'cancelled_during_review' };
  }
  if (String(row.final_payment_status ?? '').toUpperCase() === 'CANCELLED') {
    return { ok: false, code: 'final_cancelled' };
  }

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
          final_payment_retry_reason: 'requires_action',
          last_failure_code: pi.last_payment_error?.code ?? 'requires_action',
          last_failure_message:
            pi.last_payment_error?.message ?? 'This payment requires additional authentication.',
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
      declineCode: pi.last_payment_error?.decline_code ?? null,
    });
    return { ok: false, code: 'failed' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[attemptFinalCharge] exception', { bookingId: input.bookingId, message: msg });
    await recoverFinalChargeException(admin, input.bookingId, msg);
    return { ok: false, code: 'exception' };
  }
}

/**
 * Stripe client threw before a PaymentIntent id existed — move booking out of final_processing and notify customer.
 */
export async function recoverFinalChargeException(
  admin: AdminClient,
  bookingId: string,
  errorMessage: string
): Promise<void> {
  const { data: row } = await admin
    .from('bookings')
    .select('payment_lifecycle_status, final_charge_retry_count, customer_id')
    .eq('id', bookingId)
    .maybeSingle();

  const lc = String((row as { payment_lifecycle_status?: string } | null)?.payment_lifecycle_status ?? '');
  if (lc !== 'final_processing') return;

  const nextRetry =
    Number((row as { final_charge_retry_count?: number } | null)?.final_charge_retry_count ?? 0) + 1;
  const now = new Date().toISOString();

  await admin
    .from('bookings')
    .update({
      payment_lifecycle_status: 'payment_failed',
      payment_failed_at: now,
      payout_blocked: true,
      payout_hold_reason: 'charge_failed',
      final_payment_status: 'FAILED',
      final_charge_retry_count: nextRetry,
      final_payment_retry_reason: 'unknown',
      last_failure_code: 'exception',
      last_failure_message: errorMessage,
    })
    .eq('id', bookingId)
    .eq('payment_lifecycle_status', 'final_processing');

  await logBookingPaymentEvent(admin, {
    bookingId,
    eventType: 'final_payment_failed',
    phase: 'final',
    status: 'exception',
    metadata: {
      failure_message: errorMessage,
      retry_count: nextRetry,
      no_payment_intent: true,
      final_payment_retry_reason: 'unknown',
    },
  });
  await syncBookingPaymentSummary(admin, bookingId);

  const cid = (row as { customer_id?: string } | null)?.customer_id;
    if (cid) {
    void createNotificationEvent({
      userId: cid,
      type: NOTIFICATION_TYPES.PAYMENT_FAILED,
      bookingId,
      titleOverride: 'Your payment failed — update your card',
      bodyOverride:
        'Open your booking to update your payment method or complete the remaining balance.',
      basePath: 'customer',
      dedupeKey: `final_charge_exception:${bookingId}:${nextRetry}`,
    });
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
    .select(
      'amount_paid_cents, deposit_amount_cents, amount_deposit, status, status_history, customer_id'
    )
    .eq('id', bookingId)
    .maybeSingle();
  const pr = prevRow.data as Record<string, unknown> | null;
  const depositPaid =
    Number(pr?.amount_paid_cents ?? 0) ||
    Number(pr?.deposit_amount_cents ?? pr?.amount_deposit ?? 0) ||
    0;
  const finalAmt = paymentIntent.amount;
  const newPaid = depositPaid + finalAmt;

  const prevStatus = String(pr?.status ?? '');
  const history = Array.isArray(pr?.status_history)
    ? ([...(pr!.status_history as { status: string; at: string }[])] as { status: string; at: string }[])
    : [];
  const nextBookingStatus = getBookingWorkflowStatusAfterFinalPayment(prevStatus);
  const nextHistory = [...history, { status: nextBookingStatus, at: now }];

  await admin
    .from('bookings')
    .update({
      final_payment_intent_id: paymentIntent.id,
      stripe_payment_intent_remaining_id: paymentIntent.id,
      final_payment_status: 'PAID',
      paid_remaining_at: now,
      fully_paid_at: now,
      amount_paid_cents: newPaid,
      /**
       * Do not set `payment_lifecycle_status` here: remainder settlement is `final_payment_status` + timestamps;
       * the follow-up update applies {@link resolvePayoutLifecyclePatchAfterFinalPayment} from {@link evaluatePayoutEligibility}.
       */
      status: nextBookingStatus,
      status_history: nextHistory,
      final_payment_retry_reason: null,
      last_failure_code: null,
      last_failure_message: null,
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

  const customerId = (pr?.customer_id as string | undefined) ?? null;
  if (customerId) {
    const dollars = (finalAmt / 100).toFixed(2);
    void createNotificationEvent({
      userId: customerId,
      type: NOTIFICATION_TYPES.PAYMENT_REMAINING_PAID,
      bookingId,
      titleOverride: 'Remaining balance charged',
      bodyOverride: `We charged $${dollars} to your saved card. View your booking for your receipt.`,
      basePath: 'customer',
      dedupeKey: `final_remaining_paid_pi:${paymentIntent.id}`,
    });
  }

  const ev = await evaluatePayoutEligibility(admin, bookingId);
  const payoutPatch = resolvePayoutLifecyclePatchAfterFinalPayment(ev);
  await admin
    .from('bookings')
    .update({
      ...payoutPatch,
      ...(ev.eligible ? { payout_eligible_at: now } : {}),
    })
    .eq('id', bookingId);

  if (ev.eligible) {
    await logBookingPaymentEvent(admin, {
      bookingId,
      eventType: 'payout_ready',
      phase: 'payout',
      status: 'ready',
      metadata: { after: 'final_payment_succeeded' },
    });
  } else {
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
  input: {
    paymentIntentId: string;
    failureCode: string;
    failureMessage: string;
    declineCode?: string | null;
  }
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

  const retryReason = mapStripeFailureCodeToFinalPaymentRetryReason(
    input.failureCode,
    input.declineCode
  );
  const { data: row } = await admin
    .from('bookings')
    .select('final_charge_retry_count')
    .eq('id', bookingId)
    .maybeSingle();
  const prevRetryCount = Number(
    (row as { final_charge_retry_count?: number } | null)?.final_charge_retry_count ?? 0
  );
  const now = new Date().toISOString();

  if (retryReason === 'requires_action') {
    await admin
      .from('bookings')
      .update({
        final_payment_retry_reason: retryReason,
        last_failure_code: input.failureCode,
        last_failure_message: input.failureMessage,
        payment_failed_at: now,
        payout_blocked: true,
        payout_hold_reason: 'requires_customer_action',
        payment_lifecycle_status: 'requires_customer_action',
        requires_customer_action_at: now,
        final_charge_retry_count: prevRetryCount,
        final_payment_status: 'FAILED',
      })
      .eq('id', bookingId);

    await logBookingPaymentEvent(admin, {
      bookingId,
      eventType: 'final_payment_failed',
      phase: 'final',
      status: 'requires_action',
      stripePaymentIntentId: input.paymentIntentId || null,
      metadata: {
        failure_code: input.failureCode,
        failure_message: input.failureMessage,
        decline_code: input.declineCode ?? null,
        retry_count: prevRetryCount,
        final_payment_retry_reason: retryReason,
        auto_retry: false,
      },
    });

    await syncBookingPaymentSummary(admin, bookingId);

    const { data: cust } = await admin.from('bookings').select('customer_id').eq('id', bookingId).maybeSingle();
    const cid = (cust as { customer_id?: string } | null)?.customer_id;
    if (cid) {
      void createNotificationEvent({
        userId: cid,
        type: NOTIFICATION_TYPES.PAYMENT_FAILED,
        bookingId,
        titleOverride: 'Action required to complete payment',
        bodyOverride:
          'Open your booking to authenticate with your bank or update your payment method.',
        basePath: 'customer',
        dedupeKey: `final_pi_requires_action:${input.paymentIntentId}`,
      });
    }
    return;
  }

  const nextRetry = prevRetryCount + 1;
  const retryCeiling = finalPaymentAutoRetryCountCeiling(retryReason);

  await admin
    .from('bookings')
    .update({
      final_charge_retry_count: nextRetry,
      final_payment_retry_reason: retryReason,
      last_failure_code: input.failureCode,
      last_failure_message: input.failureMessage,
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
      decline_code: input.declineCode ?? null,
      retry_count: nextRetry,
      final_payment_retry_reason: retryReason,
    },
  });

  if (nextRetry < retryCeiling) {
    await logBookingPaymentEvent(admin, {
      bookingId,
      eventType: 'retry_scheduled',
      phase: 'final',
      status: 'scheduled',
      metadata: { attempt: nextRetry, final_payment_retry_reason: retryReason },
    });
  }

  await syncBookingPaymentSummary(admin, bookingId);

  const { data: cust } = await admin.from('bookings').select('customer_id').eq('id', bookingId).maybeSingle();
  const cid = (cust as { customer_id?: string } | null)?.customer_id;
  if (cid) {
    void createNotificationEvent({
      userId: cid,
      type: NOTIFICATION_TYPES.PAYMENT_FAILED,
      bookingId,
      titleOverride: 'Your payment failed — update your card',
      bodyOverride:
        'Open your booking to update your payment method or complete the remaining balance.',
      basePath: 'customer',
      dedupeKey: `final_pi_failed:${input.paymentIntentId}`,
    });
  }
}

export type PayoutTransferEvaluation =
  | { ok: true }
  | { ok: false; holdReason: PayoutHoldReason; flagForAdminReview: boolean };

/**
 * Eligibility for Stripe transfer (cron auto-release or admin approve_payout).
 * Differs from {@link evaluatePayoutEligibility}: uses post-completion review window for automatic
 * release, optional admin bypass for confirmation/photos/suspicious flags, and enforces Connect readiness.
 */
export async function evaluatePayoutTransferEligibility(
  admin: AdminClient,
  bookingId: string,
  opts: { initiatedByAdmin: boolean }
): Promise<PayoutTransferEvaluation> {
  const snap = await getPayoutReleaseEligibilitySnapshot(admin, bookingId, {
    initiatedByAdmin: opts.initiatedByAdmin,
  });
  if (snap.eligible) return { ok: true };
  return { ok: false, holdReason: snap.holdReason, flagForAdminReview: snap.flagForAdminReview };
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
    lc === 'paid' ||
    ['final_paid', 'payout_ready', 'payout_sent'].includes(lc) ||
    finalPaidLegacy;
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
    payment_lifecycle_status: (row.payment_lifecycle_status as string | null | undefined) ?? null,
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
  const initiatedByAdmin = input.initiatedByAdmin === true;
  const transferEv = await evaluatePayoutTransferEligibility(admin, input.bookingId, { initiatedByAdmin });
  if (!transferEv.ok) {
    return { ok: false, code: transferEv.holdReason };
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
    'customer_refunded',
  ]);
  if (
    !initiatedByAdmin &&
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
        'stripe_payment_intent_remaining_id',
        'payment_intent_id',
        'stripe_payment_intent_deposit_id',
        'deposit_payment_intent_id',
        'payout_released',
        'pricing_version',
        'deposit_amount_cents',
        'amount_deposit',
        'final_amount_cents',
        'remaining_amount_cents',
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
  const finalPi = coalesceBookingFinalPaymentIntentId(row as BookingFinalPaymentIntentIdRow) ?? '';

  const totalCents = Number(row.total_amount_cents ?? row.amount_total ?? 0) || 0;
  const depRow = Number(row.deposit_amount_cents ?? row.amount_deposit ?? 0) || 0;
  const finRow = Number(row.final_amount_cents ?? row.remaining_amount_cents ?? 0) || 0;
  const platformFee = Number(row.amount_platform_fee ?? 0) || 0;
  const pricingVersion =
    typeof row.pricing_version === 'string' ? row.pricing_version : null;

  const transferMeta = transferLifecycleStripeMetadata({
    booking_id: input.bookingId,
    linked_final_payment_intent_id: finalPi,
    payout_amount_cents: netToPro,
    pro_id: String(row.pro_id ?? ''),
    subtotal_cents: subtotalCents,
    total_amount_cents: totalCents,
    platform_fee_cents: platformFee,
    deposit_amount_cents: depRow,
    final_amount_cents: finRow,
    pricing_version: pricingVersion,
  });

  const transferId = await createTransfer({
    amount: netToPro,
    currency,
    destinationAccountId: dest,
    bookingId: input.bookingId,
    metadata: transferMeta,
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
      requires_admin_review: false,
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

/**
 * Admin “approve & release payout”: audit snapshot, {@link releasePayout} with full server eligibility,
 * then mark pending `payout_review_queue` rows for the booking approved.
 */
export async function runAdminApprovePayoutRelease(
  admin: AdminClient,
  input: { bookingId: string; actorUserId: string }
): Promise<{ ok: boolean; code?: string; transferId?: string | null; amountTransferredCents?: number }> {
  const id = input.bookingId;
  const { data: snap } = await admin
    .from('bookings')
    .select(
      'requires_admin_review, payout_hold_reason, suspicious_completion, suspicious_completion_reason, payment_lifecycle_status'
    )
    .eq('id', id)
    .maybeSingle();
  const snapRow = snap as Record<string, unknown> | null;
  await logBookingPaymentEvent(admin, {
    bookingId: id,
    eventType: 'admin_payout_approve_attempted',
    phase: 'payout',
    status: 'attempted',
    actorType: 'admin',
    actorUserId: input.actorUserId,
    metadata: {
      requires_admin_review_before: snapRow?.requires_admin_review === true,
      payout_hold_reason: snapRow?.payout_hold_reason ?? null,
      suspicious_completion: snapRow?.suspicious_completion === true,
      suspicious_completion_reason: snapRow?.suspicious_completion_reason ?? null,
      payment_lifecycle_status: snapRow?.payment_lifecycle_status ?? null,
    },
  });

  const out = await releasePayout(admin, { bookingId: id, initiatedByAdmin: true, actorUserId: input.actorUserId });
  if (!out.ok) {
    return { ok: false, code: out.code, transferId: out.transferId ?? null };
  }
  const now = new Date().toISOString();
  await admin
    .from('payout_review_queue')
    .update({
      status: 'approved',
      reviewed_by: input.actorUserId,
      reviewed_at: now,
    })
    .eq('booking_id', id)
    .in('status', ['pending_review', 'held']);

  const { data: bRow } = await admin.from('bookings').select('transferred_total_cents').eq('id', id).maybeSingle();
  const amountCents = Number((bRow as { transferred_total_cents?: number } | null)?.transferred_total_cents ?? 0) || 0;
  await logBookingPaymentEvent(admin, {
    bookingId: id,
    eventType: 'payout_released',
    phase: 'payout',
    status: 'released',
    amountCents,
    stripeTransferId: out.transferId ?? null,
    actorType: 'admin',
    actorUserId: input.actorUserId,
    metadata: {
      source: 'admin_override',
      pre_review_snapshot: {
        payout_hold_reason: snapRow?.payout_hold_reason ?? null,
        suspicious_completion: snapRow?.suspicious_completion === true,
      },
    },
  });
  return { ok: true, transferId: out.transferId ?? null, amountTransferredCents: amountCents };
}

/**
 * Admin “keep on hold”: no Stripe transfer, no refund; booking stays flagged for review.
 * Updates or creates `payout_review_queue` row to status `held` with optional reason + internal note.
 */
export async function runAdminKeepPayoutOnHold(
  admin: AdminClient,
  input: {
    bookingId: string;
    actorUserId: string;
    holdReason?: string | null;
    internalNote?: string | null;
  }
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const now = new Date().toISOString();
  const { data: b, error: bErr } = await admin
    .from('bookings')
    .select('id, payout_released')
    .eq('id', input.bookingId)
    .maybeSingle();
  if (bErr || !b) return { ok: false, error: 'not_found' };
  if ((b as { payout_released?: boolean }).payout_released === true) {
    return { ok: false, error: 'already_released' };
  }

  await admin.from('bookings').update({ requires_admin_review: true }).eq('id', input.bookingId);

  const { data: q } = await admin
    .from('payout_review_queue')
    .select('id, details, reason, status')
    .eq('booking_id', input.bookingId)
    .maybeSingle();

  const prevDetails =
    q?.details != null && typeof q.details === 'object' && !Array.isArray(q.details)
      ? (q.details as Record<string, unknown>)
      : {};
  const nextDetails: Record<string, unknown> = {
    ...prevDetails,
    hold_reason: input.holdReason?.trim() || null,
    internal_note: input.internalNote?.trim() || null,
    keep_on_hold_at: now,
    keep_on_hold_by: input.actorUserId,
  };

  if (q) {
    const { error } = await admin
      .from('payout_review_queue')
      .update({
        status: 'held',
        reviewed_by: input.actorUserId,
        reviewed_at: now,
        details: nextDetails,
      })
      .eq('id', (q as { id: string }).id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await admin.from('payout_review_queue').insert({
      booking_id: input.bookingId,
      reason: 'payout_blocked',
      details: { ...nextDetails, source: 'admin_keep_on_hold' },
      status: 'held',
      reviewed_by: input.actorUserId,
      reviewed_at: now,
    });
    if (error) return { ok: false, error: error.message };
  }

  await logBookingPaymentEvent(admin, {
    bookingId: input.bookingId,
    eventType: 'admin_payout_keep_on_hold',
    phase: 'payout',
    status: 'held',
    actorType: 'admin',
    actorUserId: input.actorUserId,
    metadata: {
      hold_reason: input.holdReason ?? null,
      internal_note: input.internalNote ?? null,
      queue_row_existed: Boolean(q),
    },
  });

  return { ok: true, message: 'Payout remains on hold pending further review.' };
}

/**
 * Admin “refund customer” from payout review: full Stripe refund, booking lifecycle updated,
 * clears manual review flag, marks open `payout_review_queue` rows refunded, blocks future payout.
 */
export async function runAdminRefundCustomer(
  admin: AdminClient,
  input: {
    bookingId: string;
    actorUserId: string;
    refundReason?: string | null;
    internalNote?: string | null;
  }
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const id = input.bookingId;
  const stripe = stripeClient();
  if (!stripe) {
    return { ok: false, error: 'stripe_not_configured' };
  }

  const { data: b, error: bErr } = await admin
    .from('bookings')
    .select(
      [
        'id',
        'payout_released',
        'final_payment_intent_id',
        'stripe_payment_intent_remaining_id',
        'stripe_payment_intent_deposit_id',
        'deposit_payment_intent_id',
        'payment_intent_id',
        'payment_lifecycle_status',
        'refund_status',
        'deposit_amount_cents',
        'amount_deposit',
        'final_amount_cents',
        'remaining_amount_cents',
        'subtotal_cents',
        'total_amount_cents',
        'amount_total',
        'amount_platform_fee',
        'pricing_version',
        'stripe_transfer_id',
        'payout_transfer_id',
      ].join(', ')
    )
    .eq('id', id)
    .maybeSingle();
  if (bErr || !b) return { ok: false, error: 'not_found' };
  const br = b as unknown as Record<string, string | boolean | number | null | undefined>;
  const payoutReleased = br.payout_released === true;
  const lc = String(br.payment_lifecycle_status ?? '');
  const rs = String(br.refund_status ?? '').toLowerCase();
  if (lc === 'refunded' || rs === 'succeeded') {
    return { ok: false, error: 'already_refunded' };
  }

  const piFinal = coalesceBookingFinalPaymentIntentId(br as BookingFinalPaymentIntentIdRow);
  const piDep = coalesceBookingDepositPaymentIntentId(br as BookingFinalPaymentIntentIdRow);
  if (!piFinal && !piDep) {
    return { ok: false, error: 'no_payment_intent' };
  }

  const depCents =
    Number(br.deposit_amount_cents ?? br.amount_deposit ?? 0) || 0;
  const finalCents =
    Number(br.final_amount_cents ?? br.remaining_amount_cents ?? 0) || 0;
  const subtotalSnap = Number(br.subtotal_cents ?? 0) || 0;
  const totalSnap =
    Number(br.total_amount_cents ?? br.amount_total ?? 0) || 0;
  const platformSnap = Number(br.amount_platform_fee ?? 0) || 0;
  const pricingSnap = typeof br.pricing_version === 'string' ? br.pricing_version : null;

  const refundType = payoutReleased ? 'after_payout' : 'before_payout';
  const requiresClawback = payoutReleased;

  const refundIds: { pi: string; refundId: string; amountCents: number }[] = [];
  try {
    if (piFinal) {
      const rid = await refundPaymentIntent(
        piFinal,
        refundLifecycleMetadata({
          booking_id: id,
          refund_scope: 'full',
          resolution_type: 'admin_refund_customer',
          subtotal_cents: subtotalSnap,
          total_amount_cents: totalSnap,
          platform_fee_cents: platformSnap,
          deposit_amount_cents: depCents,
          final_amount_cents: finalCents,
          pricing_version: pricingSnap,
        })
      );
      if (rid) refundIds.push({ pi: piFinal, refundId: rid, amountCents: finalCents > 0 ? finalCents : 0 });
    }
    if (piDep && piDep !== piFinal) {
      const rid = await refundPaymentIntent(
        piDep,
        refundLifecycleMetadata({
          booking_id: id,
          refund_scope: 'full',
          resolution_type: 'admin_refund_customer',
          subtotal_cents: subtotalSnap,
          total_amount_cents: totalSnap,
          platform_fee_cents: platformSnap,
          deposit_amount_cents: depCents,
          final_amount_cents: finalCents,
          pricing_version: pricingSnap,
        })
      );
      if (rid) refundIds.push({ pi: piDep, refundId: rid, amountCents: depCents > 0 ? depCents : 0 });
    }
  } catch (e) {
    console.error('[runAdminRefundCustomer] stripe refund failed', id, e);
    return { ok: false, error: 'stripe_refund_failed' };
  }

  const now = new Date().toISOString();
  const reasonTrim = input.refundReason?.trim() || null;
  const noteTrim = input.internalNote?.trim() || null;

  await admin
    .from('bookings')
    .update({
      payment_lifecycle_status: 'refunded',
      refund_status: 'succeeded',
      requires_admin_review: payoutReleased ? true : false,
      payout_blocked: true,
      payout_hold_reason: 'customer_refunded',
      refund_after_payout: payoutReleased ? true : false,
    })
    .eq('id', id);

  for (const row of refundIds) {
    const amt = row.amountCents > 0 ? row.amountCents : 0;
    const ins = await appendBookingRefundEvent(admin, {
      bookingId: id,
      refundType,
      amountCents: amt,
      stripeRefundId: row.refundId,
      paymentIntentId: row.pi,
      requiresClawback,
      source: 'admin',
    });
    if (ins.ok === false && 'error' in ins) {
      console.warn('[runAdminRefundCustomer] refund ledger insert', id, ins.error);
    }
  }

  if (payoutReleased && refundIds.length > 0) {
    const stripeTransferId =
      typeof br.stripe_transfer_id === 'string' && br.stripe_transfer_id.trim()
        ? br.stripe_transfer_id.trim()
        : typeof br.payout_transfer_id === 'string' && br.payout_transfer_id.trim()
          ? br.payout_transfer_id.trim()
          : null;
    const rem = await recordRefundAfterPayoutRemediation(admin, {
      bookingId: id,
      idempotencyKey: `admin-refund-customer:${id}:${refundIds.map((x) => x.refundId).join(':')}`,
      source: 'admin_refund_customer',
      refundScope: 'full',
      stripeRefundIds: refundIds.map((x) => x.refundId),
      payoutReleased: true,
      stripeTransferId,
      actorUserId: input.actorUserId,
      actorType: 'admin',
    });
    if (rem.ok && !rem.skipped) {
      await logBookingPaymentEvent(admin, {
        bookingId: id,
        eventType: 'post_payout_refund_remediation_opened',
        phase: 'refund',
        status: 'pending_review',
        actorType: 'admin',
        actorUserId: input.actorUserId,
        metadata: { remediation: 'admin_refund_customer' },
      });
    } else if (!rem.ok) {
      console.warn('[runAdminRefundCustomer] remediation failed', id, rem);
    }
  }

  const { data: openQueueRows } = await admin
    .from('payout_review_queue')
    .select('id, details')
    .eq('booking_id', id)
    .in('status', [...PAYOUT_REVIEW_QUEUE_OPEN_STATUSES]);

  let hadOpenQueueRow = false;
  for (const row of openQueueRows ?? []) {
    hadOpenQueueRow = true;
    const qid = String((row as { id: string }).id);
    const prevDetails =
      row.details != null && typeof row.details === 'object' && !Array.isArray(row.details)
        ? (row.details as Record<string, unknown>)
        : {};
    const nextDetails: Record<string, unknown> = {
      ...prevDetails,
      refund_reason: reasonTrim,
      internal_note: noteTrim ?? prevDetails.internal_note,
      admin_refund_at: now,
      admin_refund_by: input.actorUserId,
      source: 'admin_refund_customer',
    };
    await admin
      .from('payout_review_queue')
      .update({
        status: 'refunded',
        reviewed_by: input.actorUserId,
        reviewed_at: now,
        details: nextDetails,
      })
      .eq('id', qid);
  }

  await syncBookingPaymentSummary(admin, id);
  await logBookingPaymentEvent(admin, {
    bookingId: id,
    eventType: 'refund_succeeded',
    phase: 'refund',
    status: 'full',
    actorType: 'admin',
    actorUserId: input.actorUserId,
  });
  await logBookingPaymentEvent(admin, {
    bookingId: id,
    eventType: 'admin_refund_customer',
    phase: 'refund',
    status: 'full',
    actorType: 'admin',
    actorUserId: input.actorUserId,
    metadata: {
      refund_reason: reasonTrim,
      internal_note: noteTrim,
      had_open_queue_row: hadOpenQueueRow,
    },
  });

  return {
    ok: true,
    message: payoutReleased
      ? 'Customer refund processed from the platform balance. Payout to the professional was not reversed automatically — booking flagged for admin review and clawback tracking.'
      : 'Customer refund processed; payout review cleared.',
  };
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
      .select(
        [
          'final_payment_intent_id',
          'stripe_payment_intent_remaining_id',
          'payment_intent_id',
          'stripe_payment_intent_deposit_id',
          'deposit_payment_intent_id',
          'payout_released',
          'subtotal_cents',
          'total_amount_cents',
          'amount_total',
          'amount_platform_fee',
          'deposit_amount_cents',
          'amount_deposit',
          'final_amount_cents',
          'remaining_amount_cents',
          'pricing_version',
          'stripe_transfer_id',
          'payout_transfer_id',
        ].join(', ')
      )
      .eq('id', bookingId)
      .maybeSingle();
    const br = b as Record<string, string | boolean | number | null | undefined> | null;
    const piRefund = br ? coalesceBookingFinalPaymentIntentId(br as BookingFinalPaymentIntentIdRow) : null;
    if (piRefund) {
      const depC = Number(br?.deposit_amount_cents ?? br?.amount_deposit ?? 0) || 0;
      const finC = Number(br?.final_amount_cents ?? br?.remaining_amount_cents ?? 0) || 0;
      const subC = Number(br?.subtotal_cents ?? 0) || 0;
      const totC = Number(br?.total_amount_cents ?? br?.amount_total ?? 0) || 0;
      const feeC = Number(br?.amount_platform_fee ?? 0) || 0;
      const pv = typeof br?.pricing_version === 'string' ? br.pricing_version : null;
      const rid = await refundPaymentIntentPartial(piRefund, input.refundAmountCents, {
        metadata: refundLifecycleMetadata({
          booking_id: bookingId,
          refund_scope: 'partial',
          resolution_type: input.resolution,
          dispute_id: input.disputeId,
          subtotal_cents: subC,
          total_amount_cents: totC,
          platform_fee_cents: feeC,
          deposit_amount_cents: depC,
          final_amount_cents: finC,
          pricing_version: pv,
        }),
        idempotencyKey: `dispute-partial-refund-${input.disputeId}-${piRefund}-${input.refundAmountCents}`,
      });
      if (rid) {
        const after = br?.payout_released === true;
        await appendBookingRefundEvent(admin, {
          bookingId,
          refundType: after ? 'after_payout' : 'before_payout',
          amountCents: input.refundAmountCents,
          stripeRefundId: rid,
          paymentIntentId: piRefund,
          requiresClawback: after,
          source: 'dispute',
        });
        if (after) {
          const tid =
            typeof br?.stripe_transfer_id === 'string' && br.stripe_transfer_id.trim()
              ? br.stripe_transfer_id.trim()
              : typeof br?.payout_transfer_id === 'string' && br.payout_transfer_id.trim()
                ? br.payout_transfer_id.trim()
                : null;
          const rem = await recordRefundAfterPayoutRemediation(admin, {
            bookingId,
            idempotencyKey: `dispute-partial:${bookingId}:${rid}`,
            source: 'dispute',
            refundScope: 'partial',
            amountCents: input.refundAmountCents,
            stripeRefundIds: [rid],
            payoutReleased: true,
            stripeTransferId: tid,
            actorUserId: input.adminUserId,
            actorType: 'admin',
          });
          if (rem.ok && !rem.skipped) {
            await logBookingPaymentEvent(admin, {
              bookingId,
              eventType: 'post_payout_refund_remediation_opened',
              phase: 'refund',
              status: 'pending_review',
              actorType: 'admin',
              actorUserId: input.adminUserId,
              metadata: { remediation: 'dispute_partial_refund', dispute_id: input.disputeId },
            });
          }
        }
      }
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

function bookingRowHasPaymentIntentId(row: Record<string, unknown>, paymentIntentId: string): boolean {
  const pi = String(paymentIntentId ?? '').trim();
  if (!pi) return false;
  const ids = [
    row.final_payment_intent_id,
    row.stripe_payment_intent_remaining_id,
    row.payment_intent_id,
    row.stripe_payment_intent_deposit_id,
    row.deposit_payment_intent_id,
  ];
  return ids.some((v) => String(v ?? '').trim() === pi);
}

export async function resolveBookingIdFromStripePaymentIntentId(
  admin: AdminClient,
  paymentIntentId: string
): Promise<string | null> {
  const pid = String(paymentIntentId ?? '').trim();
  if (!pid) return null;
  const { data, error } = await admin
    .from('bookings')
    .select('id')
    .or(
      `final_payment_intent_id.eq.${pid},stripe_payment_intent_remaining_id.eq.${pid},payment_intent_id.eq.${pid},stripe_payment_intent_deposit_id.eq.${pid},deposit_payment_intent_id.eq.${pid}`
    )
    .limit(2);
  if (error || !data?.length) return null;
  if (data.length > 1) {
    console.warn('[resolveBookingIdFromStripePaymentIntentId] ambiguous PI', pid);
    return null;
  }
  return String((data[0] as { id: string }).id);
}

function estimateCustomerPaidCentsFromBookingRow(row: Record<string, unknown>): number {
  const explicit = Number(row.amount_paid_cents ?? 0);
  if (Number.isFinite(explicit) && explicit > 0) return Math.max(0, Math.round(explicit));
  const depositCents = Number(row.deposit_amount_cents ?? row.amount_deposit ?? 0) || 0;
  const finalCents = Number(row.final_amount_cents ?? row.remaining_amount_cents ?? 0) || 0;
  const depositPaid = String(row.payment_status ?? '').toUpperCase() === 'PAID';
  const finalPaid = String(row.final_payment_status ?? '').toUpperCase() === 'PAID';
  return Math.max(0, (depositPaid ? depositCents : 0) + (finalPaid ? finalCents : 0));
}

/**
 * Apply Stripe `charge.refunded` delta to the booking ledger, lifecycle, and payment summary.
 * Idempotent per Stripe event via {@link logBookingPaymentEvent} + `stripe_events` in the webhook route.
 */
export async function applyStripeChargeRefundedWebhook(
  admin: AdminClient,
  input: {
    paymentIntentId: string;
    chargeId: string;
    deltaRefundedCents: number;
    stripeEventId: string;
    bookingIdFromMetadata?: string | null;
    stripeRefundId?: string | null;
  }
): Promise<{ ok: boolean; bookingId?: string; reason?: string }> {
  const delta = Math.max(0, Math.round(input.deltaRefundedCents || 0));
  if (delta <= 0) return { ok: false, reason: 'zero_delta' };

  const piId = String(input.paymentIntentId ?? '').trim();
  const metaBid = String(input.bookingIdFromMetadata ?? '').trim();

  let bookingId: string | null = null;
  if (metaBid) {
    const { data: byMeta } = await admin
      .from('bookings')
      .select(
        'id, final_payment_intent_id, stripe_payment_intent_remaining_id, payment_intent_id, stripe_payment_intent_deposit_id, deposit_payment_intent_id'
      )
      .eq('id', metaBid)
      .maybeSingle();
    const br = byMeta as Record<string, unknown> | null;
    if (br && bookingRowHasPaymentIntentId(br, piId)) {
      bookingId = metaBid;
    }
  }
  if (!bookingId) {
    bookingId = await resolveBookingIdFromStripePaymentIntentId(admin, piId);
  }
  if (!bookingId) return { ok: false, reason: 'booking_not_found' };

  if (await bookingRefundEventExistsForStripeEvent(admin, input.stripeEventId)) {
    return { ok: true, bookingId, reason: 'duplicate_refund_ledger' };
  }
  if (await legacyWebhookChargeRefundLedgerDup(admin, bookingId, input.stripeEventId)) {
    return { ok: true, bookingId, reason: 'duplicate_legacy_payment_event' };
  }

  const { data: row, error } = await admin
    .from('bookings')
    .select(
      [
        'id',
        'payout_released',
        'payment_status',
        'final_payment_status',
        'amount_paid_cents',
        'amount_refunded_cents',
        'refunded_total_cents',
        'refunded_at',
        'payment_lifecycle_status',
        'deposit_amount_cents',
        'amount_deposit',
        'final_amount_cents',
        'remaining_amount_cents',
        'stripe_transfer_id',
        'payout_transfer_id',
      ].join(', ')
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (error || !row) return { ok: false, reason: 'booking_load_failed' };

  const r = row as unknown as Record<string, unknown>;
  const refTot = Number(r.refunded_total_cents ?? 0) || 0;
  const refAmt = Number(r.amount_refunded_cents ?? 0) || 0;
  const prevRefunded = Math.max(refAmt, refTot);
  const nextRefunded = prevRefunded + delta;
  const paidCents = estimateCustomerPaidCentsFromBookingRow(r);
  const nowIso = new Date().toISOString();
  const payoutReleased = r.payout_released === true;
  const refundType = payoutReleased ? 'after_payout' : 'before_payout';

  const update: Record<string, unknown> = {
    amount_refunded_cents: nextRefunded,
    refunded_total_cents: nextRefunded,
    refund_status: 'succeeded',
    refunded_at: (r.refunded_at as string | null) ?? nowIso,
  };

  const curLc = String(r.payment_lifecycle_status ?? '').toLowerCase();

  if (paidCents > 0 && nextRefunded >= paidCents) {
    update.payment_lifecycle_status = 'refunded';
    if (r.payout_released !== true) {
      update.payout_blocked = true;
      update.payout_hold_reason = 'customer_refunded';
    }
  } else if (nextRefunded > 0 && curLc !== 'refunded') {
    update.payment_lifecycle_status = 'partially_refunded';
  }

  if (payoutReleased) {
    update.refund_after_payout = true;
    update.requires_admin_review = true;
  }

  const { data: updatedRow, error: upErr } = await admin
    .from('bookings')
    .update(update)
    .eq('id', bookingId)
    .eq('refunded_total_cents', refTot)
    .eq('amount_refunded_cents', refAmt)
    .select('id')
    .maybeSingle();

  if (upErr) {
    console.warn('[applyStripeChargeRefundedWebhook] update failed', upErr);
    return { ok: false, reason: 'update_failed' };
  }
  if (!updatedRow) {
    const { data: r2 } = await admin
      .from('bookings')
      .select('refunded_total_cents, amount_refunded_cents')
      .eq('id', bookingId)
      .maybeSingle();
    const r2t = r2 as { refunded_total_cents?: number; amount_refunded_cents?: number } | null;
    const nowMax = Math.max(
      Number(r2t?.amount_refunded_cents ?? 0) || 0,
      Number(r2t?.refunded_total_cents ?? 0) || 0
    );
    if (nowMax >= nextRefunded) {
      return { ok: true, bookingId, reason: 'refund_already_applied' };
    }
    if (await bookingRefundEventExistsForStripeEvent(admin, input.stripeEventId)) {
      return { ok: true, bookingId, reason: 'duplicate_refund_ledger_after_race' };
    }
    return { ok: false, reason: 'concurrent_refund_update' };
  }

  const ledger = await appendBookingRefundEvent(admin, {
    bookingId,
    refundType,
    amountCents: delta,
    stripeRefundId: input.stripeRefundId ?? null,
    stripeChargeId: input.chargeId,
    paymentIntentId: piId,
    stripeEventId: input.stripeEventId,
    requiresClawback: refundType === 'after_payout',
    source: 'webhook',
  });
  if (ledger.ok === false && 'duplicate' in ledger && ledger.duplicate) {
    return { ok: true, bookingId, reason: 'duplicate_refund_ledger_insert' };
  }
  if (ledger.ok === false && 'error' in ledger) {
    console.warn('[applyStripeChargeRefundedWebhook] ledger insert failed', ledger.error);
  }

  await logBookingPaymentEvent(admin, {
    bookingId,
    eventType: 'webhook_charge_refunded',
    phase: 'refund',
    status: paidCents > 0 && nextRefunded >= paidCents ? 'refunded' : 'partially_refunded',
    amountCents: delta,
    stripePaymentIntentId: piId,
    stripeChargeId: input.chargeId,
    stripeRefundId: input.stripeRefundId ?? null,
    metadata: {
      stripe_event_id: input.stripeEventId,
      cumulative_refunded_cents: nextRefunded,
      refund_type: refundType,
      connect_transfer_not_reversed: true,
    },
  });

  if (payoutReleased) {
    const tidRaw = r.stripe_transfer_id ?? r.payout_transfer_id;
    const tid =
      typeof tidRaw === 'string' && tidRaw.trim() ? tidRaw.trim() : null;
    const rem = await recordRefundAfterPayoutRemediation(admin, {
      bookingId,
      idempotencyKey: `webhook:${input.stripeEventId}`,
      source: 'webhook_charge_refunded',
      refundScope: paidCents > 0 && nextRefunded >= paidCents ? 'full' : 'partial',
      amountCents: delta,
      stripeRefundIds: input.stripeRefundId ? [input.stripeRefundId] : [],
      payoutReleased: true,
      stripeTransferId: tid,
      actorType: 'system',
    });
    if (rem.ok && !rem.skipped) {
      await logBookingPaymentEvent(admin, {
        bookingId,
        eventType: 'post_payout_refund_remediation_opened',
        phase: 'refund',
        status: 'pending_review',
        metadata: { remediation: 'webhook_charge_refunded', stripe_event_id: input.stripeEventId },
      });
    }
  }

  await syncBookingPaymentSummary(admin, bookingId);

  return { ok: true, bookingId };
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
  assertUnifiedBookingPaymentIntentMetadata(metadata);

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
