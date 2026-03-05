/**
 * GET /api/admin/marketplace/heatmap
 * Returns demand_cells for admin heatmap table.
 * Reads from demand_cells (populated by recompute_surge_for_cell).
 * Optional ?refresh=1: aggregates from demand_requests + pro_presence and recomputes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { isAdminUser } from '@/app/(app)/admin/_admin';

export const dynamic = 'force-dynamic';

function getCellKey(borough: string | null, neighborhood: string | null): string {
  const b = (borough || '').trim() || 'unknown';
  const n = (neighborhood || '').trim() || 'unknown';
  return `${b}:${n}`;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(supabase, user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const refresh = searchParams.get('refresh') === '1';
    const serviceFilter = searchParams.get('service');

    const admin = createAdminSupabaseClient();

    if (refresh) {
      // Aggregate from demand_requests + pro_presence, call recompute for each cell
      const { data: requests } = await admin
        .from('demand_requests')
        .select('service_slug, borough, neighborhood')
        .eq('status', 'open');

      const { data: presence } = await admin
        .from('pro_presence')
        .select('borough, neighborhood')
        .eq('is_online', true);

      const cellMap = new Map<string, number>();
      for (const r of requests ?? []) {
        const cellKey = getCellKey(r.borough, r.neighborhood);
        const key = `${cellKey}|${r.service_slug}`;
        cellMap.set(key, (cellMap.get(key) ?? 0) + 1);
      }

      const proCountByCell = new Map<string, number>();
      for (const p of presence ?? []) {
        const cellKey = getCellKey(p.borough, p.neighborhood);
        proCountByCell.set(cellKey, (proCountByCell.get(cellKey) ?? 0) + 1);
      }

      for (const [key, openRequests] of cellMap) {
        const [cellKey, serviceSlug] = key.split('|');
        const prosOnline = proCountByCell.get(cellKey) ?? 0;
        await admin.rpc('recompute_surge_for_cell', {
          p_cell_key: cellKey,
          p_service_slug: serviceSlug,
          p_open_requests: openRequests,
          p_pros_online: prosOnline,
        });
      }
    }

    let q = admin
      .from('demand_cells')
      .select('cell_key, service_slug, open_requests, pros_online, surge_multiplier, updated_at')
      .order('open_requests', { ascending: false });

    if (serviceFilter) {
      q = q.eq('service_slug', serviceFilter);
    }

    const { data: cells, error } = await q;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (cells ?? []).map((c) => ({
      cellKey: c.cell_key,
      serviceSlug: c.service_slug,
      openRequests: c.open_requests,
      prosOnline: c.pros_online,
      surgeMultiplier: Number(c.surge_multiplier ?? 1),
      updatedAt: c.updated_at,
    }));

    return NextResponse.json({ cells: formatted }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[admin/marketplace/heatmap] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
