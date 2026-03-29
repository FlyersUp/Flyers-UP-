/**
 * GET /api/pro/calendar/day?date=YYYY-MM-DD&durationMinutes=60
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { loadComputeContextForProRange } from '@/lib/availability/load-context';
import { computeSlotsForDay } from '@/lib/availability/engine';
import { PRO_CALENDAR_DISPLAY_STATUSES } from '@/lib/calendar/pro-display-statuses';
import { DateTime } from 'luxon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
  const date = url.searchParams.get('date')?.trim() ?? '';
  const durationMinutes = Math.min(
    8 * 60,
    Math.max(15, parseInt(url.searchParams.get('durationMinutes') ?? '60', 10) || 60)
  );

  if (!DATE_RE.test(date)) {
    return NextResponse.json({ ok: false, error: 'date=YYYY-MM-DD required' }, { status: 400 });
  }

  const ctx = await loadComputeContextForProRange(admin, pro.id, date, date);
  if (!ctx) {
    return NextResponse.json({ ok: false, error: 'Could not load context' }, { status: 500 });
  }

  const bookableSlotsPreview = computeSlotsForDay(date, durationMinutes, ctx);

  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  const [{ data: blockedRows }, { data: bookingRows }] = await Promise.all([
    admin
      .from('pro_blocked_times')
      .select('id, start_at, end_at, reason')
      .eq('pro_user_id', user.id)
      .lt('start_at', dayEnd)
      .gt('end_at', dayStart),
    admin
      .from('bookings')
      .select(
        'id, customer_id, service_date, service_time, booking_timezone, status, duration_hours, scheduled_start_at, scheduled_end_at, address, notes, price'
      )
      .eq('pro_id', pro.id)
      .in('status', [...PRO_CALENDAR_DISPLAY_STATUSES])
      .eq('service_date', date)
      .order('service_time', { ascending: true }),
  ]);

  const { data: blockedDates } = await admin
    .from('pro_blocked_dates')
    .select('blocked_date, reason')
    .eq('pro_id', pro.id)
    .eq('blocked_date', date)
    .maybeSingle();

  return NextResponse.json(
    {
      ok: true,
      date,
      timezone: ctx.zone,
      fullDayBlocked: Boolean(blockedDates),
      bookableSlotsPreview,
      blockedTimes: blockedRows ?? [],
      bookings: bookingRows ?? [],
      label: DateTime.fromISO(date, { zone: ctx.zone }).setLocale('en-US').toFormat('cccc, MMM d, yyyy'),
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
