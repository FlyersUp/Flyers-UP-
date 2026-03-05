/**
 * POST /api/bookings/[bookingId]/pay/final
 * Creates PaymentIntent for remaining balance after job completion.
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

const ELIGIBLE_STATUSES = ['deposit_paid', 'pro_en_route', 'in_progress', 'completed_pending_payment', 'awaiting_payment', 'awaiting_remaining_payment'];

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
    .select('id, customer_id, pro_id, status, payment_status, final_payment_intent_id, final_payment_status, amount_remaining, remaining_amount_cents, amount_total, total_amount_cents, amount_platform_fee, amount_deposit, currency, price')
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const status = String(booking.status);
  const finalStatus = String(booking.final_payment_status ?? 'UNPAID');

  if (!ELIGIBLE_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Booking is not ready for final payment (status: ${status})` },
      { status: 409 }
    );
  }

  const amountDeposit = Number(booking.amount_deposit ?? 0);
  const hadDeposit = amountDeposit > 0;
  if (hadDeposit && booking.payment_status !== 'PAID') {
    return NextResponse.json(
      { error: 'Deposit must be paid first' },
      { status: 409 }
    );
  }

  if (finalStatus === 'PAID') {
    return NextResponse.json(
      { error: 'Booking is already fully paid' },
      { status: 409 }
    );
  }

  const amountTotal = Number(booking.amount_total ?? booking.total_amount_cents ?? 0);
  const priceCents = Math.round(Number((booking as { price?: number }).price ?? 0) * 100);
  const amountRemaining = Number(
    booking.amount_remaining ??
    booking.remaining_amount_cents ??
    (amountTotal > 0 ? Math.max(0, amountTotal - amountDeposit) : priceCents - amountDeposit)
  );
  if (!Number.isFinite(amountRemaining) || amountRemaining <= 0) {
    return NextResponse.json({ error: 'No remaining balance to pay' }, { status: 400 });
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

  if (!connectedAccountId) {
    return NextResponse.json(
      { error: 'Pro is not ready to receive payments yet.' },
      { status: 409 }
    );
  }

  const amountPlatformFee = Number(booking.amount_platform_fee ?? 0);
  const remainingPlatformFee = amountTotal > 0
    ? Math.round((amountPlatformFee * amountRemaining) / amountTotal)
    : 0;

  const customerResult = await getOrCreateStripeCustomer(user.id, user.email ?? null);
  if ('error' in customerResult) {
    return NextResponse.json({ error: customerResult.error }, { status: 500 });
  }

  const existingPiId =
    booking.final_payment_intent_id && typeof booking.final_payment_intent_id === 'string'
      ? booking.final_payment_intent_id.trim()
      : null;

  if (existingPiId && finalStatus !== 'PAID') {
    try {
      const pi = await stripe.paymentIntents.retrieve(existingPiId);
      if (pi.status === 'succeeded') {
        return NextResponse.json({ error: 'Already fully paid' }, { status: 409 });
      }
      if (pi.amount === amountRemaining && pi.client_secret) {
        return NextResponse.json({
          clientSecret: pi.client_secret,
          paymentIntentId: pi.id,
          amountRemaining,
        });
      }
    } catch {
      // Fall through
    }
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountRemaining,
    currency: (booking.currency as string) || 'usd',
    automatic_payment_methods: { enabled: true },
    customer: customerResult.stripeCustomerId,
    metadata: {
      bookingId: id,
      customerId: booking.customer_id,
      proId: booking.pro_id,
      phase: 'final',
    },
    application_fee_amount: remainingPlatformFee,
    transfer_data: { destination: connectedAccountId },
  });

  const piStatus = paymentIntent.status;
  const newFinalStatus =
    piStatus === 'succeeded' ? 'PAID'
    : piStatus === 'requires_action' ? 'REQUIRES_ACTION'
    : 'UNPAID';

  await admin
    .from('bookings')
    .update({
      final_payment_intent_id: paymentIntent.id,
      stripe_payment_intent_remaining_id: paymentIntent.id,
      final_payment_status: newFinalStatus,
    })
    .eq('id', id);

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amountRemaining,
  });
}
