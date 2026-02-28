/**
 * POST /api/bookings/[bookingId]/accept
 * Pro accepts a pending booking.
 * 1. Creates Stripe PaymentIntent (capture_method: manual, 15% fee, transfer to Pro)
 * 2. Saves payment_intent_id to booking
 * 3. Updates status = accepted, accepted_at
 * Customer must authorize card separately (clientSecret from GET /api/bookings/[id]/authorize).
 */
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { getOrCreateStripeCustomer } from '@/lib/stripeCustomer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { createNotification, bookingDeepLinkCustomer } from '@/lib/notifications';

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
    .select('id, customer_id, pro_id, status, price, payment_intent_id')
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

  const { data: customerProfile } = await admin
    .from('profiles')
    .select('id, email')
    .eq('id', booking.customer_id)
    .maybeSingle();

  const customerResult = await getOrCreateStripeCustomer(
    booking.customer_id,
    (customerProfile as { email?: string } | null)?.email ?? null
  );
  if ('error' in customerResult) {
    return NextResponse.json({ error: customerResult.error }, { status: 500 });
  }

  const applicationFeeAmount = Math.round(amountCents * PLATFORM_FEE_RATE);

  const paymentIntentData: {
    amount: number;
    currency: string;
    capture_method: 'manual';
    automatic_payment_methods: { enabled: boolean };
    customer: string;
    metadata: { bookingId: string; customerId: string; proId: string };
    application_fee_amount?: number;
    transfer_data?: { destination: string };
  } = {
    amount: amountCents,
    currency: 'usd',
    capture_method: 'manual',
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

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
  } catch (err) {
    console.error('Accept: PaymentIntent create failed', err);
    return NextResponse.json(
      { error: 'Failed to create payment authorization' },
      { status: 500 }
    );
  }

  const now = new Date().toISOString();
  const history = ((booking as { status_history?: { status: string; at: string }[] }).status_history ?? []) as { status: string; at: string }[];
  const newHistory = [...history, { status: 'accepted', at: now }];

  const { data: updated, error: updateErr } = await admin
    .from('bookings')
    .update({
      status: 'accepted',
      status_history: newHistory,
      accepted_at: now,
      payment_intent_id: paymentIntent.id,
      status_updated_at: now,
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

  // Notify Customer: Booking accepted (card authorized)
  void createNotification({
    user_id: booking.customer_id,
    type: 'booking_accepted',
    title: 'Booking accepted',
    body: 'Your booking was accepted. Card has been authorized for payment.',
    booking_id: id,
    deep_link: bookingDeepLinkCustomer(id),
  });

  return NextResponse.json({
    booking: {
      id: updated.id,
      status: updated.status,
      status_history: updated.status_history,
      accepted_at: updated.accepted_at,
      payment_intent_id: paymentIntent.id,
    },
  }, { status: 200 });
}
