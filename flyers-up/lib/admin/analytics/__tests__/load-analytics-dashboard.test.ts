import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildFunnelSteps, computePctChange, funnelDropFromPrior } from '../analytics-helpers';
import {
  assertAnalyticsDashboardShape,
  attentionSeverityFromTier,
  createEmptyAnalyticsDashboard,
} from '../load-analytics-dashboard';

describe('admin analytics dashboard', () => {
  it('empty dashboard has stable shape and validates', () => {
    const d = createEmptyAnalyticsDashboard('30d');
    assertAnalyticsDashboardShape(d);
    assert.equal(d.funnel.length, 6);
    assert.equal(d.bookingsOverTime.length, 0);
    assert.equal(d.revenueOverTime.length, 0);
    assert.ok(Array.isArray(d.attentionFeed));
    assert.equal(d.kpis.gmvCents.changePct, null);
  });

  it('funnel handles zeros without NaN', () => {
    const f = buildFunnelSteps({
      visits: 0,
      signupStart: 0,
      signupDone: 0,
      bookingStart: 0,
      depositPaid: 0,
      jobDone: 0,
    });
    assert.equal(f.length, 6);
    assert.ok(f.every((s) => Number.isFinite(s.count)));
    assert.equal(f[0].dropFromPriorPct, null);
  });

  it('computePctChange edge cases', () => {
    assert.equal(computePctChange(110, 100), 10);
    assert.equal(computePctChange(100, 0), null);
    assert.equal(computePctChange(0, 100), -100);
  });

  it('funnelDropFromPrior', () => {
    assert.equal(funnelDropFromPrior(100, 50), -50);
    assert.equal(funnelDropFromPrior(0, 10), null);
  });

  it('attentionSeverityFromTier', () => {
    assert.equal(attentionSeverityFromTier('high'), 'HIGH');
    assert.equal(attentionSeverityFromTier('medium'), 'MEDIUM');
    assert.equal(attentionSeverityFromTier('low'), 'LOW');
  });
});
