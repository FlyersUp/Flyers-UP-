import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasExplicitNewLifecycleColumns,
  normalizeCustomerPaymentCard,
} from '@/lib/bookings/customer-payment-card-normalize';

const depositPaidBase = {
  status: 'awaiting_remaining_payment',
  paymentStatus: 'PAID',
  paidDepositAt: '2026-01-01T00:00:00Z',
  amountRemaining: 5000,
  completedAt: '2026-01-01T10:00:00Z',
};

test('legacy: post-review balance without lifecycle columns → pending_manual', () => {
  const n = normalizeCustomerPaymentCard(
    {
      ...depositPaidBase,
      paymentLifecycleStatus: null,
      customerReviewDeadlineAt: null,
      remainingDueAt: null,
    },
    Date.parse('2026-01-05T12:00:00Z')
  );
  assert.equal(n.kind, 'pending_manual');
  assert.equal(n.normalizeBranch, 'legacy:post_review_no_lifecycle_columns');
  assert.equal(n.raw.kind, 'post_review_auto_pending');
});

test('new booking: inside 24h review window → scheduled with countdown ISO', () => {
  const deadline = '2026-01-02T10:00:00Z';
  const n = normalizeCustomerPaymentCard(
    {
      ...depositPaidBase,
      paymentLifecycleStatus: 'final_pending',
      customerReviewDeadlineAt: deadline,
    },
    Date.parse('2026-01-01T20:00:00Z')
  );
  assert.equal(n.kind, 'scheduled');
  assert.equal(n.normalizeBranch, 'derive:review_window_auto');
  assert.equal(n.countdownDeadlineIso, deadline);
});

test('new booking: past window with lifecycle columns → processing (auto-charge path)', () => {
  const n = normalizeCustomerPaymentCard(
    {
      ...depositPaidBase,
      paymentLifecycleStatus: 'final_pending',
      customerReviewDeadlineAt: '2026-01-01T12:00:00Z',
    },
    Date.parse('2026-01-02T12:00:00Z')
  );
  assert.equal(n.kind, 'processing');
  assert.equal(n.normalizeBranch, 'derive:post_review_with_lifecycle_columns');
});

test('final payment failed → action_required', () => {
  const n = normalizeCustomerPaymentCard(
    {
      ...depositPaidBase,
      finalPaymentStatus: 'FAILED',
      paymentLifecycleStatus: 'payment_failed',
    },
    Date.parse('2026-01-02T12:00:00Z')
  );
  assert.equal(n.kind, 'action_required');
  assert.equal(n.normalizeBranch, 'derive:failed');
});

test('fully paid → paid', () => {
  const n = normalizeCustomerPaymentCard(
    {
      ...depositPaidBase,
      status: 'fully_paid',
      amountRemaining: 0,
      paidRemainingAt: '2026-01-02T08:00:00Z',
      paymentLifecycleStatus: 'final_paid',
    },
    Date.parse('2026-01-02T12:00:00Z')
  );
  assert.equal(n.kind, 'paid');
  assert.equal(n.normalizeBranch, 'derive:success');
});

test('final_processing → processing', () => {
  const n = normalizeCustomerPaymentCard(
    {
      ...depositPaidBase,
      paymentLifecycleStatus: 'final_processing',
    },
    Date.parse('2026-01-02T12:00:00Z')
  );
  assert.equal(n.kind, 'processing');
  assert.equal(n.normalizeBranch, 'derive:final_processing');
});

test('hasExplicitNewLifecycleColumns respects lifecycle and deadline', () => {
  assert.equal(
    hasExplicitNewLifecycleColumns({
      status: 'x',
      paymentLifecycleStatus: 'final_pending',
    }),
    true
  );
  assert.equal(
    hasExplicitNewLifecycleColumns({
      status: 'x',
      customerReviewDeadlineAt: '2026-01-02T00:00:00Z',
    }),
    true
  );
  assert.equal(
    hasExplicitNewLifecycleColumns({
      status: 'x',
      paymentLifecycleStatus: '  ',
      customerReviewDeadlineAt: null,
    }),
    false
  );
});
