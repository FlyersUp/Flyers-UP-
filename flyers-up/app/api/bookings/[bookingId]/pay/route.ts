/**
 * POST /api/bookings/[bookingId]/pay
 * Creates or retrieves PaymentIntent for booking checkout.
 * Returns { clientSecret, paymentIntentId } for Stripe Elements confirmPayment.
 * Uses destination charges: 15% platform fee + transfer to Pro Connect account.
 * Webhook payment_intent.succeeded updates payment_status=PAID, paid_at.
 */

import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { getOrCreateStripeCustomer } from '@/lib/stripeCustomer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

const PLATFORM_FEE_RATE = 0.15;

export async function POST(
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
    .select('id, customer_id, pro_id, status, price, payment_intent_id, payment_status')
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const status = String(booking.status);
  const paymentStatus = String(booking.payment_status ?? 'UNPAID');

  if (status !== 'awaiting_payment') {
    return NextResponse.json(
      { error: `Booking is not ready for payment (status: ${status})` },
      { status: 400 }
    );
  }

  if (paymentStatus === 'PAID') {
    return NextResponse.json(
      { error: 'Booking is already paid' },
      { status: 400 }
    );
  }

  const amountCents = Math.round(Number(booking.price ?? 0) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: 'Booking total is not set' }, { status: 400 });
  }

  const { data: proRow } = await admin
    .from('service_pros')
    .select('stripe_account_id, stripe_charges_enabled')
    .eq('id', booking.pro_id)
    .maybeSingle();

  const connectedAccountId =
    proRow?.stripe_account_id && proRow?.stripe_charges_enabled === true
      ? proRow.stripe_account_id
      : null;

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
        return NextResponse.json({ error: 'Payment already completed' }, { status: 400 });
      }
      if (pi.client_secret) {
        return NextResponse.json({
          clientSecret: pi.client_secret,
          paymentIntentId: pi.id,
        });
      }
    } catch {
      // Fall through to create new
    }
  }

  const applicationFeeAmount = Math.round(amountCents * PLATFORM_FEE_RATE);

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
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    customer: customerResult.stripeCustomerId,
    metadata: {
      bookingId: id,
      customerId: booking.customer_id,
      proId: booking.pro_id,
    },
  };

  if (connectedAccountId) {
    paymentIntentData.application_fee_amount = applicationFeeAmount;
    paymentIntentData.transfer_data = { destination: connectedAccountId };
  }

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
  });
}
