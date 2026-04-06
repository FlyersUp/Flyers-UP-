import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron/auth';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { attemptFinalCharge } from '@/lib/bookings/payment-lifecycle-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) return authErr;

  const admin = createSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: rows, error } = await admin
    .from('bookings')
    .select('id')
    .eq('service_status', 'completed')
    .eq('payment_lifecycle_status', 'final_pending')
    .lte('customer_review_deadline_at', now)
    .eq('dispute_status', 'none')
    .eq('admin_hold', false)
    .eq('off_session_ready', true)
    .not('saved_payment_method_id', 'is', null)
    .gt('final_amount_cents', 0);

  if (error) {
    console.error('[cron/bookings/final-charge-scheduler]', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  let attempted = 0;
  for (const r of rows ?? []) {
    const res = await attemptFinalCharge(admin, { bookingId: r.id });
    if (res.ok) attempted++;
  }

  return NextResponse.json({ attempted, candidates: rows?.length ?? 0 });
}
