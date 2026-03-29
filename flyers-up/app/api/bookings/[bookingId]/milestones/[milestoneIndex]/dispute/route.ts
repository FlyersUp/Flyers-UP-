/**
 * POST /api/bookings/[bookingId]/milestones/[milestoneIndex]/dispute
 * Customer opens a dispute on a milestone — blocks payout until resolved.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { insertBookingProgressEvent } from '@/lib/bookings/booking-progress-events';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ bookingId: string; milestoneIndex: string }> }) {
  const { bookingId, milestoneIndex: mi } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
  const index = parseInt(mi, 10);
  if (!Number.isFinite(index) || index < 0) {
    return NextResponse.json({ error: 'Invalid milestone index' }, { status: 400 });
  }

  let body: { reason?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'customer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, customer_id, pro_id, status')
    .eq('id', id)
    .maybeSingle();

  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (booking.customer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: row } = await admin
    .from('booking_milestones')
    .select('id, milestone_index, status')
    .eq('booking_id', id)
    .eq('milestone_index', index)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
  if (!['completed_pending_confirmation', 'confirmed', 'auto_confirmed', 'in_progress'].includes(String(row.status))) {
    return NextResponse.json({ error: 'Milestone cannot be disputed in its current state' }, { status: 409 });
  }

  const now = new Date().toISOString();
  await admin
    .from('booking_milestones')
    .update({
      status: 'disputed',
      dispute_open: true,
      updated_at: now,
    })
    .eq('id', row.id);

  await admin
    .from('bookings')
    .update({
      dispute_open: true,
      progress_status: 'disputed',
    })
    .eq('id', id);

  await insertBookingProgressEvent(admin, {
    booking_id: id,
    milestone_id: row.id,
    actor_user_id: user.id,
    event_type: 'dispute_opened',
    event_payload: { milestone_index: index, reason: body.reason?.slice(0, 500) ?? null },
  });

  const { data: proRow } = await admin.from('service_pros').select('user_id').eq('id', booking.pro_id).maybeSingle();
  const proUserId = (proRow as { user_id?: string } | null)?.user_id;
  if (proUserId) {
    void createNotificationEvent({
      userId: proUserId,
      type: NOTIFICATION_TYPES.BOOKING_CANCELED,
      bookingId: id,
      actorUserId: user.id,
      titleOverride: 'Customer reported an issue',
      bodyOverride: 'A milestone dispute was opened. Our team may review before payout.',
      basePath: 'pro',
    });
  }

  return NextResponse.json({ ok: true });
}
