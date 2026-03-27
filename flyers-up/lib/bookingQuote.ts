/**
 * Server-side booking quote logic.
 * Computes price breakdown from booking + pro pricing rules.
 * Used by /api/bookings/[bookingId]/quote and /api/bookings/[bookingId]/pay.
 */

import { computeBookingPricing } from '@/lib/bookings/pricing';
import { getDemandFeeCents } from '@/lib/bookings/fee-config';
import { getFeeRuleForBooking } from '@/lib/bookings/fee-rules';
import {
  resolveDynamicPricing,
  type DynamicPricingInput,
} from '@/lib/bookings/dynamic-pricing';
import {
  resolveAreaDemandScoreFromBooking,
  resolveConversionRiskScore,
  resolveCustomerBookingHistoryFlags,
  resolveSupplyTightnessScoreFromBooking,
  resolveTrustRiskScore,
  resolveUrgencyFromBooking,
} from '@/lib/bookings/dynamic-pricing-features';

const PLATFORM_FEE_RATE =
  Number(process.env.SERVER_PLATFORM_FEE_RATE ?? process.env.NEXT_PUBLIC_PLATFORM_FEE_RATE ?? '0.15') || 0.15;

export interface QuoteBreakdown {
  amountSubtotal: number; // cents
  amountPlatformFee: number; // cents
  amountTravelFee: number; // cents
  amountTotal: number; // cents
  serviceFeeCents: number;
  convenienceFeeCents: number;
  protectionFeeCents: number;
  demandFeeCents: number;
  feeTotalCents: number;
  promoDiscountCents: number;
  amountDeposit: number; // cents
  amountRemaining: number; // cents
  depositPercent: number; // 10-100
  dynamicPricingReasons?: string[];
  currency: string;
}

export interface QuoteResult {
  bookingId: string;
  quote: QuoteBreakdown;
  serviceName: string;
  proName: string;
  serviceDate: string;
  serviceTime: string;
  address?: string;
  durationHours?: number;
  paymentDueAt?: string | null;
  dynamicPricingReasons?: string[];
}

export interface BookingForQuote {
  id: string;
  customer_id: string;
  pro_id: string;
  service_date: string;
  service_time: string;
  address?: string | null;
  price?: number | null;
  status: string;
  duration_hours?: number | null;
  miles_distance?: number | null;
  flat_fee_selected?: boolean | null;
  hourly_selected?: boolean | null;
  /** Stamped at booking creation (identity / audit only; does not affect quote math). */
  fee_profile?: string | null;
  pricing_occupation_slug?: string | null;
  pricing_category_slug?: string | null;
  urgency?: string | null;
  created_at?: string | null;
}

export interface ProPricingForQuote {
  pricing_model?: string | null;
  starting_price?: number | null;
  starting_rate?: number | null;
  hourly_rate?: number | null;
  min_hours?: number | null;
  travel_fee_enabled?: boolean | null;
  travel_fee_base?: number | null;
  travel_free_within_miles?: number | null;
  travel_extra_per_mile?: number | null;
  deposit_percent_default?: number | null;
  deposit_percent_min?: number | null;
  deposit_percent_max?: number | null;
}

const DEPOSIT_PERCENT_DEFAULT = 50;
const DEPOSIT_PERCENT_MIN = 20;
const DEPOSIT_PERCENT_MAX = 80;

/**
 * Clamp deposit percent within pro limits.
 */
function clampDepositPercent(
  percent: number,
  proPricing: ProPricingForQuote | null
): number {
  const min = Math.max(DEPOSIT_PERCENT_MIN, proPricing?.deposit_percent_min ?? DEPOSIT_PERCENT_MIN);
  const max = Math.min(DEPOSIT_PERCENT_MAX, proPricing?.deposit_percent_max ?? DEPOSIT_PERCENT_MAX);
  return Math.max(min, Math.min(max, Math.round(percent)));
}

/**
 * Compute quote from booking + pro pricing.
 * - If booking.price is set: use it as total, derive breakdown.
 * - Otherwise: compute from pro_profiles (base + travel).
 * - Adds deposit/remaining from deposit_percent (pro default or 50).
 */
export function computeQuote(
  booking: BookingForQuote,
  proPricing: ProPricingForQuote | null,
  serviceName: string,
  proName: string,
  options?: {
    paymentDueAt?: string | null;
    depositPercentOverride?: number | null;
    urgency?: string | null;
    completedOrPaidBookingCount?: number | null;
  }
): QuoteResult {
  const quote = computeQuoteBreakdown(
    booking,
    proPricing,
    options?.depositPercentOverride,
    serviceName,
    options
  );
  return {
    bookingId: booking.id,
    quote,
    serviceName,
    proName,
    serviceDate: booking.service_date,
    serviceTime: booking.service_time,
    address: booking.address ?? undefined,
    durationHours: booking.duration_hours ?? undefined,
    paymentDueAt: options?.paymentDueAt ?? undefined,
    dynamicPricingReasons: quote.dynamicPricingReasons ?? [],
  };
}

function computeQuoteBreakdown(
  booking: BookingForQuote,
  proPricing: ProPricingForQuote | null,
  depositPercentOverride?: number | null,
  categoryName?: string,
  options?: {
    urgency?: string | null;
    completedOrPaidBookingCount?: number | null;
  }
): QuoteBreakdown {
  const currency = 'usd';

  const addDepositToBreakdown = (base: Omit<QuoteBreakdown, 'amountDeposit' | 'amountRemaining' | 'depositPercent'>): QuoteBreakdown => {
    const depositPercent = depositPercentOverride != null
      ? clampDepositPercent(depositPercentOverride, proPricing)
      : clampDepositPercent(proPricing?.deposit_percent_default ?? DEPOSIT_PERCENT_DEFAULT, proPricing);
    const feeRule = getFeeRuleForBooking({
      serviceSubtotalCents: base.amountSubtotal,
      categoryName,
    });
    const bookingHistory = resolveCustomerBookingHistoryFlags({
      completedOrPaidBookingCount: options?.completedOrPaidBookingCount ?? 0,
    });
    const dynamicInput: DynamicPricingInput = {
      occupationProfile: feeRule.profile,
      serviceSubtotalCents: base.amountSubtotal,
      urgency: resolveUrgencyFromBooking({
        urgency: options?.urgency ?? booking.urgency,
        serviceDate: booking.service_date,
        serviceTime: booking.service_time,
        requestedAt: booking.created_at ?? null,
      }),
      areaDemandScore: resolveAreaDemandScoreFromBooking(),
      supplyTightnessScore: resolveSupplyTightnessScoreFromBooking(),
      conversionRiskScore: resolveConversionRiskScore({
        serviceSubtotalCents: base.amountSubtotal,
        isFirstBooking: bookingHistory.isFirstBooking,
      }),
      trustRiskScore: resolveTrustRiskScore({ occupationProfile: feeRule.profile }),
      isFirstBooking: bookingHistory.isFirstBooking,
      isRepeatCustomer: bookingHistory.isRepeatCustomer,
    };
    const dynamicPricing = resolveDynamicPricing({
      baseServiceFeePercent: feeRule.serviceFeePercent,
      baseConvenienceFeeCents: feeRule.convenienceFeeCents,
      baseProtectionFeeCents: feeRule.protectionFeeCents,
      input: dynamicInput,
    });
    const pricing = computeBookingPricing({
      serviceSubtotalCents: base.amountSubtotal,
      depositPercent: depositPercent / 100,
      serviceFeePercent: dynamicPricing.serviceFeePercent,
      convenienceFeeCents: dynamicPricing.convenienceFeeCents,
      protectionFeeCents: dynamicPricing.protectionFeeCents,
      demandFeeCents:
        feeRule.demandFeeMode === 'supported_if_applicable'
          ? dynamicPricing.demandFeeCents || getDemandFeeCents({})
          : 0,
      promoDiscountCents: dynamicPricing.promoDiscountCents,
    });
    const amountDeposit = pricing.depositChargeCents;
    const amountRemaining = pricing.finalChargeCents;
    return {
      ...base,
      amountPlatformFee: pricing.feeTotalCents,
      amountTotal: pricing.customerTotalCents,
      serviceFeeCents: pricing.serviceFeeCents,
      convenienceFeeCents: pricing.convenienceFeeCents,
      protectionFeeCents: pricing.protectionFeeCents,
      demandFeeCents: pricing.demandFeeCents,
      feeTotalCents: pricing.feeTotalCents,
      promoDiscountCents: pricing.promoDiscountCents,
      amountDeposit,
      amountRemaining,
      depositPercent,
      dynamicPricingReasons: dynamicPricing.reasons,
    };
  };

  // If booking has price (numeric, dollars): use as total and derive breakdown
  const bookingPriceDollars = Number(booking.price ?? 0);
  if (Number.isFinite(bookingPriceDollars) && bookingPriceDollars > 0) {
    const subtotalCents = Math.round(bookingPriceDollars * 100);
    return addDepositToBreakdown({
      amountSubtotal: subtotalCents,
      amountPlatformFee: Math.round(subtotalCents * PLATFORM_FEE_RATE),
      amountTravelFee: 0,
      amountTotal: subtotalCents,
      serviceFeeCents: 0,
      convenienceFeeCents: 0,
      protectionFeeCents: 0,
      demandFeeCents: 0,
      feeTotalCents: 0,
      promoDiscountCents: 0,
      currency,
    });
  }

  // Compute from pro pricing
  let baseCents = 0;
  const model = proPricing?.pricing_model ?? 'flat';
  const startingPrice = Number(proPricing?.starting_price ?? proPricing?.starting_rate ?? 0);
  const hourlyRate = Number(proPricing?.hourly_rate ?? 0);
  const minHours = Number(proPricing?.min_hours ?? 0);
  const durationHours = Number(booking.duration_hours ?? 0);
  const flatSelected = booking.flat_fee_selected === true;
  const hourlySelected = booking.hourly_selected === true;

  if (model === 'flat' || (model === 'hybrid' && flatSelected)) {
    baseCents = Math.round(startingPrice * 100);
  } else if (model === 'hourly' || (model === 'hybrid' && hourlySelected)) {
    const hours = Math.max(durationHours ?? 0, minHours > 0 ? minHours : 0);
    baseCents = Math.round(hours * hourlyRate * 100);
  } else if (model === 'hybrid') {
    if (durationHours > 0 && durationHours > 2 && hourlyRate > 0) {
      const hours = Math.max(durationHours, minHours > 0 ? minHours : 0);
      baseCents = Math.round(hours * hourlyRate * 100);
    } else {
      baseCents = Math.round(startingPrice * 100);
    }
  } else {
    baseCents = Math.round(startingPrice * 100);
  }

  let travelCents = 0;
  if (proPricing?.travel_fee_enabled) {
    const base = Number(proPricing.travel_fee_base ?? 0);
    travelCents = Math.round(base * 100);
    const miles = Number(booking.miles_distance ?? 0);
    const freeMiles = Number(proPricing.travel_free_within_miles ?? 0);
    const extraPerMile = Number(proPricing.travel_extra_per_mile ?? 0);
    if (miles > 0 && freeMiles >= 0 && extraPerMile > 0 && miles > freeMiles) {
      travelCents += Math.round((miles - freeMiles) * extraPerMile * 100);
    }
  }

  const amountSubtotal = baseCents + travelCents;
  const amountPlatformFee = Math.round(amountSubtotal * PLATFORM_FEE_RATE);
  const amountTotal = amountSubtotal + amountPlatformFee;

  return addDepositToBreakdown({
    amountSubtotal,
    amountPlatformFee,
    amountTravelFee: travelCents,
    amountTotal,
    serviceFeeCents: 0,
    convenienceFeeCents: 0,
    protectionFeeCents: 0,
    demandFeeCents: 0,
    feeTotalCents: 0,
    promoDiscountCents: 0,
    currency,
  });
}
