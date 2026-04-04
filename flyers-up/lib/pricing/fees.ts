/**
 * Versioned marketplace fee engine (server-side only).
 * All amounts are integer cents. Do not trust client-submitted fees.
 */

export const DEFAULT_MARKETPLACE_PRICING_VERSION = 'v1_2026_04';

/** Known engine versions (immutable snapshot on booking). */
export const MARKETPLACE_PRICING_VERSIONS = [
  'v1_2026_04',
  'v2_low_ticket_push',
  'v3_higher_protection',
] as const;

export type MarketplacePricingVersionId = (typeof MARKETPLACE_PRICING_VERSIONS)[number];

export type MarketplacePricingBand = 'low' | 'mid' | 'high';

export type MarketplaceFeeBreakdown = {
  subtotalCents: number;
  serviceFeeCents: number;
  convenienceFeeCents: number;
  protectionFeeCents: number;
  feeTotalCents: number;
  customerTotalCents: number;
  stripeEstimatedFeeCents: number;
  platformGrossMarginCents: number;
  /** feeTotal / subtotal when subtotal > 0; else 0 */
  effectiveTakeRate: number;
  pricingVersion: string;
  pricingBand: MarketplacePricingBand;
};

type CentProfile = Readonly<{
  lowServiceRate: number;
  lowServiceMinCents: number;
  lowConvenienceCents: number;
  lowProtectionCents: number;
  midServiceRate: number;
  midConvenienceCents: number;
  midProtectionRate: number;
  midProtectionMinCents: number;
  highServiceRate: number;
  highProtectionRate: number;
  feeFloorUnder75Cents: number;
}>;

const PROFILE_V1: CentProfile = {
  lowServiceRate: 0.12,
  lowServiceMinCents: 150,
  lowConvenienceCents: 249,
  lowProtectionCents: 79,
  midServiceRate: 0.12,
  midConvenienceCents: 199,
  midProtectionRate: 0.025,
  midProtectionMinCents: 99,
  highServiceRate: 0.135,
  highProtectionRate: 0.03,
  feeFloorUnder75Cents: 499,
};

/** v2: lower friction on small jobs (conversion push). */
const PROFILE_V2: CentProfile = {
  ...PROFILE_V1,
  lowServiceMinCents: 120,
  lowConvenienceCents: 199,
  feeFloorUnder75Cents: 449,
};

/** v3: higher protection / guarantee take. */
const PROFILE_V3: CentProfile = {
  ...PROFILE_V1,
  lowProtectionCents: 129,
  midProtectionRate: 0.03,
  midProtectionMinCents: 149,
  highProtectionRate: 0.035,
};

function bandForSubtotal(subtotalCents: number): MarketplacePricingBand {
  if (subtotalCents < 2500) return 'low';
  if (subtotalCents < 7500) return 'mid';
  return 'high';
}

function stripeFeeEstimateCents(customerTotalCents: number): number {
  return Math.round(customerTotalCents * 0.029 + 30);
}

function enforceFeeCoversStripe(
  subtotalCents: number,
  serviceFeeCents: number,
  convenienceFeeCents: number,
  protectionFeeCents: number
): {
  serviceFeeCents: number;
  convenienceFeeCents: number;
  protectionFeeCents: number;
  feeTotalCents: number;
  customerTotalCents: number;
  stripeEstimatedFeeCents: number;
} {
  let conv = convenienceFeeCents;
  const serv = serviceFeeCents;
  const prot = protectionFeeCents;
  const maxIterations = 12;
  for (let i = 0; i < maxIterations; i++) {
    const feeTotal = serv + conv + prot;
    const customerTotal = subtotalCents + feeTotal;
    const stripe = stripeFeeEstimateCents(customerTotal);
    if (feeTotal >= stripe) break;
    const bump = stripe - feeTotal + 1;
    conv += bump;
  }
  const feeTotalCents = serv + conv + prot;
  const customerTotalCents = subtotalCents + feeTotalCents;
  return {
    serviceFeeCents: serv,
    convenienceFeeCents: conv,
    protectionFeeCents: prot,
    feeTotalCents,
    customerTotalCents,
    stripeEstimatedFeeCents: stripeFeeEstimateCents(customerTotalCents),
  };
}

function computeWithProfile(
  subtotalCents: number,
  profile: CentProfile
): Omit<MarketplaceFeeBreakdown, 'pricingVersion'> {
  const s = Math.max(0, Math.round(subtotalCents));
  if (s <= 0) {
    const stripeEstimatedFeeCents = stripeFeeEstimateCents(0);
    return {
      subtotalCents: 0,
      serviceFeeCents: 0,
      convenienceFeeCents: 0,
      protectionFeeCents: 0,
      feeTotalCents: 0,
      customerTotalCents: 0,
      stripeEstimatedFeeCents,
      platformGrossMarginCents: -stripeEstimatedFeeCents,
      effectiveTakeRate: 0,
      pricingBand: 'low',
    };
  }
  const band = bandForSubtotal(s);

  let serviceFeeCents = 0;
  let convenienceFeeCents = 0;
  let protectionFeeCents = 0;

  if (band === 'low') {
    serviceFeeCents = Math.max(Math.round(s * profile.lowServiceRate), profile.lowServiceMinCents);
    convenienceFeeCents = profile.lowConvenienceCents;
    protectionFeeCents = profile.lowProtectionCents;
  } else if (band === 'mid') {
    serviceFeeCents = Math.round(s * profile.midServiceRate);
    convenienceFeeCents = profile.midConvenienceCents;
    protectionFeeCents = Math.max(
      Math.round(s * profile.midProtectionRate),
      profile.midProtectionMinCents
    );
  } else {
    serviceFeeCents = Math.round(s * profile.highServiceRate);
    convenienceFeeCents = 0;
    protectionFeeCents = Math.round(s * profile.highProtectionRate);
  }

  let feeTotalCents = serviceFeeCents + convenienceFeeCents + protectionFeeCents;

  if (s < 7500 && feeTotalCents < profile.feeFloorUnder75Cents) {
    const add = profile.feeFloorUnder75Cents - feeTotalCents;
    convenienceFeeCents += add;
    feeTotalCents = serviceFeeCents + convenienceFeeCents + protectionFeeCents;
  }

  const afterStripe = enforceFeeCoversStripe(s, serviceFeeCents, convenienceFeeCents, protectionFeeCents);
  serviceFeeCents = afterStripe.serviceFeeCents;
  convenienceFeeCents = afterStripe.convenienceFeeCents;
  protectionFeeCents = afterStripe.protectionFeeCents;
  feeTotalCents = afterStripe.feeTotalCents;
  const customerTotalCents = afterStripe.customerTotalCents;
  const stripeEstimatedFeeCents = afterStripe.stripeEstimatedFeeCents;

  const platformGrossMarginCents = feeTotalCents - stripeEstimatedFeeCents;
  const effectiveTakeRate = s > 0 ? feeTotalCents / s : 0;

  return {
    subtotalCents: s,
    serviceFeeCents,
    convenienceFeeCents,
    protectionFeeCents,
    feeTotalCents,
    customerTotalCents,
    stripeEstimatedFeeCents,
    platformGrossMarginCents,
    effectiveTakeRate,
    pricingBand: band,
  };
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

/**
 * Base version when no experiment overrides (default `v1_2026_04`).
 * Set `MARKETPLACE_PRICING_VERSION=v1_2026_04` explicitly in env if needed.
 */
export function resolveMarketplacePricingVersion(): string {
  const v = (process.env.MARKETPLACE_PRICING_VERSION ?? DEFAULT_MARKETPLACE_PRICING_VERSION).trim();
  return v || DEFAULT_MARKETPLACE_PRICING_VERSION;
}

/**
 * Fee experiment / A/B flag (server env only).
 *
 * - `off`, `control`, empty: use `MARKETPLACE_PRICING_VERSION` (or default v1).
 * - `v1_2026_04` | `v2_low_ticket_push` | `v3_higher_protection`: force that engine for all new bookings.
 * - `deterministic_ab`: pick an arm from `MARKETPLACE_PRICING_AB_ARMS` using `hashStringForPricingAb(customerId)`.
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
      'v1_2026_04,v2_low_ticket_push,v3_higher_protection'
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
    return arms[idx] ?? DEFAULT_MARKETPLACE_PRICING_VERSION;
  }

  if (isKnownVersion(raw)) {
    return raw;
  }

  console.warn('[pricing] Unknown MARKETPLACE_PRICING_EXPERIMENT, falling back to MARKETPLACE_PRICING_VERSION', raw);
  return resolveMarketplacePricingVersion();
}

/**
 * Deterministic, versioned marketplace fees on pro subtotal (cents), before demand/promo adjustments.
 */
export function computeMarketplaceFees(
  subtotalCents: number,
  pricingVersion: string = resolveMarketplacePricingVersionForBooking()
): MarketplaceFeeBreakdown {
  const v = pricingVersion.trim() || DEFAULT_MARKETPLACE_PRICING_VERSION;

  if (v === 'v1_2026_04' || v === DEFAULT_MARKETPLACE_PRICING_VERSION) {
    return { ...computeWithProfile(subtotalCents, PROFILE_V1), pricingVersion: 'v1_2026_04' };
  }
  if (v === 'v2_low_ticket_push') {
    return { ...computeWithProfile(subtotalCents, PROFILE_V2), pricingVersion: 'v2_low_ticket_push' };
  }
  if (v === 'v3_higher_protection') {
    return { ...computeWithProfile(subtotalCents, PROFILE_V3), pricingVersion: 'v3_higher_protection' };
  }

  console.warn('[pricing] Unknown pricing version, using v1_2026_04', v);
  return { ...computeWithProfile(subtotalCents, PROFILE_V1), pricingVersion: 'v1_2026_04' };
}

/**
 * Internal / admin: contribution margin after Stripe, refunds, promos, and reserves (all cents).
 */
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
