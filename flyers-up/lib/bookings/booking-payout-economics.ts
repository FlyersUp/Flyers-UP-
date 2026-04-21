import { computeNetToPro } from '@/lib/bookings/money';

/**
 * Canonical booking-row inputs for payout / finance summaries.
 * On modern checkout, `total_amount_cents` = full customer total and
 * `customer_fees_retained_cents` = **all** customer-facing Flyers Up fees
 * (service + convenience + protection + demand). Pro intended share ≈ `subtotal_cents` / `amount_subtotal`.
 *
 * Prefer frozen snapshot columns (`fee_total_cents`, `subtotal_cents`) over legacy single-field fallbacks.
 */
export type BookingEconomicsRow = {
  total_amount_cents?: number | null;
  amount_total?: number | null;
  customer_total_cents?: number | null;
  /** Frozen pricing snapshot — canonical marketplace fee aggregate when set. */
  fee_total_cents?: number | null;
  service_fee_cents?: number | null;
  convenience_fee_cents?: number | null;
  protection_fee_cents?: number | null;
  demand_fee_cents?: number | null;
  subtotal_cents?: number | null;
  pro_earnings_cents?: number | null;
  customer_fees_retained_cents?: number | null;
  /** Legacy duplicate of customer_fees_retained_cents on some rows (pre-rename). */
  platform_fee_cents?: number | null;
  amount_platform_fee?: number | null;
  refunded_total_cents?: number | null;
  amount_subtotal?: number | null;
};

export type ProPayoutResolution = {
  payoutCents: number;
  cappedToSubtotal: boolean;
  warnings: string[];
  /** Fee aggregate used with `computeNetToPro` (matches receipt / snapshot). */
  marketplaceFeesRetainedCents: number;
};

function nonNegInt(x: unknown): number {
  const n = Math.round(Number(x) || 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Sum of customer-facing marketplace fee lines (matches receipt / {@link bookingPricingSnapshotToDbRow}). */
export function sumMarketplaceFeeComponents(row: BookingEconomicsRow): number {
  return (
    nonNegInt(row.service_fee_cents) +
    nonNegInt(row.convenience_fee_cents) +
    nonNegInt(row.protection_fee_cents) +
    nonNegInt(row.demand_fee_cents)
  );
}

/**
 * Pro work / earnings subtotal in cents — same precedence as receipt + Stripe PI metadata
 * (`subtotal_cents` before legacy `amount_subtotal`).
 */
export function resolveProServiceSubtotalCents(row: BookingEconomicsRow): number {
  const fromSnap = nonNegInt(row.subtotal_cents);
  if (fromSnap > 0) return fromSnap;
  const fromEarn = nonNegInt(row.pro_earnings_cents);
  if (fromEarn > 0) return fromEarn;
  return nonNegInt(row.amount_subtotal);
}

export type MarketplaceFeesResolution = {
  feeCents: number;
  warnings: string[];
};

/**
 * Full marketplace fee bucket (customer-facing, before Stripe processing fees).
 * Order: `fee_total_cents` → sum of components → fix under-recorded DB columns using
 * `(customer_total - refunded) - pro_subtotal` when that is larger than legacy single-field values.
 */
export function resolveMarketplaceFeesRetainedCents(row: BookingEconomicsRow): MarketplaceFeesResolution {
  const warnings: string[] = [];
  const customerNet = Math.max(
    0,
    nonNegInt(row.total_amount_cents ?? row.amount_total) - nonNegInt(row.refunded_total_cents)
  );
  const proSub = resolveProServiceSubtotalCents(row);

  const feeTotal = nonNegInt(row.fee_total_cents);
  if (feeTotal > 0) {
    return { feeCents: feeTotal, warnings };
  }

  const componentSum = sumMarketplaceFeeComponents(row);
  if (componentSum > 0) {
    return { feeCents: componentSum, warnings };
  }

  const recorded = nonNegInt(
    row.customer_fees_retained_cents ?? row.platform_fee_cents ?? row.amount_platform_fee
  );

  if (proSub > 0 && customerNet >= proSub) {
    const implied = Math.max(0, customerNet - proSub);
    if (implied > recorded + 2) {
      warnings.push('marketplace_fees_used_implied_total_minus_subtotal');
      return { feeCents: implied, warnings };
    }
  }

  if (recorded > 0) {
    return { feeCents: recorded, warnings };
  }

  if (proSub > 0 && customerNet >= proSub) {
    const implied = Math.max(0, customerNet - proSub);
    warnings.push('marketplace_fees_used_implied_total_minus_subtotal');
    return { feeCents: implied, warnings };
  }

  return { feeCents: 0, warnings };
}

/**
 * Stripe.transfer amount to the pro's Connect account (before eligibility / risk gates).
 * Uses {@link resolveMarketplaceFeesRetainedCents} for the fee bucket, then
 * `max(0, customer_total - platform_fees_retained - refunded)`.
 * If a canonical pro subtotal is present and the formula exceeds it (bad/missing fee columns), payout is **capped** to that subtotal.
 */
export function resolveProPayoutTransferCents(row: BookingEconomicsRow): ProPayoutResolution {
  const warnings: string[] = [];
  const customerTotal = Math.max(
    0,
    Math.round(Number(row.total_amount_cents ?? row.amount_total ?? 0) || 0)
  );
  const refunded = Math.max(0, Math.round(Number(row.refunded_total_cents ?? 0) || 0));
  const feeRes = resolveMarketplaceFeesRetainedCents(row);
  warnings.push(...feeRes.warnings);

  let payout = computeNetToPro(customerTotal, feeRes.feeCents, refunded);
  const proSub = resolveProServiceSubtotalCents(row);
  let cappedToSubtotal = false;

  if (proSub > 0 && payout > proSub) {
    warnings.push('pro_payout_exceeded_amount_subtotal_capped');
    payout = proSub;
    cappedToSubtotal = true;
  }

  return {
    payoutCents: Math.max(0, payout),
    cappedToSubtotal,
    warnings,
    marketplaceFeesRetainedCents: feeRes.feeCents,
  };
}

/** Finance snapshot for admin / reporting (Stripe fees are optional — not stored on booking row). */
export type BookingPayoutEconomicsSnapshot = {
  customerTotalCents: number;
  platformFeesRetainedCents: number;
  proServiceSubtotalCents: number | null;
  refundedTotalCents: number;
  proPayoutTransferCents: number;
  /** customer_total - pro_payout (before Stripe processing). Ignores refund nuance; use ledger for refunds. */
  platformGrossRevenueCents: number;
  stripeProcessingFeesCents: number | null;
  /** customer_total - stripe_fees - pro_payout when stripe fees provided. */
  platformNetRevenueCents: number | null;
  cappedProPayoutToSubtotal: boolean;
  warnings: string[];
};

export function buildBookingPayoutEconomicsSnapshot(
  row: BookingEconomicsRow,
  stripeProcessingFeesCents: number | null = null
): BookingPayoutEconomicsSnapshot {
  const customerTotalCents = Math.max(
    0,
    Math.round(Number(row.total_amount_cents ?? row.amount_total ?? 0) || 0)
  );
  const refundedTotalCents = Math.max(0, Math.round(Number(row.refunded_total_cents ?? 0) || 0));
  const rawSub = resolveProServiceSubtotalCents(row);
  const proServiceSubtotalCents = rawSub > 0 ? rawSub : null;

  const { payoutCents, cappedToSubtotal, warnings, marketplaceFeesRetainedCents } =
    resolveProPayoutTransferCents(row);

  const platformGrossRevenueCents = Math.max(0, customerTotalCents - payoutCents);
  const platformNetRevenueCents =
    stripeProcessingFeesCents != null && Number.isFinite(stripeProcessingFeesCents)
      ? Math.max(0, customerTotalCents - Math.round(stripeProcessingFeesCents) - payoutCents)
      : null;

  return {
    customerTotalCents,
    platformFeesRetainedCents: marketplaceFeesRetainedCents,
    proServiceSubtotalCents,
    refundedTotalCents,
    proPayoutTransferCents: payoutCents,
    platformGrossRevenueCents,
    stripeProcessingFeesCents,
    platformNetRevenueCents,
    cappedProPayoutToSubtotal: cappedToSubtotal,
    warnings,
  };
}
