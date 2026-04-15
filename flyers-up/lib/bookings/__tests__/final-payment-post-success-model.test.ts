import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getBookingWorkflowStatusAfterFinalPayment,
  resolvePayoutLifecyclePatchAfterFinalPayment,
} from '@/lib/bookings/final-payment-post-success-model';

test('workflow status: standard path → awaiting_customer_confirmation (confirmation UX still pending)', () => {
  assert.equal(
    getBookingWorkflowStatusAfterFinalPayment('awaiting_remaining_payment'),
    'awaiting_customer_confirmation'
  );
});

test('workflow status: non-standard prior → paid (no ambiguous fully_paid)', () => {
  assert.equal(getBookingWorkflowStatusAfterFinalPayment('deposit_paid'), 'paid');
  assert.equal(getBookingWorkflowStatusAfterFinalPayment('in_progress'), 'paid');
});

test('payout lifecycle patch: eligible → payout_ready (money + payout truth)', () => {
  assert.deepEqual(resolvePayoutLifecyclePatchAfterFinalPayment({ eligible: true, holdReason: 'none' }), {
    payment_lifecycle_status: 'payout_ready',
    payout_blocked: false,
    payout_hold_reason: 'none',
  });
});

test('payout lifecycle patch: ineligible → payout_on_hold with reason', () => {
  assert.deepEqual(
    resolvePayoutLifecyclePatchAfterFinalPayment({
      eligible: false,
      holdReason: 'insufficient_completion_evidence',
    }),
    {
      payment_lifecycle_status: 'payout_on_hold',
      payout_blocked: true,
      payout_hold_reason: 'insufficient_completion_evidence',
    }
  );
});
