import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron/auth';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { logBookingPaymentEvent } from '@/lib/bookings/payment-lifecycle-service';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) return authErr;

  const admin = createSupabaseAdmin();

  const { data: rows, error } = await admin
    .from('bookings')
    .select('id, customer_id, payment_lifecycle_status, final_payment_status')
    .in('payment_lifecycle_status', ['requires_customer_action', 'payment_failed'])
    .eq('dispute_status', 'none')
    .not('final_payment_status', 'ilike', 'paid');

  if (error) {
    console.error('[cron/bookings/manual-payment-reminders]', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  let reminded = 0;
  for (const r of rows ?? []) {
    const customerId = (r as { customer_id?: string }).customer_id;
    await logBookingPaymentEvent(admin, {
      bookingId: r.id,
      eventType: 'manual_payment_link_sent',
      phase: 'final',
      status: 'reminder',
      metadata: { cron: 'manual-payment-reminders' },
    });
    if (customerId) {
      void createNotificationEvent({
        userId: customerId,
        type: NOTIFICATION_TYPES.PAYMENT_FAILED,
        bookingId: r.id,
        titleOverride: 'Complete your payment',
        bodyOverride: 'Action is needed to finish paying for your booking.',
        basePath: 'customer',
      });
    }
    reminded++;
  }

  return NextResponse.json({ reminded, total: rows?.length ?? 0 });
}
