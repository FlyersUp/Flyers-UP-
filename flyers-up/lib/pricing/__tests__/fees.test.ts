import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeContributionMarginCents,
  computeMarketplaceFees,
  hashStringForPricingAb,
  resolveMarketplacePricingVersionForBooking,
} from '@/lib/pricing/fees';

describe('computeMarketplaceFees', () => {
  it('LOW tier: $20 job uses 12% vs $1.50 max and fixed convenience/protection', () => {
    const r = computeMarketplaceFees(2000, 'v1_2026_04');
    assert.equal(r.pricingBand, 'low');
    assert.equal(r.serviceFeeCents, 240); // 12% of 2000
    assert.equal(r.convenienceFeeCents, 249);
    assert.equal(r.protectionFeeCents, 79);
    assert.ok(r.feeTotalCents >= 499 || r.subtotalCents >= 7500); // floor or high tier
    assert.equal(r.subtotalCents, 2000);
    assert.equal(r.customerTotalCents, r.subtotalCents + r.feeTotalCents);
    assert.ok(r.feeTotalCents >= r.stripeEstimatedFeeCents);
    assert.equal(r.pricingVersion, 'v1_2026_04');
  });

  it('MID tier at $50', () => {
    const r = computeMarketplaceFees(5000, 'v1_2026_04');
    assert.equal(r.pricingBand, 'mid');
    assert.equal(r.serviceFeeCents, 600);
    assert.equal(r.convenienceFeeCents, 199);
    assert.ok(r.protectionFeeCents >= 99);
  });

  it('HIGH tier at $100', () => {
    const r = computeMarketplaceFees(10000, 'v1_2026_04');
    assert.equal(r.pricingBand, 'high');
    assert.equal(r.serviceFeeCents, 1350);
    assert.equal(r.convenienceFeeCents, 0);
    assert.equal(r.protectionFeeCents, 300);
  });

  it('v2_low_ticket_push lowers low-tier friction vs v1 at same subtotal', () => {
    const v1 = computeMarketplaceFees(1000, 'v1_2026_04');
    const v2 = computeMarketplaceFees(1000, 'v2_low_ticket_push');
    assert.equal(v1.pricingVersion, 'v1_2026_04');
    assert.equal(v2.pricingVersion, 'v2_low_ticket_push');
    assert.ok(v2.customerTotalCents <= v1.customerTotalCents);
  });

  it('v3_higher_protection raises protection vs v1 at $50', () => {
    const v1 = computeMarketplaceFees(5000, 'v1_2026_04');
    const v3 = computeMarketplaceFees(5000, 'v3_higher_protection');
    assert.ok(v3.protectionFeeCents >= v1.protectionFeeCents);
    assert.equal(v3.pricingVersion, 'v3_higher_protection');
  });
});

describe('computeContributionMarginCents', () => {
  it('subtracts all buckets', () => {
    const m = computeContributionMarginCents({
      feeTotalCents: 1000,
      stripeFeeCents: 300,
      refundsCents: 50,
      promoCreditsCents: 25,
      supportReserveCents: 10,
      riskReserveCents: 15,
    });
    assert.equal(m, 600);
  });

  it('treats omitted optional buckets as zero', () => {
    assert.equal(
      computeContributionMarginCents({ feeTotalCents: 500, stripeFeeCents: 100 }),
      400
    );
  });
});

describe('resolveMarketplacePricingVersionForBooking', () => {
  it('hashStringForPricingAb is stable for deterministic A/B', () => {
    assert.equal(hashStringForPricingAb('user-uuid-1'), hashStringForPricingAb('user-uuid-1'));
    assert.notEqual(hashStringForPricingAb('user-a'), hashStringForPricingAb('user-b'));
  });

  it('returns a known arm when MARKETPLACE_PRICING_EXPERIMENT is set (smoke)', () => {
    const prev = process.env.MARKETPLACE_PRICING_EXPERIMENT;
    process.env.MARKETPLACE_PRICING_EXPERIMENT = 'v2_low_ticket_push';
    try {
      assert.equal(resolveMarketplacePricingVersionForBooking({ customerId: 'x' }), 'v2_low_ticket_push');
    } finally {
      if (prev === undefined) delete process.env.MARKETPLACE_PRICING_EXPERIMENT;
      else process.env.MARKETPLACE_PRICING_EXPERIMENT = prev;
    }
  });
});
