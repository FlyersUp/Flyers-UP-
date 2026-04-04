import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeProDashboardMetrics,
  hoursWorkedForCompletedBooking,
  type BookingMetricRow,
} from '@/lib/pro-dashboard/metrics';

describe('hoursWorkedForCompletedBooking', () => {
  it('uses completed_at - started_at when valid', () => {
    const h = hoursWorkedForCompletedBooking({
      started_at: '2025-01-01T10:00:00.000Z',
      completed_at: '2025-01-01T12:00:00.000Z',
      duration_hours: 0.5,
    });
    assert.equal(h, 2);
  });

  it('falls back to duration_hours when timestamps missing', () => {
    const h = hoursWorkedForCompletedBooking({
      started_at: null,
      completed_at: null,
      duration_hours: 3,
    });
    assert.equal(h, 3);
  });

  it('defaults to 1 hour', () => {
    const h = hoursWorkedForCompletedBooking({
      started_at: null,
      completed_at: null,
      duration_hours: null,
    });
    assert.equal(h, 1);
  });
});

describe('computeProDashboardMetrics', () => {
  const base = (over: Partial<BookingMetricRow>): BookingMetricRow => ({
    subtotal_cents: 5000,
    completed_at: '2025-01-01T11:00:00.000Z',
    started_at: '2025-01-01T10:00:00.000Z',
    created_at: '2025-01-01T09:00:00.000Z',
    suggested_price_cents: 6000,
    was_below_suggestion: true,
    status: 'completed',
    duration_hours: 1,
    ...over,
  });

  it('sums earnings and counts completed jobs', () => {
    const rows: BookingMetricRow[] = [
      base({ subtotal_cents: 10000 }),
      base({ subtotal_cents: 5000, was_below_suggestion: false }),
    ];
    const m = computeProDashboardMetrics(rows);
    assert.equal(m.totalJobsCompleted, 2);
    assert.equal(m.totalEarningsCents, 15000);
    assert.equal(m.avgJobValueCents, 7500);
  });

  it('computes earnings per hour from elapsed time', () => {
    const rows: BookingMetricRow[] = [
      base({
        subtotal_cents: 6000,
        started_at: '2025-01-01T10:00:00.000Z',
        completed_at: '2025-01-01T11:00:00.000Z',
      }),
    ];
    const m = computeProDashboardMetrics(rows);
    assert.equal(m.earningsPerHourCents, 6000);
  });

  it('win rate uses completed vs lost outcomes only', () => {
    const rows: BookingMetricRow[] = [
      base({ status: 'completed' }),
      base({ status: 'cancelled_by_customer', subtotal_cents: null }),
      base({ status: 'requested' }),
    ];
    const m = computeProDashboardMetrics(rows);
    assert.equal(m.winRate, 0.5);
  });

  it('below suggestion uses was_below_suggestion when present', () => {
    const rows: BookingMetricRow[] = [
      base({ was_below_suggestion: true }),
      base({ was_below_suggestion: false }),
    ];
    const m = computeProDashboardMetrics(rows);
    assert.equal(m.belowSuggestionRate, 0.5);
  });

  it('falls back to cents compare when flag absent', () => {
    const rows: BookingMetricRow[] = [
      {
        subtotal_cents: 4000,
        suggested_price_cents: 5000,
        was_below_suggestion: null,
        status: 'deposit_paid',
        completed_at: null,
        started_at: null,
        created_at: 'x',
        duration_hours: null,
      },
      {
        subtotal_cents: 6000,
        suggested_price_cents: 5000,
        was_below_suggestion: null,
        status: 'accepted',
        completed_at: null,
        started_at: null,
        created_at: 'y',
        duration_hours: null,
      },
    ];
    const m = computeProDashboardMetrics(rows);
    assert.equal(m.belowSuggestionRate, 0.5);
  });
});
