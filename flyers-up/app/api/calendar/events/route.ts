/**
 * GET /api/calendar/events
 * Returns calendar events (derived from bookings) for the authenticated user.
 * Pro: events for pro_id = their service_pros.id
 * Customer: events for customer_id = their user id
 * Query: from (YYYY-MM-DD), to (YYYY-MM-DD), role (pro|customer)
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { recordServerErrorEvent } from '@/lib/serverError';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { CALENDAR_COMMITTED_STATUSES } from '@/lib/calendar/committed-states';
import { PRO_CALENDAR_DISPLAY_STATUSES } from '@/lib/calendar/pro-display-statuses';
import { bookingToCalendarEvent } from '@/lib/calendar/event-from-booking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const role = url.searchParams.get('role') || 'customer';

  try {
    const authed = await createServerSupabaseClient();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminSupabaseClient();

    if (role === 'pro') {
      const { data: proRow, error: proErr } = await admin
        .from('service_pros')
        .select('id, category_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (proErr || !proRow?.id) {
        return NextResponse.json({ ok: true, events: [] }, { status: 200 });
      }

      let proServiceName = 'Service';
      if (proRow.category_id) {
        const { data: cat } = await admin.from('service_categories').select('name').eq('id', proRow.category_id).maybeSingle();
        if (cat?.name) proServiceName = cat.name;
      }

      let q = admin
        .from('bookings')
        .select(
          'id, customer_id, pro_id, service_date, service_time, booking_timezone, address, notes, status, price, duration_hours, payment_status'
        )
        .eq('pro_id', proRow.id)
        .in('status', [...PRO_CALENDAR_DISPLAY_STATUSES])
        .order('service_date', { ascending: true })
        .order('service_time', { ascending: true })
        .limit(100);

      if (from) q = q.gte('service_date', from);
      if (to) q = q.lte('service_date', to);

      const { data: bookings, error } = await q;
      if (error) {
        void recordServerErrorEvent({
          message: 'Calendar events (pro) query failed',
          severity: 'error',
          route: 'api:GET /api/calendar/events',
          meta: { code: (error as any).code, message: (error as any).message },
        });
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      const rows = (bookings ?? []) as any[];
      const customerIds = [...new Set(rows.map((b) => b.customer_id).filter(Boolean))];
      const customerById = new Map<string, { fullName: string | null }>();
      if (customerIds.length > 0) {
        const { data: profiles } = await admin
          .from('profiles')
          .select('id, full_name')
          .in('id', customerIds);
        (profiles ?? []).forEach((p: any) => {
          if (p?.id) customerById.set(p.id, { fullName: p.full_name ?? null });
        });
      }

      const events = rows
        .map((b) =>
          bookingToCalendarEvent(
            {
              ...b,
              customer: customerById.get(b.customer_id) ?? null,
              pro: { displayName: null, serviceName: proServiceName },
            },
            'pro'
          )
        )
        .filter((e): e is NonNullable<typeof e> => e != null);

      return NextResponse.json(
        { ok: true, events },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Customer
    const { data: profile } = await authed.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if ((profile?.role ?? 'customer') !== 'customer') {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    let q = admin
      .from('bookings')
      .select(
        'id, customer_id, pro_id, service_date, service_time, booking_timezone, address, notes, status, price, duration_hours, payment_status'
      )
      .eq('customer_id', user.id)
      .in('status', [...CALENDAR_COMMITTED_STATUSES])
      .order('service_date', { ascending: true })
      .order('service_time', { ascending: true })
      .limit(100);

    if (from) q = q.gte('service_date', from);
    if (to) q = q.lte('service_date', to);

    const { data: bookings, error } = await q;
    if (error) {
      void recordServerErrorEvent({
        message: 'Calendar events (customer) query failed',
        severity: 'error',
        route: 'api:GET /api/calendar/events',
        meta: { code: (error as any).code, message: (error as any).message },
      });
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const rows = (bookings ?? []) as any[];
    const proIds = [...new Set(rows.map((b) => normalizeUuidOrNull(b.pro_id)).filter(Boolean))] as string[];
    const proById = new Map<string, { displayName: string | null; serviceName: string | null }>();
    if (proIds.length > 0) {
      const { data: pros } = await admin
        .from('service_pros')
        .select('id, display_name, category_id')
        .in('id', proIds);
      const catIds = [...new Set((pros ?? []).map((p: any) => p?.category_id).filter(Boolean))];
      const catById = new Map<string, string>();
      if (catIds.length > 0) {
        const { data: cats } = await admin.from('service_categories').select('id, name').in('id', catIds);
        (cats ?? []).forEach((c: any) => { if (c?.id) catById.set(c.id, c.name || 'Service'); });
      }
      (pros ?? []).forEach((p: any) => {
        if (p?.id)
          proById.set(p.id, {
            displayName: p.display_name ?? null,
            serviceName: p.category_id ? (catById.get(p.category_id) ?? 'Service') : 'Service',
          });
      });
    }

    const events = rows
      .map((b) =>
        bookingToCalendarEvent(
          {
            ...b,
            customer: null,
            pro: proById.get(b.pro_id) ?? { displayName: null, serviceName: 'Service' },
          },
          'customer'
        )
      )
      .filter((e): e is NonNullable<typeof e> => e != null);

    return NextResponse.json(
      { ok: true, events },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    void recordServerErrorEvent({
      message: 'Calendar events: unexpected error',
      severity: 'error',
      route: 'api:GET /api/calendar/events',
      meta: { error: err instanceof Error ? err.message : String(err) },
    });
    return NextResponse.json({ ok: false, error: 'Unexpected error' }, { status: 500 });
  }
}
