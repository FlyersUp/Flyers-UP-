/**
 * GET /api/demand/heatmap
 * Returns demand heatmap: cells with open_requests, pros_online, surge_multiplier
 * Grouped by cell_key (borough:neighborhood) + service_slug
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

function getCellKey(borough: string | null, neighborhood: string | null): string {
  const b = (borough || '').trim() || 'unknown';
  const n = (neighborhood || '').trim() || 'unknown';
  return `${b}:${n}`;
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminSupabaseClient();

    // Fetch open demand_requests
    const { data: requests, error: reqErr } = await admin
      .from('demand_requests')
      .select('id, service_slug, borough, neighborhood')
      .eq('status', 'open');

    if (reqErr) {
      console.error('[demand/heatmap] requests error:', reqErr);
      return NextResponse.json({ error: reqErr.message }, { status: 500 });
    }

    // Fetch online pros from pro_presence
    const { data: presence, error: presErr } = await admin
      .from('pro_presence')
      .select('pro_id, borough, neighborhood')
      .eq('is_online', true);

    if (presErr) {
      console.error('[demand/heatmap] presence error:', presErr);
    }

    // Aggregate by cell_key + service_slug
    const cellMap = new Map<string, { open_requests: number; pros_online: number }>();

    for (const r of requests ?? []) {
      const cellKey = getCellKey(r.borough, r.neighborhood);
      const key = `${cellKey}|${r.service_slug}`;
      const cur = cellMap.get(key) ?? { open_requests: 0, pros_online: 0 };
      cur.open_requests += 1;
      cellMap.set(key, cur);
    }

    // Count pros per cell (borough:neighborhood)
    const proCells = new Set<string>();
    for (const p of presence ?? []) {
      const cellKey = getCellKey(p.borough, p.neighborhood);
      proCells.add(cellKey);
    }

    // For each cell+service, we need pros in that cell. We don't have service-level presence,
    // so we use cell-level pros_online as approximation.
    const cells: Array<{ cellKey: string; serviceSlug: string; openRequests: number; prosOnline: number; surgeMultiplier: number }> = [];

    for (const [key, counts] of cellMap) {
      const [cellKey, serviceSlug] = key.split('|');
      const prosInCell = (presence ?? []).filter(
        (p) => getCellKey(p.borough, p.neighborhood) === cellKey
      ).length;
      const prosOnlineCount = prosInCell;

      // Call RPC to compute surge (RPC uses GREATEST(pros_online,1) internally)
      const { data: mult } = await supabase.rpc('recompute_surge_for_cell', {
        p_cell_key: cellKey,
        p_service_slug: serviceSlug,
        p_open_requests: counts.open_requests,
        p_pros_online: prosOnlineCount,
      });

      const surgeMultiplier = typeof mult === 'number' ? mult : 1.0;

      cells.push({
        cellKey,
        serviceSlug,
        openRequests: counts.open_requests,
        prosOnline: prosOnlineCount,
        surgeMultiplier,
      });
    }

    return NextResponse.json({ cells }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[demand/heatmap] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
