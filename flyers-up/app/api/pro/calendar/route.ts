/**
 * GET /api/pro/calendar?month=YYYY-MM&durationMinutes=60
 * Bookings (broad statuses) + blocked intervals + customer-style month summary for the grid.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { loadComputeContextForProRange } from '@/lib/availability/load-context';
import { computeMonthSummaries } from '@/lib/availability/engine';
import { PRO_CALENDAR_DISPLAY_STATUSES } from '@/lib/calendar/pro-display-statuses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MONTH_RE = /^(\d{4})-(\d{2})$/;

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: pro } = await admin.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
  if (!pro?.id) return NextResponse.json({ ok: false, error: 'Pro not found' }, { status: 403 });

  const url = new URL(req.url);
  const month = url.searchParams.get('month')?.trim() ?? '';
  const m = month.match(MONTH_RE);
  if (!m) {
    return NextResponse.json({ ok: false, error: 'month=YYYY-MM required' }, { status: 400 });
  }
  const year = parseInt(m[1]!, 10);
  const monthNum = parseInt(m[2]!, 10);
  const durationMinutes = Math.min(
    8 * 60,
    Math.max(15, parseInt(url.searchParams.get('durationMinutes') ?? '60', 10) || 60)
  );

  const pad = (n: number) => String(n).padStart(2, '0');
  const start = `${year}-${pad(monthNum)}-01`;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const end = `${year}-${pad(monthNum)}-${pad(lastDay)}`;

  const ctx = await loadComputeContextForProRange(admin, pro.id, start, end);
  if (!ctx) {
    return NextResponse.json({ ok: false, error: 'Could not load calendar context' }, { status: 500 });
  }

  const summary = computeMonthSummaries(year, monthNum, durationMinutes, ctx);

  const rangeStartUtc = `${start}T00:00:00.000Z`;
  const rangeEndUtc = `${end}T23:59:59.999Z`;

  const [{ data: blockedRows }, { data: bookingRows }] = await Promise.all([
    admin
      .from('pro_blocked_times')
      .select('id, start_at, end_at, reason')
      .eq('pro_user_id', user.id)
      .lt('start_at', rangeEndUtc)
      .gt('end_at', rangeStartUtc),
    admin
      .from('bookings')
      .select(
        'id, customer_id, service_date, service_time, booking_timezone, status, duration_hours, scheduled_start_at, scheduled_end_at, address, notes, price'
      )
      .eq('pro_id', pro.id)
      .in('status', [...PRO_CALENDAR_DISPLAY_STATUSES])
      .gte('service_date', start)
      .lte('service_date', end)
      .order('service_date', { ascending: true })
      .order('service_time', { ascending: true })
      .limit(200),
  ]);

  return NextResponse.json(
    {
      ok: true,
      month,
      timezone: ctx.zone,
      summary,
      blockedTimes: blockedRows ?? [],
      bookings: bookingRows ?? [],
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
