/**
 * POST /api/bookings/[bookingId]/pay/deposit
 * Creates PaymentIntent for deposit. Customer must pay within payment_due_at (30 min).
 *
 * CRITICAL: Deposit is charged to platform (no transfer_data). Pro does NOT receive
 * funds until verified arrival, start, completion, and customer/auto confirmation.
 * Funds are held by platform until release-payouts cron runs after eligibility.
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
import { getFeeRuleForBooking } from '@/lib/bookings/fee-rules';
import {
  resolveAreaDemandScoreFromBooking,
  resolveConversionRiskScore,
  resolveCustomerBookingHistoryFlags,
  resolveSupplyTightnessScoreFromBooking,
  resolveTrustRiskScore,
  resolveUrgencyFromBooking,
} from '@/lib/bookings/dynamic-pricing-features';
import { DEFAULT_BOOKING_TIMEZONE } from '@/lib/datetime/constants';
import type { OverlapBookingRow } from '@/lib/operations/availabilityValidation';
import {
  buildExistingBookingRangesForOverlap,
  resolveSameDayEnabledFromServicePro,
  validateProAvailability,
} from '@/lib/operations/availabilityValidation';
import { loadRecurringHoldRangesForProAroundServiceDate } from '@/lib/recurring/recurring-holds';
import {
  buildBookingPaymentIntentStripeFields,
  capStripeBookingPaymentMetadata,
} from '@/lib/stripe/booking-payment-intent-metadata';
import {
  buildBookingPaymentIntentPricingMetadata,
  trustOccupationProfileForStripeMetadata,
} from '@/lib/stripe/booking-payment-pricing-metadata';
import { appendLifecyclePaymentIntentMetadata } from '@/lib/stripe/booking-payment-metadata-lifecycle';
import { assertUnifiedBookingPaymentIntentMetadata } from '@/lib/stripe/payment-intent-metadata-unified';
import {
  logBookingPaymentEvent,
  syncBookingPaymentSummary,
} from '@/lib/bookings/payment-lifecycle-service';
import { minimumBookingNoticeFromBookingRow } from '@/lib/pricing/config';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

/** Safe client message + machine code for Network tab / support */
function depositErrorPayload(err: unknown): { message: string; code: string } {
  if (err instanceof Stripe.errors.StripeAuthenticationError) {
    console.error(
      '[pay/deposit] FLYERSUP_DEPOSIT_ERR StripeAuthenticationError — check STRIPE_SECRET_KEY in Vercel (sk_live_ / sk_test_, no spaces, redeploy)'
    );
    return {
      message: 'Payments couldn’t be started. Please try again later or contact support.',
      code: 'STRIPE_AUTH_FAILED',
    };
  }
  if (err instanceof Stripe.errors.StripeInvalidRequestError) {
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('api key') || msg.includes('invalid api') || err.code === 'api_key_invalid') {
      console.error('[pay/deposit] FLYERSUP_DEPOSIT_ERR StripeInvalidRequestError (key):', err.message);
      return {
        message: 'Payments couldn’t be started. Please try again later or contact support.',
        code: 'STRIPE_INVALID_KEY',
      };
    }
    // Connect / destination / amount — show type in logs, safe message to user
    console.error('[pay/deposit] FLYERSUP_DEPOSIT_ERR StripeInvalidRequestError:', err.code, err.message);
    return {
      message: err.message || 'Payment could not be started. Check pro Stripe Connect setup.',
      code: 'STRIPE_INVALID_REQUEST',
    };
  }
  if (err instanceof Stripe.errors.StripeAPIError) {
    console.error('[pay/deposit] FLYERSUP_DEPOSIT_ERR StripeAPIError:', err.message);
    return { message: 'Payment service error. Please try again.', code: 'STRIPE_API_ERROR' };
  }
  if (err instanceof Error) {
    const m = err.message;
    if (m.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return { message: 'Server configuration error', code: 'SERVER_CONFIG' };
    }
    console.error('[pay/deposit] FLYERSUP_DEPOSIT_ERR Error:', m);
    return { message: m, code: 'UNKNOWN' };
  }
  console.error('[pay/deposit] FLYERSUP_DEPOSIT_ERR non-Error:', err);
  return { message: 'Internal server error', code: 'UNKNOWN' };
}

const ELIGIBLE_STATUSES = [
  'accepted',
  'accepted_pending_payment',
  'payment_required',
  'awaiting_deposit_payment',
];

/**
 * If the job moved past "accepted" before deposit was collected (legacy bug or race),
 * still allow the customer to pay the deposit so the booking can reconcile. Do not use
 * for in_progress+ (work started without deposit is an ops edge case).
 */
const DEPOSIT_RECOVERY_PRE_WORK_STATUSES = ['pro_en_route', 'on_the_way', 'arrived'] as const;

function isDepositRecoveryStatus(status: string): boolean {
  return (DEPOSIT_RECOVERY_PRE_WORK_STATUSES as readonly string[]).includes(status);
}

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
    .select(
      'id, customer_id, pro_id, status, price, payment_intent_id, payment_status, payment_due_at, paid_deposit_at, service_date, service_time, booking_timezone, address, job_request_id, scope_confirmed_at, urgency, created_at, fee_profile, pricing_occupation_slug, pricing_category_slug, pricing_version, pricing_band, service_fee_cents, convenience_fee_cents, protection_fee_cents, original_subtotal_cents, subtotal_cents, demand_fee_cents, fee_total_cents, customer_total_cents, pro_earnings_cents, platform_revenue_cents, charge_model, duration_hours, miles_distance, flat_fee_selected, hourly_selected'
    )
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

  const minimumBookingNotice = minimumBookingNoticeFromBookingRow(
    booking as { original_subtotal_cents?: number | null; subtotal_cents?: number | null }
  );

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
  const paymentStatus = String(booking.payment_status ?? 'UNPAID').toUpperCase();
  const paidDepositAt = (booking as { paid_deposit_at?: string | null }).paid_deposit_at;

  if (paymentStatus === 'PAID' || paidDepositAt) {
    return NextResponse.json(
      { error: 'Deposit already paid' },
      { status: 409 }
    );
  }

  const recovery = isDepositRecoveryStatus(status);
  const statusOk = ELIGIBLE_STATUSES.includes(status) || recovery;
  if (!statusOk) {
    return NextResponse.json(
      { error: `Booking is not ready for deposit (status: ${status})` },
      { status: 409 }
    );
  }

  const paymentDueAt = (booking as { payment_due_at?: string | null }).payment_due_at;
  // Recovery path: original 30m window may have expired while the booking was stuck; still allow deposit.
  if (paymentDueAt && !recovery) {
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
      'id, user_id, display_name, category_id, occupation_id, occupations(slug), stripe_account_id, stripe_charges_enabled, available, travel_radius_miles, service_area_mode, service_area_values, lead_time_minutes, buffer_between_jobs_minutes, same_day_enabled, same_day_available, availability_rules'
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

  const { data: otherBookings } = await admin
    .from('bookings')
    .select(
      'id, service_date, service_time, booking_timezone, status, duration_hours, estimated_duration_minutes, scheduled_start_at, scheduled_end_at, completed_at'
    )
    .eq('pro_id', booking.pro_id)
    .neq('id', id)
    .eq('service_date', booking.service_date);
  const depositTz =
    String((booking as { booking_timezone?: string | null }).booking_timezone ?? '').trim() ||
    DEFAULT_BOOKING_TIMEZONE;
  const existingRanges = buildExistingBookingRangesForOverlap((otherBookings ?? []) as OverlapBookingRow[], {
    excludeBookingId: id,
    defaultTimeZone: depositTz,
  });

  const extraBusyRangesUtc = await loadRecurringHoldRangesForProAroundServiceDate(
    admin,
    (proRow as { user_id: string }).user_id,
    String(booking.service_date)
  );

  const availResult = validateProAvailability({
    proId: booking.pro_id,
    proUserId: (proRow as { user_id: string }).user_id,
    serviceDate: booking.service_date,
    serviceTime: booking.service_time || '12:00',
    bookingTimeZone: (booking as { booking_timezone?: string | null }).booking_timezone ?? DEFAULT_BOOKING_TIMEZONE,
    addressZip: (booking as { address?: string }).address?.match(/\d{5}/)?.[0],
    proActive: Boolean((proRow as { available?: boolean }).available ?? true),
    travelRadiusMiles: (proRow as { travel_radius_miles?: number | null }).travel_radius_miles,
    serviceAreaMode: (proRow as { service_area_mode?: string | null }).service_area_mode as 'radius' | 'boroughs' | 'zip_codes' | null,
    serviceAreaValues: (proRow as { service_area_values?: string[] | null }).service_area_values,
    leadTimeMinutes: (proRow as { lead_time_minutes?: number | null }).lead_time_minutes,
    bufferBetweenJobsMinutes: (proRow as { buffer_between_jobs_minutes?: number | null }).buffer_between_jobs_minutes,
    sameDayEnabled: resolveSameDayEnabledFromServicePro(
      proRow as { same_day_enabled?: boolean | null; same_day_available?: boolean | null }
    ),
    blockedDates: blockedDates.length ? blockedDates : undefined,
    existingBookingRanges: existingRanges,
    extraBusyRangesUtc,
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
  const occSlugFromPro =
    (proRow as { occupations?: { slug?: string } | null }).occupations?.slug?.trim() || null;

  const { data: profileRow } = await admin
    .from('profiles')
    .select('avatar_url')
    .eq('id', proRow.user_id)
    .maybeSingle();
  const proPhotoUrl = (profileRow as { avatar_url?: string | null })?.avatar_url ?? null;
  const { count: completedPaidCount } = await admin
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', booking.customer_id)
    .in('status', ['fully_paid', 'completed', 'customer_confirmed', 'auto_confirmed', 'payout_released']);

  const bStamp = booking as {
    fee_profile?: string | null;
    pricing_occupation_slug?: string | null;
    pricing_category_slug?: string | null;
  };

  const bSnap = booking as {
    pricing_version?: string | null;
    pricing_band?: string | null;
    service_fee_cents?: number | null;
    convenience_fee_cents?: number | null;
    protection_fee_cents?: number | null;
    pricing_occupation_slug?: string | null;
    pricing_category_slug?: string | null;
    duration_hours?: number | null;
    miles_distance?: number | null;
    flat_fee_selected?: boolean | null;
    hourly_selected?: boolean | null;
    subtotal_cents?: number | null;
    demand_fee_cents?: number | null;
    fee_total_cents?: number | null;
    customer_total_cents?: number | null;
    pro_earnings_cents?: number | null;
    platform_revenue_cents?: number | null;
    charge_model?: string | null;
  };
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
      duration_hours: bSnap.duration_hours ?? null,
      miles_distance: bSnap.miles_distance ?? null,
      flat_fee_selected: bSnap.flat_fee_selected ?? null,
      hourly_selected: bSnap.hourly_selected ?? null,
      urgency: (booking as { urgency?: string | null }).urgency ?? null,
      created_at: (booking as { created_at?: string | null }).created_at ?? null,
      pricing_occupation_slug: bSnap.pricing_occupation_slug ?? null,
      pricing_category_slug: bSnap.pricing_category_slug ?? null,
      pricing_version: bSnap.pricing_version ?? null,
      service_fee_cents: bSnap.service_fee_cents ?? null,
      convenience_fee_cents: bSnap.convenience_fee_cents ?? null,
      protection_fee_cents: bSnap.protection_fee_cents ?? null,
      subtotal_cents: bSnap.subtotal_cents ?? null,
      demand_fee_cents: bSnap.demand_fee_cents ?? null,
      fee_total_cents: bSnap.fee_total_cents ?? null,
      customer_total_cents: bSnap.customer_total_cents ?? null,
      pro_earnings_cents: bSnap.pro_earnings_cents ?? null,
      platform_revenue_cents: bSnap.platform_revenue_cents ?? null,
      charge_model: bSnap.charge_model ?? null,
    },
    proPricing,
    serviceName,
    proName,
    {
      paymentDueAt,
      occupationSlug: bSnap.pricing_occupation_slug ?? occSlugFromPro,
      completedOrPaidBookingCount: completedPaidCount ?? 0,
    }
  );

  const { quote, pricing } = quoteResult;
  const feeRule = getFeeRuleForBooking({
    serviceSubtotalCents: quote.amountSubtotal,
    categoryName: serviceName,
    occupationSlug: bSnap.pricing_occupation_slug ?? occSlugFromPro ?? undefined,
    categorySlug: bSnap.pricing_category_slug ?? undefined,
  });
  const stripeBookingFrozenCtx = {
    fee_profile: bStamp.fee_profile,
    pricing_version: bSnap.pricing_version,
    pricing_band: bSnap.pricing_band,
    pricing_occupation_slug: bSnap.pricing_occupation_slug,
    pricing_category_slug: bSnap.pricing_category_slug,
    subtotal_cents: bSnap.subtotal_cents,
    service_fee_cents: bSnap.service_fee_cents,
    convenience_fee_cents: bSnap.convenience_fee_cents,
    protection_fee_cents: bSnap.protection_fee_cents,
    demand_fee_cents: bSnap.demand_fee_cents,
    fee_total_cents: bSnap.fee_total_cents,
    customer_total_cents: bSnap.customer_total_cents,
  };
  const historyFlags = resolveCustomerBookingHistoryFlags({
    completedOrPaidBookingCount: completedPaidCount ?? 0,
  });
  const urgency = resolveUrgencyFromBooking({
    urgency: (booking as { urgency?: string | null }).urgency ?? null,
    serviceDate: booking.service_date,
    serviceTime: booking.service_time,
    requestedAt: (booking as { created_at?: string | null }).created_at ?? null,
  });
  const areaDemandScore = resolveAreaDemandScoreFromBooking();
  const supplyTightnessScore = resolveSupplyTightnessScoreFromBooking();
  const conversionRiskScore = resolveConversionRiskScore({
    serviceSubtotalCents: quote.amountSubtotal,
    isFirstBooking: historyFlags.isFirstBooking,
  });
  const trustRiskScore = resolveTrustRiskScore({
    occupationProfile: trustOccupationProfileForStripeMetadata(
      id,
      stripeBookingFrozenCtx,
      feeRule.profile
    ),
  });
  const amountDeposit = pricing.depositChargeCents;
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
          minimumBookingNotice,
          quote: quoteResult,
        });
      }
    } catch {
      // Fall through to create new
    }
  }

  // Platform holds deposit — NO transfer_data. Pro receives payout only after
  // verified arrival, start, completion, and confirmation (release-payouts cron).
  const stripeFields = buildBookingPaymentIntentStripeFields({
    bookingId: id,
    customerId: booking.customer_id,
    proId: booking.pro_id,
    paymentPhase: 'deposit',
    serviceTitle: serviceName,
    pricing: buildBookingPaymentIntentPricingMetadata({
      bookingId: id,
      booking: stripeBookingFrozenCtx,
      liveFeeRule: feeRule,
      quote,
      pricing,
      dynamic: {
        dynamicReasonsCsv: (quote.dynamicPricingReasons ?? []).join(','),
        urgency,
        areaDemandScore,
        supplyTightnessScore,
        conversionRiskScore,
        trustRiskScore,
        isFirstBooking: historyFlags.isFirstBooking,
        isRepeatCustomer: historyFlags.isRepeatCustomer,
      },
    }),
  });

  Object.assign(
    stripeFields.metadata,
    appendLifecyclePaymentIntentMetadata(
      {
        booking_id: id,
        customer_id: booking.customer_id,
        pro_id: booking.pro_id,
        booking_service_status: status,
        pricing_version: (bSnap.pricing_version && String(bSnap.pricing_version).trim()) || '',
        subtotal_cents: quote.amountSubtotal,
        platform_fee_cents: pricing.feeTotalCents,
        deposit_amount_cents: pricing.depositChargeCents,
        final_amount_cents: pricing.finalChargeCents,
        total_amount_cents: pricing.customerTotalCents,
      },
      'deposit'
    )
  );
  stripeFields.metadata = capStripeBookingPaymentMetadata(stripeFields.metadata);
  assertUnifiedBookingPaymentIntentMetadata(stripeFields.metadata);

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: amountDeposit,
      currency: quote.currency,
      automatic_payment_methods: { enabled: true },
      customer: customerResult.stripeCustomerId,
      setup_future_usage: 'off_session',
      metadata: stripeFields.metadata,
      description: stripeFields.description,
      statement_descriptor_suffix: stripeFields.statement_descriptor_suffix,
      // No transfer_data: funds go to platform. Pro paid later via release-payouts.
    },
    { idempotencyKey: `deposit-${id}` }
  );

  const piStatus = paymentIntent.status;
  const newPaymentStatus =
    piStatus === 'succeeded' ? 'PAID'
    : piStatus === 'requires_action' ? 'REQUIRES_ACTION'
    : 'UNPAID';

  const lifecycleDeposit =
    newPaymentStatus === 'PAID' ? 'deposit_paid' : 'deposit_pending';
  const serviceDeposit =
    newPaymentStatus === 'PAID' ? 'deposit_paid' : 'deposit_pending';

  await admin
    .from('bookings')
    .update({
      payment_intent_id: paymentIntent.id,
      stripe_payment_intent_deposit_id: paymentIntent.id,
      stripe_destination_account_id: connectedAccountId,
      payment_status: newPaymentStatus,
      status: 'payment_required',
      amount_subtotal: quote.amountSubtotal,
      amount_travel_fee: quote.amountTravelFee,
      amount_platform_fee: pricing.feeTotalCents,
      amount_total: pricing.customerTotalCents,
      total_amount_cents: pricing.customerTotalCents,
      platform_fee_bps: breakdown.platform_fee_bps,
      customer_fees_retained_cents: pricing.feeTotalCents,
      deposit_amount_cents: pricing.depositChargeCents,
      remaining_amount_cents: pricing.finalChargeCents,
      amount_deposit: amountDeposit,
      amount_remaining: pricing.finalChargeCents,
      deposit_percent: breakdown.deposit_percent,
      currency: quote.currency,
      platform_fee_cents: pricing.feeTotalCents,
      final_amount_cents: pricing.finalChargeCents,
      payment_lifecycle_status: lifecycleDeposit,
      service_status: serviceDeposit,
      deposit_payment_intent_id: paymentIntent.id,
    })
    .eq('id', id);

  try {
    await syncBookingPaymentSummary(admin, id);
    await logBookingPaymentEvent(admin, {
      bookingId: id,
      eventType: 'deposit_intent_created',
      phase: 'deposit',
      status: piStatus,
      amountCents: amountDeposit,
      currency: quote.currency,
      stripePaymentIntentId: paymentIntent.id,
      metadata: { via: 'pay_deposit_route' },
    });
  } catch (e) {
    console.warn('[pay/deposit] lifecycle ledger failed', e);
  }

  console.info('[booking] deposit_intent_created', {
    bookingId: id,
    paymentIntentStatus: piStatus,
    amountDeposit,
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    minimumBookingNotice,
    quote: {
      ...quoteResult,
      proPhotoUrl,
      address: booking.address ?? undefined,
      durationHours: (booking as { duration_hours?: number | null }).duration_hours ?? undefined,
      minimumBookingNotice,
    },
  });
  } catch (err) {
    const { bookingId: bid } = await params;
    const { message, code } = depositErrorPayload(err);
    console.error('[pay/deposit] unhandled error', { bookingId: bid, code, err });
    return NextResponse.json({ error: message, code }, { status: 500 });
  }
}
