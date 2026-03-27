import type { OccupationFeeProfile } from '@/lib/bookings/fee-rules';

export type DynamicPricingInput = {
  occupationProfile: OccupationFeeProfile;
  serviceSubtotalCents: number;
  urgency: 'scheduled' | 'same_day' | 'asap';
  areaDemandScore: number;
  supplyTightnessScore: number;
  conversionRiskScore: number;
  trustRiskScore: number;
  isFirstBooking: boolean;
  isRepeatCustomer: boolean;
};

export type DynamicPricingAdjustment = {
  serviceFeePercentDelta: number;
  convenienceFeeDeltaCents: number;
  protectionFeeDeltaCents: number;
  demandFeeCents: number;
  promoDiscountCents: number;
  reasons: string[];
};

export type DynamicPricingGuardrailResult = {
  cappedServiceFeePercent?: number;
  cappedConvenienceFeeCents?: number;
  cappedProtectionFeeCents?: number;
  cappedDemandFeeCents?: number;
  cappedPromoDiscountCents?: number;
  reasons: string[];
};

export type ResolvedDynamicPricing = {
  serviceFeePercent: number;
  convenienceFeeCents: number;
  protectionFeeCents: number;
  demandFeeCents: number;
  promoDiscountCents: number;
  reasons: string[];
};

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function resolveDynamicPricingAdjustment(
  input: DynamicPricingInput
): DynamicPricingAdjustment {
  const reasons: string[] = [];
  const supply = clampScore(input.supplyTightnessScore);
  const conversion = clampScore(input.conversionRiskScore);
  const trust = clampScore(input.trustRiskScore);

  let serviceFeePercentDelta = 0;
  let convenienceFeeDeltaCents = 0;
  let protectionFeeDeltaCents = 0;
  let demandFeeCents = 0;
  const promoDiscountCents = 0;

  if (input.urgency === 'same_day' && supply >= 70) {
    demandFeeCents = Math.round(input.serviceSubtotalCents * 0.05);
    reasons.push('same_day_supply_tightness');
  }
  if (input.urgency === 'asap' && supply >= 70) {
    demandFeeCents = Math.round(input.serviceSubtotalCents * 0.08);
    reasons.push('asap_supply_tightness');
  }
  if (input.urgency === 'asap' && supply >= 85) {
    demandFeeCents = Math.round(input.serviceSubtotalCents * 0.12);
    reasons.push('asap_extreme_supply_tightness');
  }

  if (conversion >= 75) {
    convenienceFeeDeltaCents -= 100;
    protectionFeeDeltaCents -= 100;
    reasons.push('high_conversion_risk_fee_softening');
  }

  if (trust >= 70 && input.occupationProfile === 'premium_trust') {
    protectionFeeDeltaCents += 100;
    reasons.push('premium_trust_risk_uplift');
  }

  if (supply >= 80 && input.urgency !== 'scheduled') {
    serviceFeePercentDelta += 0.01;
    reasons.push('service_fee_uplift_supply_pressure');
  }
  if (conversion >= 85 && input.serviceSubtotalCents < 5000) {
    serviceFeePercentDelta -= 0.01;
    reasons.push('service_fee_softening_conversion_risk');
  }

  if (input.isFirstBooking && input.serviceSubtotalCents < 3500) {
    reasons.push('first_booking_low_ticket_fee_softening');
  }

  if (input.isRepeatCustomer && conversion < 60) {
    reasons.push('repeat_customer_neutral_pricing');
  }

  return {
    serviceFeePercentDelta,
    convenienceFeeDeltaCents,
    protectionFeeDeltaCents,
    demandFeeCents,
    promoDiscountCents,
    reasons,
  };
}

export function applyDynamicPricingGuardrails(input: {
  serviceSubtotalCents: number;
  urgency: 'scheduled' | 'same_day' | 'asap';
  serviceFeePercent: number;
  convenienceFeeCents: number;
  protectionFeeCents: number;
  demandFeeCents: number;
  promoDiscountCents: number;
  isFirstBooking: boolean;
}): DynamicPricingGuardrailResult {
  const reasons: string[] = [];
  const subtotal = Math.max(0, Math.round(input.serviceSubtotalCents));
  let serviceFeePercent = Math.max(0, input.serviceFeePercent);
  let convenienceFeeCents = Math.max(0, Math.round(input.convenienceFeeCents));
  let protectionFeeCents = Math.max(0, Math.round(input.protectionFeeCents));
  let demandFeeCents = Math.max(0, Math.round(input.demandFeeCents));
  let promoDiscountCents = Math.max(0, Math.round(input.promoDiscountCents));

  const demandCap =
    input.urgency === 'scheduled'
      ? 0
      : input.urgency === 'same_day'
        ? Math.round(subtotal * 0.1)
        : Math.round(subtotal * 0.15);
  if (demandFeeCents > demandCap) {
    demandFeeCents = demandCap;
    reasons.push('demand_fee_cap_applied');
  }

  const resolveFeeCap = (): { cap: number; reason: string } => {
    if (subtotal < 2500) {
      return {
        cap: input.isFirstBooking ? 200 : 300,
        reason: 'fee_cap_applied_under_25',
      };
    }
    if (subtotal < 7500) {
      return { cap: Math.min(Math.round(subtotal * 0.2), 800), reason: 'fee_cap_applied_mid_tier' };
    }
    return { cap: Math.min(Math.round(subtotal * 0.25), 2000), reason: 'fee_cap_applied_high_tier' };
  };

  let serviceFeeCents = Math.round(subtotal * serviceFeePercent);
  const feeCap = resolveFeeCap();
  const netFees =
    serviceFeeCents + convenienceFeeCents + protectionFeeCents + demandFeeCents - promoDiscountCents;

  if (netFees > feeCap.cap) {
    reasons.push(feeCap.reason);
    let overflow = netFees - feeCap.cap;

    const take = (value: number): [number, number] => {
      if (overflow <= 0) return [value, 0];
      const cut = Math.min(value, overflow);
      return [value - cut, cut];
    };

    [convenienceFeeCents] = take(convenienceFeeCents);
    overflow = serviceFeeCents + convenienceFeeCents + protectionFeeCents + demandFeeCents - promoDiscountCents - feeCap.cap;
    [protectionFeeCents] = take(protectionFeeCents);
    overflow = serviceFeeCents + convenienceFeeCents + protectionFeeCents + demandFeeCents - promoDiscountCents - feeCap.cap;
    [demandFeeCents] = take(demandFeeCents);
    overflow = serviceFeeCents + convenienceFeeCents + protectionFeeCents + demandFeeCents - promoDiscountCents - feeCap.cap;
    if (overflow > 0 && subtotal > 0) {
      serviceFeeCents = Math.max(0, serviceFeeCents - overflow);
      serviceFeePercent = serviceFeeCents / subtotal;
    }
  }

  promoDiscountCents = Math.max(
    0,
    Math.min(
      promoDiscountCents,
      serviceFeeCents + convenienceFeeCents + protectionFeeCents + demandFeeCents
    )
  );

  return {
    cappedServiceFeePercent: serviceFeePercent,
    cappedConvenienceFeeCents: convenienceFeeCents,
    cappedProtectionFeeCents: protectionFeeCents,
    cappedDemandFeeCents: demandFeeCents,
    cappedPromoDiscountCents: promoDiscountCents,
    reasons,
  };
}

export function resolveDynamicPricing(params: {
  baseServiceFeePercent: number;
  baseConvenienceFeeCents: number;
  baseProtectionFeeCents: number;
  input: DynamicPricingInput;
}): ResolvedDynamicPricing {
  const adjustment = resolveDynamicPricingAdjustment(params.input);
  const reasons = [...adjustment.reasons];

  let serviceFeePercent = params.baseServiceFeePercent + adjustment.serviceFeePercentDelta;
  let convenienceFeeCents = params.baseConvenienceFeeCents + adjustment.convenienceFeeDeltaCents;
  let protectionFeeCents = params.baseProtectionFeeCents + adjustment.protectionFeeDeltaCents;
  let demandFeeCents = adjustment.demandFeeCents;
  let promoDiscountCents = adjustment.promoDiscountCents;

  if (params.input.isFirstBooking && params.input.serviceSubtotalCents < 3500) {
    convenienceFeeCents = 0;
    reasons.push('first_booking_convenience_waived');
  }

  serviceFeePercent = Math.max(0, serviceFeePercent);
  convenienceFeeCents = Math.max(0, Math.round(convenienceFeeCents));
  protectionFeeCents = Math.max(0, Math.round(protectionFeeCents));
  demandFeeCents = Math.max(0, Math.round(demandFeeCents));
  promoDiscountCents = Math.max(0, Math.round(promoDiscountCents));

  const guardrails = applyDynamicPricingGuardrails({
    serviceSubtotalCents: params.input.serviceSubtotalCents,
    urgency: params.input.urgency,
    serviceFeePercent,
    convenienceFeeCents,
    protectionFeeCents,
    demandFeeCents,
    promoDiscountCents,
    isFirstBooking: params.input.isFirstBooking,
  });

  return {
    serviceFeePercent: guardrails.cappedServiceFeePercent ?? serviceFeePercent,
    convenienceFeeCents: guardrails.cappedConvenienceFeeCents ?? convenienceFeeCents,
    protectionFeeCents: guardrails.cappedProtectionFeeCents ?? protectionFeeCents,
    demandFeeCents: guardrails.cappedDemandFeeCents ?? demandFeeCents,
    promoDiscountCents: guardrails.cappedPromoDiscountCents ?? promoDiscountCents,
    reasons: [...new Set([...reasons, ...guardrails.reasons])],
  };
}
