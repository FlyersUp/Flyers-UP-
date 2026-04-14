import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { isServiceProBookableByCustomers } from '@/lib/pro/pro-bookability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — public-ish signal for rebook UI: whether this pro accepts new customer bookings.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ proId: string }> }
) {
  const { proId } = await params;
  const id = normalizeUuidOrNull(proId);
  if (!id) {
    return NextResponse.json({ bookable: false, error: 'invalid_pro' }, { status: 400 });
  }
  try {
    const admin = createAdminSupabaseClient();
    const bookable = await isServiceProBookableByCustomers(admin, id);
    return NextResponse.json({ bookable }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ bookable: false }, { status: 200 });
  }
}
