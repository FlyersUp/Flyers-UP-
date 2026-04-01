import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  bookingRequiresCustomerDepositBeforeEnRoute,
  canProMarkBookingEnRoute,
} from '../pro-en-route-deposit-guard';

describe('pro-en-route-deposit-guard', () => {
  it('blocks en route when awaiting_deposit_payment and no deposit record', () => {
    const input = { status: 'awaiting_deposit_payment', paid_deposit_at: null, payment_status: 'UNPAID' };
    assert.ok(bookingRequiresCustomerDepositBeforeEnRoute(input));
    assert.ok(!canProMarkBookingEnRoute(input));
  });

  it('allows en route when deposit paid (deposit_paid)', () => {
    const input = { status: 'deposit_paid', paid_deposit_at: null, payment_status: 'PAID' };
    assert.ok(!bookingRequiresCustomerDepositBeforeEnRoute(input));
    assert.ok(canProMarkBookingEnRoute(input));
  });

  it('allows en route when awaiting_deposit_payment but paid_deposit_at set (race)', () => {
    const input = {
      status: 'awaiting_deposit_payment',
      paid_deposit_at: '2026-01-01T00:00:00Z',
      payment_status: 'UNPAID',
    };
    assert.ok(bookingRequiresCustomerDepositBeforeEnRoute(input));
    assert.ok(canProMarkBookingEnRoute(input));
  });

  it('allows en route for legacy accepted with no split deposit', () => {
    const input = { status: 'accepted', amount_deposit: 0, paid_deposit_at: null, payment_status: null };
    assert.ok(!bookingRequiresCustomerDepositBeforeEnRoute(input));
    assert.ok(canProMarkBookingEnRoute(input));
  });

  it('blocks accepted with positive amount_deposit until paid', () => {
    const unpaid = {
      status: 'accepted',
      amount_deposit: 500,
      paid_deposit_at: null,
      payment_status: 'UNPAID',
    };
    assert.ok(bookingRequiresCustomerDepositBeforeEnRoute(unpaid));
    assert.ok(!canProMarkBookingEnRoute(unpaid));
    const paid = { ...unpaid, paid_deposit_at: '2026-01-01T00:00:00Z' };
    assert.ok(canProMarkBookingEnRoute(paid));
  });
});
