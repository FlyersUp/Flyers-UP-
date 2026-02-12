import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { recordServerErrorEvent } from '@/lib/serverError';
import { normalizeUuidOrNull } from '@/lib/isUuid';

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
  const statusFilter = url.searchParams.get('status'); // e.g. requested|accepted|...
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? '50'), 1), 100);

  try {
    const authed = await createServerSupabaseClient();
    const {
      data: { user },
    } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await authed.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile || profile.role !== 'pro') {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    // Use admin client so we can safely resolve customer name/phone without opening profiles RLS.
    const admin = createAdminSupabaseClient();

    const { data: proRow, error: proErr } = await admin
      .from('service_pros')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (proErr || !proRow?.id) {
      return NextResponse.json({ ok: true, bookings: [] }, { status: 200 });
    }

    const proId = String(proRow.id);

    let q = admin
      .from('bookings')
      .select('id, customer_id, pro_id, service_date, service_time, address, notes, status, price, created_at')
      .eq('pro_id', proId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (statusFilter) q = q.eq('status', statusFilter);

    const { data: bookings, error: bookingsErr } = await q;
    if (bookingsErr) {
      void recordServerErrorEvent({
        message: 'API pro bookings: query failed',
        severity: 'error',
        route: 'api:GET /api/pro/bookings',
        userId: user.id,
        meta: { statusFilter, code: (bookingsErr as any).code, message: (bookingsErr as any).message },
      });
      return NextResponse.json({ ok: false, error: bookingsErr.message }, { status: 500 });
    }

    const rows = (bookings as BookingRow[]) ?? [];
    const customerIds = Array.from(
      new Set(rows.map((b) => normalizeUuidOrNull(b.customer_id)).filter((v): v is string => Boolean(v)))
    );

    const customerById = new Map<string, { fullName: string | null; phone: string | null }>();
    if (customerIds.length > 0) {
      const { data: customers, error: custErr } = await admin
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', customerIds);

      if (!custErr && Array.isArray(customers)) {
        customers.forEach((c: any) => {
          const id = normalizeUuidOrNull(c?.id);
          if (!id) return;
          customerById.set(id, {
            fullName: typeof c.full_name === 'string' ? c.full_name : null,
            phone: typeof c.phone === 'string' ? c.phone : null,
          });
        });
      }
    }

    return NextResponse.json(
      {
        ok: true,
        bookings: rows.map((b) => {
          const cust = customerById.get(b.customer_id) ?? null;
          return {
            ...b,
            customer: cust,
          };
        }),
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    void recordServerErrorEvent({
      message: 'API pro bookings: unexpected exception',
      severity: 'error',
      route: 'api:GET /api/pro/bookings',
      meta: { error: err instanceof Error ? err.message : String(err) },
    });
    return NextResponse.json({ ok: false, error: 'Unexpected error' }, { status: 500 });
  }
}

