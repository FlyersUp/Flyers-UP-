/**
 * GET /api/admin/marketplace/stats
 * KPI stats for admin dashboard: open requests, claims, time-to-claim, surge, pros online
 */
import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { isAdminUser } from '@/app/(app)/admin/_admin';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(supabase, user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminSupabaseClient();
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const dayIso = dayAgo.toISOString();
    const weekIso = weekAgo.toISOString();

    const [
      { count: openNow },
      { data: claimed24h },
      { data: claimed7d },
      { count: prosOnline },
    ] = await Promise.all([
      admin.from('demand_requests').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      admin.from('demand_requests').select('id, created_at, claimed_at').eq('status', 'claimed').gte('claimed_at', dayIso),
      admin.from('demand_requests').select('id, created_at, claimed_at').eq('status', 'claimed').gte('claimed_at', weekIso),
      admin.from('pro_presence').select('pro_id', { count: 'exact', head: true }).eq('is_online', true),
    ]);

    const claims24h = claimed24h?.length ?? 0;
    const claims7d = claimed7d?.length ?? 0;

    let avgTimeToClaimMs: number | null = null;
    let avgSurgeWeighted: number | null = null;

    if (claimed24h && claimed24h.length > 0) {
      const times = claimed24h
        .filter((r) => r.created_at && r.claimed_at)
        .map((r) => new Date(r.claimed_at!).getTime() - new Date(r.created_at!).getTime());
      if (times.length > 0) {
        avgTimeToClaimMs = times.reduce((a, b) => a + b, 0) / times.length;
      }
    }

    const { data: openReqs } = await admin
      .from('demand_requests')
      .select('surge_multiplier')
      .eq('status', 'open');
    if (openReqs && openReqs.length > 0) {
      const total = openReqs.reduce((s, r) => s + (r.surge_multiplier ?? 1), 0);
      avgSurgeWeighted = total / openReqs.length;
    }

    return NextResponse.json({
      openRequestsNow: openNow ?? 0,
      claimsPerHour24h: claims24h / 24,
      claims7d,
      avgTimeToClaimMs,
      avgSurgeMultiplier: avgSurgeWeighted,
      prosOnlineNow: prosOnline ?? 0,
    });
  } catch (err) {
    console.error('[admin/marketplace/stats] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
