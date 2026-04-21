import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  auditOneHistoricalPayout,
  summarizePayoutAudit,
} from '@/lib/bookings/payout-audit-historical';

describe('payout-audit-historical', () => {
  it('flags definite overpayment for known bad economics (3860 total, 3500 transfer, 3000 subtotal, 860 fee_total)', () => {
    const row = {
      id: '00000000-0000-4000-8000-000000000001',
      total_amount_cents: 3860,
      subtotal_cents: 3000,
      fee_total_cents: 860,
      customer_fees_retained_cents: 360,
      amount_platform_fee: 360,
      refunded_total_cents: 0,
      transferred_total_cents: 3500,
      booking_payouts_amount_cents: null as number | null,
      payout_amount_cents: 0,
    };
    const r = auditOneHistoricalPayout(row);
    assert.ok(r);
    assert.equal(r!.expected_transfer_cents, 3000);
    assert.equal(r!.actual_transfer_cents, 3500);
    assert.equal(r!.bucket, 'definite_overpayment');
    assert.equal(r!.delta_actual_minus_expected_cents, 500);
    assert.equal(r!.flags.actual_over_expected, true);
    assert.equal(r!.flags.platform_gross_below_expected_fees, true);
  });

  it('likely_safe when transfer matches resolved economics', () => {
    const row = {
      id: '00000000-0000-4000-8000-000000000002',
      total_amount_cents: 3860,
      subtotal_cents: 3000,
      fee_total_cents: 860,
      refunded_total_cents: 0,
      transferred_total_cents: 3000,
    };
    const r = auditOneHistoricalPayout(row);
    assert.ok(r);
    assert.equal(r!.bucket, 'likely_safe');
  });

  it('summarize aggregates overpayment exposure', () => {
    const a = auditOneHistoricalPayout({
      id: 'a',
      total_amount_cents: 3860,
      subtotal_cents: 3000,
      fee_total_cents: 860,
      transferred_total_cents: 3500,
    })!;
    const b = auditOneHistoricalPayout({
      id: 'b',
      total_amount_cents: 1000,
      subtotal_cents: 800,
      fee_total_cents: 200,
      transferred_total_cents: 800,
    })!;
    const s = summarizePayoutAudit([a, b]);
    assert.equal(s.definite_overpayment.count, 1);
    assert.equal(s.exposure_overpayment_cents, 500);
    assert.equal(s.likely_safe.count, 1);
  });
});
