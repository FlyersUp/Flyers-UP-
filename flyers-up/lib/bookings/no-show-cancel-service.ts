/**
 * Transaction-safe no-show cancel service.
 * Uses atomic RPC to lock, re-check, update, incident, event.
 * Side effects (refund, notifications) happen only after successful atomic cancel.
 */

import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { refundPaymentIntent } from '@/lib/stripe/server';
import { refundLifecycleMetadata } from '@/lib/stripe/booking-payment-metadata-lifecycle';
import { appendBookingRefundEvent } from '@/lib/bookings/booking-refund-ledger';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

export type NoShowCancelResult =
  | { ok: true; message: string }
  | { ok: false; status: 400 | 401 | 403 | 404 | 409 | 500; error: string };

/**
 * Atomically cancel a booking due to pro no-show.
 * Returns conflict if state changed during execution.
 */
export async function executeNoShowCancel(
  bookingId: string,
  customerId: string
): Promise<NoShowCancelResult> {
  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await admin.rpc('cancel_booking_no_show_pro_atomic', {
    p_booking_id: bookingId,
    p_customer_id: customerId,
    p_now: now,
  });

  if (error) {
    console.error('[no-show-cancel] RPC failed', { bookingId, error });
    return { ok: false, status: 500, error: 'Failed to cancel' };
  }

  const result = data as { ok?: boolean; reason?: string; status?: string } | null;
  if (!result || !result.ok) {
    const reason = result?.reason ?? 'unknown';
    if (reason === 'not_found') {
      return { ok: false, status: 404, error: 'Booking not found' };
    }
    if (reason === 'pro_arrived') {
      return { ok: false, status: 409, error: 'Pro has already arrived. Use standard cancel if needed.' };
    }
    if (reason === 'already_completed') {
      return { ok: false, status: 409, error: 'Booking already completed.' };
    }
    if (reason === 'already_cancelled') {
      return { ok: false, status: 409, error: 'Booking already canceled.' };
    }
    if (reason === 'payout_already_released') {
      return { ok: false, status: 409, error: 'Payout already released. Contact support.' };
    }
    if (reason === 'threshold_not_reached') {
      return {
        ok: false,
        status: 409,
        error: 'Penalty-free cancellation not yet available. Please wait until the grace period ends.',
      };
    }
    if (reason === 'invalid_status') {
      return {
        ok: false,
        status: 409,
        error: `Booking cannot be canceled (status: ${result?.status ?? 'unknown'})`,
      };
    }
    return { ok: false, status: 409, error: 'Booking state changed. Please refresh.' };
  }

  const payload = data as {
    pro_id?: string;
    stripe_payment_intent_deposit_id?: string | null;
    refund_status?: string | null;
  };

  // Refund deposit if captured
  const depositPiId = payload.stripe_payment_intent_deposit_id;
  if (depositPiId && payload.refund_status !== 'succeeded') {
    const { data: snapPre } = await admin
      .from('bookings')
      .select(
        [
          'payout_released',
          'deposit_amount_cents',
          'amount_deposit',
          'subtotal_cents',
          'total_amount_cents',
          'amount_total',
          'amount_platform_fee',
          'final_amount_cents',
          'remaining_amount_cents',
          'pricing_version',
        ].join(', ')
      )
      .eq('id', bookingId)
      .maybeSingle();
    const sn = snapPre as {
      payout_released?: boolean;
      deposit_amount_cents?: number;
      amount_deposit?: number;
      subtotal_cents?: number;
      total_amount_cents?: number;
      amount_total?: number;
      amount_platform_fee?: number;
      final_amount_cents?: number;
      remaining_amount_cents?: number;
      pricing_version?: string | null;
    } | null;
    const depCents = Number(sn?.deposit_amount_cents ?? sn?.amount_deposit ?? 0) || 0;
    const refundId = await refundPaymentIntent(
      depositPiId,
      refundLifecycleMetadata({
        booking_id: bookingId,
        refund_scope: 'deposit',
        resolution_type: 'no_show_pro_cancel',
        subtotal_cents: Number(sn?.subtotal_cents ?? 0) || 0,
        total_amount_cents: Number(sn?.total_amount_cents ?? sn?.amount_total ?? 0) || 0,
        platform_fee_cents: Number(sn?.amount_platform_fee ?? 0) || 0,
        deposit_amount_cents: depCents,
        final_amount_cents: Number(sn?.final_amount_cents ?? sn?.remaining_amount_cents ?? 0) || 0,
        pricing_version: typeof sn?.pricing_version === 'string' ? sn.pricing_version : null,
        extra: { reason: 'requested_by_customer' },
      })
    );
    if (refundId) {
      const afterPayout = sn?.payout_released === true;
      void appendBookingRefundEvent(admin, {
        bookingId,
        refundType: afterPayout ? 'after_payout' : 'before_payout',
        amountCents: depCents,
        stripeRefundId: refundId,
        paymentIntentId: depositPiId,
        requiresClawback: afterPayout,
        source: 'system',
      });
      await admin
        .from('bookings')
        .update({
          refund_status: 'pending',
          ...(afterPayout ? { refund_after_payout: true, requires_admin_review: true } : {}),
        })
        .eq('id', bookingId);
    }
  }

  // Notify pro
  const proId = payload.pro_id;
  if (proId) {
    const { data: proRow } = await admin
      .from('service_pros')
      .select('user_id')
      .eq('id', proId)
      .maybeSingle();
    const proUserId = (proRow as { user_id?: string } | null)?.user_id;
    if (proUserId) {
      void createNotificationEvent({
        userId: proUserId,
        type: NOTIFICATION_TYPES.BOOKING_CANCELED,
        bookingId,
        titleOverride: 'Booking canceled (no-show)',
        bodyOverride: 'Customer canceled because you did not arrive within the grace period.',
        basePath: 'pro',
      });
    }
  }

  // Notify customer
  void createNotificationEvent({
    userId: customerId,
    type: NOTIFICATION_TYPES.PAYMENT_REFUNDED,
    bookingId,
    titleOverride: 'Booking canceled',
    bodyOverride: 'You canceled penalty-free. Deposit refund initiated.',
    basePath: 'customer',
  });

  return {
    ok: true,
    message: 'Booking canceled penalty-free. Refund initiated.',
  };
}
