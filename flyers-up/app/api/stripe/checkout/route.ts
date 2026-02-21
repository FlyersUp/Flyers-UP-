import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

function getOriginFromRequest(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!host) return 'https://www.flyersup.app';
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 });
  }

  const { bookingId } = (await req.json().catch(() => ({}))) as { bookingId?: string };
  if (!bookingId) {
    return NextResponse.json({ error: 'Missing bookingId.' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'customer') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data: booking, error: bErr } = await supabase
    .from('bookings')
    .select('id, customer_id, pro_id, status, price')
    .eq('id', bookingId)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }

  if (booking.status !== 'awaiting_payment') {
    return NextResponse.json({ error: `Booking is not ready for payment (status: ${booking.status}).` }, { status: 400 });
  }

  const amountCents = Math.round(Number(booking.price ?? 0) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: 'Booking total is not set yet.' }, { status: 400 });
  }

  // If pro has Stripe Connect, use destination charge so payment goes directly to them
  const { data: proRow } = await supabase
    .from('service_pros')
    .select('stripe_account_id, stripe_charges_enabled')
    .eq('id', booking.pro_id)
    .maybeSingle();

  const useDestinationCharge =
    proRow?.stripe_account_id &&
    proRow?.stripe_charges_enabled === true;

  const origin = getOriginFromRequest(req);
  const successUrl = `${origin}/customer/booking/paid?bookingId=${encodeURIComponent(bookingId)}`;
  const cancelUrl = `${origin}/jobs/${encodeURIComponent(bookingId)}`;

  const paymentIntentData: {
    metadata: { booking_id: string; customer_id: string; pro_id: string };
    transfer_data?: { destination: string };
    application_fee_amount?: number;
  } = {
    metadata: {
      booking_id: booking.id,
      customer_id: booking.customer_id,
      pro_id: booking.pro_id,
    },
  };

  if (useDestinationCharge && proRow?.stripe_account_id) {
    paymentIntentData.transfer_data = { destination: proRow.stripe_account_id };
    paymentIntentData.application_fee_amount = Math.round(amountCents * 0.15); // 15% platform fee
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: 'Flyers Up service',
          },
        },
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    payment_intent_data: paymentIntentData,
    metadata: {
      booking_id: booking.id,
    },
  });

  return NextResponse.json({ url: session.url }, { status: 200 });
}

