/**
 * Run: npx tsx --test lib/bookings/__tests__/payout-release-cron-selection.test.ts
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  payoutReleaseCronShouldAttemptAfterImmediateGrace,
  PAYOUT_RELEASE_CRON_IMMEDIATE_GRACE_SEC,
} from '@/lib/bookings/payout-release-cron-selection';

describe('payoutReleaseCronShouldAttemptAfterImmediateGrace', () => {
  it('allows legacy null lifecycle + final PAID', () => {
    assert.equal(
      payoutReleaseCronShouldAttemptAfterImmediateGrace(
        { payment_lifecycle_status: null, final_payment_status: 'PAID' },
        Date.now()
      ),
      true
    );
  });

  it('defers when payout_eligible_at is within grace window', () => {
    const now = Date.parse('2026-06-01T12:00:00Z');
    const fresh = new Date(now - (PAYOUT_RELEASE_CRON_IMMEDIATE_GRACE_SEC - 10) * 1000).toISOString();
    assert.equal(
      payoutReleaseCronShouldAttemptAfterImmediateGrace(
        { payment_lifecycle_status: 'payout_ready', payout_eligible_at: fresh, final_payment_status: 'PAID' },
        now
      ),
      false
    );
  });

  it('allows when payout_eligible_at is older than grace', () => {
    const now = Date.parse('2026-06-01T12:00:00Z');
    const old = new Date(now - (PAYOUT_RELEASE_CRON_IMMEDIATE_GRACE_SEC + 5) * 1000).toISOString();
    assert.equal(
      payoutReleaseCronShouldAttemptAfterImmediateGrace(
        { payment_lifecycle_status: 'payout_ready', payout_eligible_at: old, final_payment_status: 'PAID' },
        now
      ),
      true
    );
  });

  it('allows when payout_eligible_at is missing', () => {
    assert.equal(
      payoutReleaseCronShouldAttemptAfterImmediateGrace(
        { payment_lifecycle_status: 'payout_ready', final_payment_status: 'PAID' },
        Date.now()
      ),
      true
    );
  });
});
