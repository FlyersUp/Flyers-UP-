import type { QuoteBreakdown } from '@/lib/bookingQuote';
import type { MultiFeeBookingPricing } from '@/lib/bookings/pricing';
import type { OccupationFeeProfile, ResolvedFeeRule } from '@/lib/bookings/fee-rules';
import { getBookingSubtotalTier, parseStampedFeeProfile } from '@/lib/bookings/fee-rules';
import { coerceCompleteFrozenPricingRow, type BookingFrozenPricingRow } from '@/lib/bookings/frozen-booking-pricing';
import type { BookingPaymentIntentPricingMetadata } from '@/lib/stripe/booking-payment-intent-metadata';

/** Snapshot fields from `bookings` used to prefer frozen labels on PaymentIntents. */
export type BookingRowStripePricingContext = {
  fee_profile?: string | null;
  pricing_version?: string | null;
  pricing_band?: string | null;
  pricing_occupation_slug?: string | null;
  pricing_category_slug?: string | null;
  subtotal_cents?: number | null;
  service_fee_cents?: number | null;
  convenience_fee_cents?: number | null;
  protection_fee_cents?: number | null;
  demand_fee_cents?: number | null;
  fee_total_cents?: number | null;
  customer_total_cents?: number | null;
};

export type BookingPaymentPricingMetadataDynamicContext = {
  dynamicReasonsCsv: string;
  urgency: string | null;
  areaDemandScore: number;
  supplyTightnessScore: number;
  conversionRiskScore: number;
  trustRiskScore: number;
  isFirstBooking: boolean;
  isRepeatCustomer: boolean;
};

function frozenProbe(bookingId: string, b: BookingRowStripePricingContext): BookingFrozenPricingRow {
  return {
    id: bookingId,
    pricing_version: b.pricing_version ?? null,
    subtotal_cents: b.subtotal_cents ?? null,
    service_fee_cents: b.service_fee_cents ?? null,
    convenience_fee_cents: b.convenience_fee_cents ?? null,
    protection_fee_cents: b.protection_fee_cents ?? null,
    demand_fee_cents: b.demand_fee_cents ?? null,
    fee_total_cents: b.fee_total_cents ?? null,
    customer_total_cents: b.customer_total_cents ?? null,
  };
}

/**
 * Builds PaymentIntent `pricing` metadata: numeric cents always match `pricing` / `quote`;
 * `fee_profile` and `subtotal_tier` follow the stamped booking when the snapshot is complete.
 */
export function buildBookingPaymentIntentPricingMetadata(args: {
  bookingId: string;
  booking: BookingRowStripePricingContext;
  liveFeeRule: ResolvedFeeRule;
  quote: QuoteBreakdown;
  pricing: MultiFeeBookingPricing;
  dynamic: BookingPaymentPricingMetadataDynamicContext;
}): BookingPaymentIntentPricingMetadata {
  const { bookingId, booking, liveFeeRule, quote, pricing, dynamic } = args;
  const frozenOk = coerceCompleteFrozenPricingRow(frozenProbe(bookingId, booking)) != null;

  const stampedProfile = booking.fee_profile?.trim();
  const feeProfileMeta =
    frozenOk && stampedProfile ? stampedProfile : liveFeeRule.profile;

  const subtotalForTier = Math.max(0, Math.round(booking.subtotal_cents ?? quote.amountSubtotal));
  const subtotalTierMeta = frozenOk
    ? getBookingSubtotalTier(subtotalForTier)
    : liveFeeRule.tier;

  return {
    fee_profile: feeProfileMeta,
    subtotal_tier: subtotalTierMeta,
    booking_fee_profile_stamped: stampedProfile || undefined,
    booking_pricing_occupation_slug: booking.pricing_occupation_slug ?? undefined,
    booking_pricing_category_slug: booking.pricing_category_slug ?? undefined,
    pricing_version: (booking.pricing_version && String(booking.pricing_version).trim()) || undefined,
    subtotal_cents: quote.amountSubtotal,
    total_amount_cents: pricing.customerTotalCents,
    platform_fee_cents: pricing.feeTotalCents,
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
    dynamic_pricing_reasons: dynamic.dynamicReasonsCsv,
    urgency: dynamic.urgency ?? undefined,
    area_demand_score: dynamic.areaDemandScore,
    supply_tightness_score: dynamic.supplyTightnessScore,
    conversion_risk_score: dynamic.conversionRiskScore,
    trust_risk_score: dynamic.trustRiskScore,
    is_first_booking: String(dynamic.isFirstBooking),
    is_repeat_customer: String(dynamic.isRepeatCustomer),
    deposit_platform_fee_cents: pricing.depositFeeTotalCents,
    deposit_charge_cents: pricing.depositChargeCents,
    final_base_cents: pricing.finalBaseCents,
    final_platform_fee_cents: pricing.finalFeeTotalCents,
    final_charge_cents: pricing.finalChargeCents,
  };
}

/** Occupation profile for trust-risk scoring: stamped when snapshot is complete, else live rule. */
export function trustOccupationProfileForStripeMetadata(
  bookingId: string,
  booking: BookingRowStripePricingContext,
  liveProfile: OccupationFeeProfile
): OccupationFeeProfile {
  if (coerceCompleteFrozenPricingRow(frozenProbe(bookingId, booking))) {
    const p = parseStampedFeeProfile(booking.fee_profile);
    if (p) return p;
  }
  return liveProfile;
}

/** When only {@link MultiFeeBookingPricing} exists (e.g. pay/final fallback), rebuild quote fields for metadata. */
export function quoteBreakdownStubFromPricing(
  pricing: MultiFeeBookingPricing,
  opts?: { dynamicPricingReasons?: string[]; depositPercent?: number }
): QuoteBreakdown {
  const depositPct =
    opts?.depositPercent ??
    (pricing.customerTotalCents > 0
      ? Math.min(100, Math.max(1, Math.round((pricing.depositChargeCents / pricing.customerTotalCents) * 100)))
      : 50);
  return {
    amountSubtotal: pricing.serviceSubtotalCents,
    amountPlatformFee: pricing.feeTotalCents,
    amountTravelFee: 0,
    amountTotal: pricing.customerTotalCents,
    serviceFeeCents: pricing.serviceFeeCents,
    convenienceFeeCents: pricing.convenienceFeeCents,
    protectionFeeCents: pricing.protectionFeeCents,
    demandFeeCents: pricing.demandFeeCents,
    feeTotalCents: pricing.feeTotalCents,
    promoDiscountCents: pricing.promoDiscountCents,
    amountDeposit: pricing.depositChargeCents,
    amountRemaining: pricing.finalChargeCents,
    depositPercent: depositPct,
    dynamicPricingReasons: opts?.dynamicPricingReasons ?? [],
    currency: 'usd',
  };
}
