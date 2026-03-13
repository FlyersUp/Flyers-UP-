/**
 * GET /api/customer/favorites - List favorite pros
 * POST /api/customer/favorites - Add favorite (body: { proId })
 * DELETE /api/customer/favorites?proId=... - Remove favorite
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile || (profile.role ?? 'customer') !== 'customer') {
      return NextResponse.json({ ok: true, favorites: [] }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    const admin = createAdminSupabaseClient();
    const { data: favs, error } = await admin
      .from('favorite_pros')
      .select('pro_id, created_at')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const proIds = (favs ?? []).map((f) => f.pro_id).filter(Boolean);
    if (proIds.length === 0) {
      return NextResponse.json({ ok: true, favorites: [] }, { status: 200 });
    }

    const { data: pros } = await admin
      .from('service_pros')
      .select('id, display_name, logo_url, category_id')
      .in('id', proIds);

    const catIds = Array.from(new Set((pros ?? []).map((p: any) => p?.category_id).filter(Boolean)));
    const catById = new Map<string, string>();
    if (catIds.length > 0) {
      const { data: cats } = await admin.from('service_categories').select('id, name').in('id', catIds);
      (cats ?? []).forEach((c: any) => { if (c?.id) catById.set(c.id, c.name || 'Service'); });
    }

    const proById = new Map<string, { id: string; displayName: string; logoUrl?: string | null; serviceName: string }>();
    (pros ?? []).forEach((p: any) => {
      if (!p?.id) return;
      proById.set(p.id, {
        id: p.id,
        displayName: p.display_name || 'Pro',
        logoUrl: p.logo_url ?? null,
        serviceName: p.category_id ? (catById.get(p.category_id) ?? 'Service') : 'Service',
      });
    });

    const favorites = (favs ?? []).map((f) => ({
      proId: f.pro_id,
      createdAt: f.created_at,
      pro: proById.get(f.pro_id) ?? null,
    }));

    return NextResponse.json({ ok: true, favorites }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Favorites GET error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile || (profile.role ?? 'customer') !== 'customer') {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    let body: { proId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    }
    const proId = normalizeUuidOrNull(body?.proId);
    if (!proId) return NextResponse.json({ ok: false, error: 'proId required' }, { status: 400 });

    const admin = createAdminSupabaseClient();
    const { error } = await admin.from('favorite_pros').upsert(
      { customer_id: user.id, pro_id: proId },
      { onConflict: 'customer_id,pro_id' }
    );
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('Favorites POST error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile || (profile.role ?? 'customer') !== 'customer') {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const url = new URL(req.url);
    const proId = normalizeUuidOrNull(url.searchParams.get('proId'));
    if (!proId) return NextResponse.json({ ok: false, error: 'proId required' }, { status: 400 });

    const admin = createAdminSupabaseClient();
    const { error } = await admin.from('favorite_pros').delete().eq('customer_id', user.id).eq('pro_id', proId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('Favorites DELETE error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
