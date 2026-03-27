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

export function computeBookingPricing(params: {
  serviceSubtotalCents: number;
  depositPercent: number;
  serviceFeePercent: number;
  convenienceFeeCents: number;
  protectionFeeCents: number;
  demandFeeCents?: number;
  promoDiscountCents?: number;
}): MultiFeeBookingPricing {
  const serviceSubtotalCents = Math.round(params.serviceSubtotalCents);
  const depositPercent = params.depositPercent;
  const serviceFeePercent = params.serviceFeePercent;
  const convenienceFeeCents = Math.round(params.convenienceFeeCents);
  const protectionFeeCents = Math.round(params.protectionFeeCents);
  const demandFeeCents = Math.round(params.demandFeeCents ?? 0);
  const promoDiscountCents = Math.round(params.promoDiscountCents ?? 0);

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

  const serviceFeeCents = Math.round(serviceSubtotalCents * serviceFeePercent);
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
