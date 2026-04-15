/**
 * Run: npx tsx --test lib/stripe/__tests__/refund-batch-outcome.test.ts
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { refundBatchIsComplete } from '@/lib/stripe/refund-batch-outcome';

test('refundBatchIsComplete: zero attempts always allows success path', () => {
  assert.equal(refundBatchIsComplete(0, 0), true);
  assert.equal(refundBatchIsComplete(0, 1), true);
});

test('refundBatchIsComplete: multi-PI full refund requires every attempt', () => {
  assert.equal(refundBatchIsComplete(2, 2), true);
  assert.equal(refundBatchIsComplete(2, 1), false);
  assert.equal(refundBatchIsComplete(2, 0), false);
  assert.equal(refundBatchIsComplete(1, 1), true);
  assert.equal(refundBatchIsComplete(1, 0), false);
});
