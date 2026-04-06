/**
 * @deprecated Disabled to avoid duplicate Stripe transfers and noisy logs.
 * Use GET /api/cron/bookings/payout-release (same CRON_SECRET) instead.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) return authErr;

  return NextResponse.json(
    {
      deprecated: true,
      error: 'Gone',
      message:
        'This endpoint is disabled. Point your scheduler at GET /api/cron/bookings/payout-release to release payouts.',
      replacement: '/api/cron/bookings/payout-release',
    },
    { status: 410 }
  );
}
