/**
 * Canonical admin refund operational trace: same booking_payment_events + booking_refund_remediation_events
 * pattern for every admin-triggered refund entry point (fail-closed on partial batches).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { logBookingPaymentEvent } from '@/lib/bookings/booking-payment-event-log';
import { appendBookingRefundEvent } from '@/lib/bookings/booking-refund-ledger';
import { appendRefundRemediationLedgerEvent } from '@/lib/bookings/refund-remediation';
import type { BookingPaymentStatus } from '@/lib/bookings/payment-lifecycle-types';
import { assertPayoutHoldReason } from '@/lib/bookings/payment-lifecycle-types';
import type { AdminRefundLegResult } from '@/lib/bookings/admin-refund-customer-stripe';

export type AdminRefundInstrumentSource =
  | 'admin_refund_customer'
  | 'admin_full_refund_route'
  | 'admin_partial_refund';

export async function emitAdminRefundBatchStarted(
  admin: SupabaseClient,
  input: {
    bookingId: string;
    actorUserId: string;
    batchCorrelationId: string;
    routeSource: AdminRefundInstrumentSource;
    piFinal: string | null;
    piDep: string | null;
    payoutReleased: boolean;
    extraMetadata?: Record<string, unknown>;
  }
): Promise<void> {
  const meta = {
    batch_correlation_id: input.batchCorrelationId,
    route_source: input.routeSource,
    pi_final: input.piFinal,
    pi_deposit: input.piDep,
    payout_released: input.payoutReleased,
    ...input.extraMetadata,
  };
  await logBookingPaymentEvent(admin, {
    bookingId: input.bookingId,
    eventType: 'refund_batch_started',
    phase: 'refund',
    status: input.routeSource,
    actorType: 'admin',
    actorUserId: input.actorUserId,
    metadata: meta,
  });
  await appendRefundRemediationLedgerEvent(admin, {
    bookingId: input.bookingId,
    eventType: 'refund_batch_started',
    actorType: 'admin',
    actorUserId: input.actorUserId,
    details: meta,
  });
}

export async function emitAdminRefundLegOutcomes(
  admin: SupabaseClient,
  input: {
    bookingId: string;
    actorUserId: string;
    batchCorrelationId: string;
    routeSource: AdminRefundInstrumentSource;
    legs: AdminRefundLegResult[];
  }
): Promise<void> {
  for (const leg of input.legs) {
    if (leg.ok) {
      await logBookingPaymentEvent(admin, {
        bookingId: input.bookingId,
        eventType: 'refund_leg_succeeded',
        phase: 'refund',
        status: leg.phase,
        stripePaymentIntentId: leg.pi,
        stripeRefundId: leg.refundId,
        amountCents: leg.amountCents,
        actorType: 'admin',
        actorUserId: input.actorUserId,
        metadata: {
          batch_correlation_id: input.batchCorrelationId,
          route_source: input.routeSource,
          phase: leg.phase,
        },
      });
      await appendRefundRemediationLedgerEvent(admin, {
        bookingId: input.bookingId,
        eventType: 'refund_leg_succeeded',
        actorType: 'admin',
        actorUserId: input.actorUserId,
        details: {
          batch_correlation_id: input.batchCorrelationId,
          route_source: input.routeSource,
          phase: leg.phase,
          payment_intent_id: leg.pi,
          stripe_refund_id: leg.refundId,
          amount_cents: leg.amountCents,
        },
      });
    } else {
      await logBookingPaymentEvent(admin, {
        bookingId: input.bookingId,
        eventType: 'refund_leg_failed',
        phase: 'refund',
        status: leg.reason,
        stripePaymentIntentId: leg.pi,
        actorType: 'admin',
        actorUserId: input.actorUserId,
        metadata: {
          batch_correlation_id: input.batchCorrelationId,
          route_source: input.routeSource,
          phase: leg.phase,
        },
      });
      await appendRefundRemediationLedgerEvent(admin, {
        bookingId: input.bookingId,
        eventType: 'refund_leg_failed',
        actorType: 'admin',
        actorUserId: input.actorUserId,
        details: {
          batch_correlation_id: input.batchCorrelationId,
          route_source: input.routeSource,
          phase: leg.phase,
          payment_intent_id: leg.pi,
          reason: leg.reason,
        },
      });
    }
  }
}

/**
 * After a partial or failed admin refund batch: ledger successes, dual ledgers for failure, booking flags, no sync.
 */
export async function emitAdminRefundBatchFailureClosed(
  admin: SupabaseClient,
  input: {
    bookingId: string;
    actorUserId: string;
    batchCorrelationId: string;
    routeSource: AdminRefundInstrumentSource;
    stripeBatchError: 'stripe_refund_failed' | 'stripe_refund_partial_failure' | 'stripe_refund_incomplete' | string;
    expectedAttempts: number;
    succeededCount: number;
    successRefundRows: { pi: string; refundId: string; amountCents: number }[];
    payoutReleased: boolean;
  }
): Promise<void> {
  const refundType = input.payoutReleased ? 'after_payout' : 'before_payout';
  for (const row of input.successRefundRows) {
    const ins = await appendBookingRefundEvent(admin, {
      bookingId: input.bookingId,
      refundType,
      amountCents: row.amountCents > 0 ? row.amountCents : 0,
      stripeRefundId: row.refundId,
      paymentIntentId: row.pi,
      requiresClawback: input.payoutReleased,
      source: 'admin',
    });
    if (ins.ok === false && 'error' in ins) {
      console.warn('[emitAdminRefundBatchFailureClosed] ledger insert', input.bookingId, ins.error);
    }
  }

  const partial =
    input.stripeBatchError === 'stripe_refund_partial_failure' ||
    input.stripeBatchError === 'stripe_refund_incomplete';

  await logBookingPaymentEvent(admin, {
    bookingId: input.bookingId,
    eventType: 'refund_batch_partial_failure',
    phase: 'refund',
    status: input.stripeBatchError,
    actorType: 'admin',
    actorUserId: input.actorUserId,
    metadata: {
      batch_correlation_id: input.batchCorrelationId,
      route_source: input.routeSource,
      expected: input.expectedAttempts,
      succeeded: input.succeededCount,
    },
  });
  await appendRefundRemediationLedgerEvent(admin, {
    bookingId: input.bookingId,
    eventType: 'refund_batch_partial_failure',
    actorType: 'admin',
    actorUserId: input.actorUserId,
    details: {
      batch_correlation_id: input.batchCorrelationId,
      route_source: input.routeSource,
      error: input.stripeBatchError,
      expected: input.expectedAttempts,
      succeeded: input.succeededCount,
    },
  });

  await logBookingPaymentEvent(admin, {
    bookingId: input.bookingId,
    eventType: 'admin_review_required',
    phase: 'refund',
    status: partial ? 'partial_refund_batch' : 'refund_failed',
    actorType: 'admin',
    actorUserId: input.actorUserId,
    metadata: {
      batch_correlation_id: input.batchCorrelationId,
      route_source: input.routeSource,
      reason: partial ? 'stripe_multi_pi_partial_refund' : 'stripe_refund_failed',
    },
  });
  await appendRefundRemediationLedgerEvent(admin, {
    bookingId: input.bookingId,
    eventType: 'admin_review_required',
    actorType: 'admin',
    actorUserId: input.actorUserId,
    details: {
      batch_correlation_id: input.batchCorrelationId,
      route_source: input.routeSource,
      reason: partial ? 'stripe_multi_pi_partial_refund' : 'stripe_refund_failed',
    },
  });

  await admin
    .from('bookings')
    .update({
      requires_admin_review: true,
      payout_blocked: true,
      payout_hold_reason: assertPayoutHoldReason('admin_review_required'),
      refund_status: partial ? 'partially_failed' : 'failed',
      ...(partial
        ? {
            payment_lifecycle_status: 'partially_refunded' as BookingPaymentStatus,
          }
        : {}),
    })
    .eq('id', input.bookingId);
}

export async function emitRemediationRequiredPaymentEvent(
  admin: SupabaseClient,
  input: {
    bookingId: string;
    actorUserId: string;
    routeSource: AdminRefundInstrumentSource;
    remediationKey: string;
  }
): Promise<void> {
  const meta = { route_source: input.routeSource, remediation_key: input.remediationKey };
  await logBookingPaymentEvent(admin, {
    bookingId: input.bookingId,
    eventType: 'remediation_required',
    phase: 'refund',
    status: 'opened',
    actorType: 'admin',
    actorUserId: input.actorUserId,
    metadata: meta,
  });
  await appendRefundRemediationLedgerEvent(admin, {
    bookingId: input.bookingId,
    eventType: 'remediation_required',
    actorType: 'admin',
    actorUserId: input.actorUserId,
    details: meta,
  });
}
