/**
 * Versioned marketplace fee engine (server-side only).
 * All amounts are integer cents. Do not trust client-submitted fees.
 */

export const DEFAULT_MARKETPLACE_PRICING_VERSION = 'v1_2026_04';

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

const CENTS = {
  LOW_CONVENIENCE: 249,
  LOW_PROTECTION: 79,
  LOW_SERVICE_MIN: 150,
  MID_CONVENIENCE: 199,
  MID_PROTECTION_MIN: 99,
  FEE_FLOOR_UNDER_75: 499,
} as const;

function bandForSubtotal(subtotalCents: number): MarketplacePricingBand {
  if (subtotalCents < 2500) return 'low';
  if (subtotalCents < 7500) return 'mid';
  return 'high';
}

function stripeFeeEstimateCents(customerTotalCents: number): number {
  return Math.round(customerTotalCents * 0.029 + 30);
}

/**
 * Ensure customer-facing fees at least cover estimated Stripe processing on the charge.
 * Bumps convenience fee (deterministic) until fee_total >= stripe estimate + 1 cent margin.
 */
function enforceFeeCoversStripe(
  subtotalCents: number,
  serviceFeeCents: number,
  convenienceFeeCents: number,
  protectionFeeCents: number
): { serviceFeeCents: number; convenienceFeeCents: number; protectionFeeCents: number; feeTotalCents: number; customerTotalCents: number; stripeEstimatedFeeCents: number } {
  let conv = convenienceFeeCents;
  let serv = serviceFeeCents;
  let prot = protectionFeeCents;
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

function computeV1_2026_04(subtotalCents: number): Omit<MarketplaceFeeBreakdown, 'pricingVersion'> {
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
    serviceFeeCents = Math.max(Math.round(s * 0.12), CENTS.LOW_SERVICE_MIN);
    convenienceFeeCents = CENTS.LOW_CONVENIENCE;
    protectionFeeCents = CENTS.LOW_PROTECTION;
  } else if (band === 'mid') {
    serviceFeeCents = Math.round(s * 0.12);
    convenienceFeeCents = CENTS.MID_CONVENIENCE;
    protectionFeeCents = Math.max(Math.round(s * 0.025), CENTS.MID_PROTECTION_MIN);
  } else {
    serviceFeeCents = Math.round(s * 0.135);
    convenienceFeeCents = 0;
    protectionFeeCents = Math.round(s * 0.03);
  }

  let feeTotalCents = serviceFeeCents + convenienceFeeCents + protectionFeeCents;

  // Minimum $4.99 total fees for subtotals under $75
  if (s < 7500 && feeTotalCents < CENTS.FEE_FLOOR_UNDER_75) {
    const add = CENTS.FEE_FLOOR_UNDER_75 - feeTotalCents;
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

/**
 * Resolve pricing version from env for A/B or staged rollouts.
 * `MARKETPLACE_PRICING_VERSION=v1_2026_04` (default)
 */
export function resolveMarketplacePricingVersion(): string {
  const v = (process.env.MARKETPLACE_PRICING_VERSION ?? DEFAULT_MARKETPLACE_PRICING_VERSION).trim();
  return v || DEFAULT_MARKETPLACE_PRICING_VERSION;
}

/**
 * Deterministic, versioned marketplace fees on pro subtotal (cents), before demand/promo adjustments.
 */
export function computeMarketplaceFees(
  subtotalCents: number,
  pricingVersion: string = resolveMarketplacePricingVersion()
): MarketplaceFeeBreakdown {
  const v = pricingVersion.trim() || DEFAULT_MARKETPLACE_PRICING_VERSION;
  if (v === 'v1_2026_04' || v === DEFAULT_MARKETPLACE_PRICING_VERSION) {
    return { ...computeV1_2026_04(subtotalCents), pricingVersion: 'v1_2026_04' };
  }
  // Unknown version: fail safe to default engine (explicit version tag)
  console.warn('[pricing] Unknown MARKETPLACE_PRICING_VERSION, using v1_2026_04', v);
  return { ...computeV1_2026_04(subtotalCents), pricingVersion: 'v1_2026_04' };
}

/**
 * Internal / admin: contribution margin after Stripe, refunds, promos, and reserves (all cents).
 */
export function computeContributionMarginCents(input: {
  feeTotalCents: number;
  stripeFeeCents: number;
  refundsCents: number;
  promoCreditsCents: number;
  supportReserveCents: number;
  riskReserveCents: number;
}): number {
  return (
    Math.round(input.feeTotalCents) -
    Math.round(input.stripeFeeCents) -
    Math.round(input.refundsCents) -
    Math.round(input.promoCreditsCents) -
    Math.round(input.supportReserveCents) -
    Math.round(input.riskReserveCents)
  );
}
