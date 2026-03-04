/**
 * Cron: auto-confirm
 * Auto-confirms bookings when customer hasn't confirmed by auto_confirm_at
 * and remaining is paid. Runs every 5 min.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron/auth';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { createNotification } from '@/lib/notify/create-notification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) return authErr;

  const admin = createSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: eligible, error } = await admin
    .from('bookings')
    .select('id, customer_id, pro_id, service_pros(user_id)')
    .eq('status', 'awaiting_customer_confirmation')
    .is('confirmed_by_customer_at', null)
    .lt('auto_confirm_at', now)
    .not('paid_remaining_at', 'is', null);

  if (error) {
    console.error('[cron/auto-confirm] query failed', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  let confirmed = 0;
  for (const b of eligible ?? []) {
    const { error: updErr } = await admin
      .from('bookings')
      .update({
        status: 'completed',
        confirmed_by_customer_at: now,
      })
      .eq('id', b.id)
      .eq('status', 'awaiting_customer_confirmation');

    if (updErr) continue;

    await admin.from('booking_events').insert({
      booking_id: b.id,
      type: 'AUTO_CONFIRMED',
      data: {},
    });

    await createNotification({
      userId: b.customer_id,
      bookingId: b.id,
      type: 'booking_auto_confirmed',
      title: 'Booking auto-confirmed',
      body: 'Booking auto-confirmed after 24h — thanks!',
    });

    const proUserId = (b.service_pros as { user_id?: string })?.user_id;
    if (proUserId) {
      await createNotification({
        userId: proUserId,
        bookingId: b.id,
        type: 'booking_auto_confirmed',
        title: 'Booking auto-confirmed',
        body: 'Booking auto-confirmed — payout releasing',
      });
    }
    confirmed++;
  }

  return NextResponse.json({ confirmed, total: eligible?.length ?? 0 });
}
