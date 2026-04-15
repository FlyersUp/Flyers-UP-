import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  finalPaymentAutoRetryCountCeiling,
  hoursBeforeNextFinalPaymentCronAttempt,
  mapStripeFailureCodeToFinalPaymentRetryReason,
} from '@/lib/bookings/final-payment-retry-reason';

describe('mapStripeFailureCodeToFinalPaymentRetryReason', () => {
  it('maps known Stripe codes', () => {
    assert.equal(mapStripeFailureCodeToFinalPaymentRetryReason('insufficient_funds'), 'insufficient_funds');
    assert.equal(mapStripeFailureCodeToFinalPaymentRetryReason('card_declined'), 'card_declined');
    assert.equal(
      mapStripeFailureCodeToFinalPaymentRetryReason('card_declined', 'insufficient_funds'),
      'insufficient_funds'
    );
    assert.equal(
      mapStripeFailureCodeToFinalPaymentRetryReason('authentication_required'),
      'requires_action'
    );
    assert.equal(mapStripeFailureCodeToFinalPaymentRetryReason('requires_action'), 'requires_action');
  });

  it('treats empty and unrecognized as unknown', () => {
    assert.equal(mapStripeFailureCodeToFinalPaymentRetryReason(''), 'unknown');
    assert.equal(mapStripeFailureCodeToFinalPaymentRetryReason('processing_error'), 'unknown');
    assert.equal(mapStripeFailureCodeToFinalPaymentRetryReason(undefined), 'unknown');
  });
});

describe('finalPaymentAutoRetryCountCeiling', () => {
  it('allows one auto retry for card_declined', () => {
    assert.equal(finalPaymentAutoRetryCountCeiling('card_declined'), 2);
  });

  it('keeps legacy window for other reasons', () => {
    assert.equal(finalPaymentAutoRetryCountCeiling('insufficient_funds'), 3);
    assert.equal(finalPaymentAutoRetryCountCeiling('unknown'), 3);
    assert.equal(finalPaymentAutoRetryCountCeiling(null), 3);
    assert.equal(finalPaymentAutoRetryCountCeiling(undefined), 3);
  });
});

describe('hoursBeforeNextFinalPaymentCronAttempt', () => {
  it('uses 12h after first failure then 48h', () => {
    assert.equal(hoursBeforeNextFinalPaymentCronAttempt(0), 12);
    assert.equal(hoursBeforeNextFinalPaymentCronAttempt(1), 12);
    assert.equal(hoursBeforeNextFinalPaymentCronAttempt(2), 48);
    assert.equal(hoursBeforeNextFinalPaymentCronAttempt(3), 48);
  });
});
