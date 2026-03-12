/**
 * POST /api/bookings/[bookingId]/confirm
 * Customer confirms work completion.
 * Sets confirmed_by_customer_at, status = 'completed'.
 * Only when status = 'awaiting_customer_confirmation'.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'customer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, customer_id, pro_id, status, status_history')
    .eq('id', id)
    .single();

  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (booking.customer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (booking.status !== 'awaiting_customer_confirmation') {
    return NextResponse.json(
      { error: `Cannot confirm booking with status: ${booking.status}` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const history = ((booking as { status_history?: { status: string; at: string }[] }).status_history ?? []) as { status: string; at: string }[];
  const newHistory = [...history, { status: 'completed', at: now }];

  const { error: updateErr } = await admin
    .from('bookings')
    .update({
      status: 'completed',
      customer_confirmed: true,
      confirmed_by_customer_at: now,
      status_history: newHistory,
    })
    .eq('id', id)
    .eq('customer_id', user.id);

  if (updateErr) return NextResponse.json({ error: 'Failed to update' }, { status: 500 });

  await admin.from('booking_events').insert({
    booking_id: id,
    type: 'CUSTOMER_CONFIRMED',
    data: {},
  });

  const { data: proRow } = await admin.from('service_pros').select('user_id').eq('id', booking.pro_id).maybeSingle();
  const proUserId = (proRow as { user_id?: string } | null)?.user_id;
  if (proUserId) {
    void createNotificationEvent({
      userId: proUserId,
      type: NOTIFICATION_TYPES.BOOKING_COMPLETED,
      bookingId: id,
      actorUserId: user.id,
      titleOverride: 'Customer confirmed',
      bodyOverride: 'Customer confirmed — payout releasing',
      basePath: 'pro',
    });
  }

  return NextResponse.json({ status: 'completed', confirmed_at: now });
}
