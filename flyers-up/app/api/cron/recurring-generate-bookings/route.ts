/**
 * Materialize upcoming recurring occurrences into booking rows (idempotent).
 * Secured by CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron/auth';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { generateBookingFromOccurrence } from '@/lib/recurring/occurrence-booking';
const AUTO_GENERATE_STATUSES = ['scheduled', 'pending_confirmation', 'confirmed'] as const;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HORIZON_DAYS = 14;

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) return authErr;

  const admin = createSupabaseAdmin();
  const now = new Date();
  const horizon = new Date(now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await admin
    .from('recurring_occurrences')
    .select(
      `
      id,
      recurring_series!inner ( status )
    `
    )
    .is('booking_id', null)
    .eq('recurring_series.status', 'approved')
    .in('status', [...AUTO_GENERATE_STATUSES])
    .gt('scheduled_end_at', now.toISOString())
    .lte('scheduled_start_at', horizon);

  if (error) {
    console.error('[cron/recurring-generate-bookings]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const r of rows ?? []) {
    const id = (r as { id: string }).id;
    const res = await generateBookingFromOccurrence(admin, id);
    if (res.ok) {
      if (res.alreadyExisted) skipped++;
      else created++;
    } else {
      failed++;
      console.warn('[cron/recurring-generate-bookings] skip', id, res.code, res.message);
    }
  }

  return NextResponse.json({ ok: true, examined: rows?.length ?? 0, created, skipped, failed });
}
