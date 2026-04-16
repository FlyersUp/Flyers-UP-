import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  customerRemainingPaymentUiInputFromBookingSlice,
  deriveCustomerRemainingPaymentUiState,
} from '@/lib/bookings/customer-remaining-payment-ui';

const base = {
  status: 'deposit_paid',
  paymentStatus: 'PAID',
  amountRemaining: 5000,
  paidDepositAt: '2026-01-01T00:00:00Z',
};

test('deposit not paid → none', () => {
  const s = deriveCustomerRemainingPaymentUiState(
    { ...base, paymentStatus: 'UNPAID', paidDepositAt: null, paidAt: null },
    Date.parse('2026-01-02T12:00:00Z')
  );
  assert.equal(s.kind, 'none');
});

test('deposit paid, job not complete → before_completion', () => {
  const s = deriveCustomerRemainingPaymentUiState(
    { ...base, status: 'in_progress', completedAt: null },
    Date.parse('2026-01-02T12:00:00Z')
  );
  assert.equal(s.kind, 'before_completion');
});

test('completed, final_pending, before deadline → review_window_auto', () => {
  const s = deriveCustomerRemainingPaymentUiState(
    {
      ...base,
      status: 'awaiting_remaining_payment',
      completedAt: '2026-01-01T10:00:00Z',
      paymentLifecycleStatus: 'final_pending',
      customerReviewDeadlineAt: '2026-01-02T10:00:00Z',
    },
    Date.parse('2026-01-01T20:00:00Z')
  );
  assert.equal(s.kind, 'review_window_auto');
});

test('completed, after deadline → post_review_auto_pending', () => {
  const s = deriveCustomerRemainingPaymentUiState(
    {
      ...base,
      status: 'awaiting_remaining_payment',
      paymentLifecycleStatus: 'final_pending',
      customerReviewDeadlineAt: '2026-01-02T10:00:00Z',
    },
    Date.parse('2026-01-03T12:00:00Z')
  );
  assert.equal(s.kind, 'post_review_auto_pending');
});

test('final_processing → processing', () => {
  const s = deriveCustomerRemainingPaymentUiState(
    {
      ...base,
      status: 'awaiting_remaining_payment',
      paymentLifecycleStatus: 'final_processing',
      customerReviewDeadlineAt: '2026-01-01T10:00:00Z',
    },
    Date.parse('2026-01-03T12:00:00Z')
  );
  assert.equal(s.kind, 'processing');
});

test('final_payment_status FAILED → failed', () => {
  const s = deriveCustomerRemainingPaymentUiState(
    {
      ...base,
      status: 'awaiting_remaining_payment',
      finalPaymentStatus: 'FAILED',
    },
    Date.parse('2026-01-03T12:00:00Z')
  );
  assert.equal(s.kind, 'failed');
});

test('final PAID → success', () => {
  const s = deriveCustomerRemainingPaymentUiState(
    {
      ...base,
      status: 'awaiting_customer_confirmation',
      finalPaymentStatus: 'PAID',
      amountRemaining: 5000,
    },
    Date.parse('2026-01-03T12:00:00Z')
  );
  assert.equal(s.kind, 'success');
});

test('customerRemainingPaymentUiInputFromBookingSlice maps completion + payout fields', () => {
  const input = customerRemainingPaymentUiInputFromBookingSlice({
    status: 'awaiting_remaining_payment',
    paymentStatus: 'PAID',
    completedAt: null,
    completion: { completedAt: '2026-01-01T12:00:00Z' },
    customerReviewDeadlineAt: '2026-01-02T12:00:00Z',
    amountRemaining: 1000,
    payoutReleased: true,
    refundAfterPayout: true,
    refundedTotalCents: 100,
    amountPaidCents: 9000,
  });
  assert.equal(input.completedAt, '2026-01-01T12:00:00Z');
  assert.equal(input.customerReviewDeadlineAt, '2026-01-02T12:00:00Z');
  assert.equal(input.payoutReleased, true);
  assert.equal(input.refundAfterPayout, true);
  assert.equal(input.refundedTotalCents, 100);
  assert.equal(input.amountPaidCents, 9000);
});

test('payout_on_hold → success (customer settled; stale amount_remaining must not imply balance due)', () => {
  const s = deriveCustomerRemainingPaymentUiState(
    {
      ...base,
      status: 'awaiting_customer_confirmation',
      paymentLifecycleStatus: 'payout_on_hold',
      amountRemaining: 100,
      completedAt: '2026-01-01T10:00:00Z',
    },
    Date.parse('2026-01-03T12:00:00Z')
  );
  assert.equal(s.kind, 'success');
});
