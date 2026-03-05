/**
 * POST /api/admin/seed-demand
 * Seeds ~20 fake demand_requests for local dev. Guarded by NODE_ENV=development.
 */
import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { isAdminUser } from '@/app/(app)/admin/_admin';

export const dynamic = 'force-dynamic';

const FAKE_SERVICES = ['cleaning', 'handyman', 'plumbing', 'electrical', 'moving'];
const FAKE_BOROUGHS = ['Brooklyn', 'Manhattan', 'Queens', 'Bronx', 'Staten Island'];
const FAKE_NEIGHBORHOODS: Record<string, string[]> = {
  Brooklyn: ['Williamsburg', 'Bushwick', 'Park Slope', 'DUMBO', 'Bed-Stuy'],
  Manhattan: ['Upper East Side', 'Chelsea', 'Harlem', 'SoHo', 'Tribeca'],
  Queens: ['Astoria', 'Flushing', 'Long Island City', 'Jackson Heights', 'Forest Hills'],
  Bronx: ['South Bronx', 'Riverdale', 'Fordham', 'Mott Haven', 'Pelham'],
  'Staten Island': ['St. George', 'New Dorp', 'Tottenville', 'Port Richmond', 'Eltingville'],
};

export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(supabase, user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminSupabaseClient();

    const rows = [];
    for (let i = 0; i < 20; i++) {
      const borough = FAKE_BOROUGHS[i % FAKE_BOROUGHS.length];
      const neighborhoods = FAKE_NEIGHBORHOODS[borough] ?? ['unknown'];
      const neighborhood = neighborhoods[i % neighborhoods.length];
      const serviceSlug = FAKE_SERVICES[i % FAKE_SERVICES.length];
      const basePriceCents = [5000, 7500, 10000, 15000, 20000][i % 5];
      const surgeMult = 1 + (i % 5) * 0.05;
      const urgency = (['normal', 'priority', 'emergency'] as const)[i % 3];

      rows.push({
        customer_id: null,
        service_slug: serviceSlug,
        subcategory_slug: null,
        borough,
        neighborhood,
        lat: null,
        lng: null,
        scheduled_for: null,
        urgency,
        status: 'open',
        claimed_by_pro_id: null,
        claimed_at: null,
        base_price_cents: basePriceCents,
        surge_multiplier: surgeMult,
        final_price_cents: Math.round(basePriceCents * surgeMult),
      });
    }

    const { data, error } = await admin.from('demand_requests').insert(rows).select('id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, inserted: data?.length ?? rows.length });
  } catch (err) {
    console.error('[admin/seed-demand] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
