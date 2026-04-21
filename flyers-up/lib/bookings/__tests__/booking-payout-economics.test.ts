import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildBookingPayoutEconomicsSnapshot,
  resolveMarketplaceFeesRetainedCents,
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
    const { payoutCents, cappedToSubtotal, warnings, marketplaceFeesRetainedCents } =
      resolveProPayoutTransferCents(row);
    assert.equal(payoutCents, 2700);
    assert.equal(marketplaceFeesRetainedCents, 470);
    assert.equal(cappedToSubtotal, false);
    assert.equal(warnings.length, 0);

    const snap = buildBookingPayoutEconomicsSnapshot(row, 152);
    assert.equal(snap.customerTotalCents, 3170);
    assert.equal(snap.proPayoutTransferCents, 2700);
    assert.equal(snap.platformGrossRevenueCents, 470);
    assert.equal(snap.platformNetRevenueCents, 318);
  });

  it('caps pro payout when recorded fees are barely below implied and implied upgrade does not apply', () => {
    const { payoutCents, cappedToSubtotal, warnings } = resolveProPayoutTransferCents({
      total_amount_cents: 3170,
      customer_fees_retained_cents: 469,
      amount_subtotal: 2700,
      refunded_total_cents: 0,
    });
    assert.equal(payoutCents, 2700);
    assert.equal(cappedToSubtotal, true);
    assert.ok(warnings.some((w) => w.includes('capped')));
  });

  /** Known bad example: receipt shows full fees but legacy columns only retained deposit-phase fee. */
  it('uses fee_total_cents over partial customer_fees_retained / amount_platform_fee', () => {
    const row = {
      total_amount_cents: 3860,
      subtotal_cents: 3000,
      fee_total_cents: 860,
      customer_fees_retained_cents: 360,
      amount_platform_fee: 360,
      refunded_total_cents: 0,
    };
    const fee = resolveMarketplaceFeesRetainedCents(row);
    assert.equal(fee.feeCents, 860);
    const { payoutCents, marketplaceFeesRetainedCents } = resolveProPayoutTransferCents(row);
    assert.equal(marketplaceFeesRetainedCents, 860);
    assert.equal(payoutCents, 3000);
  });

  it('sums marketplace fee components when fee_total_cents is absent', () => {
    const row = {
      total_amount_cents: 3860,
      subtotal_cents: 3000,
      service_fee_cents: 400,
      convenience_fee_cents: 200,
      protection_fee_cents: 160,
      demand_fee_cents: 100,
      refunded_total_cents: 0,
    };
    const { payoutCents, marketplaceFeesRetainedCents } = resolveProPayoutTransferCents(row);
    assert.equal(marketplaceFeesRetainedCents, 860);
    assert.equal(payoutCents, 3000);
  });

  it('infers full marketplace fees from customer total minus subtotal when DB fee columns under-recorded', () => {
    const row = {
      total_amount_cents: 3860,
      subtotal_cents: 3000,
      amount_subtotal: null,
      customer_fees_retained_cents: 360,
      amount_platform_fee: 360,
      refunded_total_cents: 0,
    };
    const fee = resolveMarketplaceFeesRetainedCents(row);
    assert.ok(fee.warnings.some((w) => w.includes('implied')));
    assert.equal(fee.feeCents, 860);
    const { payoutCents } = resolveProPayoutTransferCents(row);
    assert.equal(payoutCents, 3000);
  });

  it('prefers subtotal_cents over missing amount_subtotal for cap (deposit + final split)', () => {
    const row = {
      total_amount_cents: 3860,
      subtotal_cents: 3000,
      amount_subtotal: null,
      fee_total_cents: 860,
      refunded_total_cents: 0,
    };
    const { payoutCents, cappedToSubtotal } = resolveProPayoutTransferCents(row);
    assert.equal(payoutCents, 3000);
    assert.equal(cappedToSubtotal, false);
  });

  it('platform gross on snapshot matches displayed marketplace fees before Stripe processing', () => {
    const row = {
      total_amount_cents: 3860,
      subtotal_cents: 3000,
      fee_total_cents: 860,
      refunded_total_cents: 0,
    };
    const snap = buildBookingPayoutEconomicsSnapshot(row, null);
    assert.equal(snap.platformFeesRetainedCents, 860);
    assert.equal(snap.proPayoutTransferCents, 3000);
    assert.equal(snap.platformGrossRevenueCents, 860);
  });
});
