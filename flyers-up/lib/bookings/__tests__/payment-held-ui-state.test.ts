import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  buildPaymentHeldUiState,
  buildPaymentHeldUiStateFromBooking,
  resolvePaymentHoldReasonAndContext,
  shouldShowPaymentHeldUi,
} from '../payment-held-ui-state';

describe('payment-held-ui-state', () => {
  it('shouldShowPaymentHeldUi is true for payout_on_hold when not released', () => {
    assert.strictEqual(
      shouldShowPaymentHeldUi({
        payoutReleased: false,
        paymentLifecycleStatus: 'payout_on_hold',
        requiresAdminReview: false,
      }),
      true
    );
  });

  it('shouldShowPaymentHeldUi is false when payout released', () => {
    assert.strictEqual(
      shouldShowPaymentHeldUi({
        payoutReleased: true,
        paymentLifecycleStatus: 'payout_on_hold',
        requiresAdminReview: true,
      }),
      false
    );
  });

  it('shouldShowPaymentHeldUi is true when requires_admin_review and not released', () => {
    assert.strictEqual(
      shouldShowPaymentHeldUi({
        payoutReleased: false,
        paymentLifecycleStatus: 'payout_ready',
        requiresAdminReview: true,
      }),
      true
    );
  });

  it('resolvePaymentHoldReasonAndContext prefers payout_hold_reason when set', () => {
    const r = resolvePaymentHoldReasonAndContext({
      payoutHoldReason: 'dispute_open',
      suspiciousCompletion: true,
    });
    assert.strictEqual(r.reason, 'dispute_open');
  });

  it('resolvePaymentHoldReasonAndContext uses admin_hold when flagged', () => {
    const r = resolvePaymentHoldReasonAndContext({
      payoutHoldReason: 'none',
      adminHold: true,
    });
    assert.strictEqual(r.reason, 'admin_hold');
  });

  it('resolvePaymentHoldReasonAndContext maps suspicious completion to fraud_review', () => {
    const r = resolvePaymentHoldReasonAndContext({
      payoutHoldReason: 'none',
      suspiciousCompletion: true,
      suspiciousCompletionReason: 'too_fast',
    });
    assert.strictEqual(r.reason, 'fraud_review');
    assert.strictEqual(r.context.suspiciousCompletion, true);
  });

  it('buildPaymentHeldUiState (pro) returns four-step timeline with held current', () => {
    const s = buildPaymentHeldUiState({
      view: 'pro',
      holdReason: 'fraud_review',
      context: { suspiciousCompletion: true, suspiciousCompletionReason: 'too_fast' },
    });
    assert.strictEqual(s.variant, 'pro');
    assert.strictEqual(s.badge, 'Under review');
    assert.strictEqual(s.timeline.length, 4);
    assert.strictEqual(s.timeline[0].state, 'complete');
    assert.strictEqual(s.timeline[1].state, 'complete');
    assert.strictEqual(s.timeline[2].state, 'current');
    assert.strictEqual(s.timeline[2].key, 'held');
    assert.strictEqual(s.timeline[3].state, 'upcoming');
    assert.strictEqual(s.explanationCode, 'payout_flagged_suspicious_completion');
    assert.ok(s.whyCallout?.headline.includes('Why'));
  });

  it('buildPaymentHeldUiState (customer) uses calm titles and customer_message in panel', () => {
    const s = buildPaymentHeldUiState({
      view: 'customer',
      holdReason: 'fraud_review',
      context: {},
    });
    assert.strictEqual(s.title, 'Payment under review');
    assert.strictEqual(s.subtitle, 'Standard security check');
    assert.ok(s.infoPanelBody.length > 20);
  });

  it('buildPaymentHeldUiStateFromBooking returns null when not held', () => {
    assert.strictEqual(
      buildPaymentHeldUiStateFromBooking('pro', {
        payoutReleased: false,
        paymentLifecycleStatus: 'final_paid',
        requiresAdminReview: false,
      }),
      null
    );
  });

  it('buildPaymentHeldUiStateFromBooking returns pro state when payout_on_hold', () => {
    const s = buildPaymentHeldUiStateFromBooking('pro', {
      payoutReleased: false,
      paymentLifecycleStatus: 'payout_on_hold',
      payoutHoldReason: 'fraud_review',
      suspiciousCompletion: true,
    });
    assert.ok(s);
    assert.strictEqual(s!.variant, 'pro');
  });
});
