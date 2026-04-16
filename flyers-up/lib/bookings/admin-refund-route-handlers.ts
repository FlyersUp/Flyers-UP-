/**
 * Admin refund flows initiated from {@link app/api/admin/bookings/[bookingId]/payment-lifecycle/route.ts}:
 * same operational trace as {@link runAdminRefundCustomer} (batch / leg / fail-closed / remediation_required).
 */

import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { refundPaymentIntent, refundPaymentIntentPartial } from '@/lib/stripe/server';
import { refundLifecycleMetadata } from '@/lib/stripe/booking-payment-metadata-lifecycle';
import { runAdminRefundCustomerStripeRefunds } from '@/lib/bookings/admin-refund-customer-stripe';
import {
  emitAdminRefundBatchFailureClosed,
  emitAdminRefundBatchStarted,
  emitAdminRefundLegOutcomes,
  emitRemediationRequiredPaymentEvent,
} from '@/lib/bookings/admin-refund-instrumentation';
import { appendBookingRefundEvent } from '@/lib/bookings/booking-refund-ledger';
import {
  coalesceBookingDepositPaymentIntentId,
  coalesceBookingFinalPaymentIntentId,
  type BookingFinalPaymentIntentIdRow,
} from '@/lib/bookings/money-state';
import { recordRefundAfterPayoutRemediation } from '@/lib/bookings/refund-remediation';
import { logBookingPaymentEvent } from '@/lib/bookings/booking-payment-event-log';
import { syncBookingPaymentSummary } from '@/lib/bookings/payment-lifecycle-service';
import type { AdminRefundLegResult } from '@/lib/bookings/admin-refund-customer-stripe';

export type AdminFullRefundRouteResult =
  | { ok: true }
  | { ok: false; httpStatus: number; error: string; body: Record<string, unknown> };

export type AdminPartialRefundRouteResult =
  | { ok: true; refundId: string }
  | { ok: false; httpStatus: number; error: string; body: Record<string, unknown> };

export async function runAdminFullRefundRouteFlow(
  admin: SupabaseClient,
  input: {
    bookingId: string;
    actorUserId: string;
    /** Tests only — forwards to Stripe refund helper. */
    refundPaymentIntent?: typeof refundPaymentIntent;
  }
): Promise<AdminFullRefundRouteResult> {
  const id = input.bookingId;
  const { data: b } = await admin
    .from('bookings')
    .select(
      [
        'final_payment_intent_id',
        'stripe_payment_intent_remaining_id',
        'stripe_payment_intent_deposit_id',
        'deposit_payment_intent_id',
        'payment_intent_id',
        'payout_released',
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
  const br = b as Record<string, string | number | boolean | null> | null;
  if (!br) return { ok: false, httpStatus: 404, error: 'not_found', body: { error: 'Booking not found' } };

  const piFinal = coalesceBookingFinalPaymentIntentId(br as BookingFinalPaymentIntentIdRow);
  const piDep = coalesceBookingDepositPaymentIntentId(br as BookingFinalPaymentIntentIdRow);
  const afterPayout = br.payout_released === true;
  const depCents = Number(br.deposit_amount_cents ?? br.amount_deposit ?? 0) || 0;
  const finalCents = Number(br.final_amount_cents ?? br.remaining_amount_cents ?? 0) || 0;
  const subSnap = Number(br.subtotal_cents ?? 0) || 0;
  const totalSnap = Number(br.total_amount_cents ?? br.amount_total ?? 0) || 0;
  const platformSnap = Number(br.amount_platform_fee ?? 0) || 0;
  const pricingSnap = typeof br.pricing_version === 'string' ? br.pricing_version : null;

  if (!piFinal && !piDep) {
    return { ok: false, httpStatus: 400, error: 'no_pi', body: { error: 'No PaymentIntent for refund' } };
  }

  const batchCorrelationId = randomUUID();
  await emitAdminRefundBatchStarted(admin, {
    bookingId: id,
    actorUserId: input.actorUserId,
    batchCorrelationId,
    routeSource: 'admin_full_refund_route',
    piFinal,
    piDep,
    payoutReleased: afterPayout,
  });

  const stripeBatch = await runAdminRefundCustomerStripeRefunds({
    bookingId: id,
    piFinal,
    piDep,
    depCents,
    finalCents,
    subtotalSnap: subSnap,
    totalSnap,
    platformSnap,
    pricingSnap,
    payoutReleased: afterPayout,
    resolutionType: 'admin_full_refund',
    refundPaymentIntent: input.refundPaymentIntent,
  });

  await emitAdminRefundLegOutcomes(admin, {
    bookingId: id,
    actorUserId: input.actorUserId,
    batchCorrelationId,
    routeSource: 'admin_full_refund_route',
    legs: stripeBatch.legs,
  });

  if (!stripeBatch.ok) {
    await emitAdminRefundBatchFailureClosed(admin, {
      bookingId: id,
      actorUserId: input.actorUserId,
      batchCorrelationId,
      routeSource: 'admin_full_refund_route',
      stripeBatchError: stripeBatch.error,
      expectedAttempts: stripeBatch.expectedRefundAttempts,
      succeededCount: stripeBatch.refundIds.length,
      successRefundRows: stripeBatch.refundIds.map((r) => ({
        pi: r.pi,
        refundId: r.refundId,
        amountCents: r.amountCents,
      })),
      payoutReleased: afterPayout,
    });
    await syncBookingPaymentSummary(admin, id);
    return {
      ok: false,
      httpStatus: 502,
      error: stripeBatch.error,
      body: {
        ok: false,
        error: stripeBatch.error,
        attempted: stripeBatch.expectedRefundAttempts,
        succeeded: stripeBatch.refundIds.length,
      },
    };
  }

  const recorded = stripeBatch.refundIds;

  await admin
    .from('bookings')
    .update({
      payment_lifecycle_status: 'refunded',
      refund_status: 'succeeded',
      ...(afterPayout ? { refund_after_payout: true, requires_admin_review: true } : {}),
    })
    .eq('id', id);

  for (const row of recorded) {
    const ins = await appendBookingRefundEvent(admin, {
      bookingId: id,
      refundType: afterPayout ? 'after_payout' : 'before_payout',
      amountCents: row.amountCents,
      stripeRefundId: row.refundId,
      paymentIntentId: row.pi,
      requiresClawback: afterPayout,
      source: 'admin',
    });
    if (ins.ok === false && 'error' in ins) console.warn('[admin full_refund] ledger', ins.error);
  }

  if (afterPayout && recorded.length > 0) {
    const tid =
      typeof br.stripe_transfer_id === 'string' && String(br.stripe_transfer_id).trim()
        ? String(br.stripe_transfer_id).trim()
        : typeof br.payout_transfer_id === 'string' && String(br.payout_transfer_id).trim()
          ? String(br.payout_transfer_id).trim()
          : null;
    const rem = await recordRefundAfterPayoutRemediation(admin, {
      bookingId: id,
      idempotencyKey: `admin-full-refund-route:${id}:${recorded.map((r) => r.refundId).join(':')}`,
      source: 'admin_full_refund_route',
      refundScope: 'full',
      stripeRefundIds: recorded.map((r) => r.refundId),
      payoutReleased: true,
      stripeTransferId: tid,
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
        metadata: { remediation: 'admin_full_refund_route' },
      });
      await emitRemediationRequiredPaymentEvent(admin, {
        bookingId: id,
        actorUserId: input.actorUserId,
        routeSource: 'admin_full_refund_route',
        remediationKey: 'post_payout_refund',
      });
    }
  }

  await syncBookingPaymentSummary(admin, id);
  await logBookingPaymentEvent(admin, {
    bookingId: id,
    eventType: 'refund_succeeded',
    phase: 'refund',
    status: 'full',
    actorType: 'admin',
    actorUserId: input.actorUserId,
    metadata: { route_source: 'admin_full_refund_route' },
  });
  return { ok: true };
}

export async function runAdminPartialRefundRouteFlow(
  admin: SupabaseClient,
  input: {
    bookingId: string;
    actorUserId: string;
    partialRefundCents: number;
    refundPaymentIntentPartial?: typeof refundPaymentIntentPartial;
  }
): Promise<AdminPartialRefundRouteResult> {
  const id = input.bookingId;
  const cents = input.partialRefundCents;
  const partialFn = input.refundPaymentIntentPartial ?? refundPaymentIntentPartial;

  const { data: b } = await admin
    .from('bookings')
    .select(
      [
        'final_payment_intent_id',
        'stripe_payment_intent_remaining_id',
        'payment_intent_id',
        'stripe_payment_intent_deposit_id',
        'deposit_payment_intent_id',
        'amount_refunded_cents',
        'refunded_total_cents',
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
    .eq('id', id)
    .maybeSingle();
  const br = b as Record<string, string | null | number | undefined> | null;
  if (!br) return { ok: false, httpStatus: 404, error: 'not_found', body: { error: 'Booking not found' } };

  const piFinal = coalesceBookingFinalPaymentIntentId(br as BookingFinalPaymentIntentIdRow);
  const piDeposit = coalesceBookingDepositPaymentIntentId(br as BookingFinalPaymentIntentIdRow);
  const piId = piFinal ?? piDeposit;
  if (!piId) return { ok: false, httpStatus: 400, error: 'no_pi', body: { error: 'No PaymentIntent' } };

  const depC = Number(br.deposit_amount_cents ?? br.amount_deposit ?? 0) || 0;
  const finC = Number(br.final_amount_cents ?? br.remaining_amount_cents ?? 0) || 0;
  const subC = Number(br.subtotal_cents ?? 0) || 0;
  const totC = Number(br.total_amount_cents ?? br.amount_total ?? 0) || 0;
  const feeC = Number(br.amount_platform_fee ?? 0) || 0;
  const pv = typeof br.pricing_version === 'string' ? br.pricing_version : null;
  const afterPayout = (br as { payout_released?: boolean }).payout_released === true;
  const phase: 'final' | 'deposit' = piFinal ? 'final' : 'deposit';

  const batchCorrelationId = randomUUID();
  await emitAdminRefundBatchStarted(admin, {
    bookingId: id,
    actorUserId: input.actorUserId,
    batchCorrelationId,
    routeSource: 'admin_partial_refund',
    piFinal,
    piDep: piDeposit,
    payoutReleased: afterPayout,
    extraMetadata: { partial_refund_cents: cents, target_pi: piId },
  });

  const refundId = await partialFn(piId, cents, {
    metadata: refundLifecycleMetadata({
      booking_id: id,
      refund_scope: 'partial',
      resolution_type: 'admin',
      refunded_amount_cents: cents,
      refund_type: afterPayout ? 'after_payout' : 'before_payout',
      refund_source_payment_phase: phase,
      subtotal_cents: subC,
      total_amount_cents: totC,
      platform_fee_cents: feeC,
      deposit_amount_cents: depC,
      final_amount_cents: finC,
      pricing_version: pv,
    }),
    idempotencyKey: `admin-partial-refund-${id}-${piId}-${cents}`,
  });

  const legs: AdminRefundLegResult[] = refundId
    ? [{ phase, pi: piId, ok: true, refundId, amountCents: cents }]
    : [{ phase, pi: piId, ok: false, reason: 'null_refund' }];

  await emitAdminRefundLegOutcomes(admin, {
    bookingId: id,
    actorUserId: input.actorUserId,
    batchCorrelationId,
    routeSource: 'admin_partial_refund',
    legs,
  });

  if (!refundId) {
    console.error('[admin partial_refund] refundPaymentIntentPartial returned null', {
      booking_id: id,
      payment_intent: piId,
      cents,
    });
    await emitAdminRefundBatchFailureClosed(admin, {
      bookingId: id,
      actorUserId: input.actorUserId,
      batchCorrelationId,
      routeSource: 'admin_partial_refund',
      stripeBatchError: 'stripe_refund_failed',
      expectedAttempts: 1,
      succeededCount: 0,
      successRefundRows: [],
      payoutReleased: afterPayout,
    });
    await syncBookingPaymentSummary(admin, id);
    return {
      ok: false,
      httpStatus: 502,
      error: 'refund_not_created',
      body: { error: 'Stripe partial refund failed', code: 'refund_not_created' },
    };
  }

  const prevRef = Number(br.amount_refunded_cents ?? br.refunded_total_cents ?? 0) || 0;
  const nextRef = prevRef + cents;
  await admin
    .from('bookings')
    .update({
      amount_refunded_cents: nextRef,
      refunded_total_cents: nextRef,
      payment_lifecycle_status: 'partially_refunded',
      ...(afterPayout ? { refund_after_payout: true, requires_admin_review: true } : {}),
    })
    .eq('id', id);

  const ledger = await appendBookingRefundEvent(admin, {
    bookingId: id,
    refundType: afterPayout ? 'after_payout' : 'before_payout',
    amountCents: cents,
    stripeRefundId: refundId,
    paymentIntentId: piId,
    requiresClawback: afterPayout,
    source: 'admin',
  });
  if (ledger.ok === false && 'error' in ledger) {
    console.warn('[admin partial_refund] ledger', ledger.error);
  }

  if (afterPayout) {
    const tid =
      typeof br.stripe_transfer_id === 'string' && String(br.stripe_transfer_id).trim()
        ? String(br.stripe_transfer_id).trim()
        : typeof br.payout_transfer_id === 'string' && String(br.payout_transfer_id).trim()
          ? String(br.payout_transfer_id).trim()
          : null;
    const rem = await recordRefundAfterPayoutRemediation(admin, {
      bookingId: id,
      idempotencyKey: `admin-partial:${id}:${refundId}`,
      source: 'admin_partial_refund',
      refundScope: 'partial',
      amountCents: cents,
      stripeRefundIds: [refundId],
      payoutReleased: true,
      stripeTransferId: tid,
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
        metadata: { remediation: 'admin_partial_refund' },
      });
      await emitRemediationRequiredPaymentEvent(admin, {
        bookingId: id,
        actorUserId: input.actorUserId,
        routeSource: 'admin_partial_refund',
        remediationKey: 'post_payout_refund',
      });
    }
  }

  await syncBookingPaymentSummary(admin, id);
  await logBookingPaymentEvent(admin, {
    bookingId: id,
    eventType: 'refund_created',
    phase: 'refund',
    status: 'partial',
    amountCents: cents,
    stripeRefundId: refundId,
    actorType: 'admin',
    actorUserId: input.actorUserId,
    metadata: { route_source: 'admin_partial_refund', batch_correlation_id: batchCorrelationId },
  });

  return { ok: true, refundId };
}
