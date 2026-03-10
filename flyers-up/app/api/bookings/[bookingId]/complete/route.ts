/**
 * POST /api/bookings/[bookingId]/complete
 * Pro marks work complete.
 * 1. Update status = awaiting_remaining_payment, completed_by_pro_at, remaining_due_at, auto_confirm_at
 * 2. Customer pays remaining separately; then confirms or auto-confirms after 24h.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { isValidTransition } from '@/components/jobs/jobStatus';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) {
    return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'pro') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: proRow } = await supabase
    .from('service_pros')
    .select('id, user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!proRow?.id) {
    return NextResponse.json({ error: 'Pro profile not found' }, { status: 403 });
  }
  const proId = String(proRow.id);
  const proUserId = proRow.user_id ?? null;

  const admin = createAdminSupabaseClient();
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, status, status_history, pro_id, customer_id, payment_intent_id')
    .eq('id', id)
    .single();

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  if (booking.pro_id !== proId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!isValidTransition(String(booking.status), 'awaiting_remaining_payment')) {
    return NextResponse.json(
      { error: `Cannot complete booking with status: ${booking.status}` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const history = ((booking as { status_history?: { status: string; at: string }[] }).status_history ?? []) as { status: string; at: string }[];
  const newHistory = [...history, { status: 'awaiting_remaining_payment', at: now }];

  const { data: updated, error: updateErr } = await admin
    .from('bookings')
    .update({
      status: 'awaiting_remaining_payment',
      status_history: newHistory,
      completed_at: now,
      completed_by_pro_at: now,
      remaining_due_at: in24h,
      auto_confirm_at: in24h,
      status_updated_at: now,
      status_updated_by: user.id,
    })
    .eq('id', id)
    .eq('pro_id', proId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }

  await admin.from('booking_events').insert({
    booking_id: id,
    type: 'WORK_COMPLETED_BY_PRO',
    data: {},
  });

  void createNotificationEvent({
    userId: booking.customer_id,
    type: NOTIFICATION_TYPES.BOOKING_COMPLETED,
    bookingId: id,
    actorUserId: proUserId ?? undefined,
    basePath: 'customer',
  });

  if (proUserId) {
    void createNotificationEvent({
      userId: proUserId,
      type: NOTIFICATION_TYPES.BOOKING_COMPLETED,
      bookingId: id,
      actorUserId: user.id,
      titleOverride: 'Marked complete',
      bodyOverride: 'Marked complete — awaiting customer payment/confirmation',
      basePath: 'pro',
    });
  }

  return NextResponse.json({
    booking: {
      id: updated.id,
      status: updated.status,
      status_history: updated.status_history,
      completed_at: updated.completed_at,
      completed_by_pro_at: now,
      remaining_due_at: in24h,
      auto_confirm_at: in24h,
    },
  }, { status: 200 });
}
