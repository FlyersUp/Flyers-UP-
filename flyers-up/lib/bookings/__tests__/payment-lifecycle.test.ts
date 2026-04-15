import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { appendLifecyclePaymentIntentMetadata } from '@/lib/stripe/booking-payment-metadata-lifecycle';

describe('payment lifecycle metadata', () => {
  it('deposit metadata includes payment_phase and amounts', () => {
    const m = appendLifecyclePaymentIntentMetadata(
      {
        booking_id: 'b1',
        customer_id: 'c1',
        pro_id: 'p1',
        pricing_version: 'v1',
        subtotal_cents: 10000,
        platform_fee_cents: 500,
        deposit_amount_cents: 2000,
        final_amount_cents: 8000,
        total_amount_cents: 10500,
      },
      'deposit'
    );
    assert.equal(m.payment_phase, 'deposit');
    assert.equal(m.deposit_amount_cents, '2000');
  });

  it('final metadata links deposit PI and review deadline', () => {
    const m = appendLifecyclePaymentIntentMetadata(
      {
        booking_id: 'b1',
        customer_id: 'c1',
        pro_id: 'p1',
        pricing_version: 'v1',
        subtotal_cents: 10000,
        platform_fee_cents: 500,
        deposit_amount_cents: 2000,
        final_amount_cents: 8000,
        total_amount_cents: 10500,
        linked_deposit_payment_intent_id: 'pi_dep',
        review_deadline_at: '2026-01-01T00:00:00.000Z',
      },
      'final'
    );
    assert.equal(m.payment_phase, 'final');
    assert.equal(m.linked_deposit_payment_intent_id, 'pi_dep');
    assert.equal(m.review_deadline_at, '2026-01-01T00:00:00.000Z');
  });
});

describe('payment lifecycle guards', () => {
  it('isBookingPaymentStatus', async () => {
    const { isBookingPaymentStatus } = await import('../payment-lifecycle-types');
    assert.equal(isBookingPaymentStatus('deposit_paid'), true);
    assert.equal(isBookingPaymentStatus('cancelled_during_review'), true);
    assert.equal(isBookingPaymentStatus('nope'), false);
  });
});

describe('resolveEffectivePaymentLifecycle', () => {
  it('prefers payment_lifecycle_status when valid', async () => {
    const { resolveEffectivePaymentLifecycle } = await import('../payment-lifecycle-read');
    assert.equal(
      resolveEffectivePaymentLifecycle({ payment_lifecycle_status: 'final_pending' }),
      'final_pending'
    );
  });

  it('maps legacy deposit paid', async () => {
    const { resolveEffectivePaymentLifecycle } = await import('../payment-lifecycle-read');
    assert.equal(
      resolveEffectivePaymentLifecycle({
        payment_lifecycle_status: null,
        payment_status: 'PAID',
        final_payment_status: 'UNPAID',
      }),
      'deposit_paid'
    );
  });
});
