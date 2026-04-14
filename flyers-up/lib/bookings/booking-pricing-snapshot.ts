import type { ChargeModel } from '@/lib/pricing/fees';
import { computeBookingPricing, type MultiFeeBookingPricing } from '@/lib/bookings/pricing';
import type { MarketplaceFeeBreakdown } from '@/lib/pricing/fees';
import type { BookingFrozenPricingRow } from '@/lib/bookings/frozen-booking-pricing';
import { coerceCompleteFrozenPricingRow } from '@/lib/bookings/frozen-booking-pricing';

/** Frozen at booking time; matches `bookings.charge_model` CHECK / app usage. */
export type BookingChargeModel = ChargeModel;

/**
 * Immutable marketplace pricing snapshot (logical shape).
 * Persisted on `bookings` with `total_cents` stored as `customer_total_cents`.
 */
export type BookingPricingSnapshot = {
  charge_model: BookingChargeModel | null;
  subtotal_cents: number;
  service_fee_cents: number;
  convenience_fee_cents: number;
  protection_fee_cents: number;
  demand_fee_cents: number;
  total_cents: number;
  pro_earnings_cents: number;
  platform_revenue_cents: number;

  flat_fee_cents: number | null;
  hourly_rate_cents: number | null;
  base_fee_cents: number | null;
  included_hours: number | null;
  actual_hours_estimate: number | null;
  overage_hourly_rate_cents: number | null;
  minimum_job_cents: number | null;
  demand_multiplier: number | null;
};

/** Columns written to `public.bookings` (snake_case, Supabase-aligned). */
export type BookingsTablePricingSnapshotRow = {
  charge_model: string | null;
  subtotal_cents: number;
  service_fee_cents: number;
  convenience_fee_cents: number;
  protection_fee_cents: number;
  demand_fee_cents: number;
  fee_total_cents: number;
  customer_total_cents: number;
  pro_earnings_cents: number;
  platform_revenue_cents: number;
  flat_fee_cents: number | null;
  hourly_rate_cents: number | null;
  base_fee_cents: number | null;
  included_hours: number | null;
  actual_hours_estimate: number | null;
  overage_hourly_rate_cents: number | null;
  minimum_job_cents: number | null;
  demand_multiplier: number | null;
};

/**
 * Map logical snapshot → DB row fragment. Prefer `feeTotalCents` from the fee engine when provided
 * so it stays identical to `calculateMarketplaceFees` / Stripe metadata.
 */
export function bookingPricingSnapshotToDbRow(
  s: BookingPricingSnapshot,
  options?: { feeTotalCents?: number }
): BookingsTablePricingSnapshotRow {
  const feeTotalCents =
    options?.feeTotalCents ??
    s.service_fee_cents + s.convenience_fee_cents + s.protection_fee_cents + s.demand_fee_cents;

  return {
    charge_model: s.charge_model,
    subtotal_cents: s.subtotal_cents,
    service_fee_cents: s.service_fee_cents,
    convenience_fee_cents: s.convenience_fee_cents,
    protection_fee_cents: s.protection_fee_cents,
    demand_fee_cents: s.demand_fee_cents,
    fee_total_cents: feeTotalCents,
    customer_total_cents: s.total_cents,
    pro_earnings_cents: s.pro_earnings_cents,
    platform_revenue_cents: s.platform_revenue_cents,
    flat_fee_cents: s.flat_fee_cents,
    hourly_rate_cents: s.hourly_rate_cents,
    base_fee_cents: s.base_fee_cents,
    included_hours: s.included_hours,
    actual_hours_estimate: s.actual_hours_estimate,
    overage_hourly_rate_cents: s.overage_hourly_rate_cents,
    minimum_job_cents: s.minimum_job_cents,
    demand_multiplier: s.demand_multiplier,
  };
}

/**
 * DB `UPDATE` fragment for marketplace snapshot after a live quote (e.g. accept-quote).
 * `mf` supplies version/band/Stripe estimates aligned with tiered engine for the frozen subtotal.
 */
export function buildBookingPricingSnapshotPatchFromMultiFeePricing(args: {
  pricing: MultiFeeBookingPricing;
  mf: MarketplaceFeeBreakdown;
  chargeModel: BookingChargeModel | null;
  feeProfile: string;
  flatFeeCents: number | null;
  hourlyRateCents: number | null;
  baseFeeCents: number | null;
  includedHours: number | null;
  actualHoursEstimate: number | null;
  overageHourlyRateCents: number | null;
  minimumJobCents: number | null;
  demandMultiplier: number | null;
}): Record<string, unknown> {
  const p = args.pricing;
  const row = bookingPricingSnapshotToDbRow(
    {
      charge_model: args.chargeModel,
      subtotal_cents: p.serviceSubtotalCents,
      service_fee_cents: p.serviceFeeCents,
      convenience_fee_cents: p.convenienceFeeCents,
      protection_fee_cents: p.protectionFeeCents,
      demand_fee_cents: p.demandFeeCents,
      total_cents: p.customerTotalCents,
      pro_earnings_cents: p.serviceSubtotalCents,
      platform_revenue_cents: p.feeTotalCents,
      flat_fee_cents: args.flatFeeCents,
      hourly_rate_cents: args.hourlyRateCents,
      base_fee_cents: args.baseFeeCents,
      included_hours: args.includedHours,
      actual_hours_estimate: args.actualHoursEstimate,
      overage_hourly_rate_cents: args.overageHourlyRateCents,
      minimum_job_cents: args.minimumJobCents,
      demand_multiplier: args.demandMultiplier,
    },
    { feeTotalCents: p.feeTotalCents }
  );

  return {
    ...row,
    pricing_version: args.mf.pricingVersion,
    pricing_band: args.mf.pricingBand,
    stripe_estimated_fee_cents: args.mf.stripeEstimatedFeeCents,
    platform_gross_margin_cents: args.mf.platformGrossMarginCents,
    effective_take_rate: Number(args.mf.effectiveTakeRate.toFixed(4)),
    fee_profile: args.feeProfile,
  };
}

/** Canonical alias — same as {@link buildBookingPricingSnapshotPatchFromMultiFeePricing}. */
export const buildCanonicalBookingPricingSnapshotPatch = buildBookingPricingSnapshotPatchFromMultiFeePricing;

const DEPOSIT_PERCENT_DEFAULT = 50;
const DEPOSIT_PERCENT_MIN = 20;
const DEPOSIT_PERCENT_MAX = 80;

export type ProDepositPercentsForSnapshot = {
  deposit_percent_default?: number | null;
  deposit_percent_min?: number | null;
  deposit_percent_max?: number | null;
} | null;

/** Clamp pro deposit percent to [min,max] and [20,80], return fraction in (0,1]. */
export function clampProDepositFraction(pro: ProDepositPercentsForSnapshot): number {
  const min = Math.max(DEPOSIT_PERCENT_MIN, pro?.deposit_percent_min ?? DEPOSIT_PERCENT_MIN);
  const max = Math.min(DEPOSIT_PERCENT_MAX, pro?.deposit_percent_max ?? DEPOSIT_PERCENT_MAX);
  const raw = pro?.deposit_percent_default ?? DEPOSIT_PERCENT_DEFAULT;
  const pct = Math.max(min, Math.min(max, Math.round(Number(raw) || DEPOSIT_PERCENT_DEFAULT)));
  return Math.max(0.01, Math.min(1, pct / 100));
}

/**
 * Same frozen snapshot shape as accept-quote, for paths that only have {@link computeMarketplaceFees}
 * output (new request / recurring occurrence). Aligns deposit split with pro defaults.
 */
export function buildCanonicalBookingPricingSnapshotPatchFromMarketplaceFees(args: {
  marketplaceFees: MarketplaceFeeBreakdown;
  chargeModel: BookingChargeModel | null;
  /** Stamped `bookings.fee_profile` (occupation rule profile, e.g. from {@link getFeeRuleForBooking}). */
  feeProfile: string;
  proDepositPercents: ProDepositPercentsForSnapshot;
  flatFeeCents: number | null;
  hourlyRateCents: number | null;
  baseFeeCents: number | null;
  includedHours: number | null;
  actualHoursEstimate: number | null;
  overageHourlyRateCents: number | null;
  minimumJobCents: number | null;
  demandMultiplier: number | null;
}): Record<string, unknown> {
  const mf = args.marketplaceFees;
  const depositFraction = clampProDepositFraction(args.proDepositPercents);
  const pricing = computeBookingPricing({
    serviceSubtotalCents: mf.subtotalCents,
    depositPercent: depositFraction,
    frozenCoreFeesCents: {
      serviceFeeCents: mf.serviceFeeCents,
      convenienceFeeCents: mf.convenienceFeeCents,
      protectionFeeCents: mf.protectionFeeCents,
    },
    demandFeeCents: mf.demandFeeCents,
    promoDiscountCents: 0,
  });
  return buildBookingPricingSnapshotPatchFromMultiFeePricing({
    pricing,
    mf,
    chargeModel: args.chargeModel,
    feeProfile: args.feeProfile,
    flatFeeCents: args.flatFeeCents,
    hourlyRateCents: args.hourlyRateCents,
    baseFeeCents: args.baseFeeCents,
    includedHours: args.includedHours,
    actualHoursEstimate: args.actualHoursEstimate,
    overageHourlyRateCents: args.overageHourlyRateCents,
    minimumJobCents: args.minimumJobCents,
    demandMultiplier: args.demandMultiplier,
  });
}

function snapshotPatchAsFrozenProbe(
  bookingId: string,
  patch: Record<string, unknown>
): BookingFrozenPricingRow {
  return {
    id: bookingId,
    pricing_version: patch.pricing_version as string | null | undefined,
    subtotal_cents: patch.subtotal_cents as number | null | undefined,
    service_fee_cents: patch.service_fee_cents as number | null | undefined,
    convenience_fee_cents: patch.convenience_fee_cents as number | null | undefined,
    protection_fee_cents: patch.protection_fee_cents as number | null | undefined,
    demand_fee_cents: patch.demand_fee_cents as number | null | undefined,
    fee_total_cents: patch.fee_total_cents as number | null | undefined,
    customer_total_cents: patch.customer_total_cents as number | null | undefined,
  };
}

/**
 * Loud log when a write would not satisfy {@link coerceCompleteFrozenPricingRow} (missing/incoherent snapshot).
 */
export function logIfBookingPricingSnapshotPatchIncomplete(
  context: string,
  bookingId: string,
  patch: Record<string, unknown>
): void {
  if (!coerceCompleteFrozenPricingRow(snapshotPatchAsFrozenProbe(bookingId, patch))) {
    console.warn('[booking-pricing-snapshot] INCOMPLETE_FROZEN_SNAPSHOT', {
      context,
      bookingId,
      hasPricingVersion: Boolean(String(patch.pricing_version ?? '').trim()),
    });
  }
}
