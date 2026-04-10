import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isStripeFinalPaymentIntentInFlightStatus } from '../final-payment-intent-stripe-gate';

test('in-flight statuses', () => {
  assert.equal(isStripeFinalPaymentIntentInFlightStatus('processing'), true);
  assert.equal(isStripeFinalPaymentIntentInFlightStatus('REQUIRES_ACTION'), true);
  assert.equal(isStripeFinalPaymentIntentInFlightStatus('requires_capture'), true);
});

test('not in-flight', () => {
  assert.equal(isStripeFinalPaymentIntentInFlightStatus('succeeded'), false);
  assert.equal(isStripeFinalPaymentIntentInFlightStatus('requires_payment_method'), false);
  assert.equal(isStripeFinalPaymentIntentInFlightStatus(null), false);
});
