/**
 * Centralized marketplace pricing (integer cents).
 * Pro keeps 100% of the service subtotal; customer pays tiered marketplace fees on top.
 */

export const TIERED_PRICING_VERSION_ID = 'tiered_v1';

/** @deprecated Legacy IDs; fee math uses {@link TIERED_PRICING_VERSION_ID}. Kept for migrations / env compatibility. */
export const DEFAULT_MARKETPLACE_PRICING_VERSION = TIERED_PRICING_VERSION_ID;

export const MARKETPLACE_PRICING_VERSIONS = ['tiered_v1', 'v1_2026_04', 'v2_low_ticket_push', 'v3_higher_protection'] as const;

export type MarketplacePricingVersionId = (typeof MARKETPLACE_PRICING_VERSIONS)[number];

export type MarketplacePricingBand = 'low' | 'mid' | 'high';

export type ChargeModel = 'flat' | 'hourly' | 'flat_hourly';

/**
 * Optional travel add-on (cents), same on every {@link FeeInputs} variant.
 * Subtotal before marketplace fees is always **work (by charge model) + travel**.
 */
type TravelAugment = { travelFeeCents?: number };

export type FeeInputs =
  | ({
      chargeModel: 'flat';
      flatFeeCents: number;
      demandMultiplier?: number;
    } & TravelAugment)
  | ({
      chargeModel: 'hourly';
      hourlyRateCents: number;
      hours: number;
      minimumJobCents?: number;
      demandMultiplier?: number;
    } & TravelAugment)
  | ({
      chargeModel: 'flat_hourly';
      baseFeeCents: number;
      includedHours: number;
      actualHours: number;
      overageHourlyRateCents: number;
      minimumJobCents?: number;
      demandMultiplier?: number;
    } & TravelAugment);

export type FeeBreakdown = {
  subtotalCents: number;
  serviceFeeCents: number;
  convenienceFeeCents: number;
  protectionFeeCents: number;
  demandFeeCents: number;
  totalFeeCents: number;
  totalCustomerCents: number;
  proEarningsCents: number;
  platformRevenueCents: number;
};

/** DB / Stripe snapshot: canonical {@link FeeBreakdown} plus legacy aliases and engine metadata. */
export type MarketplaceFeeBreakdown = FeeBreakdown & {
  /** @deprecated Use {@link FeeBreakdown.totalFeeCents} */
  feeTotalCents: number;
  /** @deprecated Use {@link FeeBreakdown.totalCustomerCents} */
  totalCents: number;
  /** @deprecated Use {@link FeeBreakdown.proEarningsCents} */
  proReceivesCents: number;
  /** @deprecated Use {@link FeeBreakdown.totalCustomerCents} */
  customerTotalCents: number;
  stripeEstimatedFeeCents: number;
  platformGrossMarginCents: number;
  effectiveTakeRate: number;
  pricingVersion: string;
  pricingBand: MarketplacePricingBand;
};

export type MarketplaceFeeProfile = 'low' | 'medium' | 'high';

export type MarketplaceFeeOverrides = {
  /** Absolute demand in cents; when positive, overrides {@link FeeInputs} `demandMultiplier`. */
  demandFeeCents?: number;
  /** Scales tiered service fee after bracket math (default medium = 1×). */
  feeProfile?: MarketplaceFeeProfile;
};

function bandForSubtotalTier(subtotalCents: number): MarketplacePricingBand {
  const s = Math.max(0, Math.round(subtotalCents));
  if (s < 5000) return 'low';
  if (s < 50000) return 'mid';
  return 'high';
}

function stripeFeeEstimateCents(customerTotalCents: number): number {
  return Math.round(Math.max(0, customerTotalCents) * 0.029 + 30);
}

function roundCents(value: number): number {
  return Math.round(value);
}

function clampNonNegative(value: number): number {
  return Math.max(0, roundCents(value));
}

function travelFromInput(input: FeeInputs): number {
  return clampNonNegative(input.travelFeeCents ?? 0);
}

function demandMultiplierFromInput(input: FeeInputs): number {
  const m = Number(input.demandMultiplier ?? 0);
  return Number.isFinite(m) ? m : 0;
}

export function adjustFeeRateByProfile(
  baseRate: number,
  profile: MarketplaceFeeProfile
): number {
  if (profile === 'low') return baseRate * 0.85;
  if (profile === 'high') return baseRate * 1.15;
  return baseRate;
}

/**
 * Tiered service fee (1× / “medium” bracket math) before {@link adjustFeeRateByProfile}.
 * - <$50  => 22%, minimum $6
 * - <$150 => 15%
 * - <$500 => 10%
 * - $500+ => 7%, capped at $50
 *
 * Charged to the customer, not deducted from the pro.
 */
export function calculateBaseTieredServiceFeeCents(subtotalCents: number): number {
  const s = clampNonNegative(subtotalCents);
  if (s <= 0) return 0;
  if (s < 5_000) {
    return Math.max(roundCents(s * 0.22), 600);
  }
  if (s < 15_000) {
    return roundCents(s * 0.15);
  }
  if (s < 50_000) {
    return roundCents(s * 0.1);
  }
  return Math.min(roundCents(s * 0.07), 5_000);
}

export function calculateServiceFeeCents(
  subtotalCents: number,
  feeProfile: MarketplaceFeeProfile = 'medium'
): number {
  const base = calculateBaseTieredServiceFeeCents(subtotalCents);
  return roundCents(adjustFeeRateByProfile(base, feeProfile));
}

export function calculateConvenienceFeeCents(subtotalCents: number): number {
  const s = clampNonNegative(subtotalCents);
  if (s <= 0) return 0;
  if (s < 7_500) return 199;
  if (s < 20_000) return 299;
  return 399;
}

export function calculateProtectionFeeCents(subtotalCents: number): number {
  const s = clampNonNegative(subtotalCents);
  if (s <= 0) return 0;
  return Math.min(Math.max(roundCents(s * 0.02), 100), 999);
}

export function calculateDemandFeeCents(subtotalCents: number, demandMultiplier = 0): number {
  const s = clampNonNegative(subtotalCents);
  const m = Number(demandMultiplier);
  if (!Number.isFinite(m) || m <= 0) return 0;
  return roundCents(s * m);
}

export function calculateSubtotalCents(input: FeeInputs): number {
  const travel = travelFromInput(input);
  let work = 0;
  switch (input.chargeModel) {
    case 'flat': {
      work = clampNonNegative(input.flatFeeCents);
      break;
    }
    case 'hourly': {
      const raw = input.hourlyRateCents * input.hours;
      const subtotal = clampNonNegative(raw);
      work = Math.max(subtotal, input.minimumJobCents ?? 0);
      break;
    }
    case 'flat_hourly': {
      const extraHours = Math.max(0, input.actualHours - input.includedHours);
      const overage = roundCents(input.overageHourlyRateCents * extraHours);
      const raw = input.baseFeeCents + overage;
      const subtotal = clampNonNegative(raw);
      work = Math.max(subtotal, input.minimumJobCents ?? 0);
      break;
    }
    default: {
      const exhaustive: never = input;
      return exhaustive;
    }
  }
  return work + travel;
}

function coreFeeBreakdownFromSubtotal(
  subtotalCents: number,
  demandFeeCentsResolved: number,
  feeProfile: MarketplaceFeeProfile = 'medium'
): FeeBreakdown {
  const s = clampNonNegative(subtotalCents);
  const serviceFeeCents = calculateServiceFeeCents(s, feeProfile);
  const convenienceFeeCents = calculateConvenienceFeeCents(s);
  const protectionFeeCents = calculateProtectionFeeCents(s);
  const demandFeeCents = Math.max(0, roundCents(demandFeeCentsResolved));
  const totalFeeCents = serviceFeeCents + convenienceFeeCents + protectionFeeCents + demandFeeCents;
  return {
    subtotalCents: s,
    serviceFeeCents,
    convenienceFeeCents,
    protectionFeeCents,
    demandFeeCents,
    totalFeeCents,
    totalCustomerCents: s + totalFeeCents,
    proEarningsCents: s,
    platformRevenueCents: totalFeeCents,
  };
}

function toMarketplaceFeeBreakdown(
  b: FeeBreakdown,
  pricingVersion: string
): MarketplaceFeeBreakdown {
  const version = pricingVersion.trim() || TIERED_PRICING_VERSION_ID;
  const stripeEstimatedFeeCents = stripeFeeEstimateCents(b.totalCustomerCents);
  const effectiveTakeRate = b.subtotalCents > 0 ? b.totalFeeCents / b.subtotalCents : 0;
  return {
    ...b,
    feeTotalCents: b.totalFeeCents,
    totalCents: b.totalCustomerCents,
    proReceivesCents: b.proEarningsCents,
    customerTotalCents: b.totalCustomerCents,
    stripeEstimatedFeeCents,
    platformGrossMarginCents: b.platformRevenueCents - stripeEstimatedFeeCents,
    effectiveTakeRate,
    pricingVersion: isKnownVersion(version) ? version : TIERED_PRICING_VERSION_ID,
    pricingBand: bandForSubtotalTier(b.subtotalCents),
  };
}

/**
 * Full marketplace fee stack on top of pro subtotal.
 * Optional `demandFeeCents` override for pay-time dynamic pricing (caps / absolutes).
 *
 * @example Flat job ($100 work; fees on top)
 * ```ts
 * calculateMarketplaceFees({ chargeModel: 'flat', flatFeeCents: 10_000 });
 * ```
 *
 * @example Hourly (rate × hours, floored by minimum job when higher)
 * ```ts
 * calculateMarketplaceFees({
 *   chargeModel: 'hourly',
 *   hourlyRateCents: 4_000,
 *   hours: 3,
 *   minimumJobCents: 8_000,
 * });
 * ```
 *
 * @example Flat + hourly overage (base package + extra hours × overage rate; then minimum)
 * ```ts
 * calculateMarketplaceFees({
 *   chargeModel: 'flat_hourly',
 *   baseFeeCents: 8_000,
 *   includedHours: 2,
 *   actualHours: 3.5,
 *   overageHourlyRateCents: 3_000,
 *   minimumJobCents: 10_000,
 * });
 * ```
 *
 * @example Travel on top of any model (fees use full pro subtotal = work + travel)
 * ```ts
 * calculateMarketplaceFees({
 *   chargeModel: 'hourly',
 *   hourlyRateCents: 4_000,
 *   hours: 3,
 *   minimumJobCents: 8_000,
 *   travelFeeCents: 1_500, // e.g. $15 trip
 * });
 * ```
 */
export function calculateMarketplaceFees(
  input: FeeInputs,
  overrides?: MarketplaceFeeOverrides
): MarketplaceFeeBreakdown {
  const subtotalCents = calculateSubtotalCents(input);
  const s = clampNonNegative(subtotalCents);

  if (s <= 0) {
    const b = coreFeeBreakdownFromSubtotal(0, 0, overrides?.feeProfile ?? 'medium');
    return toMarketplaceFeeBreakdown(b, TIERED_PRICING_VERSION_ID);
  }

  const feeProfile = overrides?.feeProfile ?? 'medium';
  const overrideDemand = overrides?.demandFeeCents;
  const demandResolved =
    overrideDemand != null && Number.isFinite(overrideDemand) && overrideDemand > 0
      ? overrideDemand
      : calculateDemandFeeCents(s, demandMultiplierFromInput(input));

  const b = coreFeeBreakdownFromSubtotal(s, demandResolved, feeProfile);
  return toMarketplaceFeeBreakdown(b, TIERED_PRICING_VERSION_ID);
}

function isKnownVersion(v: string): v is MarketplacePricingVersionId {
  return (MARKETPLACE_PRICING_VERSIONS as readonly string[]).includes(v);
}

/** Stable 32-bit hash for deterministic A/B assignment. */
export function hashStringForPricingAb(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  }
  return h;
}

export function resolveMarketplacePricingVersion(): string {
  const v = (process.env.MARKETPLACE_PRICING_VERSION ?? TIERED_PRICING_VERSION_ID).trim();
  return v || TIERED_PRICING_VERSION_ID;
}

/**
 * Experiment / version stamp for bookings (fee math is always tiered).
 * Arms still select a `pricing_version` string for analytics.
 */
export function resolveMarketplacePricingVersionForBooking(context?: {
  customerId?: string | null;
}): string {
  const raw = (process.env.MARKETPLACE_PRICING_EXPERIMENT ?? 'off').trim().toLowerCase();
  if (raw === '' || raw === 'off' || raw === 'control') {
    return resolveMarketplacePricingVersion();
  }

  if (raw === 'deterministic_ab') {
    const armsRaw = (
      process.env.MARKETPLACE_PRICING_AB_ARMS ??
      'tiered_v1,v1_2026_04,v2_low_ticket_push,v3_higher_protection'
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const arms = armsRaw.filter((a): a is MarketplacePricingVersionId => isKnownVersion(a));
    const cid = context?.customerId?.trim();
    if (!cid || arms.length === 0) {
      return resolveMarketplacePricingVersion();
    }
    const idx = Math.abs(hashStringForPricingAb(cid)) % arms.length;
    return arms[idx] ?? TIERED_PRICING_VERSION_ID;
  }

  if (isKnownVersion(raw)) {
    return raw;
  }

  console.warn('[pricing] Unknown MARKETPLACE_PRICING_EXPERIMENT, falling back', raw);
  return resolveMarketplacePricingVersion();
}

/**
 * Back-compat: tiered engine from pro subtotal (cents). Version stamps `pricing_version` only.
 */
export function computeMarketplaceFees(
  subtotalCents: number,
  pricingVersion: string = resolveMarketplacePricingVersionForBooking(),
  feeProfile: MarketplaceFeeProfile = 'medium'
): MarketplaceFeeBreakdown {
  const b = calculateMarketplaceFees(
    {
      chargeModel: 'flat',
      flatFeeCents: Math.max(0, Math.round(subtotalCents)),
    },
    { feeProfile }
  );
  const version = pricingVersion.trim() || TIERED_PRICING_VERSION_ID;
  return toMarketplaceFeeBreakdown(
    {
      subtotalCents: b.subtotalCents,
      serviceFeeCents: b.serviceFeeCents,
      convenienceFeeCents: b.convenienceFeeCents,
      protectionFeeCents: b.protectionFeeCents,
      demandFeeCents: b.demandFeeCents,
      totalFeeCents: b.totalFeeCents,
      totalCustomerCents: b.totalCustomerCents,
      proEarningsCents: b.proEarningsCents,
      platformRevenueCents: b.platformRevenueCents,
    },
    version
  );
}

export function computeContributionMarginCents(input: {
  feeTotalCents: number;
  stripeFeeCents: number;
  refundsCents?: number;
  promoCreditsCents?: number;
  supportReserveCents?: number;
  riskReserveCents?: number;
}): number {
  return (
    Math.round(input.feeTotalCents) -
    Math.round(input.stripeFeeCents) -
    Math.round(input.refundsCents ?? 0) -
    Math.round(input.promoCreditsCents ?? 0) -
    Math.round(input.supportReserveCents ?? 0) -
    Math.round(input.riskReserveCents ?? 0)
  );
}
