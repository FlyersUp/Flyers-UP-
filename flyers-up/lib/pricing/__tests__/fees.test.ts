/**
 * Run: npx tsx --test lib/pricing/__tests__/fees.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  adjustFeeRateByProfile,
  calculateBaseTieredServiceFeeCents,
  calculateConvenienceFeeCents,
  calculateDemandFeeCents,
  calculateMarketplaceFees,
  calculateProtectionFeeCents,
  calculateServiceFeeCents,
  calculateSubtotalCents,
  computeMarketplaceFees,
  resolveMarketplacePricingVersionForBooking,
} from '@/lib/pricing/fees';

describe('calculateSubtotalCents', () => {
  it('flat + travel', () => {
    assert.equal(
      calculateSubtotalCents({ chargeModel: 'flat', flatFeeCents: 8000, travelFeeCents: 1500 }),
      9500
    );
  });

  it('hourly with minimum job', () => {
    assert.equal(
      calculateSubtotalCents({
        chargeModel: 'hourly',
        hourlyRateCents: 5000,
        hours: 2,
        minimumJobCents: 15000,
        travelFeeCents: 0,
      }),
      15000
    );
  });

  it('flat_hourly with overage after included hours', () => {
    assert.equal(
      calculateSubtotalCents({
        chargeModel: 'flat_hourly',
        baseFeeCents: 10000,
        includedHours: 2,
        actualHours: 4,
        overageHourlyRateCents: 3000,
        travelFeeCents: 0,
      }),
      16000
    );
  });

  it('hourly + travelFeeCents', () => {
    assert.equal(
      calculateSubtotalCents({
        chargeModel: 'hourly',
        hourlyRateCents: 4_000,
        hours: 3,
        minimumJobCents: 8_000,
        travelFeeCents: 1_500,
      }),
      13_500
    );
  });

  it('flat_hourly + travelFeeCents', () => {
    assert.equal(
      calculateSubtotalCents({
        chargeModel: 'flat_hourly',
        baseFeeCents: 8_000,
        includedHours: 2,
        actualHours: 3.5,
        overageHourlyRateCents: 3_000,
        minimumJobCents: 10_000,
        travelFeeCents: 2_000,
      }),
      14_500
    );
  });
});

describe('calculateServiceFeeCents — tiers', () => {
  it('under $50: 22% with $6 floor', () => {
    assert.equal(calculateServiceFeeCents(2000), 600);
    assert.equal(calculateServiceFeeCents(4900), 1078);
  });

  it('under $150: 15%', () => {
    assert.equal(calculateServiceFeeCents(10000), 1500);
  });

  it('under $500: 10%', () => {
    assert.equal(calculateServiceFeeCents(20000), 2000);
  });

  it('large job: 7% capped at $50', () => {
    assert.equal(calculateServiceFeeCents(100_000), 5000);
    assert.equal(calculateServiceFeeCents(60_000), 4200);
  });

  it('fee profile scales tiered service fee (low / high)', () => {
    const base = calculateBaseTieredServiceFeeCents(10_000);
    assert.equal(base, 1500);
    assert.equal(calculateServiceFeeCents(10_000, 'low'), 1275);
    assert.equal(calculateServiceFeeCents(10_000, 'high'), 1725);
  });

  it('large-job cap applies to base tier before profile multiplier', () => {
    assert.equal(calculateBaseTieredServiceFeeCents(100_000), 5000);
    assert.equal(calculateServiceFeeCents(100_000, 'high'), 5750);
  });
});

describe('adjustFeeRateByProfile', () => {
  it('multiplies by 0.85 / 1 / 1.15', () => {
    assert.equal(adjustFeeRateByProfile(1000, 'low'), 850);
    assert.equal(adjustFeeRateByProfile(1000, 'medium'), 1000);
    assert.equal(adjustFeeRateByProfile(1000, 'high'), 1150);
  });
});

describe('calculateConvenienceFeeCents', () => {
  it('tier buckets', () => {
    assert.equal(calculateConvenienceFeeCents(5000), 199);
    assert.equal(calculateConvenienceFeeCents(10000), 299);
    assert.equal(calculateConvenienceFeeCents(25_000), 399);
  });
});

describe('calculateProtectionFeeCents', () => {
  it('2% with min $1 max $9.99', () => {
    assert.equal(calculateProtectionFeeCents(3000), 100);
    assert.equal(calculateProtectionFeeCents(10_000), 200);
    assert.equal(calculateProtectionFeeCents(1_000_000), 999);
  });
});

describe('calculateDemandFeeCents', () => {
  it('applies multiplier to subtotal', () => {
    assert.equal(calculateDemandFeeCents(10_000, 0.05), 500);
    assert.equal(calculateDemandFeeCents(10_000, 0), 0);
  });
});

describe('calculateMarketplaceFees — charge model examples', () => {
  it('flat: $100 work → subtotal 10_000 cents', () => {
    const r = calculateMarketplaceFees({ chargeModel: 'flat', flatFeeCents: 10_000 });
    assert.equal(r.subtotalCents, 10_000);
    assert.equal(r.proEarningsCents, 10_000);
  });

  it('hourly: $40/hr × 3h with $80 minimum → subtotal 12_000', () => {
    const r = calculateMarketplaceFees({
      chargeModel: 'hourly',
      hourlyRateCents: 4_000,
      hours: 3,
      minimumJobCents: 8_000,
    });
    assert.equal(r.subtotalCents, 12_000);
  });

  it('flat_hourly: $80 base, 2h included, 3.5h actual, $30/hr overage, $100 min → subtotal 12_500', () => {
    const input = {
      chargeModel: 'flat_hourly' as const,
      baseFeeCents: 8_000,
      includedHours: 2,
      actualHours: 3.5,
      overageHourlyRateCents: 3_000,
      minimumJobCents: 10_000,
    };
    assert.equal(calculateSubtotalCents(input), 12_500);
    const r = calculateMarketplaceFees(input);
    assert.equal(r.subtotalCents, 12_500);
  });

  it('hourly with travel: fees scale to work + travel subtotal', () => {
    const withoutTravel = calculateMarketplaceFees({
      chargeModel: 'hourly',
      hourlyRateCents: 4_000,
      hours: 3,
      minimumJobCents: 8_000,
    });
    const withTravel = calculateMarketplaceFees({
      chargeModel: 'hourly',
      hourlyRateCents: 4_000,
      hours: 3,
      minimumJobCents: 8_000,
      travelFeeCents: 1_500,
    });
    assert.equal(withoutTravel.subtotalCents, 12_000);
    assert.equal(withTravel.subtotalCents, 13_500);
    assert.ok(withTravel.totalCustomerCents > withoutTravel.totalCustomerCents);
    assert.equal(withTravel.proEarningsCents, 13_500);
  });
});

describe('calculateMarketplaceFees', () => {
  it('pro payout equals subtotal', () => {
    const r = calculateMarketplaceFees({ chargeModel: 'flat', flatFeeCents: 15_000 });
    assert.equal(r.proEarningsCents, r.subtotalCents);
    assert.equal(r.proReceivesCents, r.subtotalCents);
    assert.equal(r.subtotalCents, 15_000);
  });

  it('customer total equals subtotal + all fees', () => {
    const r = calculateMarketplaceFees({ chargeModel: 'flat', flatFeeCents: 10_000 }, { demandFeeCents: 250 });
    const sumLines =
      r.serviceFeeCents + r.convenienceFeeCents + r.protectionFeeCents + r.demandFeeCents;
    assert.equal(r.totalFeeCents, sumLines);
    assert.equal(r.feeTotalCents, sumLines);
    assert.equal(r.totalCustomerCents, r.subtotalCents + r.totalFeeCents);
    assert.equal(r.totalCents, r.subtotalCents + r.feeTotalCents);
    assert.equal(r.platformRevenueCents, r.totalFeeCents);
  });

  it('demand fee from multiplier when override omitted', () => {
    const r = calculateMarketplaceFees({
      chargeModel: 'flat',
      flatFeeCents: 20_000,
      demandMultiplier: 0.02,
    });
    assert.equal(r.demandFeeCents, 400);
  });
});

describe('computeMarketplaceFees (compat)', () => {
  it('returns customerTotalCents alias', () => {
    const r = computeMarketplaceFees(10_000, 'tiered_v1');
    assert.equal(r.customerTotalCents, r.subtotalCents + r.totalFeeCents);
  });
});

describe('resolveMarketplacePricingVersionForBooking', () => {
  it('deterministic_ab picks an arm from env list', () => {
    const prevExp = process.env.MARKETPLACE_PRICING_EXPERIMENT;
    const prevArms = process.env.MARKETPLACE_PRICING_AB_ARMS;
    process.env.MARKETPLACE_PRICING_EXPERIMENT = 'deterministic_ab';
    process.env.MARKETPLACE_PRICING_AB_ARMS = 'tiered_v1,v1_2026_04';
    try {
      const a = resolveMarketplacePricingVersionForBooking({ customerId: 'cust-a' });
      const b = resolveMarketplacePricingVersionForBooking({ customerId: 'cust-b' });
      assert.ok(['tiered_v1', 'v1_2026_04'].includes(a));
      assert.ok(['tiered_v1', 'v1_2026_04'].includes(b));
    } finally {
      if (prevExp === undefined) delete process.env.MARKETPLACE_PRICING_EXPERIMENT;
      else process.env.MARKETPLACE_PRICING_EXPERIMENT = prevExp;
      if (prevArms === undefined) delete process.env.MARKETPLACE_PRICING_AB_ARMS;
      else process.env.MARKETPLACE_PRICING_AB_ARMS = prevArms;
    }
  });
});
