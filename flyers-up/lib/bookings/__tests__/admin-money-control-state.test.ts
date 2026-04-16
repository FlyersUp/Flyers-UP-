/**
 * Run: npx tsx --test lib/bookings/__tests__/admin-money-control-state.test.ts
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bookingNeedsRemediationAttention,
  buildAdminMoneyControlState,
} from '@/lib/bookings/admin-money-control-state';

test('partial refund failure surfaces in admin refund pipeline + recommendation', () => {
  const state = buildAdminMoneyControlState({
    booking: {
      payment_status: 'PAID',
      final_payment_status: 'PAID',
      payment_lifecycle_status: 'partially_refunded',
      paid_deposit_at: '2026-01-01',
      paid_remaining_at: '2026-01-02',
      payout_released: false,
      payout_status: 'pending',
      requires_admin_review: true,
      refund_status: 'partially_failed',
      refund_after_payout: false,
      pro_clawback_remediation_status: 'none',
      stripe_outbound_recovery_status: 'not_applicable',
    },
    latestPaymentEvent: {
      event_type: 'refund_batch_partial_failure',
      created_at: '2026-01-03T00:00:00.000Z',
      phase: 'refund',
      status: 'stripe_refund_partial_failure',
    },
    stuckPayout: null,
  });
  assert.equal(state.refundPipeline, 'partially_failed');
  assert.ok(state.recommendedNextAction.toLowerCase().includes('retry'));
  assert.equal(state.attention.primary, 'refund_partial_failure');
  assert.equal(state.attention.headline, 'Needs attention');
});

test('remediation-needed booking is detected for helpers', () => {
  assert.equal(
    bookingNeedsRemediationAttention({
      pro_clawback_remediation_status: 'open',
      refund_after_payout: true,
      requires_admin_review: true,
    }),
    true
  );
  assert.equal(
    bookingNeedsRemediationAttention({
      pro_clawback_remediation_status: 'resolved',
      refund_after_payout: true,
      requires_admin_review: false,
    }),
    false
  );
});

test('stuck payout appears in control state', () => {
  const state = buildAdminMoneyControlState({
    booking: {
      payment_status: 'PAID',
      payment_lifecycle_status: 'payout_ready',
      final_payment_status: 'PAID',
      paid_remaining_at: '2026-01-01',
      payout_released: false,
      requires_admin_review: false,
      refund_status: 'none',
      refund_after_payout: false,
      pro_clawback_remediation_status: 'none',
      stripe_outbound_recovery_status: 'not_applicable',
    },
    latestPaymentEvent: null,
    stuckPayout: {
      bookingId: 'b1',
      status: 'paid',
      paymentLifecycleStatus: 'payout_ready',
      completedAt: null,
      customerReviewDeadlineAt: null,
      reason: 'Eligible for automatic Connect payout…',
    },
  });
  assert.ok(state.stuckPayout);
  assert.ok(state.recommendedNextAction.toLowerCase().includes('stuck'));
  assert.equal(state.attention.primary, 'stuck_silent_miss');
  assert.equal(state.attention.headline, 'Stuck payout');
});

test('manual review without stuck payout surfaces Needs attention, not stuck headline in attention', () => {
  const state = buildAdminMoneyControlState({
    booking: {
      payment_status: 'PAID',
      payment_lifecycle_status: 'payout_ready',
      final_payment_status: 'PAID',
      paid_remaining_at: '2026-01-01',
      payout_released: false,
      payout_blocked: false,
      payout_hold_reason: null,
      requires_admin_review: true,
      refund_status: 'none',
      refund_after_payout: false,
      pro_clawback_remediation_status: 'none',
      stripe_outbound_recovery_status: 'not_applicable',
    },
    latestPaymentEvent: null,
    stuckPayout: null,
  });
  assert.equal(state.stuckPayout, null);
  assert.equal(state.attention.primary, 'manual_review_required');
  assert.equal(state.attention.headline, 'Needs attention');
});

test('healthy booking has no attention headline category', () => {
  const state = buildAdminMoneyControlState({
    booking: {
      payment_status: 'PAID',
      payment_lifecycle_status: 'deposit_paid',
      final_payment_status: 'UNPAID',
      payout_released: false,
      payout_blocked: false,
      payout_hold_reason: null,
      requires_admin_review: false,
      refund_status: 'none',
      refund_after_payout: false,
      pro_clawback_remediation_status: 'none',
      stripe_outbound_recovery_status: 'not_applicable',
    },
    latestPaymentEvent: null,
    stuckPayout: null,
  });
  assert.equal(state.attention.primary, 'no_attention_needed');
});
