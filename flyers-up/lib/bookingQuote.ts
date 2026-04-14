/**
 * Server-side booking quote logic.
 * Computes price breakdown from booking + pro pricing rules.
 * Used by /api/bookings/[bookingId]/quote and /api/bookings/[bookingId]/pay.
 */

import { computeBookingPricing, type MultiFeeBookingPricing } from '@/lib/bookings/pricing';
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
import { calculateMarketplaceFees, calculateSubtotalCents, type FeeInputs } from '@/lib/pricing/fees';
import {
  getAllowDemandFeeForOccupationSlug,
  getCategoryPricingConfigForOccupationSlug,
  getFeeProfileForOccupationSlug,
} from '@/lib/pricing/category-config';
import {
  coerceCompleteFrozenPricingRow,
  logMissingFrozenPricingFields,
  tryBuildQuoteFromFrozenBookingRow,
} from '@/lib/bookings/frozen-booking-pricing';

/**
 * Maps pro pricing + booking selections to {@link FeeInputs} so subtotal matches work + travel split.
 */
export function buildFeeInputsForQuote(
  booking: BookingForQuote,
  proPricing: ProPricingForQuote | null,
  baseWorkCents: number,
  travelCents: number
): FeeInputs {
  const model = proPricing?.pricing_model ?? 'flat';
  const flatSelected = booking.flat_fee_selected === true;
  const hourlySelected = booking.hourly_selected === true;
  const startingPriceDollars = Number(proPricing?.starting_price ?? proPricing?.starting_rate ?? 0);
  const hourlyRateDollars = Number(proPricing?.hourly_rate ?? 0);
  const minHours = Number(proPricing?.min_hours ?? 0);
  const durationHours = Number(booking.duration_hours ?? 0);

  if (model === 'flat' || (model === 'hybrid' && flatSelected)) {
    return { chargeModel: 'flat', flatFeeCents: baseWorkCents, travelFeeCents: travelCents };
  }
  if (model === 'hourly' || (model === 'hybrid' && hourlySelected)) {
    const hrs = Math.max(durationHours, minHours > 0 ? minHours : 0);
    return {
      chargeModel: 'hourly',
      hourlyRateCents: Math.round(hourlyRateDollars * 100),
      hours: hrs,
      travelFeeCents: travelCents,
    };
  }
  if (model === 'hybrid') {
    if (durationHours > 2 && hourlyRateDollars > 0) {
      const hrs = Math.max(durationHours, minHours > 0 ? minHours : 0);
      return {
        chargeModel: 'flat_hourly',
        baseFeeCents: Math.round(startingPriceDollars * 100),
        includedHours: 2,
        actualHours: hrs,
        overageHourlyRateCents: Math.round(hourlyRateDollars * 100),
        travelFeeCents: travelCents,
      };
    }
    return {
      chargeModel: 'flat',
      flatFeeCents: Math.round(startingPriceDollars * 100),
      travelFeeCents: travelCents,
    };
  }
  return { chargeModel: 'flat', flatFeeCents: baseWorkCents, travelFeeCents: travelCents };
}

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
  /** Full multi-fee split used for Stripe metadata and deposit/final amounts (single source of truth). */
  pricing: MultiFeeBookingPricing;
  /** When set, totals came from DB snapshot (no live demand/category recompute). */
  pricingSource?: 'frozen' | 'computed';
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
  /** Immutable marketplace snapshot (cents) — when set, core fees come from DB, not fee rules. */
  pricing_version?: string | null;
  service_fee_cents?: number | null;
  convenience_fee_cents?: number | null;
  protection_fee_cents?: number | null;
  /** Full frozen snapshot (see {@link bookingRowHasCompleteFrozenPricing}). */
  subtotal_cents?: number | null;
  demand_fee_cents?: number | null;
  fee_total_cents?: number | null;
  customer_total_cents?: number | null;
  pro_earnings_cents?: number | null;
  platform_revenue_cents?: number | null;
  charge_model?: string | null;
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
 * - If booking.price is set: treat dollars as pro subtotal (legacy), add tiered marketplace fees.
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
    /** When booking row lacks `pricing_occupation_slug`, pass pro occupation slug from join. */
    occupationSlug?: string | null;
  }
): QuoteResult {
  const { quote, pricing, pricingSource } = computeQuoteBreakdown(
    booking,
    proPricing,
    options?.depositPercentOverride,
    serviceName,
    options
  );
  return {
    bookingId: booking.id,
    quote,
    pricing,
    pricingSource,
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
  serviceCategoryDisplayName?: string,
  options?: {
    urgency?: string | null;
    completedOrPaidBookingCount?: number | null;
    occupationSlug?: string | null;
  }
): { quote: QuoteBreakdown; pricing: MultiFeeBookingPricing; pricingSource: 'frozen' | 'computed' } {
  const currency = 'usd';

  const frozen = tryBuildQuoteFromFrozenBookingRow(booking, proPricing, depositPercentOverride);
  if (frozen) {
    return { ...frozen, pricingSource: 'frozen' };
  }
  if (booking.pricing_version?.trim() && !coerceCompleteFrozenPricingRow(booking)) {
    logMissingFrozenPricingFields(booking.id, booking);
  }

  const addDepositToBreakdown = (
    base: Omit<QuoteBreakdown, 'amountDeposit' | 'amountRemaining' | 'depositPercent'>,
    feeInputs?: FeeInputs
  ): { quote: QuoteBreakdown; pricing: MultiFeeBookingPricing; pricingSource: 'computed' } => {
    const occupationSlug =
      (options?.occupationSlug?.trim() || booking.pricing_occupation_slug?.trim() || null) ?? null;
    const categoryCfg = getCategoryPricingConfigForOccupationSlug(occupationSlug);
    const stampedSubtotal =
      booking.pricing_version?.trim() &&
      typeof booking.subtotal_cents === 'number' &&
      Number.isFinite(booking.subtotal_cents) &&
      booking.subtotal_cents >= 0
        ? Math.round(booking.subtotal_cents)
        : null;
    const effectiveSubtotal =
      stampedSubtotal != null
        ? stampedSubtotal
        : categoryCfg
          ? Math.max(base.amountSubtotal, categoryCfg.minPriceCents)
          : base.amountSubtotal;
    const baseForFees = { ...base, amountSubtotal: effectiveSubtotal, amountTotal: effectiveSubtotal };

    const depositPercent = depositPercentOverride != null
      ? clampDepositPercent(depositPercentOverride, proPricing)
      : clampDepositPercent(proPricing?.deposit_percent_default ?? DEPOSIT_PERCENT_DEFAULT, proPricing);
    const feeRule = getFeeRuleForBooking({
      serviceSubtotalCents: effectiveSubtotal,
      categoryName: serviceCategoryDisplayName,
      occupationSlug,
      categorySlug: booking.pricing_category_slug,
    });
    const bookingHistory = resolveCustomerBookingHistoryFlags({
      completedOrPaidBookingCount: options?.completedOrPaidBookingCount ?? 0,
    });
    const dynamicInput: DynamicPricingInput = {
      occupationProfile: feeRule.profile,
      serviceSubtotalCents: effectiveSubtotal,
      urgency: resolveUrgencyFromBooking({
        urgency: options?.urgency ?? booking.urgency,
        serviceDate: booking.service_date,
        serviceTime: booking.service_time,
        requestedAt: booking.created_at ?? null,
      }),
      areaDemandScore: resolveAreaDemandScoreFromBooking(),
      supplyTightnessScore: resolveSupplyTightnessScoreFromBooking(),
      conversionRiskScore: resolveConversionRiskScore({
        serviceSubtotalCents: effectiveSubtotal,
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

    const allowDemandFee = getAllowDemandFeeForOccupationSlug(occupationSlug);
    const demandFeeCents = !allowDemandFee
      ? 0
      : feeRule.demandFeeMode === 'supported_if_applicable'
        ? dynamicPricing.demandFeeCents || getDemandFeeCents({})
        : 0;

    const useMarketplaceSnapshot =
      typeof booking.pricing_version === 'string' &&
      booking.pricing_version.trim().length > 0 &&
      typeof booking.service_fee_cents === 'number' &&
      typeof booking.convenience_fee_cents === 'number' &&
      typeof booking.protection_fee_cents === 'number';

    const rawFeeInputs: FeeInputs =
      feeInputs ??
      ({
        chargeModel: 'flat',
        flatFeeCents: Math.max(0, Math.round(effectiveSubtotal)),
      } satisfies FeeInputs);

    const derivedSubtotal = calculateSubtotalCents(rawFeeInputs);
    const resolvedFeeInputs: FeeInputs =
      Math.abs(derivedSubtotal - effectiveSubtotal) > 1
        ? { chargeModel: 'flat', flatFeeCents: effectiveSubtotal }
        : rawFeeInputs;

    if (Math.abs(derivedSubtotal - effectiveSubtotal) > 1) {
      console.warn('[bookingQuote] feeInputs subtotal mismatch; coerced to flat effective subtotal', {
        bookingId: booking.id,
        effectiveSubtotal,
        subtotalFromInputs: derivedSubtotal,
      });
    }

    const feeProfile = getFeeProfileForOccupationSlug(occupationSlug);

    const frozenCore =
      useMarketplaceSnapshot && booking.service_fee_cents != null
        ? {
            serviceFeeCents: Math.round(booking.service_fee_cents),
            convenienceFeeCents: Math.round(booking.convenience_fee_cents!),
            protectionFeeCents: Math.round(booking.protection_fee_cents!),
          }
        : (() => {
            const mfCore = calculateMarketplaceFees(resolvedFeeInputs, { feeProfile });
            return {
              serviceFeeCents: mfCore.serviceFeeCents,
              convenienceFeeCents: mfCore.convenienceFeeCents,
              protectionFeeCents: mfCore.protectionFeeCents,
            };
          })();

    const pricing = computeBookingPricing({
      serviceSubtotalCents: effectiveSubtotal,
      depositPercent: depositPercent / 100,
      frozenCoreFeesCents: frozenCore,
      demandFeeCents,
      promoDiscountCents: dynamicPricing.promoDiscountCents,
    });
    const amountDeposit = pricing.depositChargeCents;
    const amountRemaining = pricing.finalChargeCents;
    return {
      pricing,
      pricingSource: 'computed' as const,
      quote: {
        ...baseForFees,
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
      },
    };
  };

  // If booking has price (numeric, dollars): treat as pro subtotal (legacy) and add tiered fees
  const bookingPriceDollars = Number(booking.price ?? 0);
  if (Number.isFinite(bookingPriceDollars) && bookingPriceDollars > 0) {
    const subtotalCents = Math.round(bookingPriceDollars * 100);
    const r = addDepositToBreakdown(
      {
        amountSubtotal: subtotalCents,
        amountPlatformFee: 0,
        amountTravelFee: 0,
        amountTotal: subtotalCents,
        serviceFeeCents: 0,
        convenienceFeeCents: 0,
        protectionFeeCents: 0,
        demandFeeCents: 0,
        feeTotalCents: 0,
        promoDiscountCents: 0,
        currency,
      },
      { chargeModel: 'flat', flatFeeCents: subtotalCents }
    );
    return { quote: r.quote, pricing: r.pricing, pricingSource: 'computed' };
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
      const flatBase = Math.round(startingPrice * 100);
      const overHrs = Math.max(0, hours - 2);
      baseCents = flatBase + Math.round(overHrs * hourlyRate * 100);
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
  const feeInputs = buildFeeInputsForQuote(booking, proPricing, baseCents, travelCents);

  const r = addDepositToBreakdown(
    {
      amountSubtotal,
      amountPlatformFee: 0,
      amountTravelFee: travelCents,
      amountTotal: amountSubtotal,
      serviceFeeCents: 0,
      convenienceFeeCents: 0,
      protectionFeeCents: 0,
      demandFeeCents: 0,
      feeTotalCents: 0,
      promoDiscountCents: 0,
      currency,
    },
    feeInputs
  );
  return { quote: r.quote, pricing: r.pricing, pricingSource: 'computed' };
}

/**
 * Prefer frozen DB snapshot; otherwise same as {@link computeQuote}.
 * Logs missing snapshot fields when `pricing_version` is set but the row is incomplete.
 */
export function getFrozenOrComputedBookingPricing(
  booking: BookingForQuote,
  proPricing: ProPricingForQuote | null,
  serviceName: string,
  proName: string,
  options?: Parameters<typeof computeQuote>[4]
): QuoteResult {
  return computeQuote(booking, proPricing, serviceName, proName, options);
}
