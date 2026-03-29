/**
 * GET /api/customer/pros/[proId]/meta — favorite + preferred + mutual for profile UI
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { requireCustomerUser } from '@/lib/recurring/api-auth';
import { computeMutualPreference } from '@/lib/recurring/eligibility';
import { loadRelationshipSignals } from '@/lib/recurring/context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ proId: string }> }) {
  const { proId: raw } = await params;
  const proId = normalizeUuidOrNull(raw);
  if (!proId) return NextResponse.json({ error: 'Invalid pro' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const auth = await requireCustomerUser(supabase);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminSupabaseClient();
  const { data: sp } = await admin.from('service_pros').select('user_id').eq('id', proId).maybeSingle();
  if (!sp?.user_id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const proUserId = sp.user_id as string;
  const signals = await loadRelationshipSignals(admin, auth.userId, proUserId);
  const mutualPreference = computeMutualPreference(signals);

  const { data: completed } = await admin
    .from('bookings')
    .select('id')
    .eq('customer_id', auth.userId)
    .eq('pro_id', proId)
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    isFavorited: signals.customerFavoritedPro,
    proMarkedPreferred: signals.proMarkedPreferred,
    proBlockedRecurring: signals.proBlockedRecurring,
    mutualPreference,
    hasCompletedBooking: Boolean(completed?.id),
  });
}
