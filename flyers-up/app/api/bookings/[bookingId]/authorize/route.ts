/**
 * GET /api/bookings/[bookingId]/authorize
 * Returns clientSecret for customer to authorize card (status=accepted).
 * PaymentIntent was created when Pro accepted. Customer authorizes here.
 */
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

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

  const admin = createAdminSupabaseClient();
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, customer_id, status, payment_intent_id')
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const status = String(booking.status);
  if (status !== 'accepted' && status !== 'pro_en_route' && status !== 'in_progress') {
    return NextResponse.json(
      { error: `Booking is not in a state requiring authorization (status: ${status})` },
      { status: 400 }
    );
  }

  const piId = booking.payment_intent_id && typeof booking.payment_intent_id === 'string'
    ? booking.payment_intent_id.trim()
    : null;

  if (!piId) {
    return NextResponse.json(
      { error: 'No payment authorization found for this booking' },
      { status: 400 }
    );
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(piId);
    if (pi.status === 'succeeded') {
      return NextResponse.json({
        clientSecret: null,
        paymentIntentId: pi.id,
        status: 'authorized',
        message: 'Your card has already been authorized.',
      });
    }
    if (pi.status === 'requires_capture') {
      return NextResponse.json({
        clientSecret: null,
        paymentIntentId: pi.id,
        status: 'authorized',
        message: 'Your card has been authorized. You will only be charged after job completion.',
      });
    }
    if (pi.client_secret) {
      return NextResponse.json({
        clientSecret: pi.client_secret,
        paymentIntentId: pi.id,
        status: 'requires_confirmation',
      });
    }
    return NextResponse.json({ error: 'Unable to retrieve payment authorization' }, { status: 500 });
  } catch {
    return NextResponse.json({ error: 'Payment authorization not found' }, { status: 404 });
  }
}
