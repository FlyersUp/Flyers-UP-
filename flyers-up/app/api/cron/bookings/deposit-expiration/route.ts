/**
 * Cron: cancel accepted / deposit-pending bookings past payment_due_at (30m window).
 * Delegates to same rules as deposit-timeout; logs booking_payment_events when table exists.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron/auth';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { logBookingPaymentEvent } from '@/lib/bookings/payment-lifecycle-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) return authErr;

  const admin = createSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: overdue, error } = await admin
    .from('bookings')
    .select('id')
    .in('status', ['awaiting_deposit_payment', 'payment_required', 'accepted'])
    .lt('payment_due_at', now)
    .is('paid_deposit_at', null);

  if (error) {
    console.error('[cron/bookings/deposit-expiration]', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  let count = 0;
  for (const b of overdue ?? []) {
    const { error: updErr } = await admin
      .from('bookings')
      .update({
        status: 'cancelled_expired',
        cancelled_at: now,
        cancel_reason: 'deposit_timeout',
      })
      .eq('id', b.id)
      .in('status', ['awaiting_deposit_payment', 'payment_required', 'accepted']);

    if (updErr) continue;
    await admin.from('booking_events').insert({
      booking_id: b.id,
      type: 'CANCELLED_EXPIRED',
      data: { reason: 'deposit_timeout', cron: 'bookings/deposit-expiration' },
    });
    try {
      await logBookingPaymentEvent(admin, {
        bookingId: b.id,
        eventType: 'deposit_payment_failed',
        phase: 'deposit',
        status: 'expired',
        metadata: { cron: 'deposit-expiration' },
      });
    } catch {
      // ledger optional if migration not applied
    }
    count++;
  }

  return NextResponse.json({ expired: count, total: overdue?.length ?? 0 });
}
