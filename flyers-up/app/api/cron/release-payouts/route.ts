/**
 * Legacy URL: Vercel and older docs pointed here. Delegates to the same job as
 * GET /api/cron/bookings/payout-release (CRON_SECRET). Prefer the canonical path for new schedulers.
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
    return NextResponse.json({
      ...result,
      deprecated_route: true,
      canonical_path: '/api/cron/bookings/payout-release',
    });
  } catch (e) {
    console.error('[cron/release-payouts]', e);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
