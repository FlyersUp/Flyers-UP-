/**
 * Cron: payout release (canonical). Use this endpoint in schedulers.
 * Implements the same guards as the former release-payouts job (milestones, photos, risk, releasePayout).
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron/auth';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { runPayoutReleaseCron } from '@/lib/bookings/payout-release-cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) return authErr;

  const admin = createSupabaseAdmin();
  try {
    const result = await runPayoutReleaseCron(admin);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[cron/bookings/payout-release]', e);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
