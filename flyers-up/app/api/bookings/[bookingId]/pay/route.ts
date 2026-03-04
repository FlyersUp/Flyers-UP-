/**
 * POST /api/bookings/[bookingId]/pay
 * Creates or retrieves PaymentIntent for booking checkout.
 * Returns { clientSecret, paymentIntentId, quote } for Stripe Elements confirmPayment.
 * Uses destination charges: platform fee + transfer to Pro Connect account.
 * Webhook payment_intent.succeeded updates payment_status=PAID, paid_at.
 */

import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { getOrCreateStripeCustomer } from '@/lib/stripeCustomer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { computeQuote } from '@/lib/bookingQuote';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

const ELIGIBLE_STATUSES = ['accepted', 'pro_en_route', 'in_progress', 'completed_pending_payment', 'awaiting_payment'];

export async function POST(
  req: Request,
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'customer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();

  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, customer_id, pro_id, status, price, payment_intent_id, payment_status, service_date, service_time, address')
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const status = String(booking.status);
  const paymentStatus = String(booking.payment_status ?? 'UNPAID');

  if (!ELIGIBLE_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Booking is not ready for payment (status: ${status})` },
      { status: 409 }
    );
  }

  if (paymentStatus === 'PAID') {
    return NextResponse.json(
      { error: 'Booking is already paid' },
      { status: 409 }
    );
  }

  const { data: proRow } = await admin
    .from('service_pros')
    .select('id, user_id, display_name, stripe_account_id, stripe_charges_enabled, service_categories(name)')
    .eq('id', booking.pro_id)
    .maybeSingle();

  if (!proRow) {
    return NextResponse.json({ error: 'Pro not found' }, { status: 404 });
  }

  const connectedAccountId =
    proRow?.stripe_account_id && proRow?.stripe_charges_enabled === true
      ? proRow.stripe_account_id
      : null;

  if (!connectedAccountId) {
    return NextResponse.json(
      { error: 'Pro is not ready to receive payments yet.' },
      { status: 409 }
    );
  }

  const { data: proPricing } = await admin
    .from('pro_profiles')
    .select('pricing_model, starting_price, starting_rate, hourly_rate, min_hours, travel_fee_enabled, travel_fee_base, travel_free_within_miles, travel_extra_per_mile')
    .eq('user_id', proRow.user_id)
    .maybeSingle();

  const cat = proRow.service_categories as { name?: string } | null;
  const serviceName = (cat?.name ?? 'Service').trim();
  const proName = (proRow.display_name ?? 'Pro').trim();

  const quoteResult = computeQuote(
    {
      id: booking.id,
      customer_id: booking.customer_id,
      pro_id: booking.pro_id,
      service_date: booking.service_date,
      service_time: booking.service_time,
      address: booking.address,
      price: booking.price,
      status: booking.status,
    },
    proPricing,
    serviceName,
    proName
  );

  const { quote } = quoteResult;
  const amountCents = quote.amountTotal;
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: 'Booking total is not set' }, { status: 400 });
  }

  const customerResult = await getOrCreateStripeCustomer(user.id, user.email ?? null);
  if ('error' in customerResult) {
    return NextResponse.json({ error: customerResult.error }, { status: 500 });
  }

  const existingPiId =
    booking.payment_intent_id && typeof booking.payment_intent_id === 'string'
      ? booking.payment_intent_id.trim()
      : null;

  if (existingPiId && paymentStatus !== 'PAID') {
    try {
      const pi = await stripe.paymentIntents.retrieve(existingPiId);
      if (pi.status === 'succeeded') {
        return NextResponse.json({ error: 'Payment already completed' }, { status: 409 });
      }
      if (pi.amount === amountCents && pi.client_secret) {
        return NextResponse.json({
          clientSecret: pi.client_secret,
          paymentIntentId: pi.id,
          quote: quoteResult,
        });
      }
    } catch {
      // Fall through to create new
    }
  }

  const paymentIntentData: {
    amount: number;
    currency: string;
    automatic_payment_methods: { enabled: boolean };
    customer: string;
    metadata: { bookingId: string; customerId: string; proId: string };
    application_fee_amount?: number;
    transfer_data?: { destination: string };
  } = {
    amount: amountCents,
    currency: quote.currency,
    automatic_payment_methods: { enabled: true },
    customer: customerResult.stripeCustomerId,
    metadata: {
      bookingId: id,
      customerId: booking.customer_id,
      proId: booking.pro_id,
    },
  };

  paymentIntentData.application_fee_amount = quote.amountPlatformFee;
  paymentIntentData.transfer_data = { destination: connectedAccountId };

  const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

  const piStatus = paymentIntent.status;
  const newPaymentStatus =
    piStatus === 'succeeded'
      ? 'PAID'
      : piStatus === 'requires_action'
        ? 'REQUIRES_ACTION'
        : 'UNPAID';

  await admin
    .from('bookings')
    .update({
      payment_intent_id: paymentIntent.id,
      payment_status: newPaymentStatus,
    })
    .eq('id', id);

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    quote: quoteResult,
  });
}
