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
import {
  buildBookingPaymentIntentStripeFields,
  capStripeBookingPaymentMetadata,
} from '@/lib/stripe/booking-payment-intent-metadata';
import {
  buildBookingPaymentIntentPricingMetadata,
  quoteBreakdownStubFromPricing,
  trustOccupationProfileForStripeMetadata,
} from '@/lib/stripe/booking-payment-pricing-metadata';
import { appendLifecyclePaymentIntentMetadata } from '@/lib/stripe/booking-payment-metadata-lifecycle';
import { assertUnifiedBookingPaymentIntentMetadata } from '@/lib/stripe/payment-intent-metadata-unified';
import {
  logBookingPaymentEvent,
  syncBookingPaymentSummary,
} from '@/lib/bookings/payment-lifecycle-service';
import { minimumBookingNoticeFromBookingRow } from '@/lib/pricing/config';
import { getUnifiedBookingPaymentAmountsForBooking } from '@/lib/bookings/booking-receipt-service';
import {
  bookingRowToFinalPaymentIntentRow,
  buildMoneyStateInputForFinalRoute,
  finalCheckoutPayable,
  logCustomerFinalPaymentRoute,
  logCustomerFinalPaymentRouteError,
  safeDepositPercentFromAmounts,
} from '@/lib/bookings/customer-final-payment-route';
import {
  getBookingDepositPaymentIntentIdOrNull,
  getBookingFinalPaymentIntentIdOrNull,
  getMoneyState,
  type BookingFinalPaymentIntentIdRow,
} from '@/lib/bookings/money-state';
import { isLaunchModeEnabled } from '@/lib/featureFlags';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

/** Columns that must exist on `bookings` (avoid optional migrations in SELECT to prevent 42703 in prod). */
const BOOKING_SELECT_COLUMNS = [
  'id',
  'customer_id',
  'pro_id',
  'status',
  'payment_status',
  'payment_lifecycle_status',
  'final_payment_intent_id',
  'stripe_payment_intent_remaining_id',
  'final_payment_status',
  'amount_remaining',
  'remaining_amount_cents',
  'amount_total',
  'total_amount_cents',
  'amount_platform_fee',
  'amount_deposit',
  'currency',
  'price',
  'service_date',
  'service_time',
  'address',
  'urgency',
  'created_at',
  'completed_at',
  'paid_at',
  'fee_profile',
  'pricing_occupation_slug',
  'pricing_category_slug',
  'paid_deposit_at',
  'paid_remaining_at',
  'fully_paid_at',
  'remaining_due_at',
  'customer_review_deadline_at',
  'pricing_version',
  'pricing_band',
  'service_fee_cents',
  'convenience_fee_cents',
  'protection_fee_cents',
  'original_subtotal_cents',
  'subtotal_cents',
  'fee_total_cents',
  'customer_total_cents',
  'pro_earnings_cents',
  'platform_revenue_cents',
  'charge_model',
  'stripe_payment_intent_deposit_id',
  'payment_intent_id',
  'deposit_payment_intent_id',
  'duration_hours',
  'miles_distance',
  'flat_fee_selected',
  'hourly_selected',
  'requires_admin_review',
  'payout_released',
  'payout_status',
  'payout_transfer_id',
  'refunded_total_cents',
  'amount_paid_cents',
].join(', ');

// Remaining payment only after pro has completed (with evidence). Prevents paying before job done.
const ELIGIBLE_STATUSES = [
  'completed_pending_payment',
  'awaiting_payment',
  'awaiting_remaining_payment',
  'awaiting_customer_confirmation',
];

function jsonBody(data: Record<string, unknown>, status: number) {
  return NextResponse.json(data, { status });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) {
    return jsonBody({ error: 'Invalid booking ID', checkoutState: 'not_eligible' }, 400);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonBody({ error: 'Unauthorized', checkoutState: 'not_eligible' }, 401);
  }

  if (!stripe) {
    logCustomerFinalPaymentRouteError('stripe_not_configured', { bookingId: id, userId: user.id });
    return jsonBody({ error: 'Stripe not configured', checkoutState: 'server_error' }, 503);
  }

  const admin = createAdminSupabaseClient();

  try {
    const { data: bookingRow, error: bErr } = await admin
      .from('bookings')
      .select(BOOKING_SELECT_COLUMNS)
      .eq('id', id)
      .maybeSingle();

    if (bErr) {
      logCustomerFinalPaymentRouteError('booking_select_failed', {
        bookingId: id,
        userId: user.id,
        code: bErr.code,
        message: bErr.message,
        details: (bErr as { details?: string }).details,
      });
      return jsonBody(
        {
          error: 'Failed to load booking',
          checkoutState: 'server_error',
          code: 'BOOKING_QUERY_ERROR',
        },
        500
      );
    }

    if (!bookingRow) {
      logCustomerFinalPaymentRoute('booking_not_found', { bookingId: id, userId: user.id });
      return jsonBody({ error: 'Booking not found', checkoutState: 'not_eligible', code: 'NOT_FOUND' }, 404);
    }

    const booking = bookingRow as unknown as Record<string, unknown>;
    if (String(booking.customer_id ?? '') !== user.id) {
      logCustomerFinalPaymentRoute('forbidden_wrong_customer', { bookingId: id, userId: user.id });
      return jsonBody({ error: 'Forbidden', checkoutState: 'not_eligible', code: 'FORBIDDEN' }, 403);
    }

    logCustomerFinalPaymentRoute('booking_loaded', {
      bookingId: id,
      userId: user.id,
      status: booking.status,
      paymentLifecycleStatus: booking.payment_lifecycle_status,
      finalPaymentStatus: booking.final_payment_status,
    });

    const paymentAmounts = await getUnifiedBookingPaymentAmountsForBooking(admin, id);
    if (!paymentAmounts) {
      logCustomerFinalPaymentRouteError('payment_amounts_null', { bookingId: id, userId: user.id });
      return jsonBody(
        {
          error: 'Unable to resolve payment totals for this booking.',
          checkoutState: 'not_eligible',
          code: 'PAYMENT_TOTALS_UNAVAILABLE',
        },
        409
      );
    }

    const coalescedFinalPiId = getBookingFinalPaymentIntentIdOrNull(
      bookingRowToFinalPaymentIntentRow(booking)
    );

    let stripePiStatus: string | null = null;
    if (coalescedFinalPiId) {
      try {
        const piLive = await stripe.paymentIntents.retrieve(coalescedFinalPiId);
        stripePiStatus = piLive.status;
        logCustomerFinalPaymentRoute('stripe_pi_retrieved', {
          bookingId: id,
          paymentIntentId: coalescedFinalPiId,
          stripeStatus: stripePiStatus,
        });
      } catch (e) {
        logCustomerFinalPaymentRouteError('stripe_pi_retrieve_failed', {
          bookingId: id,
          paymentIntentId: coalescedFinalPiId,
          message: e instanceof Error ? e.message : String(e),
        });
        stripePiStatus = null;
      }
    } else {
      logCustomerFinalPaymentRoute('no_coalesced_final_pi', { bookingId: id });
    }

    const moneyInput = buildMoneyStateInputForFinalRoute({
      booking,
      paymentAmounts,
      coalescedFinalPaymentIntentId: coalescedFinalPiId,
    });
    const money = getMoneyState(moneyInput, {
      finalPaymentIntentStatus: stripePiStatus ?? undefined,
    });

    logCustomerFinalPaymentRoute('money_state', {
      bookingId: id,
      finalPhase: money.final,
      payoutPhase: money.payout,
      remainingCents: money.remainingCents,
      coalescedFinalPiId: coalescedFinalPiId ?? '',
    });

    const paidLike =
      money.final === 'final_paid' ||
      paymentAmounts.remainingAmountCents <= 0 ||
      String(booking.final_payment_status ?? '').toUpperCase() === 'PAID';

    if (paidLike) {
      return jsonBody(
        {
          checkoutState: 'already_paid',
          message: 'This booking is already fully paid.',
          paymentAmounts: {
            totalAmountCents: paymentAmounts.totalAmountCents,
            paidAmountCents: paymentAmounts.paidAmountCents,
            remainingAmountCents: paymentAmounts.remainingAmountCents,
          },
        },
        200
      );
    }

    if (money.final === 'final_processing') {
      return jsonBody(
        {
          checkoutState: 'processing',
          message: 'Your final payment is processing. This can take a minute.',
          paymentIntentId: coalescedFinalPiId,
          paymentAmounts: {
            totalAmountCents: paymentAmounts.totalAmountCents,
            paidAmountCents: paymentAmounts.paidAmountCents,
            remainingAmountCents: paymentAmounts.remainingAmountCents,
          },
        },
        200
      );
    }

    if (money.payout === 'payout_held' && money.final !== 'final_due' && money.final !== 'final_failed') {
      return jsonBody(
        {
          checkoutState: 'not_eligible',
          code: 'PAYOUT_HELD',
          message: 'This booking is under review. Final checkout is not available right now.',
          paymentAmounts: {
            totalAmountCents: paymentAmounts.totalAmountCents,
            paidAmountCents: paymentAmounts.paidAmountCents,
            remainingAmountCents: paymentAmounts.remainingAmountCents,
          },
        },
        409
      );
    }

    const status = String(booking.status ?? '');
    if (!ELIGIBLE_STATUSES.includes(status)) {
      return jsonBody(
        {
          checkoutState: 'not_eligible',
          code: 'BOOKING_STATUS',
          message: `Booking is not ready for final payment (status: ${status}).`,
        },
        409
      );
    }

    const amountDeposit = Number(booking.amount_deposit ?? 0);
    const hadDeposit = amountDeposit > 0;
    if (hadDeposit && String(booking.payment_status ?? '').toUpperCase() !== 'PAID') {
      return jsonBody(
        {
          checkoutState: 'not_eligible',
          code: 'DEPOSIT_UNPAID',
          message: 'Deposit must be paid before the remaining balance.',
        },
        409
      );
    }

    if (!finalCheckoutPayable(money)) {
      return jsonBody(
        {
          checkoutState: 'not_eligible',
          code: 'NOT_PAYABLE',
          message: 'Final payment is not available for this booking in its current state.',
          finalPhase: money.final,
        },
        409
      );
    }

    let amountTotal = paymentAmounts.totalAmountCents;
    let amountRemaining = paymentAmounts.remainingAmountCents;
    let pricing: ReturnType<typeof computeBookingPricing> | null = null;
    let lastDynamicPricingReasons: string[] = [];

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
        .eq('id', booking.pro_id as string)
        .maybeSingle();
      const cid = (proCtx as { category_id?: string | null } | null)?.category_id;
      if (cid) {
        const { data: catRow } = await admin.from('service_categories').select('name').eq('id', cid).maybeSingle();
        if (catRow && typeof (catRow as { name?: string }).name === 'string') {
          serviceName = String((catRow as { name: string }).name).trim() || 'Service';
        }
      }
    }

    const { count: completedPaidCount } = await admin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', booking.customer_id as string)
      .in('status', ['fully_paid', 'completed', 'customer_confirmed', 'auto_confirmed', 'payout_released']);
    const historyFlags = resolveCustomerBookingHistoryFlags({
      completedOrPaidBookingCount: completedPaidCount ?? 0,
    });
    const urgency = resolveUrgencyFromBooking({
      urgency: (booking.urgency as string | null) ?? null,
      serviceDate: booking.service_date as string,
      serviceTime: booking.service_time as string,
      requestedAt: (booking.created_at as string | null) ?? null,
    });
    const areaDemandScore = resolveAreaDemandScoreFromBooking();
    const supplyTightnessScore = resolveSupplyTightnessScoreFromBooking();

    const launchMode = await isLaunchModeEnabled();

    if (launchMode) {
      amountTotal = paymentAmounts.totalAmountCents;
      amountRemaining = Math.max(0, paymentAmounts.remainingAmountCents);
      const bSnap = booking as {
        pricing_version?: string | null;
        service_fee_cents?: number | null;
        convenience_fee_cents?: number | null;
        protection_fee_cents?: number | null;
        subtotal_cents?: number | null;
        original_subtotal_cents?: number | null;
        demand_fee_cents?: number | null;
        promo_discount_cents?: number | null;
      };
      const depPct = safeDepositPercentFromAmounts(amountDeposit, amountTotal);
      const subtotalGuessFromStored = Math.max(
        0,
        Number(bSnap.subtotal_cents ?? bSnap.original_subtotal_cents ?? 0) ||
          Math.max(0, amountTotal - Number((booking as { amount_platform_fee?: number }).amount_platform_fee ?? 0))
      );
      const hasFrozen =
        typeof bSnap.pricing_version === 'string' &&
        bSnap.pricing_version.trim().length > 0 &&
        typeof bSnap.service_fee_cents === 'number' &&
        typeof bSnap.convenience_fee_cents === 'number' &&
        typeof bSnap.protection_fee_cents === 'number';
      if (!hasFrozen) {
        logCustomerFinalPaymentRouteError('launch_mode_pricing_snapshot_missing', { bookingId: id, userId: user.id });
        return jsonBody(
          {
            error: 'Booking pricing snapshot is unavailable. Contact support.',
            checkoutState: 'not_eligible',
            code: 'PRICING_SNAPSHOT_REQUIRED',
          },
          409
        );
      }
      try {
        pricing = computeBookingPricing({
          serviceSubtotalCents: subtotalGuessFromStored,
          depositPercent: depPct,
          frozenCoreFeesCents: {
            serviceFeeCents: bSnap.service_fee_cents!,
            convenienceFeeCents: bSnap.convenience_fee_cents!,
            protectionFeeCents: bSnap.protection_fee_cents!,
          },
          demandFeeCents: Number(bSnap.demand_fee_cents ?? 0),
          promoDiscountCents: Number(bSnap.promo_discount_cents ?? 0),
        });
      } catch (e) {
        logCustomerFinalPaymentRouteError('launch_mode_compute_booking_pricing_failed', {
          bookingId: id,
          message: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined,
        });
        return jsonBody(
          {
            error: 'Unable to compute pricing for this payment.',
            checkoutState: 'server_error',
            code: 'PRICING_COMPUTE_ERROR',
          },
          500
        );
      }
      const rem = Math.round(amountRemaining);
      pricing = {
        ...pricing,
        finalChargeCents: rem,
        depositChargeCents: Math.max(0, amountTotal - rem),
        customerTotalCents: amountTotal,
      };
      lastDynamicPricingReasons = [];
    } else if (!Number.isFinite(amountRemaining) || amountRemaining <= 0) {
      const { data: proRowForQuote } = await admin
        .from('service_pros')
        .select('user_id, display_name, category_id, occupation_id, occupations(slug)')
        .eq('id', booking.pro_id as string)
        .maybeSingle();
      const { data: proPricing } = await admin
        .from('pro_profiles')
        .select(
          'pricing_model, starting_price, starting_rate, hourly_rate, min_hours, travel_fee_enabled, travel_fee_base, travel_free_within_miles, travel_extra_per_mile, deposit_percent_default'
        )
        .eq('user_id', (proRowForQuote as { user_id?: string })?.user_id ?? '')
        .maybeSingle();
      const proName = ((proRowForQuote as { display_name?: string })?.display_name ?? 'Pro').trim();
      const occSlugFromPro =
        (proRowForQuote as { occupations?: { slug?: string } | null })?.occupations?.slug?.trim() || null;
      const bFin = booking as {
        pricing_version?: string | null;
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
          id: booking.id as string,
          customer_id: booking.customer_id as string,
          pro_id: booking.pro_id as string,
          service_date: booking.service_date as string,
          service_time: booking.service_time as string,
          address: booking.address as string,
          price: booking.price as number | null,
          status: booking.status as string,
          duration_hours: bFin.duration_hours ?? null,
          miles_distance: bFin.miles_distance ?? null,
          flat_fee_selected: bFin.flat_fee_selected ?? null,
          hourly_selected: bFin.hourly_selected ?? null,
          urgency: (booking.urgency as string | null) ?? null,
          created_at: (booking.created_at as string | null) ?? null,
          pricing_occupation_slug: bFin.pricing_occupation_slug ?? null,
          pricing_category_slug: bFin.pricing_category_slug ?? null,
          pricing_version: bFin.pricing_version ?? null,
          service_fee_cents: bFin.service_fee_cents ?? null,
          convenience_fee_cents: bFin.convenience_fee_cents ?? null,
          protection_fee_cents: bFin.protection_fee_cents ?? null,
          subtotal_cents: bFin.subtotal_cents ?? null,
          demand_fee_cents: bFin.demand_fee_cents ?? null,
          fee_total_cents: bFin.fee_total_cents ?? null,
          customer_total_cents: bFin.customer_total_cents ?? null,
          pro_earnings_cents: bFin.pro_earnings_cents ?? null,
          platform_revenue_cents: bFin.platform_revenue_cents ?? null,
          charge_model: bFin.charge_model ?? null,
        },
        proPricing,
        serviceName,
        proName,
        {
          occupationSlug: bFin.pricing_occupation_slug ?? occSlugFromPro,
          completedOrPaidBookingCount: completedPaidCount ?? 0,
        }
      );
      lastDynamicPricingReasons = quoteResult.quote.dynamicPricingReasons ?? [];
      pricing = quoteResult.pricing;
      amountRemaining = pricing.finalChargeCents;
      if (amountTotal <= 0) amountTotal = pricing.customerTotalCents;
    }

    if (!Number.isFinite(amountRemaining) || amountRemaining <= 0) {
      return jsonBody(
        {
          checkoutState: 'no_remaining_balance',
          message: 'There is no remaining balance to pay.',
          paymentAmounts: {
            totalAmountCents: paymentAmounts.totalAmountCents,
            paidAmountCents: paymentAmounts.paidAmountCents,
            remainingAmountCents: paymentAmounts.remainingAmountCents,
          },
        },
        200
      );
    }

    if (!launchMode && !pricing) {
      const subtotalGuessFromStored = Math.max(0, amountTotal - Number(booking.amount_platform_fee ?? 0));
      const bFall = booking as {
        pricing_version?: string | null;
        service_fee_cents?: number | null;
        convenience_fee_cents?: number | null;
        protection_fee_cents?: number | null;
      };
      const useSnap =
        typeof bFall.pricing_version === 'string' &&
        bFall.pricing_version.trim().length > 0 &&
        typeof bFall.service_fee_cents === 'number' &&
        typeof bFall.convenience_fee_cents === 'number' &&
        typeof bFall.protection_fee_cents === 'number';
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
      const depPct = safeDepositPercentFromAmounts(amountDeposit, amountTotal);
      try {
        pricing = useSnap
          ? computeBookingPricing({
              serviceSubtotalCents: subtotalGuessFromStored,
              depositPercent: depPct,
              frozenCoreFeesCents: {
                serviceFeeCents: bFall.service_fee_cents!,
                convenienceFeeCents: bFall.convenience_fee_cents!,
                protectionFeeCents: bFall.protection_fee_cents!,
              },
              demandFeeCents:
                feeRule.demandFeeMode === 'supported_if_applicable' ? dynamicPricing.demandFeeCents : 0,
              promoDiscountCents: dynamicPricing.promoDiscountCents,
            })
          : computeBookingPricing({
              serviceSubtotalCents: subtotalGuessFromStored,
              depositPercent: depPct,
              serviceFeePercent: dynamicPricing.serviceFeePercent,
              convenienceFeeCents: dynamicPricing.convenienceFeeCents,
              protectionFeeCents: dynamicPricing.protectionFeeCents,
              demandFeeCents:
                feeRule.demandFeeMode === 'supported_if_applicable' ? dynamicPricing.demandFeeCents : 0,
              promoDiscountCents: dynamicPricing.promoDiscountCents,
            });
      } catch (e) {
        logCustomerFinalPaymentRouteError('compute_booking_pricing_failed', {
          bookingId: id,
          message: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined,
        });
        return jsonBody(
          {
            error: 'Unable to compute pricing for this payment.',
            checkoutState: 'server_error',
            code: 'PRICING_COMPUTE_ERROR',
          },
          500
        );
      }
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

    if (!pricing) {
      logCustomerFinalPaymentRouteError('pricing_still_null', { bookingId: id });
      return jsonBody(
        {
          error: 'Unable to load pricing for payment intent.',
          checkoutState: 'not_eligible',
          code: 'PRICING_UNAVAILABLE',
        },
        409
      );
    }

    const { data: proRow } = await admin
      .from('service_pros')
      .select('stripe_account_id, stripe_charges_enabled')
      .eq('id', booking.pro_id as string)
      .maybeSingle();

    const connectedAccountId =
      proRow?.stripe_account_id && proRow?.stripe_charges_enabled === true ? proRow.stripe_account_id : null;

    if (!connectedAccountId) {
      return jsonBody(
        {
          checkoutState: 'not_eligible',
          code: 'PRO_NOT_PAYABLE',
          message: 'Pro is not ready to receive payments yet.',
        },
        409
      );
    }

    const customerResult = await getOrCreateStripeCustomer(user.id, user.email ?? null);
    if ('error' in customerResult) {
      logCustomerFinalPaymentRouteError('stripe_customer_failed', {
        bookingId: id,
        error: customerResult.error,
      });
      return jsonBody(
        { error: customerResult.error, checkoutState: 'server_error', code: 'STRIPE_CUSTOMER_ERROR' },
        502
      );
    }

    const amountRemainingRounded = Math.round(amountRemaining);

    if (coalescedFinalPiId && String(booking.final_payment_status ?? '').toUpperCase() !== 'PAID') {
      try {
        const pi = await stripe.paymentIntents.retrieve(coalescedFinalPiId);
        if (pi.status === 'succeeded') {
          return jsonBody(
            {
              checkoutState: 'already_paid',
              message: 'This booking is already fully paid.',
              paymentAmounts: {
                totalAmountCents: amountTotal,
                paidAmountCents: Math.max(0, amountTotal - amountRemainingRounded),
                remainingAmountCents: amountRemainingRounded,
              },
            },
            200
          );
        }
        const reusableStatuses = new Set([
          'requires_payment_method',
          'requires_confirmation',
          'requires_action',
          'processing',
        ]);
        if (reusableStatuses.has(pi.status) && pi.client_secret) {
          if (pi.amount === amountRemainingRounded || pi.amount === amountRemaining) {
            return jsonBody(
              {
                checkoutState: 'ready',
                clientSecret: pi.client_secret,
                paymentIntentId: pi.id,
                amountRemaining: amountRemainingRounded,
                paymentAmounts: {
                  totalAmountCents: amountTotal,
                  paidAmountCents: Math.max(0, amountTotal - amountRemainingRounded),
                  remainingAmountCents: amountRemainingRounded,
                },
              },
              200
            );
          }
          logCustomerFinalPaymentRoute('existing_pi_amount_mismatch', {
            bookingId: id,
            piAmount: pi.amount,
            expectedRemaining: amountRemainingRounded,
          });
        }
      } catch (e) {
        logCustomerFinalPaymentRouteError('existing_pi_retrieve_failed', {
          bookingId: id,
          paymentIntentId: coalescedFinalPiId,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const bStripe = booking as {
      pricing_version?: string | null;
      pricing_band?: string | null;
      subtotal_cents?: number | null;
      service_fee_cents?: number | null;
      convenience_fee_cents?: number | null;
      protection_fee_cents?: number | null;
      demand_fee_cents?: number | null;
      fee_total_cents?: number | null;
      customer_total_cents?: number | null;
    };
    const stripeBookingFrozenCtx = {
      fee_profile: bFinal.fee_profile,
      pricing_version: bStripe.pricing_version,
      pricing_band: bStripe.pricing_band,
      pricing_occupation_slug: bFinal.pricing_occupation_slug,
      pricing_category_slug: bFinal.pricing_category_slug,
      subtotal_cents: bStripe.subtotal_cents,
      service_fee_cents: bStripe.service_fee_cents,
      convenience_fee_cents: bStripe.convenience_fee_cents,
      protection_fee_cents: bStripe.protection_fee_cents,
      demand_fee_cents: bStripe.demand_fee_cents,
      fee_total_cents: bStripe.fee_total_cents,
      customer_total_cents: bStripe.customer_total_cents,
    };
    const feeRuleStripe = getFeeRuleForBooking({
      serviceSubtotalCents: pricing.serviceSubtotalCents,
      categoryName: serviceName,
      occupationSlug: bFinal.pricing_occupation_slug ?? undefined,
      categorySlug: bFinal.pricing_category_slug ?? undefined,
    });
    const conversionForStripe = resolveConversionRiskScore({
      serviceSubtotalCents: pricing.serviceSubtotalCents,
      isFirstBooking: historyFlags.isFirstBooking,
    });
    const trustForStripe = resolveTrustRiskScore({
      occupationProfile: trustOccupationProfileForStripeMetadata(
        id,
        stripeBookingFrozenCtx,
        feeRuleStripe.profile
      ),
    });
    const quoteForStripe = quoteBreakdownStubFromPricing(pricing, {
      dynamicPricingReasons: lastDynamicPricingReasons,
    });

    const stripeFields = buildBookingPaymentIntentStripeFields({
      bookingId: id,
      customerId: booking.customer_id as string,
      proId: booking.pro_id as string,
      paymentPhase: 'remaining',
      serviceTitle: serviceName,
      pricing: buildBookingPaymentIntentPricingMetadata({
        bookingId: id,
        booking: stripeBookingFrozenCtx,
        liveFeeRule: feeRuleStripe,
        quote: quoteForStripe,
        pricing,
        dynamic: {
          dynamicReasonsCsv: lastDynamicPricingReasons.join(','),
          urgency,
          areaDemandScore,
          supplyTightnessScore,
          conversionRiskScore: conversionForStripe,
          trustRiskScore: trustForStripe,
          isFirstBooking: historyFlags.isFirstBooking,
          isRepeatCustomer: historyFlags.isRepeatCustomer,
        },
      }),
    });

    const depositPiId = getBookingDepositPaymentIntentIdOrNull(booking as BookingFinalPaymentIntentIdRow) ?? '';

    Object.assign(
      stripeFields.metadata,
      appendLifecyclePaymentIntentMetadata(
        {
          booking_id: id,
          customer_id: booking.customer_id as string,
          pro_id: booking.pro_id as string,
          booking_service_status: status,
          pricing_version:
            typeof booking.pricing_version === 'string' ? booking.pricing_version.trim() : '',
          subtotal_cents: pricing.serviceSubtotalCents,
          platform_fee_cents: pricing.feeTotalCents,
          deposit_amount_cents: pricing.depositChargeCents,
          final_amount_cents: pricing.finalChargeCents,
          total_amount_cents: pricing.customerTotalCents,
          linked_deposit_payment_intent_id: depositPiId,
          review_deadline_at: String(booking.customer_review_deadline_at ?? ''),
        },
        'final'
      )
    );
    stripeFields.metadata = capStripeBookingPaymentMetadata(stripeFields.metadata);
    assertUnifiedBookingPaymentIntentMetadata(stripeFields.metadata);

    const currency = (typeof booking.currency === 'string' && booking.currency.trim()
      ? booking.currency.trim().toLowerCase()
      : 'usd') as string;

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountRemainingRounded,
          currency,
          automatic_payment_methods: { enabled: true },
          customer: customerResult.stripeCustomerId,
          metadata: stripeFields.metadata,
          description: stripeFields.description,
          statement_descriptor_suffix: stripeFields.statement_descriptor_suffix,
        },
        { idempotencyKey: `final-${id}` }
      );
    } catch (e) {
      logCustomerFinalPaymentRouteError('stripe_payment_intent_create_failed', {
        bookingId: id,
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      });
      return jsonBody(
        {
          error: 'Unable to start payment with Stripe. Please try again shortly.',
          checkoutState: 'server_error',
          code: 'STRIPE_PI_CREATE_FAILED',
        },
        502
      );
    }

    const piStatus = paymentIntent.status;
    const newFinalStatus =
      piStatus === 'succeeded' ? 'PAID' : piStatus === 'requires_action' ? 'REQUIRES_ACTION' : 'UNPAID';

    await admin
      .from('bookings')
      .update({
        final_payment_intent_id: paymentIntent.id,
        stripe_payment_intent_remaining_id: paymentIntent.id,
        stripe_destination_account_id: connectedAccountId,
        final_payment_status: newFinalStatus,
        payment_lifecycle_status:
          newFinalStatus === 'PAID'
            ? 'final_paid'
            : newFinalStatus === 'REQUIRES_ACTION'
              ? 'requires_customer_action'
              : 'final_pending',
      })
      .eq('id', id);

    try {
      await syncBookingPaymentSummary(admin, id);
      await logBookingPaymentEvent(admin, {
        bookingId: id,
        eventType: 'final_intent_created',
        phase: 'final',
        status: piStatus,
        amountCents: amountRemainingRounded,
        currency,
        stripePaymentIntentId: paymentIntent.id,
        metadata: { via: 'pay_final_route' },
      });
    } catch (e) {
      logCustomerFinalPaymentRouteError('lifecycle_ledger_failed', {
        bookingId: id,
        message: e instanceof Error ? e.message : String(e),
      });
    }

    logCustomerFinalPaymentRoute('final_intent_created', {
      bookingId: id,
      amountRemaining: amountRemainingRounded,
      paymentIntentStatus: piStatus,
    });

    const minNotice = minimumBookingNoticeFromBookingRow(
      booking as { original_subtotal_cents?: number | null; subtotal_cents?: number | null }
    );

    return jsonBody(
      {
        checkoutState: 'ready',
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amountRemaining: amountRemainingRounded,
        minimumBookingNotice: minNotice,
        paymentAmounts: {
          totalAmountCents: amountTotal,
          paidAmountCents: Math.max(0, amountTotal - amountRemainingRounded),
          remainingAmountCents: amountRemainingRounded,
        },
      },
      200
    );
  } catch (e) {
    logCustomerFinalPaymentRouteError('unhandled_exception', {
      bookingId: id,
      userId: user.id,
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    return jsonBody(
      {
        error: 'Unexpected server error',
        checkoutState: 'server_error',
        code: 'UNHANDLED',
      },
      500
    );
  }
}
