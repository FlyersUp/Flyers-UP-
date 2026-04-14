/**
 * Run: npx tsx --test lib/bookings/__tests__/booking-pricing-snapshot.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCanonicalBookingPricingSnapshotPatchFromMarketplaceFees,
  logIfBookingPricingSnapshotPatchIncomplete,
} from '@/lib/bookings/booking-pricing-snapshot';
import { computeMarketplaceFees } from '@/lib/pricing/fees';
import { coerceCompleteFrozenPricingRow } from '@/lib/bookings/frozen-booking-pricing';

describe('buildCanonicalBookingPricingSnapshotPatchFromMarketplaceFees', () => {
  it('returns full frozen snapshot keys aligned with accept-quote patch', () => {
    const mf = computeMarketplaceFees(10_000, 'tiered_v1', 'medium');
    const patch = buildCanonicalBookingPricingSnapshotPatchFromMarketplaceFees({
      marketplaceFees: mf,
      chargeModel: 'flat',
      feeProfile: 'standard',
      proDepositPercents: {
        deposit_percent_default: 50,
        deposit_percent_min: 20,
        deposit_percent_max: 80,
      },
      flatFeeCents: 10_000,
      hourlyRateCents: null,
      baseFeeCents: null,
      includedHours: null,
      actualHoursEstimate: 1,
      overageHourlyRateCents: null,
      minimumJobCents: null,
      demandMultiplier: null,
    });

    assert.ok(String(patch.pricing_version ?? '').trim().length > 0);
    assert.equal(patch.fee_profile, 'standard');
    assert.equal(patch.charge_model, 'flat');
    assert.equal(typeof patch.subtotal_cents, 'number');
    assert.equal(typeof patch.service_fee_cents, 'number');
    assert.equal(typeof patch.convenience_fee_cents, 'number');
    assert.equal(typeof patch.protection_fee_cents, 'number');
    assert.equal(typeof patch.demand_fee_cents, 'number');
    assert.equal(typeof patch.fee_total_cents, 'number');
    assert.equal(typeof patch.customer_total_cents, 'number');
    assert.equal(typeof patch.pro_earnings_cents, 'number');
    assert.equal(typeof patch.platform_revenue_cents, 'number');

    const row = {
      id: 'snap-test',
      pricing_version: patch.pricing_version as string,
      subtotal_cents: patch.subtotal_cents as number,
      service_fee_cents: patch.service_fee_cents as number,
      convenience_fee_cents: patch.convenience_fee_cents as number,
      protection_fee_cents: patch.protection_fee_cents as number,
      demand_fee_cents: patch.demand_fee_cents as number,
      fee_total_cents: patch.fee_total_cents as number,
      customer_total_cents: patch.customer_total_cents as number,
    };
    assert.ok(coerceCompleteFrozenPricingRow(row));
  });
});

describe('logIfBookingPricingSnapshotPatchIncomplete', () => {
  it('does not warn when patch is complete', () => {
    const mf = computeMarketplaceFees(5000, 'tiered_v1', 'medium');
    const patch = buildCanonicalBookingPricingSnapshotPatchFromMarketplaceFees({
      marketplaceFees: mf,
      chargeModel: 'flat',
      feeProfile: 'light',
      proDepositPercents: null,
      flatFeeCents: 5000,
      hourlyRateCents: null,
      baseFeeCents: null,
      includedHours: null,
      actualHoursEstimate: 1,
      overageHourlyRateCents: null,
      minimumJobCents: null,
      demandMultiplier: null,
    });
    logIfBookingPricingSnapshotPatchIncomplete('test', 'b1', patch);
  });
});
