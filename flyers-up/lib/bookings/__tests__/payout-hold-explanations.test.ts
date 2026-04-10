/**
 * Run: npx tsx --test lib/bookings/__tests__/payout-hold-explanations.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getPayoutHoldExplanation } from '../payout-hold-explanations';

describe('getPayoutHoldExplanation', () => {
  it('maps fraud_review + suspicious too_fast to payout_flagged_suspicious_completion', () => {
    const e = getPayoutHoldExplanation('fraud_review', {
      suspiciousCompletion: true,
      suspiciousCompletionReason: 'too_fast',
    });
    assert.strictEqual(e.code, 'payout_flagged_suspicious_completion');
    assert.strictEqual(e.severity, 'info');
    assert.strictEqual(e.action_required, 'none');
    assert.strictEqual(e.can_admin_override, true);
    assert.ok(!e.pro_message.toLowerCase().includes('fraud'));
    assert.ok(!e.customer_message.toLowerCase().includes('fraud'));
  });

  it('maps insufficient_completion_evidence + missingAfterPhotos', () => {
    const e = getPayoutHoldExplanation('insufficient_completion_evidence', { missingAfterPhotos: true });
    assert.strictEqual(e.code, 'payout_flagged_missing_photos');
    assert.strictEqual(e.action_required, 'verify');
  });

  it('maps missing_final_payment', () => {
    const e = getPayoutHoldExplanation('missing_final_payment');
    assert.strictEqual(e.code, 'payout_flagged_final_payment_not_collected');
  });

  it('maps payout_blocked', () => {
    const e = getPayoutHoldExplanation('payout_blocked');
    assert.strictEqual(e.code, 'payout_flagged_payout_blocked');
  });

  it('maps dispute_open', () => {
    const e = getPayoutHoldExplanation('dispute_open');
    assert.strictEqual(e.code, 'payout_flagged_dispute_open');
  });

  it('maps missing_payment_method to stripe account not ready', () => {
    const e = getPayoutHoldExplanation('missing_payment_method');
    assert.strictEqual(e.code, 'payout_flagged_stripe_account_not_ready');
    assert.strictEqual(e.can_admin_override, false);
  });

  it('maps fraud_review without suspicious context to routine review', () => {
    const e = getPayoutHoldExplanation('fraud_review', {});
    assert.strictEqual(e.code, 'payout_held_routine_review');
  });

  it('maps waiting_post_completion_review', () => {
    const e = getPayoutHoldExplanation('waiting_post_completion_review');
    assert.strictEqual(e.code, 'payout_waiting_review_window');
    assert.strictEqual(e.can_admin_override, false);
  });
});
