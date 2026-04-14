/**
 * Run: npx tsx --test lib/analytics/__tests__/revenue-sim.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NYC_SCENARIOS, simulateAllNycScenarios, simulateRevenue } from '@/lib/analytics/revenue-sim';

describe('simulateRevenue', () => {
  it('computes GMV, monthly revenue, and annual revenue', () => {
    const out = simulateRevenue({
      jobsPerMonth: 100,
      avgSubtotalCents: 10_000,
      avgFeeRate: 0.2,
    });
    assert.equal(out.monthlyGMV, 1_000_000);
    assert.equal(out.monthlyRevenue, 200_000);
    assert.equal(out.annualRevenue, 2_400_000);
  });

  it('clamps negative inputs to zero-ish totals', () => {
    const out = simulateRevenue({
      jobsPerMonth: -5,
      avgSubtotalCents: 1000,
      avgFeeRate: 0.18,
    });
    assert.equal(out.monthlyGMV, 0);
    assert.equal(out.monthlyRevenue, 0);
  });
});

describe('NYC_SCENARIOS + simulateAllNycScenarios', () => {
  it('returns one row per preset with merged outputs', () => {
    assert.equal(NYC_SCENARIOS.length, 3);
    const rows = simulateAllNycScenarios();
    assert.equal(rows.length, 3);
    const base = rows.find((r) => r.name === 'Base');
    assert.ok(base);
    assert.equal(base!.monthlyGMV, 1000 * 9500);
    assert.equal(base!.monthlyRevenue, base!.monthlyGMV * 0.2);
    assert.equal(base!.annualRevenue, base!.monthlyRevenue * 12);
  });
});
