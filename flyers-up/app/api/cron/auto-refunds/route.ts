/**
 * Cron: auto-refunds
 * Refunds deposit for cancelled bookings where job never started.
 * Idempotent. Secured by CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron/auth';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';
import { refundPaymentIntent } from '@/lib/stripe/server';
import { STATUS } from '@/lib/bookings/booking-status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CANCELLED_STATUSES = [
  STATUS.CANCELLED_EXPIRED,
  STATUS.CANCELLED_BY_CUSTOMER,
  STATUS.CANCELLED_BY_PRO,
  STATUS.CANCELLED_ADMIN,
  'cancelled',
  'declined',
  'expired_unpaid',
];

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) return authErr;

  const admin = createSupabaseAdmin();

  // Cancelled bookings with paid deposit, job never started, no refund yet
  const { data: toRefund, error } = await admin
    .from('bookings')
    .select('id, customer_id, pro_id, deposit_amount_cents, amount_deposit, refunded_total_cents, stripe_payment_intent_deposit_id, payment_intent_id, service_pros(user_id)')
    .in('status', CANCELLED_STATUSES)
    .or('refund_status.is.null,refund_status.eq.none')
    .not('paid_deposit_at', 'is', null)
    .is('started_at', null)
    .or('stripe_payment_intent_deposit_id.not.is.null,payment_intent_id.not.is.null');

  if (error) {
    console.error('[cron/auto-refunds] query failed', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  const eligible = toRefund ?? [];
  let succeeded = 0;
  let failed = 0;

  for (const b of eligible) {
    const piId = b.stripe_payment_intent_deposit_id ?? b.payment_intent_id;
    if (!piId) continue;

    // Set pending first (idempotent)
    const { error: updErr } = await admin
      .from('bookings')
      .update({ refund_status: 'pending' })
      .eq('id', b.id)
      .or('refund_status.is.null,refund_status.eq.none');

    if (updErr) continue; // Already pending or processing

    const refundId = await refundPaymentIntent(piId, {
      reason: 'requested_by_customer',
      booking_id: b.id,
    });

    const proUserId = (b.service_pros as { user_id?: string })?.user_id;

    if (refundId) {
      const amountRefunded = Number(b.deposit_amount_cents ?? b.amount_deposit ?? 0);
      const prevRefunded = Number(b.refunded_total_cents ?? 0);
      await admin
        .from('bookings')
        .update({
          refund_status: 'succeeded',
          stripe_refund_deposit_id: refundId,
          refunded_total_cents: prevRefunded + amountRefunded,
        })
        .eq('id', b.id);

      await admin.from('booking_events').insert({
        booking_id: b.id,
        type: 'REFUND_CREATED',
        data: { refund_id: refundId },
      });

      void createNotificationEvent({
        userId: b.customer_id,
        type: NOTIFICATION_TYPES.PAYMENT_REFUNDED,
        bookingId: b.id,
        basePath: 'customer',
      });
      if (proUserId) {
        void createNotificationEvent({
          userId: proUserId,
          type: NOTIFICATION_TYPES.PAYMENT_REFUNDED,
          bookingId: b.id,
          titleOverride: 'Refund processed',
          bodyOverride: 'Deposit refunded to customer.',
          basePath: 'pro',
        });
      }
      succeeded++;
    } else {
      await admin
        .from('bookings')
        .update({ refund_status: 'failed' })
        .eq('id', b.id);

      await admin.from('booking_events').insert({
        booking_id: b.id,
        type: 'REFUND_FAILED',
        data: {},
      });

      void createNotificationEvent({
        userId: b.customer_id,
        type: NOTIFICATION_TYPES.PAYMENT_FAILED,
        bookingId: b.id,
        titleOverride: 'Refund issue',
        bodyOverride: 'We could not process your refund automatically. Please contact support.',
        basePath: 'customer',
      });
      failed++;
    }
  }

  return NextResponse.json({
    succeeded,
    failed,
    total: eligible.length,
  });
}
