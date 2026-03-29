/**
 * GET /api/customer/calendar/recurring?from=&to=
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireCustomerUser } from '@/lib/recurring/api-auth';
import { recurringOccurrenceToCalendarEvent } from '@/lib/recurring/calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const auth = await requireCustomerUser(supabase);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const admin = createAdminSupabaseClient();
  const url = new URL(req.url);
  const from = url.searchParams.get('from')?.trim();
  const to = url.searchParams.get('to')?.trim();

  let q = admin
    .from('recurring_occurrences')
    .select(
      'id, recurring_series_id, scheduled_start_at, scheduled_end_at, status, booking_id, customer_user_id, pro_user_id, recurring_series(status, occupation_slug)'
    )
    .eq('customer_user_id', auth.userId)
    .order('scheduled_start_at', { ascending: true })
    .limit(500);

  if (from) q = q.gte('scheduled_start_at', `${from}T00:00:00.000Z`);
  if (to) q = q.lte('scheduled_start_at', `${to}T23:59:59.999Z`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const events = (data ?? []).map((row: Record<string, unknown>) => {
    const rs = row.recurring_series as { status?: string; occupation_slug?: string } | null;
    const occStatus = String(row.status);
    const seriesStatus = rs?.status ?? '';
    const slug = rs?.occupation_slug ?? 'recurring';
    const label =
      seriesStatus === 'paused'
        ? `[Paused] ${slug}`
        : occStatus === 'skipped'
          ? `[Skipped] ${slug}`
          : occStatus === 'reschedule_requested'
            ? `[Reschedule] ${slug}`
            : `Recurring · ${slug}`;

    return recurringOccurrenceToCalendarEvent({
      occurrenceId: String(row.id),
      seriesId: String(row.recurring_series_id),
      scheduledStartAt: String(row.scheduled_start_at),
      scheduledEndAt: String(row.scheduled_end_at),
      status: occStatus,
      occupationSlug: slug,
      customerUserId: String(row.customer_user_id),
      proUserId: String(row.pro_user_id),
      bookingId: (row.booking_id as string | null) ?? null,
      label,
    });
  });

  return NextResponse.json({ ok: true, events }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
