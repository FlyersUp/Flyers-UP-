/**
 * GET /api/customer/favorites - List favorite pros (customer_pro_preferences + legacy favorite_pros)
 * POST /api/customer/favorites - Add favorite (body: { proId })
 * DELETE /api/customer/favorites?proId=... - Remove favorite
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { setCustomerFavoritePro } from '@/lib/recurring/favorites-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile || (profile.role ?? 'customer') !== 'customer') {
      return NextResponse.json({ ok: true, favorites: [] }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    const admin = createAdminSupabaseClient();

    const { data: prefs } = await admin
      .from('customer_pro_preferences')
      .select('pro_user_id, last_interaction_at, created_at')
      .eq('customer_user_id', user.id)
      .eq('is_favorited', true)
      .order('last_interaction_at', { ascending: false });

    type Row = { proId: string; createdAt: string; pro: Record<string, unknown> | null };
    const rows: Row[] = [];

    const proUserIds = [...new Set((prefs ?? []).map((p) => (p as { pro_user_id: string }).pro_user_id).filter(Boolean))];
    if (proUserIds.length > 0) {
      const { data: pros } = await admin
        .from('service_pros')
        .select('id, user_id, display_name, logo_url, category_id')
        .in('user_id', proUserIds);

      const catIds = [...new Set((pros ?? []).map((p: { category_id?: string }) => p.category_id).filter(Boolean))];
      const catById = new Map<string, string>();
      if (catIds.length > 0) {
        const { data: cats } = await admin.from('service_categories').select('id, name').in('id', catIds);
        (cats ?? []).forEach((c: { id: string; name?: string }) => {
          if (c?.id) catById.set(c.id, c.name || 'Service');
        });
      }

      type ProRow = {
        id: string;
        user_id: string;
        display_name?: string | null;
        logo_url?: string | null;
        category_id?: string | null;
      };
      const byUser = new Map<string, ProRow>();
      (pros ?? []).forEach((p) => {
        if (p?.user_id) byUser.set(p.user_id as string, p as ProRow);
      });

      for (const pr of prefs ?? []) {
        const puid = (pr as { pro_user_id: string }).pro_user_id;
        const p = byUser.get(puid);
        if (!p?.id) continue;
        rows.push({
          proId: p.id as string,
          createdAt: (pr as { last_interaction_at?: string; created_at?: string }).last_interaction_at ?? (pr as { created_at: string }).created_at,
          pro: {
            id: p.id,
            displayName: (p.display_name as string) || 'Pro',
            logoUrl: p.logo_url ?? null,
            serviceName: p.category_id ? (catById.get(p.category_id as string) ?? 'Service') : 'Service',
          },
        });
      }
    }

    if (rows.length === 0) {
      const { data: favs } = await admin
        .from('favorite_pros')
        .select('pro_id, created_at')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      const proIds = (favs ?? []).map((f) => f.pro_id).filter(Boolean);
      if (proIds.length > 0) {
        const { data: pros } = await admin
          .from('service_pros')
          .select('id, display_name, logo_url, category_id')
          .in('id', proIds);
        const catIds = [...new Set((pros ?? []).map((p: { category_id?: string }) => p.category_id).filter(Boolean))];
        const catById = new Map<string, string>();
        if (catIds.length > 0) {
          const { data: cats } = await admin.from('service_categories').select('id, name').in('id', catIds);
          (cats ?? []).forEach((c: { id: string; name?: string }) => {
            if (c?.id) catById.set(c.id, c.name || 'Service');
          });
        }
        const proById = new Map<string, { id: string; display_name?: string; logo_url?: string | null; category_id?: string }>();
        (pros ?? []).forEach((p) => {
          if (p?.id) proById.set(p.id as string, p as { id: string; display_name?: string; logo_url?: string | null; category_id?: string });
        });
        for (const f of favs ?? []) {
          const p = proById.get(f.pro_id as string);
          rows.push({
            proId: f.pro_id as string,
            createdAt: f.created_at as string,
            pro: p
              ? {
                  id: p.id,
                  displayName: p.display_name || 'Pro',
                  logoUrl: p.logo_url ?? null,
                  serviceName: p.category_id ? (catById.get(p.category_id) ?? 'Service') : 'Service',
                }
              : null,
          });
        }
      }
    }

    return NextResponse.json({ ok: true, favorites: rows }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Favorites GET error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
    const r = await setCustomerFavoritePro(admin, user.id, proId, true);
    if (!r.ok) return NextResponse.json({ ok: false, error: r.message }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('Favorites POST error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile || (profile.role ?? 'customer') !== 'customer') {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const url = new URL(req.url);
    const proId = normalizeUuidOrNull(url.searchParams.get('proId'));
    if (!proId) return NextResponse.json({ ok: false, error: 'proId required' }, { status: 400 });

    const admin = createAdminSupabaseClient();
    const r = await setCustomerFavoritePro(admin, user.id, proId, false);
    if (!r.ok) return NextResponse.json({ ok: false, error: r.message }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('Favorites DELETE error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
