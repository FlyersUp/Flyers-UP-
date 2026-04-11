/**
 * Run: npx tsx --test lib/bookings/__tests__/pro-payout-status-message.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getProAutomatedPayoutStatusMessage } from '../pro-payout-status-message';

describe('getProAutomatedPayoutStatusMessage', () => {
  it('returns null without paid remaining', () => {
    assert.strictEqual(
      getProAutomatedPayoutStatusMessage({
        completedAt: '2025-01-01T12:00:00Z',
        paidRemainingAt: null,
        payoutReleased: false,
        payoutStatus: null,
      }),
      null
    );
  });

  it('shows review window when recently completed', () => {
    const recent = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const msg = getProAutomatedPayoutStatusMessage({
      completedAt: recent,
      paidRemainingAt: '2025-01-01T12:00:00Z',
      payoutReleased: false,
      payoutStatus: null,
    });
    assert.strictEqual(msg, 'Payment pending review window');
  });

  it('shows processing when released but Stripe not checked yet', () => {
    const msg = getProAutomatedPayoutStatusMessage({
      completedAt: '2020-01-01T12:00:00Z',
      paidRemainingAt: '2020-01-01T13:00:00Z',
      payoutReleased: true,
      payoutStatus: 'succeeded',
      payoutTransferStripeLiveChecked: false,
    });
    assert.strictEqual(msg, 'Payment released — your payout is processing');
  });

  it('shows payout sent only when live Stripe transfer is paid', () => {
    const msg = getProAutomatedPayoutStatusMessage({
      completedAt: '2020-01-01T12:00:00Z',
      paidRemainingAt: '2020-01-01T13:00:00Z',
      payoutReleased: true,
      payoutStatus: 'succeeded',
      payoutTransferStripeLiveChecked: true,
      payoutTransferStripeStatus: 'paid',
    });
    assert.strictEqual(msg, 'Payout sent');
  });

  it('shows processing when live checked but transfer still pending', () => {
    const msg = getProAutomatedPayoutStatusMessage({
      completedAt: '2020-01-01T12:00:00Z',
      paidRemainingAt: '2020-01-01T13:00:00Z',
      payoutReleased: true,
      payoutStatus: 'succeeded',
      payoutTransferStripeLiveChecked: true,
      payoutTransferStripeStatus: 'pending',
    });
    assert.strictEqual(msg, 'Payment released — your payout is processing');
  });
});
