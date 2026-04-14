/**
 * Run: npx tsx --test lib/bookings/__tests__/customer-final-payment-route.test.ts
 *
 * Guards customer final-checkout eligibility helpers without Stripe or HTTP.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { coalesceBookingFinalPaymentIntentId, getMoneyState } from '../money-state';
import {
  bookingRowToFinalPaymentIntentRow,
  buildMoneyStateInputForFinalRoute,
  finalCheckoutPayable,
  safeDepositPercentFromAmounts,
} from '../customer-final-payment-route';
import type { UnifiedBookingPaymentAmounts } from '../unified-receipt';

const amountsDue5k: UnifiedBookingPaymentAmounts = {
  totalAmountCents: 10_000,
  paidAmountCents: 5000,
  remainingAmountCents: 5000,
};

function row(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    status: 'awaiting_remaining_payment',
    payment_status: 'PAID',
    payment_lifecycle_status: 'final_pending',
    final_payment_status: null,
    paid_deposit_at: '2026-01-01T00:00:00.000Z',
    paid_at: null,
    paid_remaining_at: null,
    fully_paid_at: null,
    completed_at: '2026-01-01T10:00:00.000Z',
    remaining_due_at: '2026-01-01T12:00:00.000Z',
    customer_review_deadline_at: '2026-01-01T12:00:00.000Z',
    requires_admin_review: false,
    payout_released: false,
    payout_status: null,
    payout_transfer_id: null,
    refunded_total_cents: null,
    amount_paid_cents: null,
    ...overrides,
  };
}

describe('safeDepositPercentFromAmounts', () => {
  it('returns ratio in [0,1] for normal deposit', () => {
    assert.strictEqual(safeDepositPercentFromAmounts(3000, 10_000), 0.3);
  });

  it('returns 0 when total is 0', () => {
    assert.strictEqual(safeDepositPercentFromAmounts(100, 0), 0);
  });

  it('clamps when deposit exceeds total', () => {
    assert.strictEqual(safeDepositPercentFromAmounts(15_000, 10_000), 1);
  });
});

describe('bookingRowToFinalPaymentIntentRow + coalesceBookingFinalPaymentIntentId', () => {
  it('prefers final_payment_intent_id over legacy columns', () => {
    const id = coalesceBookingFinalPaymentIntentId(
      bookingRowToFinalPaymentIntentRow({
        final_payment_intent_id: 'pi_final',
        stripe_payment_intent_remaining_id: 'pi_remaining',
        payment_intent_id: 'pi_legacy',
      })
    );
    assert.strictEqual(id, 'pi_final');
  });

  it('uses stripe_payment_intent_remaining_id when final id empty', () => {
    const id = coalesceBookingFinalPaymentIntentId(
      bookingRowToFinalPaymentIntentRow({
        final_payment_intent_id: null,
        stripe_payment_intent_remaining_id: 'pi_rem',
        payment_intent_id: 'pi_legacy',
      })
    );
    assert.strictEqual(id, 'pi_rem');
  });

  it('uses legacy payment_intent_id when not the deposit PI', () => {
    const id = coalesceBookingFinalPaymentIntentId(
      bookingRowToFinalPaymentIntentRow({
        final_payment_intent_id: null,
        stripe_payment_intent_remaining_id: null,
        payment_intent_id: 'pi_legacy_final',
        stripe_payment_intent_deposit_id: 'pi_dep',
        deposit_payment_intent_id: null,
      })
    );
    assert.strictEqual(id, 'pi_legacy_final');
  });

  it('does not treat deposit PI as final when legacy matches deposit', () => {
    const id = coalesceBookingFinalPaymentIntentId(
      bookingRowToFinalPaymentIntentRow({
        final_payment_intent_id: null,
        stripe_payment_intent_remaining_id: null,
        payment_intent_id: 'pi_same',
        stripe_payment_intent_deposit_id: 'pi_same',
      })
    );
    assert.strictEqual(id, null);
  });
});

describe('buildMoneyStateInputForFinalRoute', () => {
  it('threads coalesced PI and unified remaining cents into money input', () => {
    const booking = row({});
    const input = buildMoneyStateInputForFinalRoute({
      booking,
      paymentAmounts: amountsDue5k,
      coalescedFinalPaymentIntentId: 'pi_coalesced',
    });
    assert.strictEqual(input.finalPaymentIntentId, 'pi_coalesced');
    assert.strictEqual(input.amountRemaining, 5000);
    assert.strictEqual(input.status, 'awaiting_remaining_payment');
  });
});

describe('finalCheckoutPayable + getMoneyState', () => {
  const pastReviewMs = Date.parse('2026-01-02T12:00:00.000Z');

  it('is true for final_due after review window with balance due', () => {
    const booking = row({});
    const input = buildMoneyStateInputForFinalRoute({
      booking,
      paymentAmounts: amountsDue5k,
      coalescedFinalPaymentIntentId: null,
    });
    const m = getMoneyState(input, {}, pastReviewMs);
    assert.strictEqual(m.final, 'final_due');
    assert.strictEqual(finalCheckoutPayable(m), true);
  });

  it('is true for final_failed when final_payment_status is FAILED', () => {
    const booking = row({
      final_payment_status: 'FAILED',
      payment_lifecycle_status: 'final_pending',
    });
    const input = buildMoneyStateInputForFinalRoute({
      booking,
      paymentAmounts: amountsDue5k,
      coalescedFinalPaymentIntentId: 'pi_x',
    });
    const m = getMoneyState(input, { finalPaymentIntentStatus: 'requires_payment_method' }, pastReviewMs);
    assert.strictEqual(m.final, 'final_failed');
    assert.strictEqual(finalCheckoutPayable(m), true);
  });

  it('is true for final_requires_action', () => {
    const booking = row({
      payment_lifecycle_status: 'requires_customer_action',
      final_payment_status: null,
    });
    const input = buildMoneyStateInputForFinalRoute({
      booking,
      paymentAmounts: amountsDue5k,
      coalescedFinalPaymentIntentId: 'pi_req',
    });
    const m = getMoneyState(input, {}, pastReviewMs);
    assert.strictEqual(m.final, 'final_requires_action');
    assert.strictEqual(finalCheckoutPayable(m), true);
  });

  it('is false for final_paid', () => {
    const booking = row({
      payment_lifecycle_status: 'final_paid',
      paid_remaining_at: '2026-01-02T08:00:00.000Z',
    });
    const paid: UnifiedBookingPaymentAmounts = {
      totalAmountCents: 10_000,
      paidAmountCents: 10_000,
      remainingAmountCents: 0,
    };
    const input = buildMoneyStateInputForFinalRoute({
      booking,
      paymentAmounts: paid,
      coalescedFinalPaymentIntentId: 'pi_done',
    });
    const m = getMoneyState(input, {}, pastReviewMs);
    assert.strictEqual(m.final, 'final_paid');
    assert.strictEqual(finalCheckoutPayable(m), false);
  });

  it('is false for final_processing', () => {
    const booking = row({
      payment_lifecycle_status: 'final_processing',
    });
    const input = buildMoneyStateInputForFinalRoute({
      booking,
      paymentAmounts: amountsDue5k,
      coalescedFinalPaymentIntentId: 'pi_123',
    });
    const m = getMoneyState(input, { finalPaymentIntentStatus: 'processing' }, pastReviewMs);
    assert.strictEqual(m.final, 'final_processing');
    assert.strictEqual(finalCheckoutPayable(m), false);
  });

  it('is false before job completion', () => {
    const booking = row({
      status: 'accepted',
      completed_at: null,
    });
    const input = buildMoneyStateInputForFinalRoute({
      booking,
      paymentAmounts: amountsDue5k,
      coalescedFinalPaymentIntentId: null,
    });
    const m = getMoneyState(input, {}, pastReviewMs);
    assert.strictEqual(m.final, 'before_completion');
    assert.strictEqual(finalCheckoutPayable(m), false);
  });
});
