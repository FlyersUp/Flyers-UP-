/**
 * POST /api/bookings/[bookingId]/pay/deposit
 * Creates PaymentIntent for deposit. Customer must pay within payment_due_at (30 min).
 */
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { getOrCreateStripeCustomer } from '@/lib/stripeCustomer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { computeQuote } from '@/lib/bookingQuote';
import { computeMoneyBreakdown } from '@/lib/bookings/money';
import { validateProAvailability } from '@/lib/operations/availabilityValidation';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

/** Safe JSON error for clients; Stripe auth details only in server logs */
function depositErrorMessage(err: unknown): string {
  if (err instanceof Stripe.errors.StripeAuthenticationError) {
    console.error('[pay/deposit] Stripe authentication failed — verify STRIPE_SECRET_KEY (live vs test, no expiry)');
    return 'Payments couldn’t be started. Please try again later or contact support.';
  }
  if (err instanceof Stripe.errors.StripeInvalidRequestError) {
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('api key') || msg.includes('invalid api') || err.code === 'api_key_invalid') {
      console.error('[pay/deposit] Stripe invalid API key / request:', err.message);
      return 'Payments couldn’t be started. Please try again later or contact support.';
    }
  }
  if (err instanceof Error) {
    const m = err.message;
    if (m.includes('SUPABASE_SERVICE_ROLE_KEY')) return 'Server configuration error';
    return m;
  }
  return 'Internal server error';
}

const ELIGIBLE_STATUSES = [
  'accepted',
  'accepted_pending_payment',
  'payment_required',
  'awaiting_deposit_payment',
];

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
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

  // Any user who is the booking's customer may pay (including pros who booked another pro).
  // Do not require profile.role === 'customer' — that blocked valid payers with role "pro".
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, customer_id, pro_id, status, price, payment_intent_id, payment_status, payment_due_at, service_date, service_time, address, duration_hours, job_request_id, scope_confirmed_at')
    .eq('id', id)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (bErr) {
    console.error('[pay/deposit] booking query error', { bookingId: id, code: bErr.code, message: bErr.message });
    return NextResponse.json({ error: 'Failed to load booking' }, { status: 500 });
  }
  if (!booking) {
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

  // Avoid nested service_categories(name) embed — if PostgREST rejects the relationship,
  // the whole row returns null and we wrongly surfaced "Pro not found" even when the pro exists.
  const { data: proRow, error: proErr } = await admin
    .from('service_pros')
    .select(
      'id, user_id, display_name, category_id, stripe_account_id, stripe_charges_enabled, available, travel_radius_miles, service_area_mode, service_area_values, lead_time_minutes, buffer_between_jobs_minutes, same_day_enabled, availability_rules'
    )
    .eq('id', booking.pro_id)
    .maybeSingle();

  if (proErr) {
    console.error('[pay/deposit] service_pros query error', {
      proId: booking.pro_id,
      code: proErr.code,
      message: proErr.message,
    });
    return NextResponse.json(
      { error: 'Failed to load service pro', code: 'PRO_QUERY_FAILED' },
      { status: 500 }
    );
  }
  if (!proRow) {
    return NextResponse.json({ error: 'Pro not found', code: 'PRO_NOT_FOUND' }, { status: 404 });
  }

  let serviceName = 'Service';
  const catId = (proRow as { category_id?: string | null }).category_id;
  if (catId) {
    const { data: catRow } = await admin
      .from('service_categories')
      .select('name')
      .eq('id', catId)
      .maybeSingle();
    if (catRow && typeof (catRow as { name?: string }).name === 'string') {
      serviceName = String((catRow as { name: string }).name).trim() || 'Service';
    }
  }

  const { data: blockedRows } = await admin
    .from('pro_blocked_dates')
    .select('blocked_date')
    .eq('pro_id', booking.pro_id)
    .eq('blocked_date', booking.service_date);
  const blockedDates = blockedRows?.length ? [String(booking.service_date)] : [];

  const ACTIVE_STATUSES = ['requested', 'accepted', 'payment_required', 'deposit_paid', 'pro_en_route', 'on_the_way', 'arrived', 'in_progress', 'completed_pending_payment', 'awaiting_payment', 'paid'];
  const { data: otherBookings } = await admin
    .from('bookings')
    .select('service_date, service_time')
    .eq('pro_id', booking.pro_id)
    .neq('id', id)
    .in('status', ACTIVE_STATUSES)
    .eq('service_date', booking.service_date);
  const existingRanges = (otherBookings ?? []).map((b) => {
    const start = new Date(`${b.service_date}T${b.service_time || '09:00'}`);
    const end = new Date(start.getTime() + 90 * 60 * 1000);
    return { startAt: start, endAt: end };
  });

  const availResult = validateProAvailability({
    proId: booking.pro_id,
    proUserId: (proRow as { user_id: string }).user_id,
    serviceDate: booking.service_date,
    serviceTime: booking.service_time || '12:00',
    addressZip: (booking as { address?: string }).address?.match(/\d{5}/)?.[0],
    proActive: Boolean((proRow as { available?: boolean }).available ?? true),
    travelRadiusMiles: (proRow as { travel_radius_miles?: number | null }).travel_radius_miles,
    serviceAreaMode: (proRow as { service_area_mode?: string | null }).service_area_mode as 'radius' | 'boroughs' | 'zip_codes' | null,
    serviceAreaValues: (proRow as { service_area_values?: string[] | null }).service_area_values,
    leadTimeMinutes: (proRow as { lead_time_minutes?: number | null }).lead_time_minutes,
    bufferBetweenJobsMinutes: (proRow as { buffer_between_jobs_minutes?: number | null }).buffer_between_jobs_minutes,
    sameDayEnabled: (proRow as { same_day_enabled?: boolean | null }).same_day_enabled ?? false,
    blockedDates: blockedDates.length ? blockedDates : undefined,
    existingBookingRanges: existingRanges,
  });
  if (availResult.allowed === 'unavailable') {
    return NextResponse.json(
      { error: availResult.rejectionReason },
      { status: 409 }
    );
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

  const proName = (proRow.display_name ?? 'Pro').trim();

  const { data: profileRow } = await admin
    .from('profiles')
    .select('avatar_url')
    .eq('id', proRow.user_id)
    .maybeSingle();
  const proPhotoUrl = (profileRow as { avatar_url?: string | null })?.avatar_url ?? null;

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
    quote: {
      ...quoteResult,
      proPhotoUrl,
      address: booking.address ?? undefined,
      durationHours: (booking as { duration_hours?: number | null }).duration_hours ?? undefined,
    },
  });
  } catch (err) {
    const { bookingId: bid } = await params;
    console.error('[pay/deposit] unhandled error', { bookingId: bid, err });
    const safeMessage = depositErrorMessage(err);
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
