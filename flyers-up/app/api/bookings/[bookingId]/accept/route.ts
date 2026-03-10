/**
 * POST /api/bookings/[bookingId]/accept
 * Pro accepts a pending booking.
 * Sets status = payment_required, payment_due_at = now + 30 min.
 * Customer must pay deposit within 30 min via /bookings/[id]/checkout.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
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
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!proRow?.id) {
    return NextResponse.json({ error: 'Pro profile not found' }, { status: 403 });
  }
  const proId = String(proRow.id);

  const admin = createAdminSupabaseClient();
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, customer_id, pro_id, status, price')
    .eq('id', id)
    .single();

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  if (booking.pro_id !== proId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (booking.status !== 'requested' && booking.status !== 'pending') {
    return NextResponse.json(
      { error: `Cannot accept booking with status: ${booking.status}` },
      { status: 409 }
    );
  }

  const amountCents = Math.round(Number(booking.price ?? 0) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: 'Booking total is not set' }, { status: 400 });
  }

  const { data: proStripe } = await admin
    .from('service_pros')
    .select('stripe_account_id, stripe_charges_enabled')
    .eq('id', booking.pro_id)
    .maybeSingle();

  const connectedAccountId =
    proStripe?.stripe_account_id && proStripe?.stripe_charges_enabled === true
      ? proStripe.stripe_account_id
      : null;

  if (!connectedAccountId) {
    return NextResponse.json(
      { error: 'Complete Stripe Connect onboarding before accepting bookings.' },
      { status: 409 }
    );
  }

  const now = new Date();
  const paymentDueAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  const history = ((booking as { status_history?: { status: string; at: string }[] }).status_history ?? []) as { status: string; at: string }[];
  const newHistory = [...history, { status: 'awaiting_deposit_payment', at: now.toISOString() }];

  const { data: updated, error: updateErr } = await admin
    .from('bookings')
    .update({
      status: 'awaiting_deposit_payment',
      status_history: newHistory,
      accepted_at: now.toISOString(),
      payment_due_at: paymentDueAt,
      payment_status: 'UNPAID',
      status_updated_at: now.toISOString(),
      status_updated_by: user.id,
    })
    .eq('id', id)
    .eq('pro_id', proId)
    .select()
    .single();

  if (updateErr) {
    console.error('Accept: booking update failed', updateErr);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }

  void createNotificationEvent({
    userId: booking.customer_id,
    type: NOTIFICATION_TYPES.BOOKING_ACCEPTED,
    actorUserId: user.id,
    bookingId: id,
    basePath: 'customer',
  });

  return NextResponse.json({
    booking: {
      id: updated.id,
      status: updated.status,
      status_history: updated.status_history,
      accepted_at: updated.accepted_at,
      payment_due_at: paymentDueAt,
    },
  }, { status: 200 });
}
