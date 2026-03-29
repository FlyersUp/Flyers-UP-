/**
 * PUT /api/bookings/[bookingId]/milestones
 * Pro replaces milestone plan (before work starts on milestones). Idempotent.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { insertBookingProgressEvent } from '@/lib/bookings/booking-progress-events';
import { MILESTONE_PLAN_EDIT_STATUSES } from '@/lib/bookings/milestone-plan-constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type MilestoneInput = { title: string; description?: string | null; amount_cents?: number };

export async function PUT(req: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  let body: { milestones?: MilestoneInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const list = Array.isArray(body.milestones) ? body.milestones : [];
  if (list.length > 20) {
    return NextResponse.json({ error: 'Too many milestones' }, { status: 400 });
  }

  for (const m of list) {
    if (!m || typeof m.title !== 'string' || !m.title.trim()) {
      return NextResponse.json({ error: 'Each milestone needs a non-empty title' }, { status: 400 });
    }
    const cents = m.amount_cents != null ? Number(m.amount_cents) : 0;
    if (!Number.isFinite(cents) || cents < 0) {
      return NextResponse.json({ error: 'amount_cents must be >= 0' }, { status: 400 });
    }
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: proRow } = await supabase.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
  if (!proRow?.id) return NextResponse.json({ error: 'Pro not found' }, { status: 403 });

  const admin = createAdminSupabaseClient();
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, pro_id, status, is_multi_day')
    .eq('id', id)
    .eq('pro_id', proRow.id)
    .maybeSingle();

  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const status = String(booking.status);
  if (!MILESTONE_PLAN_EDIT_STATUSES.has(status)) {
    return NextResponse.json(
      { error: 'Milestone plan can only be edited before the job reaches in-progress completion flow' },
      { status: 409 }
    );
  }

  const { data: existing } = await admin.from('booking_milestones').select('status').eq('booking_id', id);
  const progressed = (existing ?? []).some((r) => String((r as { status?: string }).status) !== 'pending');
  if (progressed) {
    return NextResponse.json({ error: 'Milestones already started; cannot replace plan' }, { status: 409 });
  }

  await admin.from('booking_milestones').delete().eq('booking_id', id);

  const rows = list.map((m, idx) => ({
    booking_id: id,
    milestone_index: idx,
    title: m.title.trim(),
    description: m.description?.trim() || null,
    amount_cents: m.amount_cents != null ? Number(m.amount_cents) : 0,
    status: 'pending',
  }));

  if (rows.length > 0) {
    const { error: insErr } = await admin.from('booking_milestones').insert(rows);
    if (insErr) {
      console.error('[milestones PUT] insert', insErr);
      return NextResponse.json({ error: 'Failed to save milestones' }, { status: 500 });
    }
  }

  await admin
    .from('bookings')
    .update({
      is_multi_day: list.length > 0,
      current_milestone_index: list.length > 0 ? 0 : null,
    })
    .eq('id', id)
    .eq('pro_id', proRow.id);

  await insertBookingProgressEvent(admin, {
    booking_id: id,
    actor_user_id: user.id,
    event_type: 'milestones_defined',
    event_payload: { count: list.length },
  });

  return NextResponse.json({ ok: true, count: list.length });
}
