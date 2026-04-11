/**
 * Run: npx tsx --test lib/bookings/__tests__/pro-payout-display.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  computeProPayoutTimelineStatus,
  computeProYouGotPaidVisible,
} from '../pro-payout-display';

const baseStripe = {
  payoutTransferStripeStatus: null as string | null,
  payoutTransferStripeLiveChecked: false,
};

const customerSettled = {
  paidRemainingAt: '2020-01-01T12:00:00Z' as string | null,
  finalPaymentStatus: 'PAID' as string | null,
};

describe('computeProYouGotPaidVisible', () => {
  it('is false without live Stripe paid', () => {
    assert.strictEqual(
      computeProYouGotPaidVisible({
        proEarningsCents: 1000,
        ...customerSettled,
        payoutReleased: true,
        payoutTransferId: 'tr_1',
        ...baseStripe,
        payoutTransferStripeLiveChecked: true,
        payoutTransferStripeStatus: 'pending',
      }),
      false
    );
  });

  it('is true when released, id present, live paid', () => {
    assert.strictEqual(
      computeProYouGotPaidVisible({
        proEarningsCents: 1000,
        ...customerSettled,
        payoutReleased: true,
        payoutTransferId: 'tr_1',
        payoutTransferStripeLiveChecked: true,
        payoutTransferStripeStatus: 'paid',
      }),
      true
    );
  });

  it('is true with legacy server-only transfer id', () => {
    assert.strictEqual(
      computeProYouGotPaidVisible({
        proEarningsCents: 500,
        ...customerSettled,
        payoutReleased: true,
        payoutTransferId: null,
        payoutTransferStripeLiveChecked: true,
        payoutTransferStripeStatus: 'paid',
      }),
      true
    );
  });
});

describe('computeProPayoutTimelineStatus', () => {
  it('does not return paid before payout released even if DB says succeeded', () => {
    assert.strictEqual(
      computeProPayoutTimelineStatus({
        customerPaid: true,
        ...customerSettled,
        payoutReleased: false,
        payoutTransferId: null,
        dbPayoutStatus: 'succeeded',
        ...baseStripe,
      }),
      'pending'
    );
  });

  it('returns paid only with live Stripe paid', () => {
    assert.strictEqual(
      computeProPayoutTimelineStatus({
        customerPaid: true,
        ...customerSettled,
        payoutReleased: true,
        payoutTransferId: 'tr_1',
        dbPayoutStatus: 'succeeded',
        payoutTransferStripeLiveChecked: true,
        payoutTransferStripeStatus: 'paid',
      }),
      'paid'
    );
  });

  it('returns pending when released but Stripe still pending', () => {
    assert.strictEqual(
      computeProPayoutTimelineStatus({
        customerPaid: true,
        ...customerSettled,
        payoutReleased: true,
        payoutTransferId: 'tr_1',
        dbPayoutStatus: 'succeeded',
        payoutTransferStripeLiveChecked: true,
        payoutTransferStripeStatus: 'pending',
      }),
      'pending'
    );
  });
});
