import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron/auth';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { attemptFinalCharge, logBookingPaymentEvent } from '@/lib/bookings/payment-lifecycle-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOG = '[cron/bookings/final-charge-retries]';

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) {
    console.warn(`${LOG} auth failed`);
    return authErr;
  }

  const admin = createSupabaseAdmin();
  const now = Date.now();

  const { data: rows, error } = await admin
    .from('bookings')
    .select('id, payment_failed_at, final_charge_retry_count')
    .eq('payment_lifecycle_status', 'payment_failed')
    .eq('dispute_status', 'none')
    .eq('admin_hold', false)
    .lt('final_charge_retry_count', 3)
    .not('final_payment_status', 'ilike', 'paid');

  if (error) {
    console.error(LOG, 'query failed', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  console.info(`${LOG} run`, { candidateRows: rows?.length ?? 0 });

  let retried = 0;
  for (const r of rows ?? []) {
    const failAt = (r as { payment_failed_at?: string | null }).payment_failed_at;
    const n = Number((r as { final_charge_retry_count?: number }).final_charge_retry_count ?? 0);
    if (!failAt) continue;
    const failMs = new Date(failAt).getTime();
    const hours = (now - failMs) / (3600 * 1000);
    const needHours = n <= 0 ? 12 : 48;
    if (hours < needHours) continue;

    await logBookingPaymentEvent(admin, {
      bookingId: r.id,
      eventType: 'retry_scheduled',
      phase: 'final',
      status: 'cron',
      metadata: { attempt: n + 1, cron: 'final-charge-retries' },
    });

    const res = await attemptFinalCharge(admin, { bookingId: r.id });
    console.info(`${LOG} attempt`, { bookingId: r.id, ok: res.ok, code: res.code });
    if (res.ok || res.code === 'requires_action') retried++;
  }

  return NextResponse.json({ retried, candidates: rows?.length ?? 0 });
}
