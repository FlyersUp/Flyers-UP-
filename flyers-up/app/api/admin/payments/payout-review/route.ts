/**
 * GET /api/admin/payments/payout-review
 * Flagged bookings: requires_admin_review && !payout_released
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { loadFlaggedPayoutReviewsForAdmin } from '@/lib/admin/flagged-payout-review';
import { isAdminUser } from '@/lib/admin/server-admin-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await isAdminUser(supabase, user))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminSupabaseClient();
  const { items, count } = await loadFlaggedPayoutReviewsForAdmin(admin);

  return NextResponse.json(
    { items, count },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
