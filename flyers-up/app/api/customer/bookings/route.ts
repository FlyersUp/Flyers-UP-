import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { recordServerErrorEvent } from '@/lib/serverError';

export const dynamic = 'force-dynamic';

type BookingRow = {
  id: string;
  customer_id: string;
  pro_id: string;
  service_date: string;
  service_time: string;
  address: string;
  notes: string | null;
  status: string;
  price: number | null;
  created_at: string;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const statusesRaw = url.searchParams.get('statuses'); // comma-separated
  const from = url.searchParams.get('from'); // YYYY-MM-DD (service_date)
  const to = url.searchParams.get('to'); // YYYY-MM-DD (service_date)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? '50'), 1), 100);

  try {
    const authed = await createServerSupabaseClient();
    const {
      data: { user },
    } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await authed.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile || profile.role !== 'customer') {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminSupabaseClient();

    let q = admin
      .from('bookings')
      .select('id, customer_id, pro_id, service_date, service_time, address, notes, status, price, created_at')
      .eq('customer_id', user.id)
      .order('service_date', { ascending: true })
      .order('service_time', { ascending: true })
      .limit(limit);

    if (statusesRaw) {
      const statuses = statusesRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (statuses.length > 0) q = q.in('status', statuses);
    }
    if (from) q = q.gte('service_date', from);
    if (to) q = q.lte('service_date', to);

    const { data: bookings, error: bookingsErr } = await q;
    if (bookingsErr) {
      void recordServerErrorEvent({
        message: 'API customer bookings: query failed',
        severity: 'error',
        route: 'api:GET /api/customer/bookings',
        userId: user.id,
        meta: { code: (bookingsErr as any).code, message: (bookingsErr as any).message },
      });
      return NextResponse.json({ ok: false, error: bookingsErr.message }, { status: 500 });
    }

    const rows = (bookings as BookingRow[]) ?? [];
    const proIds = Array.from(
      new Set(rows.map((b) => normalizeUuidOrNull(b.pro_id)).filter((v): v is string => Boolean(v)))
    );

    const proById = new Map<string, { displayName: string | null }>();
    if (proIds.length > 0) {
      const { data: pros } = await admin.from('service_pros').select('id, display_name').in('id', proIds);
      (pros ?? []).forEach((p: any) => {
        const id = normalizeUuidOrNull(p?.id);
        if (!id) return;
        proById.set(id, { displayName: typeof p.display_name === 'string' ? p.display_name : null });
      });
    }

    return NextResponse.json(
      {
        ok: true,
        bookings: rows.map((b) => ({
          ...b,
          pro: proById.get(b.pro_id) ?? null,
        })),
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    void recordServerErrorEvent({
      message: 'API customer bookings: unexpected exception',
      severity: 'error',
      route: 'api:GET /api/customer/bookings',
      meta: { error: err instanceof Error ? err.message : String(err) },
    });
    return NextResponse.json({ ok: false, error: 'Unexpected error' }, { status: 500 });
  }
}

