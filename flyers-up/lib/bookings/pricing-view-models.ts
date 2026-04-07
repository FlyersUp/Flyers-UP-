/**
 * View models for pricing UI — separates what customers see vs what pros see.
 * Does not change persistence, snapshots, or marketplace math.
 */

import type { UnifiedBookingReceipt } from '@/lib/bookings/unified-receipt';

/** Full customer-facing breakdown (checkout, receipts, confirmations). */
export type CustomerPriceView = {
  serviceSubtotalCents: number;
  addonLineItems: Array<{ title: string; priceCents: number }>;
  serviceFeeCents: number;
  convenienceFeeCents: number;
  protectionFeeCents: number;
  demandFeeCents: number;
  feeTotalCents: number;
  promoDiscountCents: number;
  customerTotalCents: number;
  depositScheduledCents: number;
  remainingScheduledCents: number;
  dynamicPricingReasons: string[];
};

/** Pro-safe earnings summary — no customer-only fee line items. */
export type ProEarningsView = {
  /** Job price for the pro (service + add-ons in subtotal). */
  yourRateCents: number;
  addonLineItems: Array<{ title: string; priceCents: number }>;
  /**
   * Fee withheld from the pro’s Stripe payout (Connect/app fee), if modeled.
   * Usually null — marketplace customer fees are not a deduction from your rate.
   */
  platformFeeDeductedFromProCents: number | null;
  /** Refunds charged back against the job (pro-facing). */
  refundedTotalCents: number;
  /** yourRate - refunds - platformFeeDeductedFromPro (floor 0). */
  estimatedNetCents: number;
};

export function buildCustomerPriceViewFromReceipt(r: UnifiedBookingReceipt): CustomerPriceView {
  return {
    serviceSubtotalCents: r.serviceSubtotalCents,
    addonLineItems: r.addonLineItems ?? [],
    serviceFeeCents: r.serviceFeeCents,
    convenienceFeeCents: r.convenienceFeeCents,
    protectionFeeCents: r.protectionFeeCents,
    demandFeeCents: r.demandFeeCents,
    feeTotalCents: r.feeTotalCents,
    promoDiscountCents: r.promoDiscountCents,
    customerTotalCents: r.customerTotalCents,
    depositScheduledCents: r.depositScheduledCents,
    remainingScheduledCents: r.remainingScheduledCents,
    dynamicPricingReasons: r.dynamicPricingReasons ?? [],
  };
}

/**
 * Pro earnings from canonical receipt — intentionally omits convenience/protection/demand/customer total.
 */
export function buildProEarningsViewFromReceipt(
  r: UnifiedBookingReceipt,
  options?: { platformFeeDeductedFromProCents?: number | null }
): ProEarningsView {
  const yourRateCents = Math.max(0, r.serviceSubtotalCents);
  const refunded = Math.max(0, r.refundedTotalCents);
  const platformCut = options?.platformFeeDeductedFromProCents ?? null;
  const deduct = platformCut != null && platformCut > 0 ? platformCut : 0;
  const estimatedNetCents = Math.max(0, yourRateCents - refunded - deduct);

  return {
    yourRateCents,
    addonLineItems: r.addonLineItems ?? [],
    platformFeeDeductedFromProCents: deduct > 0 ? deduct : null,
    refundedTotalCents: refunded,
    estimatedNetCents,
  };
}

export type ProEarningsFallbackInput = {
  amountSubtotalCents?: number | null;
  amountTotalCents?: number | null;
  /** customer_fees_retained — used only to derive your rate when missing (total - fees), not shown as a line item. */
  customerFeesRetainedCents?: number | null;
  refundedTotalCents?: number | null;
  priceDollars?: number | null;
};

/**
 * When receipt is unavailable: derive your rate from booking row fields only.
 */
export function buildProEarningsViewFromBookingFallback(input: ProEarningsFallbackInput): ProEarningsView | null {
  const refunded = Math.max(0, Number(input.refundedTotalCents ?? 0) || 0);
  const sub = Number(input.amountSubtotalCents ?? 0) || 0;
  const total = Number(input.amountTotalCents ?? 0) || 0;
  const fees = Math.max(0, Number(input.customerFeesRetainedCents ?? 0) || 0);

  let yourRateCents = sub > 0 ? sub : 0;
  if (yourRateCents <= 0 && total > 0 && fees >= 0) {
    yourRateCents = Math.max(0, total - fees);
  }
  if (yourRateCents <= 0 && input.priceDollars != null && input.priceDollars > 0) {
    yourRateCents = Math.round(Number(input.priceDollars) * 100);
  }

  if (yourRateCents <= 0 && total <= 0) return null;

  return {
    yourRateCents,
    addonLineItems: [],
    platformFeeDeductedFromProCents: null,
    refundedTotalCents: refunded,
    estimatedNetCents: Math.max(0, yourRateCents - refunded),
  };
}
