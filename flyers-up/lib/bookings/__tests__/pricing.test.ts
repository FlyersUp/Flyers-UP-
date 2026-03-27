import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeBookingPricing } from '../pricing';
import {
  getBookingSubtotalTier,
  getFeeRuleForBooking,
  getOccupationFeeProfile,
  parseStampedFeeProfile,
} from '../fee-rules';

describe('computeBookingPricing', () => {
  it('Scenario A: cleaner, $15 subtotal, 20% deposit', () => {
    const rule = getFeeRuleForBooking({
      serviceSubtotalCents: 1500,
      categoryName: 'cleaner',
    });
    assert.strictEqual(rule.profile, 'standard');
    assert.strictEqual(rule.tier, 'under_25');
    assert.strictEqual(rule.serviceFeePercent, 0.09);
    assert.strictEqual(rule.convenienceFeeCents, 75);
    assert.strictEqual(rule.protectionFeeCents, 75);

    const pricing = computeBookingPricing({
      serviceSubtotalCents: 1500,
      depositPercent: 0.2,
      serviceFeePercent: rule.serviceFeePercent,
      convenienceFeeCents: rule.convenienceFeeCents,
      protectionFeeCents: rule.protectionFeeCents,
      demandFeeCents: 0,
    });

    assert.strictEqual(pricing.serviceFeeCents, 135);
    assert.strictEqual(pricing.convenienceFeeCents, 75);
    assert.strictEqual(pricing.protectionFeeCents, 75);
    assert.strictEqual(pricing.demandFeeCents, 0);
    assert.strictEqual(pricing.feeTotalCents, 285);
    assert.strictEqual(pricing.customerTotalCents, 1785);
    assert.strictEqual(pricing.depositBaseCents, 300);
    assert.strictEqual(pricing.depositServiceFeeCents, 27);
    assert.strictEqual(pricing.depositConvenienceFeeCents, 15);
    assert.strictEqual(pricing.depositProtectionFeeCents, 15);
    assert.strictEqual(pricing.depositFeeTotalCents, 57);
    assert.strictEqual(pricing.depositChargeCents, 357);
    assert.strictEqual(pricing.finalChargeCents, 1428);
    assert.strictEqual(
      pricing.depositChargeCents + pricing.finalChargeCents,
      pricing.customerTotalCents
    );
  });

  it('Scenario B: barber, $20 subtotal, 20% deposit', () => {
    const rule = getFeeRuleForBooking({
      serviceSubtotalCents: 2000,
      categoryName: 'barber',
    });
    assert.strictEqual(rule.profile, 'light');
    assert.strictEqual(rule.tier, 'under_25');

    const pricing = computeBookingPricing({
      serviceSubtotalCents: 2000,
      depositPercent: 0.2,
      serviceFeePercent: rule.serviceFeePercent,
      convenienceFeeCents: rule.convenienceFeeCents,
      protectionFeeCents: rule.protectionFeeCents,
      demandFeeCents: 0,
    });
    assert.strictEqual(pricing.serviceFeeCents, 160);
    assert.strictEqual(pricing.feeTotalCents, 260);
    assert.strictEqual(pricing.customerTotalCents, 2260);
  });

  it('Scenario C: plumber, $100 subtotal, 20% deposit', () => {
    const rule = getFeeRuleForBooking({
      serviceSubtotalCents: 10000,
      categoryName: 'plumber',
    });
    assert.strictEqual(rule.profile, 'premium_trust');
    assert.strictEqual(rule.tier, 'over_75');

    const pricing = computeBookingPricing({
      serviceSubtotalCents: 10000,
      depositPercent: 0.2,
      serviceFeePercent: rule.serviceFeePercent,
      convenienceFeeCents: rule.convenienceFeeCents,
      protectionFeeCents: rule.protectionFeeCents,
      demandFeeCents: 0,
    });
    assert.strictEqual(pricing.serviceFeeCents, 1300);
    assert.strictEqual(pricing.feeTotalCents, 1850);
    assert.strictEqual(pricing.customerTotalCents, 11850);
  });

  it('rounding-sensitive case reconciles exactly', () => {
    const pricing = computeBookingPricing({
      serviceSubtotalCents: 999,
      depositPercent: 0.333,
      serviceFeePercent: 0.11,
      convenienceFeeCents: 101,
      protectionFeeCents: 103,
      demandFeeCents: 5,
    });
    assert.strictEqual(pricing.depositChargeCents + pricing.finalChargeCents, pricing.customerTotalCents);
    assert.strictEqual(pricing.depositFeeTotalCents + pricing.finalFeeTotalCents, pricing.feeTotalCents);
  });

  it('applies promo discount split across deposit/final', () => {
    const pricing = computeBookingPricing({
      serviceSubtotalCents: 5000,
      depositPercent: 0.2,
      serviceFeePercent: 0.1,
      convenienceFeeCents: 150,
      protectionFeeCents: 150,
      demandFeeCents: 100,
      promoDiscountCents: 121,
    });
    assert.strictEqual(pricing.depositPromoDiscountCents, 24);
    assert.strictEqual(pricing.finalPromoDiscountCents, 97);
    assert.strictEqual(pricing.depositChargeCents + pricing.finalChargeCents, pricing.customerTotalCents);
  });

  it('throws for invalid inputs', () => {
    assert.throws(
      () =>
        computeBookingPricing({
          serviceSubtotalCents: -1,
          depositPercent: 0.2,
          serviceFeePercent: 0.1,
          convenienceFeeCents: 1,
          protectionFeeCents: 1,
        }),
      /serviceSubtotalCents/
    );
    assert.throws(
      () =>
        computeBookingPricing({
          serviceSubtotalCents: 100,
          depositPercent: 1.1,
          serviceFeePercent: 0.1,
          convenienceFeeCents: 1,
          protectionFeeCents: 1,
        }),
      /depositPercent/
    );
    assert.throws(
      () =>
        computeBookingPricing({
          serviceSubtotalCents: 100,
          depositPercent: 0.5,
          serviceFeePercent: 0.1,
          convenienceFeeCents: -1,
          protectionFeeCents: 1,
        }),
      /fixed fee/
    );
  });
});

describe('fee-rules', () => {
  it('maps subtotal tiers exactly', () => {
    assert.strictEqual(getBookingSubtotalTier(2499), 'under_25');
    assert.strictEqual(getBookingSubtotalTier(2500), 'between_25_and_75');
    assert.strictEqual(getBookingSubtotalTier(7499), 'between_25_and_75');
    assert.strictEqual(getBookingSubtotalTier(7500), 'over_75');
  });

  it('maps occupation/category into expected profiles', () => {
    assert.strictEqual(getOccupationFeeProfile({ occupationSlug: 'dog-walker' }), 'light');
    assert.strictEqual(getOccupationFeeProfile({ categoryName: 'Plumbing' }), 'premium_trust');
    assert.strictEqual(getOccupationFeeProfile({ categoryName: 'Unknown' }), 'standard');
  });

  it('parseStampedFeeProfile only accepts known profiles', () => {
    assert.strictEqual(parseStampedFeeProfile('light'), 'light');
    assert.strictEqual(parseStampedFeeProfile(' Premium_Trust '), 'premium_trust');
    assert.strictEqual(parseStampedFeeProfile('nope'), null);
  });
});
