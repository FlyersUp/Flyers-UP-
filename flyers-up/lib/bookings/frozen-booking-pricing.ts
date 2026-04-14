/**
 * Immutable booking marketplace pricing: prefer DB snapshot over live recompute.
 */

import { computeBookingPricing, type MultiFeeBookingPricing } from '@/lib/bookings/pricing';
import type { ProPricingForQuote, QuoteBreakdown } from '@/lib/bookingQuote';

const DEPOSIT_PERCENT_DEFAULT = 50;
const DEPOSIT_PERCENT_MIN = 20;
const DEPOSIT_PERCENT_MAX = 80;

/** Booking row fields required to treat marketplace pricing as frozen (no live demand/category recompute). */
export type BookingFrozenPricingRow = {
  id: string;
  pricing_version?: string | null;
  subtotal_cents?: number | null;
  service_fee_cents?: number | null;
  convenience_fee_cents?: number | null;
  protection_fee_cents?: number | null;
  demand_fee_cents?: number | null;
  fee_total_cents?: number | null;
  customer_total_cents?: number | null;
  pro_earnings_cents?: number | null;
  platform_revenue_cents?: number | null;
};

function clampDepositPercent(
  percent: number,
  proPricing: ProPricingForQuote | null
): number {
  const min = Math.max(DEPOSIT_PERCENT_MIN, proPricing?.deposit_percent_min ?? DEPOSIT_PERCENT_MIN);
  const max = Math.min(DEPOSIT_PERCENT_MAX, proPricing?.deposit_percent_max ?? DEPOSIT_PERCENT_MAX);
  return Math.max(min, Math.min(max, Math.round(percent)));
}

function resolveDepositPercentForFrozen(
  proPricing: ProPricingForQuote | null,
  depositPercentOverride?: number | null
): number {
  return depositPercentOverride != null
    ? clampDepositPercent(depositPercentOverride, proPricing)
    : clampDepositPercent(proPricing?.deposit_percent_default ?? DEPOSIT_PERCENT_DEFAULT, proPricing);
}

export function bookingRowHasCompleteFrozenPricing(row: BookingFrozenPricingRow): boolean {
  const v = row.pricing_version?.trim();
  if (!v) return false;
  const nums: Array<[string, unknown]> = [
    ['subtotal_cents', row.subtotal_cents],
    ['service_fee_cents', row.service_fee_cents],
    ['convenience_fee_cents', row.convenience_fee_cents],
    ['protection_fee_cents', row.protection_fee_cents],
    ['fee_total_cents', row.fee_total_cents],
    ['customer_total_cents', row.customer_total_cents],
  ];
  for (const [name, x] of nums) {
    if (typeof x !== 'number' || !Number.isFinite(x) || x < 0) {
      return false;
    }
  }
  if (typeof row.demand_fee_cents !== 'number' || !Number.isFinite(row.demand_fee_cents) || row.demand_fee_cents < 0) {
    return false;
  }
  return true;
}

/**
 * When `demand_fee_cents` was not persisted (legacy), infer it from stamped line items so we never
 * re-run live demand for accepted bookings that already have fee totals frozen.
 */
export function coerceCompleteFrozenPricingRow(row: BookingFrozenPricingRow): BookingFrozenPricingRow | null {
  if (bookingRowHasCompleteFrozenPricing(row)) return row;
  const v = row.pricing_version?.trim();
  if (!v) return null;

  const coreNums: Array<unknown> = [
    row.subtotal_cents,
    row.service_fee_cents,
    row.convenience_fee_cents,
    row.protection_fee_cents,
    row.fee_total_cents,
    row.customer_total_cents,
  ];
  for (const x of coreNums) {
    if (typeof x !== 'number' || !Number.isFinite(x) || x < 0) return null;
  }

  const sub = Math.round(row.subtotal_cents!);
  const svc = Math.round(row.service_fee_cents!);
  const conv = Math.round(row.convenience_fee_cents!);
  const prot = Math.round(row.protection_fee_cents!);
  const feeTot = Math.round(row.fee_total_cents!);
  const custTot = Math.round(row.customer_total_cents!);

  if (Math.abs(sub + feeTot - custTot) > 2) return null;

  let demand = row.demand_fee_cents;
  if (typeof demand !== 'number' || !Number.isFinite(demand) || demand < 0) {
    const inferred = Math.round(feeTot - svc - conv - prot);
    if (inferred < -1) return null;
    demand = Math.max(0, inferred);
    console.warn('[frozen-booking-pricing] inferred demand_fee_cents from stamped fee_total', {
      bookingId: row.id,
      demand_fee_cents: demand,
    });
  } else {
    demand = Math.round(demand);
  }

  const sumLine = svc + conv + prot + demand;
  if (Math.abs(sumLine - feeTot) > 2) return null;

  const out: BookingFrozenPricingRow = { ...row, demand_fee_cents: demand };
  return bookingRowHasCompleteFrozenPricing(out) ? out : null;
}

export function logMissingFrozenPricingFields(bookingId: string, row: BookingFrozenPricingRow): void {
  const missing: string[] = [];
  if (!row.pricing_version?.trim()) missing.push('pricing_version');
  if (typeof row.subtotal_cents !== 'number' || !Number.isFinite(row.subtotal_cents)) missing.push('subtotal_cents');
  if (typeof row.service_fee_cents !== 'number' || !Number.isFinite(row.service_fee_cents)) {
    missing.push('service_fee_cents');
  }
  if (typeof row.convenience_fee_cents !== 'number' || !Number.isFinite(row.convenience_fee_cents)) {
    missing.push('convenience_fee_cents');
  }
  if (typeof row.protection_fee_cents !== 'number' || !Number.isFinite(row.protection_fee_cents)) {
    missing.push('protection_fee_cents');
  }
  if (typeof row.demand_fee_cents !== 'number' || !Number.isFinite(row.demand_fee_cents)) {
    missing.push('demand_fee_cents');
  }
  if (typeof row.fee_total_cents !== 'number' || !Number.isFinite(row.fee_total_cents)) missing.push('fee_total_cents');
  if (typeof row.customer_total_cents !== 'number' || !Number.isFinite(row.customer_total_cents)) {
    missing.push('customer_total_cents');
  }
  if (missing.length > 0) {
    console.warn('[frozen-booking-pricing] incomplete snapshot; falling back to live compute', {
      bookingId,
      missing,
    });
  }
}

/**
 * When {@link bookingRowHasCompleteFrozenPricing} is true, rebuild deposit/final split from frozen line items only.
 * Does not apply category minimums or live demand.
 */
export function tryBuildQuoteFromFrozenBookingRow(
  booking: BookingFrozenPricingRow,
  proPricing: ProPricingForQuote | null,
  depositPercentOverride?: number | null
): { quote: QuoteBreakdown; pricing: MultiFeeBookingPricing } | null {
  const frozenRow = coerceCompleteFrozenPricingRow(booking);
  if (!frozenRow) {
    return null;
  }

  const subtotal = Math.round(frozenRow.subtotal_cents!);
  const demand = Math.round(frozenRow.demand_fee_cents ?? 0);
  const depositPercent = resolveDepositPercentForFrozen(proPricing, depositPercentOverride);

  const pricing = computeBookingPricing({
    serviceSubtotalCents: subtotal,
    depositPercent: depositPercent / 100,
    frozenCoreFeesCents: {
      serviceFeeCents: Math.round(frozenRow.service_fee_cents!),
      convenienceFeeCents: Math.round(frozenRow.convenience_fee_cents!),
      protectionFeeCents: Math.round(frozenRow.protection_fee_cents!),
    },
    demandFeeCents: demand,
    promoDiscountCents: 0,
  });

  const storedTotal = Math.round(frozenRow.customer_total_cents!);
  if (Math.abs(storedTotal - pricing.customerTotalCents) > 2) {
    console.warn('[frozen-booking-pricing] customer_total_cents differs from frozen-line recompute', {
      bookingId: frozenRow.id,
      storedTotal,
      recomputedTotal: pricing.customerTotalCents,
    });
  }

  const quote: QuoteBreakdown = {
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
    depositPercent,
    dynamicPricingReasons: [],
    currency: 'usd',
  };

  return { quote, pricing };
}
