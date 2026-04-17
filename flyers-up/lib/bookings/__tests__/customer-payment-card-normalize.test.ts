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
  assert.equal(n.raw.kind, 'final_pending_after_completion');
});

test('Version B: final_pending before review deadline → pay remaining now (no countdown-as-gate)', () => {
  const deadline = '2026-01-02T10:00:00Z';
  const n = normalizeCustomerPaymentCard(
    {
      ...depositPaidBase,
      paymentLifecycleStatus: 'final_pending',
      customerReviewDeadlineAt: deadline,
    },
    Date.parse('2026-01-01T20:00:00Z')
  );
  assert.equal(n.kind, 'post_review_due');
  assert.equal(n.normalizeBranch, 'derive:final_pending_balance_due');
  assert.equal(n.countdownDeadlineIso, null);
});

test('new booking: past window with lifecycle columns → post_review_due (not in-flight Stripe charge)', () => {
  const n = normalizeCustomerPaymentCard(
    {
      ...depositPaidBase,
      paymentLifecycleStatus: 'final_pending',
      customerReviewDeadlineAt: '2026-01-01T12:00:00Z',
    },
    Date.parse('2026-01-02T12:00:00Z')
  );
  assert.equal(n.kind, 'post_review_due');
  assert.equal(n.normalizeBranch, 'derive:final_pending_balance_due');
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

test('final_processing without finalPaymentIntentId → post_review_due (never show processing without PI)', () => {
  const n = normalizeCustomerPaymentCard(
    {
      ...depositPaidBase,
      paymentLifecycleStatus: 'final_processing',
    },
    Date.parse('2026-01-02T12:00:00Z')
  );
  assert.equal(n.kind, 'post_review_due');
  assert.equal(n.normalizeBranch, 'guard:final_processing_without_payment_intent');
});

test('final_processing + explicit empty finalPaymentIntentId → post_review_due (stale / mismatched DB)', () => {
  const n = normalizeCustomerPaymentCard(
    {
      ...depositPaidBase,
      paymentLifecycleStatus: 'final_processing',
      finalPaymentIntentId: null,
    },
    Date.parse('2026-01-02T12:00:00Z')
  );
  assert.equal(n.kind, 'post_review_due');
  assert.equal(n.normalizeBranch, 'guard:final_processing_without_payment_intent');
});

test('final_processing + PI + live Stripe in-flight → processing', () => {
  const n = normalizeCustomerPaymentCard(
    {
      ...depositPaidBase,
      paymentLifecycleStatus: 'final_processing',
      finalPaymentIntentId: 'pi_test_123',
      finalPaymentIntentStripeLiveChecked: true,
      finalPaymentIntentStripeStatus: 'processing',
    },
    Date.parse('2026-01-02T12:00:00Z')
  );
  assert.equal(n.kind, 'processing');
  assert.equal(n.normalizeBranch, 'derive:final_processing_stripe_confirmed');
});

test('final_processing + PI but Stripe live check missing → post_review_due', () => {
  const n = normalizeCustomerPaymentCard(
    {
      ...depositPaidBase,
      paymentLifecycleStatus: 'final_processing',
      finalPaymentIntentId: 'pi_test_123',
    },
    Date.parse('2026-01-02T12:00:00Z')
  );
  assert.equal(n.kind, 'post_review_due');
  assert.equal(n.normalizeBranch, 'guard:stripe_live_check_missing');
});

test('final_processing + PI + live checked + requires_payment_method → post_review_due', () => {
  const n = normalizeCustomerPaymentCard(
    {
      ...depositPaidBase,
      paymentLifecycleStatus: 'final_processing',
      finalPaymentIntentId: 'pi_test_123',
      finalPaymentIntentStripeLiveChecked: true,
      finalPaymentIntentStripeStatus: 'requires_payment_method',
    },
    Date.parse('2026-01-02T12:00:00Z')
  );
  assert.equal(n.kind, 'post_review_due');
  assert.equal(n.normalizeBranch, 'guard:stripe_pi_not_in_flight');
});

test('final_processing + PI + live checked + succeeded → paid', () => {
  const n = normalizeCustomerPaymentCard(
    {
      ...depositPaidBase,
      paymentLifecycleStatus: 'final_processing',
      finalPaymentIntentId: 'pi_test_123',
      finalPaymentIntentStripeLiveChecked: true,
      finalPaymentIntentStripeStatus: 'succeeded',
    },
    Date.parse('2026-01-02T12:00:00Z')
  );
  assert.equal(n.kind, 'paid');
  assert.equal(n.normalizeBranch, 'guard:stripe_pi_succeeded');
});

test('final_processing + PI but booking already fully_paid (stale lifecycle) → paid not processing', () => {
  const n = normalizeCustomerPaymentCard(
    {
      ...depositPaidBase,
      status: 'fully_paid',
      amountRemaining: 5000,
      paymentLifecycleStatus: 'final_processing',
      finalPaymentIntentId: 'pi_test_123',
      finalPaymentIntentStripeLiveChecked: true,
      finalPaymentIntentStripeStatus: 'processing',
    },
    Date.parse('2026-01-02T12:00:00Z')
  );
  assert.equal(n.kind, 'paid');
  assert.equal(n.normalizeBranch, 'guard:processing_suppressed_already_paid');
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
