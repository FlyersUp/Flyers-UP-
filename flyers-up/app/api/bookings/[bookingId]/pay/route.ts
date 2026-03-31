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
import { computeBookingPricing } from '@/lib/bookings/pricing';
import { getFeeRuleForBooking } from '@/lib/bookings/fee-rules';
import { resolveDynamicPricing } from '@/lib/bookings/dynamic-pricing';
import {
  resolveAreaDemandScoreFromBooking,
  resolveConversionRiskScore,
  resolveCustomerBookingHistoryFlags,
  resolveSupplyTightnessScoreFromBooking,
  resolveTrustRiskScore,
  resolveUrgencyFromBooking,
} from '@/lib/bookings/dynamic-pricing-features';
import { buildLegacyFullPaymentIntentStripeFields } from '@/lib/stripe/booking-payment-intent-metadata';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

const ELIGIBLE_STATUSES = ['accepted', 'payment_required', 'awaiting_deposit_payment', 'pro_en_route', 'in_progress', 'completed_pending_payment', 'awaiting_payment'];

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
    .select('id, customer_id, pro_id, status, price, payment_intent_id, payment_status, service_date, service_time, address, urgency, created_at, fee_profile, pricing_occupation_slug, pricing_category_slug')
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

  const { data: proRow, error: proErr } = await admin
    .from('service_pros')
    .select('id, user_id, display_name, category_id, stripe_account_id, stripe_charges_enabled')
    .eq('id', booking.pro_id)
    .maybeSingle();

  if (proErr) {
    console.error('[pay] service_pros query error', { proId: booking.pro_id, message: proErr.message });
    return NextResponse.json({ error: 'Failed to load service pro' }, { status: 500 });
  }
  if (!proRow) {
    return NextResponse.json({ error: 'Pro not found' }, { status: 404 });
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
      urgency: (booking as { urgency?: string | null }).urgency ?? null,
      created_at: (booking as { created_at?: string | null }).created_at ?? null,
    },
    proPricing,
    serviceName,
    proName
  );

  const { quote } = quoteResult;
  const { count: completedPaidCount } = await admin
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', booking.customer_id)
    .in('status', ['fully_paid', 'completed', 'customer_confirmed', 'auto_confirmed', 'payout_released']);
  const historyFlags = resolveCustomerBookingHistoryFlags({
    completedOrPaidBookingCount: completedPaidCount ?? 0,
  });
  const feeRule = getFeeRuleForBooking({
    serviceSubtotalCents: quote.amountSubtotal,
    categoryName: serviceName,
  });
  const bPay = booking as {
    fee_profile?: string | null;
    pricing_occupation_slug?: string | null;
    pricing_category_slug?: string | null;
  };
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
  const trustRiskScore = resolveTrustRiskScore({ occupationProfile: feeRule.profile });
  const dynamicPricing = resolveDynamicPricing({
    baseServiceFeePercent: feeRule.serviceFeePercent,
    baseConvenienceFeeCents: feeRule.convenienceFeeCents,
    baseProtectionFeeCents: feeRule.protectionFeeCents,
    input: {
      occupationProfile: feeRule.profile,
      serviceSubtotalCents: quote.amountSubtotal,
      urgency,
      areaDemandScore,
      supplyTightnessScore,
      conversionRiskScore,
      trustRiskScore,
      isFirstBooking: historyFlags.isFirstBooking,
      isRepeatCustomer: historyFlags.isRepeatCustomer,
    },
  });
  const pricing = computeBookingPricing({
    serviceSubtotalCents: quote.amountSubtotal,
    depositPercent: quote.depositPercent / 100,
    serviceFeePercent: dynamicPricing.serviceFeePercent,
    convenienceFeeCents: dynamicPricing.convenienceFeeCents,
    protectionFeeCents: dynamicPricing.protectionFeeCents,
    demandFeeCents: feeRule.demandFeeMode === 'supported_if_applicable' ? dynamicPricing.demandFeeCents : 0,
    promoDiscountCents: dynamicPricing.promoDiscountCents,
  });
  const amountCents = pricing.customerTotalCents;
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

  const stripeMeta = buildLegacyFullPaymentIntentStripeFields({
    bookingId: id,
    customerId: booking.customer_id,
    proId: booking.pro_id,
    serviceTitle: serviceName,
    pricing: {
      fee_profile: feeRule.profile,
      subtotal_tier: feeRule.tier,
      booking_fee_profile_stamped: bPay.fee_profile ?? undefined,
      booking_pricing_occupation_slug: bPay.pricing_occupation_slug ?? undefined,
      booking_pricing_category_slug: bPay.pricing_category_slug ?? undefined,
      service_subtotal_cents: pricing.serviceSubtotalCents,
      service_fee_cents: pricing.serviceFeeCents,
      convenience_fee_cents: pricing.convenienceFeeCents,
      protection_fee_cents: pricing.protectionFeeCents,
      demand_fee_cents: pricing.demandFeeCents,
      promo_discount_cents: pricing.promoDiscountCents,
      fee_total_cents: pricing.feeTotalCents,
      platform_fee_total_cents: pricing.feeTotalCents,
      customer_total_cents: pricing.customerTotalCents,
      deposit_base_cents: pricing.depositBaseCents,
      deposit_service_fee_cents: pricing.depositServiceFeeCents,
      final_service_fee_cents: pricing.finalServiceFeeCents,
      deposit_convenience_fee_cents: pricing.depositConvenienceFeeCents,
      final_convenience_fee_cents: pricing.finalConvenienceFeeCents,
      deposit_protection_fee_cents: pricing.depositProtectionFeeCents,
      final_protection_fee_cents: pricing.finalProtectionFeeCents,
      deposit_demand_fee_cents: pricing.depositDemandFeeCents,
      final_demand_fee_cents: pricing.finalDemandFeeCents,
      deposit_fee_total_cents: pricing.depositFeeTotalCents,
      final_fee_total_cents: pricing.finalFeeTotalCents,
      deposit_promo_discount_cents: pricing.depositPromoDiscountCents,
      final_promo_discount_cents: pricing.finalPromoDiscountCents,
      dynamic_pricing_reasons: dynamicPricing.reasons.join(','),
      urgency,
      area_demand_score: areaDemandScore,
      supply_tightness_score: supplyTightnessScore,
      conversion_risk_score: conversionRiskScore,
      trust_risk_score: trustRiskScore,
      is_first_booking: String(historyFlags.isFirstBooking),
      is_repeat_customer: String(historyFlags.isRepeatCustomer),
      deposit_platform_fee_cents: pricing.depositFeeTotalCents,
      deposit_charge_cents: pricing.depositChargeCents,
      final_base_cents: pricing.finalBaseCents,
      final_platform_fee_cents: pricing.finalFeeTotalCents,
      final_charge_cents: pricing.finalChargeCents,
    },
  });

  const paymentIntentData: {
    amount: number;
    currency: string;
    automatic_payment_methods: { enabled: boolean };
    customer: string;
    metadata: Record<string, string>;
    description: string;
    statement_descriptor_suffix: string;
  } = {
    amount: amountCents,
    currency: quote.currency,
    automatic_payment_methods: { enabled: true },
    customer: customerResult.stripeCustomerId,
    metadata: stripeMeta.metadata,
    description: stripeMeta.description,
    statement_descriptor_suffix: stripeMeta.statement_descriptor_suffix,
  };

  const paymentIntent = await stripe.paymentIntents.create(paymentIntentData, {
    idempotencyKey: `legacy-payment-${id}`,
  });

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
