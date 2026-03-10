/**
 * POST /api/bookings/[bookingId]/accept-quote
 * Customer accepts the pro's quote.
 * Locks price_final, moves to payment flow.
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
    .select('id, customer_id, pro_id, status, price_status, price_proposed, status_history')
    .eq('id', id)
    .single();

  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (booking.customer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (booking.status !== 'requested' && (booking as { status?: string }).status !== 'pending') {
    return NextResponse.json({ error: 'Booking not in negotiation state' }, { status: 409 });
  }

  const priceStatus = (booking as { price_status?: string }).price_status ?? 'requested';
  if (priceStatus !== 'quoted') {
    return NextResponse.json({ error: 'No quote to accept' }, { status: 409 });
  }

  const proposed = Number((booking as { price_proposed?: number }).price_proposed ?? 0);
  if (!Number.isFinite(proposed) || proposed <= 0) {
    return NextResponse.json({ error: 'Invalid quote amount' }, { status: 400 });
  }

  const now = new Date();
  const paymentDueAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  const history = ((booking as { status_history?: { status: string; at: string }[] }).status_history ?? []) as { status: string; at: string }[];
  const newHistory = [...history, { status: 'awaiting_deposit_payment', at: now.toISOString() }];

  const { error: updateErr } = await admin
    .from('bookings')
    .update({
      price: proposed,
      price_final: proposed,
      price_status: 'accepted',
      status: 'awaiting_deposit_payment',
      payment_due_at: paymentDueAt,
      status_history: newHistory,
    })
    .eq('id', id);

  if (updateErr) {
    console.error('Accept quote failed', updateErr);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  await admin.from('booking_quotes').insert({
    booking_id: id,
    sender_role: 'customer',
    sender_id: user.id,
    amount: proposed,
    message: 'Accepted',
    round: (booking as { negotiation_round?: number }).negotiation_round ?? 1,
    action: 'accepted',
  });

  void createNotificationEvent({
    userId: (booking as { pro_id: string }).pro_id,
    type: NOTIFICATION_TYPES.BOOKING_ACCEPTED,
    bookingId: id,
    basePath: 'pro',
    titleOverride: 'Quote accepted',
    bodyOverride: 'Customer accepted your quote',
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
