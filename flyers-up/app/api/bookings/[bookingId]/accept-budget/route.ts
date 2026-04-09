/**
 * POST /api/bookings/[bookingId]/accept-budget
 * Pro accepts customer's budget (from job request or notes).
 * Sets price_final and price_status=accepted, moves to payment flow.
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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  let body: { amount: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    .select('id, customer_id, pro_id, status, price_status')
    .eq('id', id)
    .single();

  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (booking.pro_id !== proId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (booking.status !== 'requested' && (booking as { status?: string }).status !== 'pending') {
    return NextResponse.json({ error: 'Booking not in negotiation state' }, { status: 409 });
  }

  const priceStatus = (booking as { price_status?: string }).price_status ?? 'requested';
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
    'POST /api/bookings/[id]/accept-budget'
  );
  if (blockedRes) return blockedRes;

  const now = new Date().toISOString();
  const { error: updateErr } = await admin
    .from('bookings')
    .update({
      price: amount,
      price_final: amount,
      price_proposed: amount,
      price_status: 'accepted',
      negotiation_round: 1,
    })
    .eq('id', id);

  if (updateErr) {
    console.error('Accept budget failed', updateErr);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  await admin.from('booking_quotes').insert({
    booking_id: id,
    sender_role: 'pro',
    sender_id: user.id,
    amount,
    message: 'Accepted your budget',
    round: 1,
    action: 'accepted',
  });

  void createNotificationEvent({
    userId: booking.customer_id,
    type: NOTIFICATION_TYPES.BOOKING_ACCEPTED,
    bookingId: id,
    basePath: 'customer',
    titleOverride: 'Pro accepted your budget',
    bodyOverride: `Agreed at $${amount.toFixed(2)}`,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
