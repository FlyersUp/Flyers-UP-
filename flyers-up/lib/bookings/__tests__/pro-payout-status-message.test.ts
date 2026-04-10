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

  it('shows payout sent when released and succeeded', () => {
    const msg = getProAutomatedPayoutStatusMessage({
      completedAt: '2020-01-01T12:00:00Z',
      paidRemainingAt: '2020-01-01T13:00:00Z',
      payoutReleased: true,
      payoutStatus: 'succeeded',
    });
    assert.strictEqual(msg, 'Payout sent');
  });
});
