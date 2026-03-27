import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  applyDynamicPricingGuardrails,
  resolveDynamicPricing,
  resolveDynamicPricingAdjustment,
} from '../dynamic-pricing';
import {
  resolveAreaDemandScoreFromBooking,
  resolveConversionRiskScore,
  resolveCustomerBookingHistoryFlags,
  resolveSupplyTightnessScoreFromBooking,
  resolveTrustRiskScore,
  resolveUrgencyFromBooking,
} from '../dynamic-pricing-features';
import { computeBookingPricing } from '../pricing';

describe('dynamic pricing engine', () => {
  it('Scenario A: first-time cleaner $15 keeps low-ticket cap', () => {
    const resolved = resolveDynamicPricing({
      baseServiceFeePercent: 0.09,
      baseConvenienceFeeCents: 75,
      baseProtectionFeeCents: 75,
      input: {
        occupationProfile: 'standard',
        serviceSubtotalCents: 1500,
        urgency: 'scheduled',
        areaDemandScore: 0,
        supplyTightnessScore: 0,
        conversionRiskScore: 80,
        trustRiskScore: 40,
        isFirstBooking: true,
        isRepeatCustomer: false,
      },
    });
    assert.strictEqual(resolved.convenienceFeeCents, 0);
    const pricing = computeBookingPricing({
      serviceSubtotalCents: 1500,
      depositPercent: 0.2,
      serviceFeePercent: resolved.serviceFeePercent,
      convenienceFeeCents: resolved.convenienceFeeCents,
      protectionFeeCents: resolved.protectionFeeCents,
      demandFeeCents: resolved.demandFeeCents,
      promoDiscountCents: resolved.promoDiscountCents,
    });
    assert.ok(pricing.feeTotalCents - pricing.promoDiscountCents <= 200);
    assert.strictEqual(pricing.serviceSubtotalCents, 1500);
    assert.strictEqual(pricing.depositChargeCents + pricing.finalChargeCents, pricing.customerTotalCents);
  });

  it('Scenario B: same-day cleaner $90 with supply tightness 75 demand=5%', () => {
    const adj = resolveDynamicPricingAdjustment({
      occupationProfile: 'standard',
      serviceSubtotalCents: 9000,
      urgency: 'same_day',
      areaDemandScore: 0,
      supplyTightnessScore: 75,
      conversionRiskScore: 40,
      trustRiskScore: 40,
      isFirstBooking: false,
      isRepeatCustomer: true,
    });
    assert.strictEqual(adj.demandFeeCents, 450);
  });

  it('Scenario C: asap plumber high tightness/risk applies uplift and guardrails', () => {
    const resolved = resolveDynamicPricing({
      baseServiceFeePercent: 0.13,
      baseConvenienceFeeCents: 300,
      baseProtectionFeeCents: 250,
      input: {
        occupationProfile: 'premium_trust',
        serviceSubtotalCents: 10000,
        urgency: 'asap',
        areaDemandScore: 0,
        supplyTightnessScore: 90,
        conversionRiskScore: 30,
        trustRiskScore: 80,
        isFirstBooking: false,
        isRepeatCustomer: true,
      },
    });
    assert.ok(resolved.demandFeeCents > 0);
    assert.ok(resolved.demandFeeCents <= 1200);
    assert.ok(resolved.protectionFeeCents >= 0);
    assert.ok(resolved.serviceFeePercent >= 0.14);
  });

  it('guardrails prevent negatives and enforce demand cap', () => {
    const g = applyDynamicPricingGuardrails({
      serviceSubtotalCents: 2000,
      urgency: 'scheduled',
      serviceFeePercent: 0.1,
      convenienceFeeCents: 500,
      protectionFeeCents: 500,
      demandFeeCents: 999,
      promoDiscountCents: 0,
      isFirstBooking: true,
    });
    assert.strictEqual(g.cappedDemandFeeCents, 0);
  });
});

describe('dynamic pricing feature defaults', () => {
  it('returns safe defaults when signals unavailable', () => {
    assert.strictEqual(resolveUrgencyFromBooking({}), 'scheduled');
    assert.strictEqual(resolveAreaDemandScoreFromBooking(), 0);
    assert.strictEqual(resolveSupplyTightnessScoreFromBooking(), 0);
    assert.strictEqual(resolveConversionRiskScore({ serviceSubtotalCents: 2000, isFirstBooking: true }), 80);
    assert.strictEqual(resolveTrustRiskScore({ occupationProfile: 'premium_trust' }), 70);
    const flags = resolveCustomerBookingHistoryFlags({ completedOrPaidBookingCount: 0 });
    assert.strictEqual(flags.isFirstBooking, true);
    assert.strictEqual(flags.isRepeatCustomer, false);
  });
});
