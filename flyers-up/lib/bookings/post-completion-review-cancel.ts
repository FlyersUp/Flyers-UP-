/**
 * Customer cancellation while the booking is in the post-completion review window
 * (final balance not yet settled; {@link bookings.customer_review_deadline_at} still in the future).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CancellationPolicyDecision } from '@/lib/operations/cancellationPolicy';
import { CANCELLATION_POLICY_VERSION, type CancellationReasonCode } from '@/lib/operations/cancellationPolicy';
import { appendBookingRefundEvent } from '@/lib/bookings/booking-refund-ledger';
import { logBookingPaymentEvent, syncBookingPaymentSummary } from '@/lib/bookings/payment-lifecycle-service';
import { refundPaymentIntent, refundPaymentIntentPartial } from '@/lib/stripe/server';
import { refundLifecycleMetadata } from '@/lib/stripe/booking-payment-metadata-lifecycle';

export type BookingRowForReviewCancel = {
  id: string;
  status?: string | null;
  service_status?: string | null;
  payment_lifecycle_status?: string | null;
  customer_review_deadline_at?: string | null;
  final_payment_status?: string | null;
  paid_deposit_at?: string | null;
  paid_remaining_at?: string | null;
  amount_deposit?: number | null;
  amount_remaining?: number | null;
  deposit_amount_cents?: number | null;
  service_date?: string | null;
  service_time?: string | null;
  status_history?: unknown[] | null;
  stripe_payment_intent_deposit_id?: string | null;
  deposit_payment_intent_id?: string | null;
  payment_intent_id?: string | null;
  payout_released?: boolean | null;
};

export function isCustomerCancelDuringPostCompletionReviewWindow(row: BookingRowForReviewCancel): boolean {
  if (String(row.payment_lifecycle_status ?? '').trim() !== 'final_pending') return false;
  if (String(row.final_payment_status ?? '').toUpperCase() === 'PAID') return false;
  if (String(row.service_status ?? '').trim() !== 'completed') return false;

  const deadline = row.customer_review_deadline_at;
  if (!deadline || !String(deadline).trim()) return false;
  if (new Date(String(deadline)).getTime() <= Date.now()) return false;

  const st = String(row.status ?? '').toLowerCase();
  return (
    st === 'awaiting_remaining_payment' ||
    st === 'awaiting_customer_confirmation' ||
    st === 'completed_pending_payment' ||
    st === 'awaiting_payment'
  );
}

export async function persistCustomerCancelDuringPostCompletionReview(
  admin: SupabaseClient,
  input: {
    booking: BookingRowForReviewCancel;
    customerUserId: string;
    reasonCode: CancellationReasonCode;
    decision: CancellationPolicyDecision;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { booking, customerUserId, reasonCode, decision } = input;
  const now = new Date().toISOString();
  const history = (booking.status_history as { status: string; at: string }[]) ?? [];

  const { error: updErr } = await admin
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: now,
      cancellation_policy_version: CANCELLATION_POLICY_VERSION,
      cancellation_reason_code: reasonCode,
      canceled_by_user_id: customerUserId,
      canceled_at: now,
      payment_lifecycle_status: 'cancelled_during_review',
      final_payment_status: 'CANCELLED',
      final_charge_retry_count: 3,
      payment_failed_at: null,
      final_payment_retry_reason: null,
      payout_blocked: true,
      payout_hold_reason: 'customer_refunded',
      refund_type: decision.refundType,
      refund_amount_cents: decision.refundAmountCents,
      policy_decision_snapshot: {
        ruleFired: decision.ruleFired,
        refundType: decision.refundType,
        refundAmountCents: decision.refundAmountCents,
        strikePro: decision.strikePro,
        manualReviewRequired: decision.manualReviewRequired,
        context: 'post_completion_review_window',
      },
      policy_explanation: decision.explanation,
      strike_applied: decision.strikePro,
      manual_review_required: decision.manualReviewRequired,
      status_history: [...history, { status: 'cancelled', at: now, policy: decision.ruleFired }],
    })
    .eq('id', booking.id);

  if (updErr) {
    console.error('[post-completion-review-cancel] update failed', updErr);
    return { ok: false, error: 'Failed to cancel' };
  }

  await logBookingPaymentEvent(admin, {
    bookingId: booking.id,
    eventType: 'payout_blocked',
    phase: 'final',
    status: 'cancelled_during_review',
    metadata: { reason: 'customer_cancel_during_review', ruleFired: decision.ruleFired },
  });

  await syncBookingPaymentSummary(admin, booking.id);
  return { ok: true };
}

export async function maybeRefundDepositAfterReviewWindowCancel(
  admin: SupabaseClient,
  input: {
    bookingId: string;
    decision: CancellationPolicyDecision;
    depositPaymentIntentId: string | null;
    depositPaidCents: number;
    payoutReleased: boolean;
  }
): Promise<{ refundId: string | null; error?: string }> {
  const { bookingId, decision, depositPaymentIntentId, depositPaidCents, payoutReleased } = input;
  if (!depositPaymentIntentId?.trim()) {
    return { refundId: null };
  }
  if (decision.refundAmountCents <= 0 || decision.manualReviewRequired) {
    return { refundId: null };
  }
  if (decision.refundAmountCents > depositPaidCents) {
    return { refundId: null, error: 'Refund amount exceeds deposit paid' };
  }

  let refundId: string | null = null;
  if (decision.refundAmountCents >= depositPaidCents) {
    refundId = await refundPaymentIntent(
      depositPaymentIntentId,
      refundLifecycleMetadata({
        booking_id: bookingId,
        refund_scope: 'deposit',
        resolution_type: 'post_completion_review_cancel',
        subtotal_cents: 0,
        total_amount_cents: depositPaidCents,
        platform_fee_cents: 0,
        deposit_amount_cents: depositPaidCents,
        final_amount_cents: 0,
        extra: { reason: 'post_completion_review_cancel' },
      })
    );
  } else {
    refundId = await refundPaymentIntentPartial(depositPaymentIntentId, decision.refundAmountCents, {
      metadata: refundLifecycleMetadata({
        booking_id: bookingId,
        refund_scope: 'partial',
        resolution_type: 'post_completion_review_cancel',
        subtotal_cents: 0,
        total_amount_cents: depositPaidCents,
        platform_fee_cents: 0,
        deposit_amount_cents: depositPaidCents,
        final_amount_cents: 0,
        extra: { reason: 'post_completion_review_cancel_partial' },
      }),
      idempotencyKey: `refund-review-cancel-partial-${bookingId}-${decision.refundAmountCents}`,
    });
  }

  if (refundId) {
    await appendBookingRefundEvent(admin, {
      bookingId,
      refundType: payoutReleased ? 'after_payout' : 'before_payout',
      amountCents: decision.refundAmountCents,
      stripeRefundId: refundId,
      paymentIntentId: depositPaymentIntentId,
      requiresClawback: payoutReleased,
      source: 'system',
    });
    await admin
      .from('bookings')
      .update({
        refund_status: 'succeeded',
        stripe_refund_deposit_id: refundId,
        ...(payoutReleased ? { refund_after_payout: true, requires_admin_review: true } : {}),
      })
      .eq('id', bookingId);
  } else if (decision.refundAmountCents > 0) {
    await admin
      .from('bookings')
      .update({ refund_status: 'failed', manual_review_required: true })
      .eq('id', bookingId);
    return { refundId: null, error: 'Stripe refund failed' };
  }

  return { refundId };
}
