/**
 * Run: npx tsx --test lib/bookings/__tests__/payment-lifecycle-types-hold.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertPayoutHoldReason } from '../payment-lifecycle-types';

describe('assertPayoutHoldReason', () => {
  it('accepts admin_review_required', () => {
    assert.strictEqual(assertPayoutHoldReason('admin_review_required'), 'admin_review_required');
  });
});
