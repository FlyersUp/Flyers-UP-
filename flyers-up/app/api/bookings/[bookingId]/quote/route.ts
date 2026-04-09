/**
 * POST /api/bookings/[bookingId]/quote
 * Pro sends a quote (price + optional message).
 * Max 2 rounds. Creates quote card and updates booking price_status.
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
  if (!profile || profile.role !== 'pro') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: proRow } = await supabase
    .from('service_pros')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!proRow?.id) return NextResponse.json({ error: 'Pro not found' }, { status: 403 });
  const proId = String(proRow.id);

  const admin = createAdminSupabaseClient();
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, customer_id, pro_id, status, price_status, negotiation_round, price_proposed, price_counter')
    .eq('id', id)
    .single();

  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (booking.pro_id !== proId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (booking.status !== 'requested' && (booking as { status?: string }).status !== 'pending') {
    return NextResponse.json({ error: 'Booking not in negotiation state' }, { status: 409 });
  }

  const priceStatus = (booking as { price_status?: string }).price_status ?? 'requested';
  const round = ((booking as { negotiation_round?: number }).negotiation_round ?? 0) + 1;

  if (round > MAX_ROUNDS) {
    return NextResponse.json({ error: 'Max negotiation rounds reached' }, { status: 409 });
  }
  if (priceStatus === 'accepted' || priceStatus === 'declined') {
    return NextResponse.json({ error: 'Negotiation already concluded' }, { status: 409 });
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
    'POST /api/bookings/[id]/quote'
  );
  if (blockedRes) return blockedRes;

  const { error: quoteErr } = await admin.from('booking_quotes').insert({
    booking_id: id,
    sender_role: 'pro',
    sender_id: user.id,
    amount,
    message: body.message?.trim() || null,
    round,
    action: 'proposed',
  });

  if (quoteErr) {
    console.error('Quote insert failed', quoteErr);
    return NextResponse.json({ error: 'Failed to save quote' }, { status: 500 });
  }

  const { error: updateErr } = await admin
    .from('bookings')
    .update({
      price_proposed: amount,
      price_counter: null,
      price_status: 'quoted',
      negotiation_round: round,
    })
    .eq('id', id);

  if (updateErr) {
    console.error('Booking update failed', updateErr);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }

  void createNotificationEvent({
    userId: booking.customer_id,
    type: NOTIFICATION_TYPES.BOOKING_ACCEPTED,
    bookingId: id,
    basePath: 'customer',
    titleOverride: 'New quote received',
    bodyOverride: `Pro sent a quote: $${amount.toFixed(2)}`,
  });

  return NextResponse.json({ ok: true, round }, { status: 200 });
}
