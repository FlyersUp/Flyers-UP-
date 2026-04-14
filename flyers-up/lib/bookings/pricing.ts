import {
  calculateMarketplaceFees,
  type FeeInputs,
  type MarketplaceFeeOverrides,
} from '@/lib/pricing/fees';

export type MultiFeeBookingPricing = {
  serviceSubtotalCents: number;

  serviceFeeCents: number;
  convenienceFeeCents: number;
  protectionFeeCents: number;
  demandFeeCents: number;
  feeTotalCents: number;
  promoDiscountCents: number;
  customerTotalCents: number;

  depositBaseCents: number;
  finalBaseCents: number;

  depositServiceFeeCents: number;
  finalServiceFeeCents: number;

  depositConvenienceFeeCents: number;
  finalConvenienceFeeCents: number;

  depositProtectionFeeCents: number;
  finalProtectionFeeCents: number;

  depositDemandFeeCents: number;
  finalDemandFeeCents: number;

  depositFeeTotalCents: number;
  finalFeeTotalCents: number;
  depositPromoDiscountCents: number;
  finalPromoDiscountCents: number;

  depositChargeCents: number;
  finalChargeCents: number;
};

/** Flat quote from {@link calculateMarketplaceFees} (no deposit split, no promo). */
export type BookingQuoteSummary = {
  subtotalCents: number;
  serviceFeeCents: number;
  convenienceFeeCents: number;
  protectionFeeCents: number;
  demandFeeCents: number;
  totalCents: number;
  proReceivesCents: number;
  platformRevenueCents: number;
};

/** One row for checkout / receipt UI lists. */
export type BookingQuoteBreakdownLine = {
  label: string;
  amountCents: number;
};

/**
 * Marketplace line items + customer total from tiered engine.
 * Pro keeps {@link BookingQuoteSummary.proReceivesCents}; platform revenue is customer-paid fees.
 */
export function buildBookingQuote(
  input: FeeInputs,
  overrides?: MarketplaceFeeOverrides
): BookingQuoteSummary {
  const fees = calculateMarketplaceFees(input, overrides);

  return {
    subtotalCents: fees.subtotalCents,
    serviceFeeCents: fees.serviceFeeCents,
    convenienceFeeCents: fees.convenienceFeeCents,
    protectionFeeCents: fees.protectionFeeCents,
    demandFeeCents: fees.demandFeeCents,
    totalCents: fees.totalCustomerCents,
    proReceivesCents: fees.proEarningsCents,
    platformRevenueCents: fees.platformRevenueCents,
  };
}

/**
 * Customer-facing line order for a {@link BookingQuoteSummary} (labels match checkout copy).
 */
export function buildBookingQuoteBreakdown(
  quote: Pick<
    BookingQuoteSummary,
    | 'subtotalCents'
    | 'serviceFeeCents'
    | 'convenienceFeeCents'
    | 'protectionFeeCents'
    | 'demandFeeCents'
    | 'totalCents'
  >
): BookingQuoteBreakdownLine[] {
  const {
    subtotalCents,
    serviceFeeCents,
    convenienceFeeCents,
    protectionFeeCents,
    demandFeeCents,
    totalCents,
  } = quote;

  return [
    { label: 'Subtotal (pro rate)', amountCents: subtotalCents },
    { label: 'Service fee', amountCents: serviceFeeCents },
    { label: 'Convenience fee', amountCents: convenienceFeeCents },
    { label: 'Protection', amountCents: protectionFeeCents },
    ...(demandFeeCents > 0 ? [{ label: 'Busy-time fee', amountCents: demandFeeCents }] : []),
    { label: 'Total', amountCents: totalCents },
  ];
}

export function computeBookingPricing(params: {
  serviceSubtotalCents: number;
  depositPercent: number;
  /** Ignored when `frozenCoreFeesCents` is set (marketplace snapshot path). */
  serviceFeePercent?: number;
  convenienceFeeCents?: number;
  protectionFeeCents?: number;
  /** Immutable marketplace line items from booking row (cents). */
  frozenCoreFeesCents?: {
    serviceFeeCents: number;
    convenienceFeeCents: number;
    protectionFeeCents: number;
  };
  demandFeeCents?: number;
  promoDiscountCents?: number;
}): MultiFeeBookingPricing {
  const serviceSubtotalCents = Math.round(params.serviceSubtotalCents);
  const depositPercent = params.depositPercent;
  const demandFeeCents = Math.round(params.demandFeeCents ?? 0);
  const promoDiscountCents = Math.round(params.promoDiscountCents ?? 0);
  const useFrozen = Boolean(params.frozenCoreFeesCents);

  let serviceFeeCents: number;
  let convenienceFeeCents: number;
  let protectionFeeCents: number;
  if (useFrozen && params.frozenCoreFeesCents) {
    serviceFeeCents = Math.round(params.frozenCoreFeesCents.serviceFeeCents);
    convenienceFeeCents = Math.round(params.frozenCoreFeesCents.convenienceFeeCents);
    protectionFeeCents = Math.round(params.frozenCoreFeesCents.protectionFeeCents);
  } else {
    const serviceFeePercent = params.serviceFeePercent ?? 0;
    convenienceFeeCents = Math.round(params.convenienceFeeCents ?? 0);
    protectionFeeCents = Math.round(params.protectionFeeCents ?? 0);
    serviceFeeCents = Math.round(serviceSubtotalCents * serviceFeePercent);
  }

  if (serviceSubtotalCents < 0) {
    throw new Error('serviceSubtotalCents must be >= 0');
  }
  if (depositPercent < 0 || depositPercent > 1) {
    throw new Error('depositPercent must be between 0 and 1');
  }
  if (convenienceFeeCents < 0 || protectionFeeCents < 0 || demandFeeCents < 0) {
    throw new Error('fixed fee cents inputs must be >= 0');
  }
  if (promoDiscountCents < 0) {
    throw new Error('promoDiscountCents must be >= 0');
  }
  const feeTotalCents =
    serviceFeeCents + convenienceFeeCents + protectionFeeCents + demandFeeCents;
  const safePromoDiscountCents = Math.min(promoDiscountCents, serviceSubtotalCents + feeTotalCents);
  const customerTotalCents = Math.max(0, serviceSubtotalCents + feeTotalCents - safePromoDiscountCents);
  const depositBaseCents = Math.round(serviceSubtotalCents * depositPercent);
  const finalBaseCents = serviceSubtotalCents - depositBaseCents;

  const depositServiceFeeCents = Math.round(serviceFeeCents * depositPercent);
  const finalServiceFeeCents = serviceFeeCents - depositServiceFeeCents;

  const depositConvenienceFeeCents = Math.round(convenienceFeeCents * depositPercent);
  const finalConvenienceFeeCents = convenienceFeeCents - depositConvenienceFeeCents;

  const depositProtectionFeeCents = Math.round(protectionFeeCents * depositPercent);
  const finalProtectionFeeCents = protectionFeeCents - depositProtectionFeeCents;

  const depositDemandFeeCents = Math.round(demandFeeCents * depositPercent);
  const finalDemandFeeCents = demandFeeCents - depositDemandFeeCents;

  const depositFeeTotalCents =
    depositServiceFeeCents +
    depositConvenienceFeeCents +
    depositProtectionFeeCents +
    depositDemandFeeCents;
  const finalFeeTotalCents =
    finalServiceFeeCents +
    finalConvenienceFeeCents +
    finalProtectionFeeCents +
    finalDemandFeeCents;
  const depositPromoDiscountCents = Math.round(safePromoDiscountCents * depositPercent);
  const finalPromoDiscountCents = safePromoDiscountCents - depositPromoDiscountCents;

  const depositChargeCents = Math.max(
    0,
    depositBaseCents + depositFeeTotalCents - depositPromoDiscountCents
  );
  const finalChargeCents = Math.max(
    0,
    finalBaseCents + finalFeeTotalCents - finalPromoDiscountCents
  );

  return {
    serviceSubtotalCents,
    serviceFeeCents,
    convenienceFeeCents,
    protectionFeeCents,
    demandFeeCents,
    feeTotalCents,
    promoDiscountCents: safePromoDiscountCents,
    customerTotalCents,
    depositBaseCents,
    finalBaseCents,
    depositServiceFeeCents,
    finalServiceFeeCents,
    depositConvenienceFeeCents,
    finalConvenienceFeeCents,
    depositProtectionFeeCents,
    finalProtectionFeeCents,
    depositDemandFeeCents,
    finalDemandFeeCents,
    depositFeeTotalCents,
    finalFeeTotalCents,
    depositPromoDiscountCents,
    finalPromoDiscountCents,
    depositChargeCents,
    finalChargeCents,
  };
}
