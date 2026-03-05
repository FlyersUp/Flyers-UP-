/**
 * GET /api/demand/board
 * Service-level aggregates for Board tab: open requests, pros online, surge per service
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminSupabaseClient();

    const { data: requests } = await admin
      .from('demand_requests')
      .select('id, service_slug, borough, neighborhood, surge_multiplier, base_price_cents, final_price_cents')
      .eq('status', 'open');

    const { data: presence } = await admin
      .from('pro_presence')
      .select('pro_id, borough, neighborhood')
      .eq('is_online', true);

    const serviceMap = new Map<string, { openRequests: number; surgeSum: number; basePriceMin: number; basePriceMax: number }>();

    for (const r of requests ?? []) {
      const cur = serviceMap.get(r.service_slug) ?? {
        openRequests: 0,
        surgeSum: 0,
        basePriceMin: Infinity,
        basePriceMax: 0,
      };
      cur.openRequests += 1;
      cur.surgeSum += r.surge_multiplier ?? 1;
      if (r.base_price_cents != null) {
        cur.basePriceMin = Math.min(cur.basePriceMin, r.base_price_cents);
        cur.basePriceMax = Math.max(cur.basePriceMax, r.base_price_cents);
      }
      serviceMap.set(r.service_slug, cur);
    }

    const prosOnline = presence?.length ?? 0;

    const services = Array.from(serviceMap.entries()).map(([slug, data]) => ({
      serviceSlug: slug,
      openRequests: data.openRequests,
      prosOnline,
      surgeMultiplier: data.openRequests > 0 ? data.surgeSum / data.openRequests : 1,
      basePriceMinCents: data.basePriceMin === Infinity ? null : data.basePriceMin,
      basePriceMaxCents: data.basePriceMax === 0 ? null : data.basePriceMax,
    }));

    return NextResponse.json({ services, requests: requests ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[demand/board] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
