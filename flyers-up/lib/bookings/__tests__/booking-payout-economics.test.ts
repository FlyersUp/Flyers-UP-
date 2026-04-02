import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildBookingPayoutEconomicsSnapshot,
  resolveProPayoutTransferCents,
} from '@/lib/bookings/booking-payout-economics';

describe('booking-payout-economics', () => {
  it('matches example: 3170 customer, 470 fees, 2700 subtotal → 2700 payout', () => {
    const row = {
      total_amount_cents: 3170,
      customer_fees_retained_cents: 470,
      amount_subtotal: 2700,
      refunded_total_cents: 0,
    };
    const { payoutCents, cappedToSubtotal, warnings } = resolveProPayoutTransferCents(row);
    assert.equal(payoutCents, 2700);
    assert.equal(cappedToSubtotal, false);
    assert.equal(warnings.length, 0);

    const snap = buildBookingPayoutEconomicsSnapshot(row, 152);
    assert.equal(snap.customerTotalCents, 3170);
    assert.equal(snap.proPayoutTransferCents, 2700);
    assert.equal(snap.platformGrossRevenueCents, 470);
    assert.equal(snap.platformNetRevenueCents, 318);
  });

  it('caps pro payout when customer_fees_retained_cents under-recorded vs subtotal', () => {
    const { payoutCents, cappedToSubtotal, warnings } = resolveProPayoutTransferCents({
      total_amount_cents: 3170,
      customer_fees_retained_cents: 0,
      amount_subtotal: 2700,
      refunded_total_cents: 0,
    });
    assert.equal(payoutCents, 2700);
    assert.equal(cappedToSubtotal, true);
    assert.ok(warnings.some((w) => w.includes('capped')));
  });
});
