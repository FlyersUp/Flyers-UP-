import assert from 'node:assert';
import { describe, it } from 'node:test';
import { computeCustomerRemainingDueCents, resolveTotalBookingCentsFromRow } from '../remaining-balance-cents';

describe('remaining-balance-cents', () => {
  it('ignores stale amount_remaining=0 when deposit paid and final unpaid', () => {
    const due = computeCustomerRemainingDueCents({
      total_amount_cents: 2060,
      amount_deposit: 412,
      amount_remaining: 0,
      payment_status: 'PAID',
      final_payment_status: 'UNPAID',
      status: 'awaiting_remaining_payment',
    });
    assert.strictEqual(due, 1648);
  });

  it('no deposit: remaining is full total until paid', () => {
    const due = computeCustomerRemainingDueCents({
      total_amount_cents: 5000,
      amount_deposit: 0,
      amount_remaining: 0,
      payment_status: 'UNPAID',
      final_payment_status: 'UNPAID',
    });
    assert.strictEqual(due, 5000);
  });

  it('fully paid via final_payment_status', () => {
    const due = computeCustomerRemainingDueCents({
      total_amount_cents: 2060,
      amount_deposit: 412,
      amount_remaining: 0,
      payment_status: 'PAID',
      final_payment_status: 'PAID',
    });
    assert.strictEqual(due, 0);
  });

  it('single-phase PAID (no split) is fully paid', () => {
    const due = computeCustomerRemainingDueCents({
      total_amount_cents: 3000,
      amount_deposit: 0,
      payment_status: 'PAID',
      final_payment_status: 'UNPAID',
    });
    assert.strictEqual(due, 0);
  });

  it('resolveTotalBookingCentsFromRow prefers total_amount_cents', () => {
    assert.strictEqual(
      resolveTotalBookingCentsFromRow({
        total_amount_cents: 2060,
        amount_total: 999999,
        amount_remaining: 0,
      }),
      2060
    );
  });
});
