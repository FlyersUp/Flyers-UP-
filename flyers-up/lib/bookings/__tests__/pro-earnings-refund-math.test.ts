/**
 * Run: npx tsx --test lib/bookings/__tests__/pro-earnings-refund-math.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  attributedRefundCents,
  netProEarningDollars,
  resolveProEarningListRefundUi,
} from '../pro-earnings-refund-math';

describe('pro-earnings-refund-math', () => {
  it('caps refund to gross service cents', () => {
    assert.strictEqual(attributedRefundCents(15, 2000), 1500);
    assert.strictEqual(netProEarningDollars(15, 2000), 0);
  });

  it('partial refund reduces net', () => {
    assert.strictEqual(netProEarningDollars(15, 300), 12);
  });

  it('full refund before payout: Refunded label', () => {
    const r = resolveProEarningListRefundUi({
      grossAmountDollars: 15,
      bookingRefundedTotalCents: 1500,
      paymentLifecycleStatus: 'refunded',
      payoutReleased: false,
    });
    assert.strictEqual(r.statusLabel, 'Refunded');
    assert.strictEqual(r.ui, 'full');
  });

  it('full refund after payout: customer-facing label + detail', () => {
    const r = resolveProEarningListRefundUi({
      grossAmountDollars: 15,
      bookingRefundedTotalCents: 1500,
      paymentLifecycleStatus: 'refunded',
      payoutReleased: true,
    });
    assert.strictEqual(r.statusLabel, 'Refunded to customer');
    assert.ok(r.detail && r.detail.includes('adjustment'));
  });

  it('duplicate webhook would not change math (idempotent totals assumed)', () => {
    assert.strictEqual(netProEarningDollars(15, 1500), 0);
    assert.strictEqual(netProEarningDollars(15, 1500), 0);
  });
});
