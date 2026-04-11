/**
 * Run: npx tsx --test lib/stripe/__tests__/verify-final-payment-intent-derive.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveRequiresLiveFinalPaymentIntentRead } from '../verify-final-payment-intent-status';

test('deriveRequiresLiveFinalPaymentIntentRead is true for post_review + final PI', () => {
  assert.equal(
    deriveRequiresLiveFinalPaymentIntentRead(
      {
        status: 'awaiting_remaining_payment',
        paymentStatus: 'PAID',
        paidDepositAt: '2026-01-01T00:00:00Z',
        paymentLifecycleStatus: 'final_pending',
        completedAt: '2026-01-01T10:00:00Z',
        customerReviewDeadlineAt: '2026-01-02T10:00:00Z',
        amountRemaining: 2523,
        finalPaymentIntentId: 'pi_test',
      },
      Date.parse('2026-01-03T12:00:00Z')
    ),
    true
  );
});

test('deriveRequiresLiveFinalPaymentIntentRead is false without PI id', () => {
  assert.equal(
    deriveRequiresLiveFinalPaymentIntentRead(
      {
        status: 'awaiting_remaining_payment',
        paymentStatus: 'PAID',
        paidDepositAt: '2026-01-01T00:00:00Z',
        paymentLifecycleStatus: 'final_pending',
        completedAt: '2026-01-01T10:00:00Z',
        customerReviewDeadlineAt: '2026-01-02T10:00:00Z',
        amountRemaining: 2523,
      },
      Date.parse('2026-01-03T12:00:00Z')
    ),
    false
  );
});
