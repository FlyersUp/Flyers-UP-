/**
 * Run: npx tsx --test lib/bookings/__tests__/money-state.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { coalesceBookingFinalPaymentIntentId, getMoneyState } from '../money-state';

const depositPaidBase = {
  status: 'awaiting_remaining_payment',
  paymentStatus: 'PAID',
  paidDepositAt: '2026-01-01T00:00:00Z',
  paidRemainingAt: '2026-01-02T08:00:00Z',
  amountRemaining: 0,
  completedAt: '2026-01-01T10:00:00Z',
};

describe('getMoneyState — final payment', () => {
  it('does not emit final_processing without Stripe in-flight confirmation', () => {
    const m = getMoneyState(
      {
        ...depositPaidBase,
        paymentLifecycleStatus: 'final_processing',
        finalPaymentIntentId: 'pi_123',
        paidRemainingAt: null,
        amountRemaining: 5000,
      },
      {},
      Date.parse('2026-01-02T12:00:00Z')
    );
    assert.strictEqual(m.final, 'final_due');
  });

  it('emits final_processing when Stripe confirms in-flight PI', () => {
    const m = getMoneyState(
      {
        ...depositPaidBase,
        paymentLifecycleStatus: 'final_processing',
        finalPaymentIntentId: 'pi_123',
        paidRemainingAt: null,
        amountRemaining: 5000,
      },
      { finalPaymentIntentStatus: 'processing' },
      Date.parse('2026-01-02T12:00:00Z')
    );
    assert.strictEqual(m.final, 'final_processing');
  });

  it('emits final_paid when DB has paid_remaining_at', () => {
    const m = getMoneyState(
      {
        ...depositPaidBase,
        paymentLifecycleStatus: 'final_paid',
      },
      {},
      Date.parse('2026-01-02T12:00:00Z')
    );
    assert.strictEqual(m.final, 'final_paid');
  });

  it('emits final_paid when Stripe PI succeeded', () => {
    const m = getMoneyState(
      {
        ...depositPaidBase,
        paymentLifecycleStatus: 'final_processing',
        finalPaymentIntentId: 'pi_123',
        paidRemainingAt: null,
        amountRemaining: 5000,
      },
      { finalPaymentIntentStatus: 'succeeded' },
      Date.parse('2026-01-02T12:00:00Z')
    );
    assert.strictEqual(m.final, 'final_paid');
  });

  it('payout_on_hold + stale amount_remaining is final_paid (never customer-due because payout is held)', () => {
    const m = getMoneyState(
      {
        ...depositPaidBase,
        paymentLifecycleStatus: 'payout_on_hold',
        finalPaymentIntentId: 'pi_123',
        paidRemainingAt: null,
        amountRemaining: 100,
        requiresAdminReview: true,
        payoutReleased: false,
      },
      {},
      Date.now()
    );
    assert.strictEqual(m.final, 'final_paid');
    assert.strictEqual(m.payout, 'payout_held');
  });

  it('post_review_auto_pending + succeeded PI is final_paid (stale amount_remaining / lagging lifecycle)', () => {
    const m = getMoneyState(
      {
        ...depositPaidBase,
        paymentLifecycleStatus: 'final_pending',
        finalPaymentIntentId: 'pi_123',
        paidRemainingAt: null,
        amountRemaining: 100,
        customerReviewDeadlineAt: '2026-01-02T08:00:00Z',
      },
      { finalPaymentIntentStatus: 'succeeded' },
      Date.parse('2026-01-03T12:00:00Z')
    );
    assert.strictEqual(m.raw.kind, 'post_review_auto_pending');
    assert.strictEqual(m.final, 'final_paid');
  });
});

describe('getMoneyState — payout', () => {
  const paidCustomer = {
    ...depositPaidBase,
    paymentLifecycleStatus: 'final_paid' as const,
    payoutReleased: false,
  };

  it('payout_held when requires_admin_review', () => {
    const m = getMoneyState(
      {
        ...paidCustomer,
        requiresAdminReview: true,
        payoutReleased: false,
      },
      {},
      Date.now()
    );
    assert.strictEqual(m.payout, 'payout_held');
  });

  it('payout_failed when requires_admin_review but DB payout_status is failed (retry path)', () => {
    const m = getMoneyState(
      {
        ...paidCustomer,
        requiresAdminReview: true,
        payoutReleased: false,
        payoutStatus: 'failed',
      },
      {},
      Date.now()
    );
    assert.strictEqual(m.payout, 'payout_failed');
  });

  it('payout_failed when Stripe transfer failed even under admin review', () => {
    const m = getMoneyState(
      {
        ...paidCustomer,
        requiresAdminReview: true,
        payoutReleased: false,
        payoutTransferId: 'tr_1',
      },
      { transferStatus: 'failed' },
      Date.now()
    );
    assert.strictEqual(m.payout, 'payout_failed');
  });

  it('payout_scheduled when not released and not admin held', () => {
    const m = getMoneyState(
      {
        ...paidCustomer,
        requiresAdminReview: false,
        payoutReleased: false,
      },
      {},
      Date.now()
    );
    assert.strictEqual(m.payout, 'payout_scheduled');
  });

  it('payout_processing when released and transfer not yet paid in Stripe', () => {
    const m = getMoneyState(
      {
        ...paidCustomer,
        payoutReleased: true,
        payoutTransferId: 'tr_123',
        requiresAdminReview: false,
      },
      { transferStatus: 'pending' },
      Date.now()
    );
    assert.strictEqual(m.payout, 'payout_processing');
  });

  it('payout_paid only when Stripe transfer.status is paid', () => {
    const m = getMoneyState(
      {
        ...paidCustomer,
        payoutReleased: true,
        payoutTransferId: 'tr_123',
        requiresAdminReview: false,
      },
      { transferStatus: 'paid' },
      Date.now()
    );
    assert.strictEqual(m.payout, 'payout_paid');
  });

  it('does not emit payout_paid when transfer status not yet fetched', () => {
    const m = getMoneyState(
      {
        ...paidCustomer,
        payoutReleased: true,
        payoutTransferId: 'tr_123',
        requiresAdminReview: false,
      },
      {},
      Date.now()
    );
    assert.strictEqual(m.payout, 'payout_processing');
  });
});

describe('getMoneyState — golden flow', () => {
  const depositPaid = {
    id: 'golden-bk',
    status: 'awaiting_remaining_payment',
    paymentStatus: 'PAID',
    paidDepositAt: '2026-01-01T08:00:00Z',
    amountRemaining: 5000,
    completedAt: '2026-01-01T12:00:00Z' as string | null,
    paymentLifecycleStatus: null as string | null,
    finalPaymentIntentId: null as string | null,
    paidRemainingAt: null as string | null,
    requiresAdminReview: false,
    payoutReleased: false,
    payoutTransferId: null as string | null,
    customerReviewDeadlineAt: '2026-01-02T12:00:00Z',
  };

  it('Deposit → final processing → final paid → held → scheduled → processing → paid', () => {
    let m = getMoneyState(
      {
        id: 'golden-bk',
        status: 'accepted',
        paymentStatus: 'PAID',
        paidDepositAt: '2026-01-01T08:00:00Z',
        amountRemaining: 5000,
        completedAt: null,
        paymentLifecycleStatus: null,
        finalPaymentIntentId: null,
        paidRemainingAt: null,
        requiresAdminReview: false,
        payoutReleased: false,
        payoutTransferId: null,
        customerReviewDeadlineAt: null,
      },
      {},
      Date.parse('2026-01-01T10:00:00Z')
    );
    assert.strictEqual(m.final, 'before_completion');

    m = getMoneyState(
      {
        ...depositPaid,
        paymentLifecycleStatus: 'final_processing',
        finalPaymentIntentId: 'pi_1',
      },
      { finalPaymentIntentStatus: 'processing' },
      Date.parse('2026-01-01T14:00:00Z')
    );
    assert.strictEqual(m.final, 'final_processing');

    m = getMoneyState(
      {
        ...depositPaid,
        paymentLifecycleStatus: 'final_paid',
        paidRemainingAt: '2026-01-01T15:00:00Z',
        amountRemaining: 0,
        finalPaymentIntentId: 'pi_1',
      },
      { finalPaymentIntentStatus: 'succeeded' },
      Date.parse('2026-01-01T16:00:00Z')
    );
    assert.strictEqual(m.final, 'final_paid');
    assert.strictEqual(m.payout, 'payout_scheduled');

    m = getMoneyState(
      {
        ...depositPaid,
        paymentLifecycleStatus: 'final_paid',
        paidRemainingAt: '2026-01-01T15:00:00Z',
        amountRemaining: 0,
        requiresAdminReview: true,
      },
      {},
      Date.parse('2026-01-01T16:00:00Z')
    );
    assert.strictEqual(m.payout, 'payout_held');

    m = getMoneyState(
      {
        ...depositPaid,
        paymentLifecycleStatus: 'final_paid',
        paidRemainingAt: '2026-01-01T15:00:00Z',
        amountRemaining: 0,
        requiresAdminReview: false,
        payoutReleased: false,
      },
      {},
      Date.parse('2026-01-01T16:00:00Z')
    );
    assert.strictEqual(m.payout, 'payout_scheduled');

    m = getMoneyState(
      {
        ...depositPaid,
        paymentLifecycleStatus: 'final_paid',
        paidRemainingAt: '2026-01-01T15:00:00Z',
        amountRemaining: 0,
        payoutReleased: true,
        payoutTransferId: 'tr_1',
      },
      {},
      Date.parse('2026-01-01T16:00:00Z')
    );
    assert.strictEqual(m.payout, 'payout_processing');

    m = getMoneyState(
      {
        ...depositPaid,
        paymentLifecycleStatus: 'final_paid',
        paidRemainingAt: '2026-01-01T15:00:00Z',
        amountRemaining: 0,
        payoutReleased: true,
        payoutTransferId: 'tr_1',
      },
      { transferStatus: 'paid' },
      Date.parse('2026-01-01T16:00:00Z')
    );
    assert.strictEqual(m.payout, 'payout_paid');
  });
});

describe('coalesceBookingFinalPaymentIntentId', () => {
  it('prefers final_payment_intent_id over legacy payment_intent_id', () => {
    assert.strictEqual(
      coalesceBookingFinalPaymentIntentId({
        final_payment_intent_id: 'pi_final',
        payment_intent_id: 'pi_legacy',
      }),
      'pi_final'
    );
  });

  it('prefers stripe_payment_intent_remaining_id when final column empty', () => {
    assert.strictEqual(
      coalesceBookingFinalPaymentIntentId({
        stripe_payment_intent_remaining_id: 'pi_rem',
        payment_intent_id: 'pi_legacy',
      }),
      'pi_rem'
    );
  });

  it('uses payment_intent_id when dedicated columns empty', () => {
    assert.strictEqual(
      coalesceBookingFinalPaymentIntentId({
        payment_intent_id: 'pi_only',
      }),
      'pi_only'
    );
  });

  it('does not use payment_intent_id when it matches deposit PI', () => {
    assert.strictEqual(
      coalesceBookingFinalPaymentIntentId({
        payment_intent_id: 'pi_dep',
        stripe_payment_intent_deposit_id: 'pi_dep',
      }),
      null
    );
  });

  it('matches deposit via deposit_payment_intent_id', () => {
    assert.strictEqual(
      coalesceBookingFinalPaymentIntentId({
        payment_intent_id: 'pi_dep',
        deposit_payment_intent_id: 'pi_dep',
      }),
      null
    );
  });
});
