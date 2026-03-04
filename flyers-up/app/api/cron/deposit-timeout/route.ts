/**
 * Cron: deposit-timeout
 * Marks bookings awaiting_deposit_payment as cancelled_expired when payment_due_at passed.
 * Idempotent. Secured by CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron/auth';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { createNotification } from '@/lib/notify/create-notification';
import { stripe } from '@/lib/stripe/server';
import { STATUS } from '@/lib/bookings/booking-status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) return authErr;

  const admin = createSupabaseAdmin();
  const now = new Date().toISOString();

  // Map awaiting_deposit_payment to payment_required for existing schema
  const { data: overdue, error } = await admin
    .from('bookings')
    .select('id, customer_id, pro_id, payment_intent_id, stripe_payment_intent_deposit_id, service_pros(user_id)')
    .in('status', ['awaiting_deposit_payment', 'payment_required', 'accepted'])
    .lt('payment_due_at', now)
    .is('paid_deposit_at', null);

  if (error) {
    console.error('[cron/deposit-timeout] query failed', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  let count = 0;
  for (const b of overdue ?? []) {
    const { error: updErr } = await admin
      .from('bookings')
      .update({
        status: STATUS.CANCELLED_EXPIRED,
        cancelled_at: now,
        cancel_reason: 'deposit_timeout',
      })
      .eq('id', b.id)
      .in('status', ['awaiting_deposit_payment', 'payment_required', 'accepted']);

    if (updErr) {
      console.warn('[cron/deposit-timeout] update failed', b.id, updErr);
      continue;
    }

    // booking_events
    await admin.from('booking_events').insert({
      booking_id: b.id,
      type: 'CANCELLED_EXPIRED',
      data: { reason: 'deposit_timeout' },
    });

    // Notifications
    await createNotification({
      userId: b.customer_id,
      bookingId: b.id,
      type: 'booking_cancelled',
      title: 'Deposit expired',
      body: 'Deposit expired — booking cancelled',
    });
    const proUserId = (b.service_pros as { user_id?: string })?.user_id;
    if (proUserId) {
      await createNotification({
        userId: proUserId,
        bookingId: b.id,
        type: 'booking_cancelled',
        title: 'Booking cancelled',
        body: "Customer didn't pay deposit — booking cancelled",
      });
    }

    // Cancel PaymentIntent if exists
    const piId = b.stripe_payment_intent_deposit_id ?? b.payment_intent_id;
    if (piId && stripe) {
      try {
        const pi = await stripe.paymentIntents.retrieve(piId);
        if (pi.status !== 'succeeded' && pi.status !== 'canceled') {
          await stripe.paymentIntents.cancel(piId);
        }
      } catch (e) {
        console.warn('[cron/deposit-timeout] PI cancel failed', piId, e);
      }
    }
    count++;
  }

  return NextResponse.json({ expired: count, total: overdue?.length ?? 0 });
}
