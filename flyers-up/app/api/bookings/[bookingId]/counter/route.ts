/**
 * POST /api/bookings/[bookingId]/counter
 * Customer sends a counter offer.
 * Max 2 rounds.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';
import {
  getBookingMessagingParties,
  otherPartyUserIdForBooking,
  rejectIfMessagingBlocked,
} from '@/lib/messaging/blockEnforcement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ROUNDS = 2;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  let body: { amount: number; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

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
    .select('id, customer_id, pro_id, status, price_status, negotiation_round')
    .eq('id', id)
    .single();

  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (booking.customer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (booking.status !== 'requested' && (booking as { status?: string }).status !== 'pending') {
    return NextResponse.json({ error: 'Booking not in negotiation state' }, { status: 409 });
  }

  const priceStatus = (booking as { price_status?: string }).price_status ?? 'requested';
  if (priceStatus !== 'quoted') {
    return NextResponse.json({ error: 'No quote to counter' }, { status: 409 });
  }

  const parties = await getBookingMessagingParties(admin, {
    customer_id: booking.customer_id as string,
    pro_id: booking.pro_id as string,
  });
  if (!parties) return NextResponse.json({ error: 'Invalid booking' }, { status: 500 });
  const blockedRes = await rejectIfMessagingBlocked(
    admin,
    user.id,
    otherPartyUserIdForBooking(parties, user.id),
    'POST /api/bookings/[id]/counter'
  );
  if (blockedRes) return blockedRes;

  const round = ((booking as { negotiation_round?: number }).negotiation_round ?? 0) + 1;
  if (round > MAX_ROUNDS) {
    return NextResponse.json({ error: 'Max negotiation rounds reached' }, { status: 409 });
  }

  const { error: quoteErr } = await admin.from('booking_quotes').insert({
    booking_id: id,
    sender_role: 'customer',
    sender_id: user.id,
    amount,
    message: body.message?.trim() || null,
    round,
    action: 'countered',
  });

  if (quoteErr) {
    console.error('Counter insert failed', quoteErr);
    return NextResponse.json({ error: 'Failed to save counter' }, { status: 500 });
  }

  const { error: updateErr } = await admin
    .from('bookings')
    .update({
      price_counter: amount,
      price_status: 'countered',
      negotiation_round: round,
    })
    .eq('id', id);

  if (updateErr) {
    console.error('Booking update failed', updateErr);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }

  const { data: proRow } = await admin
    .from('service_pros')
    .select('user_id')
    .eq('id', booking.pro_id)
    .maybeSingle();
  const proUserId = (proRow as { user_id?: string } | null)?.user_id;
  if (proUserId) {
    void createNotificationEvent({
      userId: proUserId,
      type: NOTIFICATION_TYPES.BOOKING_ACCEPTED,
      bookingId: id,
      basePath: 'pro',
      titleOverride: 'Counter offer received',
      bodyOverride: `Customer countered: $${amount.toFixed(2)}`,
    });
  }

  return NextResponse.json({ ok: true, round }, { status: 200 });
}
