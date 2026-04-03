/**
 * POST /api/bookings/[bookingId]/pay/final
 * Creates PaymentIntent for remaining balance after job completion.
 *
 * Platform holds funds (no transfer_data). Pro paid via release-payouts after
 * verified arrival, start, completion, and customer/auto confirmation.
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
import { buildBookingPaymentIntentStripeFields } from '@/lib/stripe/booking-payment-intent-metadata';
import { getUnifiedBookingPaymentAmountsForBooking } from '@/lib/bookings/booking-receipt-service';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

// Remaining payment only after pro has completed (with evidence). Prevents paying before job done.
const ELIGIBLE_STATUSES = [
  'completed_pending_payment',
  'awaiting_payment',
  'awaiting_remaining_payment',
  'awaiting_customer_confirmation',
];

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
    .select('id, customer_id, pro_id, status, payment_status, final_payment_intent_id, final_payment_status, amount_remaining, remaining_amount_cents, amount_total, total_amount_cents, amount_platform_fee, amount_deposit, currency, price, service_date, service_time, address, urgency, created_at, fee_profile, pricing_occupation_slug, pricing_category_slug, paid_deposit_at, paid_remaining_at, fully_paid_at')
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

  const bFinal = booking as {
    fee_profile?: string | null;
    pricing_occupation_slug?: string | null;
    pricing_category_slug?: string | null;
  };
  let serviceName = 'Service';
  {
    const { data: proCtx } = await admin
      .from('service_pros')
      .select('category_id')
      .eq('id', booking.pro_id)
      .maybeSingle();
    const cid = (proCtx as { category_id?: string | null } | null)?.category_id;
    if (cid) {
      const { data: catRow } = await admin
        .from('service_categories')
        .select('name')
        .eq('id', cid)
        .maybeSingle();
      if (catRow && typeof (catRow as { name?: string }).name === 'string') {
        serviceName = String((catRow as { name: string }).name).trim() || 'Service';
      }
    }
  }

  const { count: completedPaidCount } = await admin
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', booking.customer_id)
    .in('status', ['fully_paid', 'completed', 'customer_confirmed', 'auto_confirmed', 'payout_released']);
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

  const paymentAmounts = await getUnifiedBookingPaymentAmountsForBooking(admin, id);
  if (!paymentAmounts) {
    return NextResponse.json({ error: 'Failed to load payment totals' }, { status: 500 });
  }
  let amountTotal = paymentAmounts.totalAmountCents;
  let amountRemaining = paymentAmounts.remainingAmountCents;
  let pricing:
    | ReturnType<typeof computeBookingPricing>
    | null = null;
  let lastDynamicPricingReasons: string[] = [];

  // Fallback: compute from quote when DB columns are empty
  if (!Number.isFinite(amountRemaining) || amountRemaining <= 0) {
    const { data: proRowForQuote } = await admin
      .from('service_pros')
      .select('user_id, display_name, category_id')
      .eq('id', booking.pro_id)
      .maybeSingle();
    const { data: proPricing } = await admin
      .from('pro_profiles')
      .select('pricing_model, starting_price, starting_rate, hourly_rate, min_hours, travel_fee_enabled, travel_fee_base, travel_free_within_miles, travel_extra_per_mile, deposit_percent_default')
      .eq('user_id', proRowForQuote?.user_id ?? '')
      .maybeSingle();
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
        urgency: (booking as { urgency?: string | null }).urgency ?? null,
        created_at: (booking as { created_at?: string | null }).created_at ?? null,
      },
      proPricing,
      serviceName,
      proName
    );
    const feeRule = getFeeRuleForBooking({
      serviceSubtotalCents: quoteResult.quote.amountSubtotal,
      categoryName: serviceName,
    });
    const dynamicPricing = resolveDynamicPricing({
      baseServiceFeePercent: feeRule.serviceFeePercent,
      baseConvenienceFeeCents: feeRule.convenienceFeeCents,
      baseProtectionFeeCents: feeRule.protectionFeeCents,
      input: {
        occupationProfile: feeRule.profile,
        serviceSubtotalCents: quoteResult.quote.amountSubtotal,
        urgency,
        areaDemandScore,
        supplyTightnessScore,
        conversionRiskScore: resolveConversionRiskScore({
          serviceSubtotalCents: quoteResult.quote.amountSubtotal,
          isFirstBooking: historyFlags.isFirstBooking,
        }),
        trustRiskScore: resolveTrustRiskScore({ occupationProfile: feeRule.profile }),
        isFirstBooking: historyFlags.isFirstBooking,
        isRepeatCustomer: historyFlags.isRepeatCustomer,
      },
    });
    lastDynamicPricingReasons = dynamicPricing.reasons;
    pricing = computeBookingPricing({
      serviceSubtotalCents: quoteResult.quote.amountSubtotal,
      depositPercent: quoteResult.quote.depositPercent / 100,
      serviceFeePercent: dynamicPricing.serviceFeePercent,
      convenienceFeeCents: dynamicPricing.convenienceFeeCents,
      protectionFeeCents: dynamicPricing.protectionFeeCents,
      demandFeeCents: feeRule.demandFeeMode === 'supported_if_applicable' ? dynamicPricing.demandFeeCents : 0,
      promoDiscountCents: dynamicPricing.promoDiscountCents,
    });
    amountRemaining = pricing.finalChargeCents;
    if (amountTotal <= 0) amountTotal = pricing.customerTotalCents;
  } else {
    const { data: proRowTitle } = await admin
      .from('service_pros')
      .select('category_id')
      .eq('id', booking.pro_id)
      .maybeSingle();
    const tCat = (proRowTitle as { category_id?: string | null } | null)?.category_id;
    if (tCat) {
      const { data: catRow } = await admin
        .from('service_categories')
        .select('name')
        .eq('id', tCat)
        .maybeSingle();
      if (catRow && typeof (catRow as { name?: string }).name === 'string') {
        serviceName = String((catRow as { name: string }).name).trim() || 'Service';
      }
    }
  }

  if (!Number.isFinite(amountRemaining) || amountRemaining <= 0) {
    return NextResponse.json(
      { error: 'No remaining balance to pay' },
      { status: 400 }
    );
  }

  if (!pricing) {
    const subtotalGuessFromStored = Math.max(0, amountTotal - Number(booking.amount_platform_fee ?? 0));
    const feeRule = getFeeRuleForBooking({
      serviceSubtotalCents: subtotalGuessFromStored,
      categoryName: serviceName,
    });
    const conversionRiskScore = resolveConversionRiskScore({
      serviceSubtotalCents: subtotalGuessFromStored,
      isFirstBooking: historyFlags.isFirstBooking,
    });
    const trustRiskScore = resolveTrustRiskScore({ occupationProfile: feeRule.profile });
    const dynamicPricing = resolveDynamicPricing({
      baseServiceFeePercent: feeRule.serviceFeePercent,
      baseConvenienceFeeCents: feeRule.convenienceFeeCents,
      baseProtectionFeeCents: feeRule.protectionFeeCents,
      input: {
        occupationProfile: feeRule.profile,
        serviceSubtotalCents: subtotalGuessFromStored,
        urgency,
        areaDemandScore,
        supplyTightnessScore,
        conversionRiskScore,
        trustRiskScore,
        isFirstBooking: historyFlags.isFirstBooking,
        isRepeatCustomer: historyFlags.isRepeatCustomer,
      },
    });
    lastDynamicPricingReasons = dynamicPricing.reasons;
    pricing = computeBookingPricing({
      serviceSubtotalCents: subtotalGuessFromStored,
      depositPercent: amountTotal > 0 ? Math.max(0, Math.min(1, amountDeposit / amountTotal)) : 0,
      serviceFeePercent: dynamicPricing.serviceFeePercent,
      convenienceFeeCents: dynamicPricing.convenienceFeeCents,
      protectionFeeCents: dynamicPricing.protectionFeeCents,
      demandFeeCents: feeRule.demandFeeMode === 'supported_if_applicable' ? dynamicPricing.demandFeeCents : 0,
      promoDiscountCents: dynamicPricing.promoDiscountCents,
    });
    if (!Number.isFinite(amountRemaining) || amountRemaining <= 0) {
      amountRemaining = pricing.finalChargeCents;
    } else {
      const adjustedFinal = Math.round(amountRemaining);
      const adjustedDeposit = Math.max(0, pricing.customerTotalCents - adjustedFinal);
      pricing = {
        ...pricing,
        depositChargeCents: adjustedDeposit,
        finalChargeCents: adjustedFinal,
      };
    }
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
          paymentAmounts: {
            totalAmountCents: amountTotal,
            paidAmountCents: Math.max(0, amountTotal - amountRemaining),
            remainingAmountCents: amountRemaining,
          },
        });
      }
    } catch {
      // Fall through
    }
  }

  const feeRuleStripe = getFeeRuleForBooking({
    serviceSubtotalCents: pricing.serviceSubtotalCents,
    categoryName: serviceName,
  });
  const conversionForStripe = resolveConversionRiskScore({
    serviceSubtotalCents: pricing.serviceSubtotalCents,
    isFirstBooking: historyFlags.isFirstBooking,
  });
  const trustForStripe = resolveTrustRiskScore({ occupationProfile: feeRuleStripe.profile });

  const stripeFields = buildBookingPaymentIntentStripeFields({
    bookingId: id,
    customerId: booking.customer_id,
    proId: booking.pro_id,
    paymentPhase: 'remaining',
    serviceTitle: serviceName,
    pricing: {
      fee_profile: feeRuleStripe.profile,
      subtotal_tier: feeRuleStripe.tier,
      booking_fee_profile_stamped: bFinal.fee_profile ?? undefined,
      booking_pricing_occupation_slug: bFinal.pricing_occupation_slug ?? undefined,
      booking_pricing_category_slug: bFinal.pricing_category_slug ?? undefined,
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
      dynamic_pricing_reasons: lastDynamicPricingReasons.join(','),
      urgency,
      area_demand_score: areaDemandScore,
      supply_tightness_score: supplyTightnessScore,
      conversion_risk_score: conversionForStripe,
      trust_risk_score: trustForStripe,
      is_first_booking: String(historyFlags.isFirstBooking),
      is_repeat_customer: String(historyFlags.isRepeatCustomer),
      deposit_platform_fee_cents: pricing.depositFeeTotalCents,
      deposit_charge_cents: pricing.depositChargeCents,
      final_base_cents: pricing.finalBaseCents,
      final_platform_fee_cents: pricing.finalFeeTotalCents,
      final_charge_cents: pricing.finalChargeCents,
    },
  });

  // Platform holds remaining — NO transfer_data. Pro paid via release-payouts.
  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: amountRemaining,
      currency: (booking.currency as string) || 'usd',
      automatic_payment_methods: { enabled: true },
      customer: customerResult.stripeCustomerId,
      metadata: stripeFields.metadata,
      description: stripeFields.description,
      statement_descriptor_suffix: stripeFields.statement_descriptor_suffix,
    },
    { idempotencyKey: `final-${id}` }
  );

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
      stripe_destination_account_id: connectedAccountId,
      final_payment_status: newFinalStatus,
    })
    .eq('id', id);

  console.info('[booking] final_intent_created', {
    bookingId: id,
    amountRemaining,
    paymentIntentStatus: piStatus,
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amountRemaining,
    paymentAmounts: {
      totalAmountCents: amountTotal,
      paidAmountCents: Math.max(0, amountTotal - amountRemaining),
      remainingAmountCents: amountRemaining,
    },
  });
}
