import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeContributionMarginCents, computeMarketplaceFees } from '@/lib/pricing/fees';

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
});
