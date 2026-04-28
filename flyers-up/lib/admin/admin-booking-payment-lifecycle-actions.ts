/**
 * Core admin payment-lifecycle POST behavior (extracted for route-level tests).
 *
 * Route-level tests matter because auth, status codes, and response mapping sit outside
 * service helpers — a bug there can return HTTP 200 with `ok: false` or drop retry snapshots.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import {
  attemptFinalCharge,
  logBookingPaymentEvent,
  openDispute,
  resolveDispute,
  runAdminApprovePayoutRelease,
  runAdminKeepPayoutOnHold,
  runAdminRefundCustomer,
  syncBookingPaymentSummary,
} from '@/lib/bookings/payment-lifecycle-service';
import { reconcileBookingForFinalAutoCharge } from '@/lib/bookings/final-charge-candidates';
import { assertPayoutHoldReason } from '@/lib/bookings/payment-lifecycle-types';
import {
  appendRefundRemediationLedgerEvent,
} from '@/lib/bookings/refund-remediation';
import {
  runAdminFullRefundRouteFlow,
  runAdminPartialRefundRouteFlow,
} from '@/lib/bookings/admin-refund-route-handlers';
import type {
  refundPaymentIntent as RefundPiFn,
  refundPaymentIntentPartial as RefundPartialFn,
} from '@/lib/stripe/server';

export type AdminPaymentLifecycleBody = {
  action: string;
  disputeId?: string;
  customerClaim?: string;
  resolution?: 'customer_favor' | 'pro_favor' | 'split';
  refundAmountCents?: number;
  adjustedFinalAmountCents?: number;
  adjustedPayoutAmountCents?: number;
  resolutionNotes?: string;
  adminHoldReason?: string;
  partialRefundCents?: number;
  holdReason?: string;
  internalNote?: string;
  refundReason?: string;
  refundInternalNote?: string;
};

async function findExistingTransferForBooking(
  stripeClient: Stripe,
  bookingId: string
): Promise<{ transferId: string; status: string | null } | null> {
  const byGroup = await stripeClient.transfers.list({
    transfer_group: `booking_${bookingId}`,
    limit: 10,
  });
  const firstGroupMatch = byGroup.data.find((t) => typeof t.id === 'string' && t.id.trim().length > 0);
  if (firstGroupMatch) {
    const destinationPayment =
      typeof firstGroupMatch.destination_payment === 'string'
        ? firstGroupMatch.destination_payment
        : null;
    return { transferId: firstGroupMatch.id, status: destinationPayment };
  }

  const recent = await stripeClient.transfers.list({ limit: 100 });
  const metaMatch = recent.data.find((t) => String(t.metadata?.booking_id ?? '') === bookingId);
  if (metaMatch) {
    const destinationPayment =
      typeof metaMatch.destination_payment === 'string' ? metaMatch.destination_payment : null;
    return { transferId: metaMatch.id, status: destinationPayment };
  }
  return null;
}

export type AdminPaymentLifecycleActionContext = {
  admin: SupabaseClient;
  bookingId: string;
  userId: string;
  body: AdminPaymentLifecycleBody;
  stripeClient: Stripe | null;
  /** Automated tests only — forwarded to refund helpers; never set from the HTTP route. */
  testOverrides?: {
    refundPaymentIntent?: typeof RefundPiFn;
    refundPaymentIntentPartial?: typeof RefundPartialFn;
  };
};

export async function runAdminBookingPaymentLifecycleAction(
  ctx: AdminPaymentLifecycleActionContext
): Promise<{ status: number; json: Record<string, unknown> }> {
  const { admin, bookingId: id, userId, body } = ctx;

  switch (body.action) {
    case 'retry_final_charge': {
      const r = await attemptFinalCharge(admin, {
        bookingId: id,
        initiatedByAdmin: true,
        actorUserId: userId,
      });
      return { status: 200, json: { ok: r.ok, code: r.code } };
    }
    case 'reconcile_and_retry_final_charge': {
      const reconciled = await reconcileBookingForFinalAutoCharge(admin, id);
      const r = await attemptFinalCharge(admin, {
        bookingId: id,
        initiatedByAdmin: true,
        actorUserId: userId,
      });
      return { status: 200, json: { ok: r.ok, code: r.code, reconciled } };
    }
    case 'send_final_payment_link': {
      await logBookingPaymentEvent(admin, {
        bookingId: id,
        eventType: 'manual_payment_link_sent',
        phase: 'final',
        status: 'admin',
        actorType: 'admin',
        actorUserId: userId,
        metadata: { source: 'admin_action' },
      });
      return { status: 200, json: { ok: true } };
    }
    case 'apply_admin_hold': {
      await admin
        .from('bookings')
        .update({
          admin_hold: true,
          payout_blocked: true,
          payout_hold_reason: 'admin_hold',
          admin_hold_reason: body.adminHoldReason ?? 'Admin hold',
        })
        .eq('id', id);
      await syncBookingPaymentSummary(admin, id);
      await logBookingPaymentEvent(admin, {
        bookingId: id,
        eventType: 'admin_hold_applied',
        phase: 'admin',
        status: 'applied',
        actorType: 'admin',
        actorUserId: userId,
        metadata: { reason: body.adminHoldReason ?? null },
      });
      return { status: 200, json: { ok: true } };
    }
    case 'release_admin_hold': {
      await admin
        .from('bookings')
        .update({
          admin_hold: false,
          admin_hold_reason: null,
        })
        .eq('id', id);
      await syncBookingPaymentSummary(admin, id);
      await logBookingPaymentEvent(admin, {
        bookingId: id,
        eventType: 'admin_hold_released',
        phase: 'admin',
        status: 'released',
        actorType: 'admin',
        actorUserId: userId,
      });
      return { status: 200, json: { ok: true } };
    }
    case 'waive_final_payment': {
      await admin
        .from('bookings')
        .update({
          final_payment_status: 'PAID',
          final_amount_cents: 0,
          remaining_amount_cents: 0,
          amount_remaining: 0,
          payment_lifecycle_status: 'final_paid',
          paid_remaining_at: new Date().toISOString(),
        })
        .eq('id', id);
      await syncBookingPaymentSummary(admin, id);
      await logBookingPaymentEvent(admin, {
        bookingId: id,
        eventType: 'final_payment_succeeded',
        phase: 'final',
        status: 'waived',
        actorType: 'admin',
        actorUserId: userId,
        metadata: { waived: true },
      });
      return { status: 200, json: { ok: true } };
    }
    case 'partial_refund': {
      const cents = body.partialRefundCents ?? body.refundAmountCents ?? 0;
      if (cents <= 0) {
        return { status: 400, json: { error: 'refund amount required' } };
      }
      const out = await runAdminPartialRefundRouteFlow(admin, {
        bookingId: id,
        actorUserId: userId,
        partialRefundCents: cents,
        refundPaymentIntentPartial: ctx.testOverrides?.refundPaymentIntentPartial,
      });
      if (!out.ok) {
        return { status: out.httpStatus, json: out.body };
      }
      return { status: 200, json: { ok: true, refundId: out.refundId } };
    }
    case 'full_refund': {
      if (!ctx.stripeClient) {
        return { status: 500, json: { error: 'Stripe not configured' } };
      }
      const out = await runAdminFullRefundRouteFlow(admin, {
        bookingId: id,
        actorUserId: userId,
        refundPaymentIntent: ctx.testOverrides?.refundPaymentIntent,
      });
      if (!out.ok) {
        return { status: out.httpStatus, json: out.body };
      }
      return { status: 200, json: { ok: true } };
    }
    case 'approve_payout': {
      console.info('[admin payment-lifecycle] approve_payout request', {
        bookingId: id,
        actorUserId: userId,
        action: body.action,
      });
      const out = await runAdminApprovePayoutRelease(admin, { bookingId: id, actorUserId: userId });
      if (!out.ok) {
        console.warn('[admin payment-lifecycle] approve_payout 400', {
          bookingId: id,
          code: out.code,
          errorPhase: out.errorPhase,
          message: out.message,
          details: out.details,
        });
        return {
          status: 400,
          json: {
            ok: false,
            code: out.code,
            message: out.message ?? null,
            details: out.details ?? null,
            errorPhase: out.errorPhase ?? 'eligibility',
            transferId: out.transferId ?? null,
          },
        };
      }
      console.info('[admin payment-lifecycle] approve_payout ok', {
        bookingId: id,
        transferId: out.transferId ?? null,
        amountTransferredCents: out.amountTransferredCents ?? 0,
      });
      return {
        status: 200,
        json: {
          ok: true,
          transferId: out.transferId ?? null,
          amountTransferredCents: out.amountTransferredCents ?? 0,
          releaseOutcome: out.releaseOutcome ?? null,
          stripeTransferStatus: out.stripeTransferStatus ?? null,
        },
      };
    }
    case 'retry_payout': {
      if (!ctx.stripeClient) {
        return { status: 500, json: { ok: false, error: 'Stripe not configured' } };
      }
      const { data: booking, error: bookingErr } = await admin
        .from('bookings')
        .select('id, payout_status, stripe_transfer_id, payout_transfer_id, payout_needs_admin_review')
        .eq('id', id)
        .maybeSingle();
      if (bookingErr || !booking) {
        return { status: 404, json: { ok: false, error: 'not_found' } };
      }
      const row = booking as {
        payout_status?: string | null;
        stripe_transfer_id?: string | null;
        payout_transfer_id?: string | null;
        payout_needs_admin_review?: boolean | null;
      };
      const existingOnRow =
        String(row.stripe_transfer_id ?? '').trim() || String(row.payout_transfer_id ?? '').trim();
      if (existingOnRow) {
        return {
          status: 200,
          json: {
            ok: true,
            status: 'already_has_transfer',
            transferId: existingOnRow,
            message: 'Booking already has a payout transfer id; no reset performed.',
          },
        };
      }

      const existingStripeTransfer = await findExistingTransferForBooking(ctx.stripeClient, id);
      if (existingStripeTransfer) {
        const now = new Date().toISOString();
        await admin
          .from('bookings')
          .update({
            stripe_transfer_id: existingStripeTransfer.transferId,
            payout_transfer_id: existingStripeTransfer.transferId,
            payout_status: 'paid',
            payout_released: true,
            payout_released_at: now,
            payout_needs_admin_review: false,
            payout_processing_started_at: null,
          })
          .eq('id', id);
        return {
          status: 200,
          json: {
            ok: true,
            status: 'resolved_existing_transfer',
            transferId: existingStripeTransfer.transferId,
            message: 'Existing Stripe transfer found and linked to booking; no new payout will be created.',
          },
        };
      }

      await admin
        .from('bookings')
        .update({
          payout_status: 'payout_ready',
          payout_needs_admin_review: false,
          payout_processing_started_at: null,
        })
        .eq('id', id);
      return {
        status: 200,
        json: {
          ok: true,
          status: 'payout_ready',
          message: 'Payout reset to ready after Stripe transfer check. Cron can attempt release on next run.',
        },
      };
    }
    case 'keep_payout_on_hold': {
      const out = await runAdminKeepPayoutOnHold(admin, {
        bookingId: id,
        actorUserId: userId,
        holdReason: body.holdReason ?? null,
        internalNote: body.internalNote ?? null,
      });
      if (!out.ok) {
        return { status: 400, json: { ok: false, error: out.error ?? 'keep_on_hold_failed' } };
      }
      return {
        status: 200,
        json: {
          ok: true,
          status: 'held',
          message: out.message ?? 'Payout remains on hold pending further review.',
        },
      };
    }
    case 'refund_customer':
    case 'retry_refund_customer': {
      const intent = body.action === 'retry_refund_customer' ? 'retry' : 'standard';
      const out = await runAdminRefundCustomer(
        admin,
        {
          bookingId: id,
          actorUserId: userId,
          refundReason: body.refundReason ?? null,
          internalNote: body.refundInternalNote ?? body.internalNote ?? null,
          intent,
        },
        ctx.testOverrides?.refundPaymentIntent
          ? { refundPaymentIntent: ctx.testOverrides.refundPaymentIntent }
          : undefined
      );
      if (!out.ok) {
        const status = mapRefundCustomerErrorToStatus(out.error);
        const json: Record<string, unknown> = {
          ok: false,
          error: out.error ?? 'refund_failed',
          message: out.message ?? null,
        };
        if (out.retry) json.retry = out.retry;
        return { status, json };
      }
      const json: Record<string, unknown> = {
        ok: true,
        status: 'refunded',
        message: out.message ?? 'Customer refund processed; payout review cleared.',
      };
      if (out.retryPreflight) json.retry = out.retryPreflight;
      return { status: 200, json };
    }
    case 'mark_manual_review_required': {
      const { data: exists, error: exErr } = await admin.from('bookings').select('id').eq('id', id).maybeSingle();
      if (exErr || !exists) {
        return { status: 404, json: { ok: false, error: 'not_found' } };
      }
      await admin
        .from('bookings')
        .update({
          requires_admin_review: true,
          payout_blocked: true,
          payout_hold_reason: assertPayoutHoldReason('admin_review_required'),
        })
        .eq('id', id);
      await syncBookingPaymentSummary(admin, id);
      await logBookingPaymentEvent(admin, {
        bookingId: id,
        eventType: 'admin_review_required',
        phase: 'admin',
        status: 'flagged',
        actorType: 'admin',
        actorUserId: userId,
        metadata: {
          source: 'mark_manual_review_required',
          internal_note: body.internalNote ?? null,
        },
      });
      await appendRefundRemediationLedgerEvent(admin, {
        bookingId: id,
        eventType: 'admin_review_required',
        actorType: 'admin',
        actorUserId: userId,
        details: {
          source: 'mark_manual_review_required',
          internal_note: body.internalNote ?? null,
        },
      });
      return {
        status: 200,
        json: {
          ok: true,
          message: 'Booking flagged for manual payout / money review.',
          requiresAdminReview: true,
          payoutBlocked: true,
          payoutHoldReason: 'admin_review_required',
        },
      };
    }
    case 'open_dispute': {
      if (!body.customerClaim?.trim()) {
        return { status: 400, json: { error: 'customerClaim required' } };
      }
      const { disputeId } = await openDispute(admin, {
        bookingId: id,
        reportedByUserId: userId,
        customerClaim: body.customerClaim,
      });
      return { status: 200, json: { ok: true, disputeId } };
    }
    case 'resolve_dispute': {
      if (!body.disputeId || !body.resolution) {
        return { status: 400, json: { error: 'disputeId and resolution required' } };
      }
      await resolveDispute(admin, {
        disputeId: body.disputeId,
        adminUserId: userId,
        resolution: body.resolution,
        refundAmountCents: body.refundAmountCents,
        adjustedFinalAmountCents: body.adjustedFinalAmountCents,
        adjustedPayoutAmountCents: body.adjustedPayoutAmountCents,
        resolutionNotes: body.resolutionNotes,
      });
      return { status: 200, json: { ok: true } };
    }
    default:
      return {
        status: 400,
        json: {
          ok: false,
          code: 'unknown_action',
          message: `Unknown action: ${String(body.action ?? '')}`,
          errorPhase: 'validation',
          details: { action: body.action ?? null },
        },
      };
  }
}

function mapRefundCustomerErrorToStatus(error: string | undefined): number {
  switch (error) {
    case 'not_found':
      return 404;
    case 'already_released':
    case 'already_refunded':
    case 'retry_not_needed':
    case 'retry_conflicts_with_existing_refund_state':
      return 409;
    case 'retry_blocked_manual_review':
      return 422;
    case 'stripe_not_configured':
      return 500;
    case 'stripe_refund_failed':
    case 'stripe_refund_partial_failure':
      return 502;
    default:
      return 400;
  }
}
