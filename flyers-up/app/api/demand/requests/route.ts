/**
 * GET /api/demand/requests - List open demand requests (pro/customer)
 * POST /api/demand/requests - Create a new demand request (customer)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { createDemandRequestSchema } from '@/lib/marketplace/schema';

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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: requests, error } = await supabase
      .from('demand_requests')
      .select('id, created_at, service_slug, subcategory_slug, borough, neighborhood, urgency, status, base_price_cents, surge_multiplier, final_price_cents, scheduled_for')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[demand/requests] GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requests: requests ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[demand/requests] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = createAdminSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createDemandRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const cellKey = getCellKey(parsed.data.borough ?? null, parsed.data.neighborhood ?? null);

    // Get surge multiplier for this cell/service
    const { data: surgeMult } = await supabase.rpc('recompute_surge_for_cell', {
      p_cell_key: cellKey,
      p_service_slug: parsed.data.service_slug,
      p_open_requests: 1, // Will be updated by aggregation; optimistic
      p_pros_online: 1,
    });
    const multiplier = typeof surgeMult === 'number' ? surgeMult : 1.0;

    const baseCents = parsed.data.base_price_cents;
    const finalCents = Math.round(baseCents * multiplier);

    const { data: inserted, error } = await supabase
      .from('demand_requests')
      .insert({
        customer_id: user.id,
        service_slug: parsed.data.service_slug,
        subcategory_slug: parsed.data.subcategory_slug ?? null,
        borough: parsed.data.borough ?? null,
        neighborhood: parsed.data.neighborhood ?? null,
        lat: parsed.data.lat ?? null,
        lng: parsed.data.lng ?? null,
        scheduled_for: parsed.data.scheduled_for ?? null,
        urgency: parsed.data.urgency,
        status: 'open',
        base_price_cents: baseCents,
        surge_multiplier: multiplier,
        final_price_cents: finalCents,
      })
      .select()
      .single();

    if (error) {
      console.error('[demand/requests] POST error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log event (admin client bypasses RLS)
    await admin.from('marketplace_events').insert({
      actor_type: 'customer',
      actor_id: user.id,
      event_type: 'request_created',
      payload: {
        request_id: inserted?.id,
        service_slug: parsed.data.service_slug,
        final_price_cents: finalCents,
      },
    });

    return NextResponse.json({ ok: true, request: inserted });
  } catch (err) {
    console.error('[demand/requests] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
