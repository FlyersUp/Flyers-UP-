import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  customerReviewWindowPassedForStuck,
  evaluateStuckPayoutFromPrefilteredRow,
  isFinalPaymentSettledForStuckRow,
  passesStuckAgeGate,
} from '@/lib/bookings/stuck-payout-detector';

const baseRow = {
  id: 'b1',
  status: 'awaiting_customer_confirmation',
  payment_lifecycle_status: 'payout_ready',
  final_payment_status: 'PAID',
  completed_at: '2026-01-01T10:00:00.000Z',
  customer_review_deadline_at: '2026-01-02T10:00:00.000Z',
  paid_remaining_at: '2026-01-02T12:00:00.000Z',
  payout_eligible_at: '2026-01-02T12:05:00.000Z',
  payout_released: false,
  requires_admin_review: false,
  refund_status: null,
  dispute_status: 'none',
  dispute_open: false,
  admin_hold: false,
  payout_blocked: false,
};

test('eligible + review passed + age past threshold → stuck', () => {
  const nowMs = Date.parse('2026-01-03T00:00:00.000Z');
  const thresholdMs = 2 * 60 * 60 * 1000;
  const stuck = evaluateStuckPayoutFromPrefilteredRow({
    row: baseRow,
    snapEligible: true,
    nowMs,
    thresholdMs,
  });
  assert.ok(stuck);
  assert.equal(stuck?.bookingId, 'b1');
  assert.equal(stuck?.paymentLifecycleStatus, 'payout_ready');
  assert.match(stuck?.reason ?? '', /Eligible for automatic Connect payout/);
});

test('cron-eligible but snapshot not eligible → not stuck (e.g. pro hold, photos)', () => {
  const nowMs = Date.parse('2026-01-03T00:00:00.000Z');
  const stuck = evaluateStuckPayoutFromPrefilteredRow({
    row: baseRow,
    snapEligible: false,
    nowMs,
    thresholdMs: 1000,
  });
  assert.equal(stuck, null);
});

test('payout_on_hold lifecycle → not stuck even if snapEligible true (defense in depth)', () => {
  const nowMs = Date.parse('2026-01-03T00:00:00.000Z');
  const stuck = evaluateStuckPayoutFromPrefilteredRow({
    row: { ...baseRow, payment_lifecycle_status: 'payout_on_hold' },
    snapEligible: true,
    nowMs,
    thresholdMs: 1000,
  });
  assert.equal(stuck, null);
});

test('refund succeeded → not stuck', () => {
  const nowMs = Date.parse('2026-01-03T00:00:00.000Z');
  const stuck = evaluateStuckPayoutFromPrefilteredRow({
    row: { ...baseRow, refund_status: 'succeeded' },
    snapEligible: true,
    nowMs,
    thresholdMs: 1000,
  });
  assert.equal(stuck, null);
});

test('customer review deadline still in future → not stuck', () => {
  const nowMs = Date.parse('2026-01-02T08:00:00.000Z');
  const stuck = evaluateStuckPayoutFromPrefilteredRow({
    row: baseRow,
    snapEligible: true,
    nowMs,
    thresholdMs: 1000,
  });
  assert.equal(stuck, null);
});

test('isFinalPaymentSettledForStuckRow: payout_ready and legacy PAID', () => {
  assert.equal(isFinalPaymentSettledForStuckRow({ payment_lifecycle_status: 'payout_ready' }), true);
  assert.equal(
    isFinalPaymentSettledForStuckRow({ payment_lifecycle_status: null, final_payment_status: 'PAID' }),
    true
  );
  assert.equal(isFinalPaymentSettledForStuckRow({ payment_lifecycle_status: 'final_pending' }), false);
});

test('customerReviewWindowPassedForStuck: null deadline → passed', () => {
  assert.equal(customerReviewWindowPassedForStuck(null, Date.now()), true);
});

test('passesStuckAgeGate uses payout_eligible_at over paid_remaining_at', () => {
  const row = {
    payout_eligible_at: '2026-01-01T00:00:00.000Z',
    paid_remaining_at: '2026-01-10T00:00:00.000Z',
  };
  const eligibleAt = Date.parse('2026-01-01T00:00:00.000Z');
  assert.equal(passesStuckAgeGate(row, eligibleAt + 7 * 60 * 60 * 1000, 6 * 60 * 60 * 1000), true);
  assert.equal(passesStuckAgeGate(row, eligibleAt + 5 * 60 * 60 * 1000, 6 * 60 * 60 * 1000), false);
});
