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
import { computeQuote } from '@/lib/bookingQuote';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

// Remaining payment only after pro has completed (with evidence). Prevents paying before job done.
const ELIGIBLE_STATUSES = ['completed_pending_payment', 'awaiting_payment', 'awaiting_remaining_payment'];

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

  const admin = createAdminSupabaseClient();

  // Same as deposit: pros who are the customer on a booking must be able to pay remaining balance.
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, customer_id, pro_id, status, payment_status, final_payment_intent_id, final_payment_status, amount_remaining, remaining_amount_cents, amount_total, total_amount_cents, amount_platform_fee, amount_deposit, currency, price, service_date, service_time, address')
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (bErr) {
    console.error('[pay/final] booking query error', { bookingId: id, code: bErr.code, message: bErr.message });
    return NextResponse.json({ error: 'Failed to load booking' }, { status: 500 });
  }
  if (!booking) {
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

  let amountTotal = Number(booking.amount_total ?? booking.total_amount_cents ?? 0);
  const rawPrice = Number((booking as { price?: number }).price ?? 0);
  // price is typically in dollars; if < 1000 treat as dollars (convert to cents)
  const priceCents = rawPrice > 0 && rawPrice < 10000
    ? Math.round(rawPrice * 100)
    : Math.round(rawPrice);
  let amountRemaining = Number(
    booking.amount_remaining ??
    booking.remaining_amount_cents ??
    (amountTotal > 0 ? Math.max(0, amountTotal - amountDeposit) : Math.max(0, priceCents - amountDeposit))
  );

  // Fallback: compute from quote when DB columns are empty
  if (!Number.isFinite(amountRemaining) || amountRemaining <= 0) {
    const { data: proRowForQuote } = await admin
      .from('service_pros')
      .select('user_id, display_name, service_categories(name)')
      .eq('id', booking.pro_id)
      .maybeSingle();
    const { data: proPricing } = await admin
      .from('pro_profiles')
      .select('pricing_model, starting_price, starting_rate, hourly_rate, min_hours, travel_fee_enabled, travel_fee_base, travel_free_within_miles, travel_extra_per_mile, deposit_percent_default')
      .eq('user_id', proRowForQuote?.user_id ?? '')
      .maybeSingle();
    const cat = proRowForQuote?.service_categories as { name?: string } | null;
    const serviceName = (cat?.name ?? 'Service').trim();
    const proName = ((proRowForQuote as { display_name?: string })?.display_name ?? 'Pro').trim();
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
    amountRemaining = quoteResult.quote.amountRemaining;
    if (amountTotal <= 0) amountTotal = quoteResult.quote.amountTotal;
  }

  if (!Number.isFinite(amountRemaining) || amountRemaining <= 0) {
    return NextResponse.json(
      { error: 'No remaining balance to pay' },
      { status: 400 }
    );
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
