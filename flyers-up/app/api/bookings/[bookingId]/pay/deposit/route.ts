/**
 * POST /api/bookings/[bookingId]/pay/deposit
 * Creates PaymentIntent for deposit. Customer must pay within payment_due_at (30 min).
 */
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { getOrCreateStripeCustomer } from '@/lib/stripeCustomer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { computeQuote } from '@/lib/bookingQuote';
import { computeMoneyBreakdown } from '@/lib/bookings/money';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

const ELIGIBLE_STATUSES = ['accepted', 'payment_required', 'awaiting_deposit_payment'];

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
    .select('id, customer_id, pro_id, status, price, payment_intent_id, payment_status, payment_due_at, service_date, service_time, address, job_request_id, scope_confirmed_at')
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (bErr || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Scope Lock: deposit cannot be charged until scope is confirmed for job-request bookings
  const jobRequestId = (booking as { job_request_id?: string | null }).job_request_id;
  const scopeConfirmedAt = (booking as { scope_confirmed_at?: string | null }).scope_confirmed_at;
  if (jobRequestId && !scopeConfirmedAt) {
    return NextResponse.json(
      { error: 'Scope must be confirmed before deposit. Please complete the Scope Lock confirmation.' },
      { status: 403 }
    );
  }

  const status = String(booking.status);
  const paymentStatus = String(booking.payment_status ?? 'UNPAID');

  if (!ELIGIBLE_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Booking is not ready for deposit (status: ${status})` },
      { status: 409 }
    );
  }

  if (paymentStatus === 'PAID') {
    return NextResponse.json(
      { error: 'Deposit already paid' },
      { status: 409 }
    );
  }

  const paymentDueAt = (booking as { payment_due_at?: string | null }).payment_due_at;
  if (paymentDueAt) {
    const due = new Date(paymentDueAt).getTime();
    if (Date.now() >= due) {
      return NextResponse.json(
        { error: 'Payment window expired. Please request the booking again.' },
        { status: 409 }
      );
    }
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
    proRow.stripe_account_id && proRow.stripe_charges_enabled === true
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
    .select('pricing_model, starting_price, starting_rate, hourly_rate, min_hours, travel_fee_enabled, travel_fee_base, travel_free_within_miles, travel_extra_per_mile, deposit_percent_default, deposit_percent_min, deposit_percent_max')
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
    proName,
    { paymentDueAt }
  );

  const { quote } = quoteResult;
  const amountDeposit = quote.amountDeposit;
  if (!Number.isFinite(amountDeposit) || amountDeposit <= 0) {
    return NextResponse.json({ error: 'Deposit amount could not be calculated' }, { status: 400 });
  }

  const breakdown = computeMoneyBreakdown(
    quote.amountTotal,
    quote.depositPercent
  );

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
        return NextResponse.json({ error: 'Deposit already paid' }, { status: 409 });
      }
      if (pi.amount === amountDeposit && pi.client_secret) {
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

  const depositPlatformFee = Math.round(
    (quote.amountPlatformFee * amountDeposit) / quote.amountTotal
  );

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountDeposit,
    currency: quote.currency,
    automatic_payment_methods: { enabled: true },
    customer: customerResult.stripeCustomerId,
    metadata: {
      bookingId: id,
      customerId: booking.customer_id,
      proId: booking.pro_id,
      phase: 'deposit',
    },
    application_fee_amount: depositPlatformFee,
    transfer_data: { destination: connectedAccountId },
  });

  const piStatus = paymentIntent.status;
  const newPaymentStatus =
    piStatus === 'succeeded' ? 'PAID'
    : piStatus === 'requires_action' ? 'REQUIRES_ACTION'
    : 'UNPAID';

  await admin
    .from('bookings')
    .update({
      payment_intent_id: paymentIntent.id,
      stripe_payment_intent_deposit_id: paymentIntent.id,
      payment_status: newPaymentStatus,
      status: 'payment_required',
      amount_subtotal: quote.amountSubtotal,
      amount_travel_fee: quote.amountTravelFee,
      amount_platform_fee: quote.amountPlatformFee,
      amount_total: quote.amountTotal,
      total_amount_cents: breakdown.total_amount_cents,
      platform_fee_bps: breakdown.platform_fee_bps,
      platform_fee_cents: breakdown.platform_fee_cents,
      deposit_amount_cents: breakdown.deposit_amount_cents,
      remaining_amount_cents: breakdown.remaining_amount_cents,
      amount_deposit: amountDeposit,
      amount_remaining: breakdown.remaining_amount_cents,
      deposit_percent: breakdown.deposit_percent,
      currency: quote.currency,
    })
    .eq('id', id);

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    quote: quoteResult,
  });
}
