import { describe, it } from 'node:test';
import assert from 'node:assert';
import { shouldShowCustomerDepositPayCta } from '@/lib/bookings/customer-booking-actions';

describe('shouldShowCustomerDepositPayCta', () => {
  it('shows when awaiting deposit and unpaid', () => {
    assert.strictEqual(
      shouldShowCustomerDepositPayCta({
        status: 'awaiting_deposit_payment',
        paidDepositAt: null,
        paidAt: null,
        paymentStatus: 'UNPAID',
      }),
      true
    );
  });

  it('hides when deposit timestamp set', () => {
    assert.strictEqual(
      shouldShowCustomerDepositPayCta({
        status: 'awaiting_deposit_payment',
        paidDepositAt: '2026-01-01T00:00:00Z',
        paymentStatus: 'UNPAID',
      }),
      false
    );
  });

  it('hides when paymentStatus PAID', () => {
    assert.strictEqual(
      shouldShowCustomerDepositPayCta({
        status: 'awaiting_deposit_payment',
        paidDepositAt: null,
        paymentStatus: 'PAID',
      }),
      false
    );
  });

  it('shows recovery path statuses when unpaid', () => {
    assert.strictEqual(
      shouldShowCustomerDepositPayCta({
        status: 'pro_en_route',
        paidDepositAt: null,
        paymentStatus: 'UNPAID',
      }),
      true
    );
  });
});
