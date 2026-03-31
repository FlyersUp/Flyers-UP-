/**
 * GET /api/admin/marketplace-trust
 * Admin analytics for marketplace trust systems.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();

  try {
    const { data: analytics, error } = await admin
      .from('admin_marketplace_trust_analytics')
      .select(
        'arrival_verified_count, arrival_total_count, arrival_verification_rate, rebook_customer_count, rebook_event_count, completion_proof_count, flyer_share_count, neighborhood_jobs_7d'
      )
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Marketplace trust analytics error', error);
      return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
    }

    return NextResponse.json({
      arrivalVerifiedCount: analytics?.arrival_verified_count ?? 0,
      arrivalTotalCount: analytics?.arrival_total_count ?? 0,
      arrivalVerificationRate: Number(analytics?.arrival_verification_rate ?? 0),
      rebookCustomerCount: analytics?.rebook_customer_count ?? 0,
      rebookEventCount: analytics?.rebook_event_count ?? 0,
      completionProofCount: analytics?.completion_proof_count ?? 0,
      flyerShareCount: analytics?.flyer_share_count ?? 0,
      neighborhoodJobs7d: analytics?.neighborhood_jobs_7d ?? 0,
    });
  } catch (err) {
    console.error('Marketplace trust analytics error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
