/**
 * Run: npx tsx --test lib/bookingQuote.__tests__/fee-inputs.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildFeeInputsForQuote } from '@/lib/bookingQuote';
import { calculateSubtotalCents } from '@/lib/pricing/fees';

describe('buildFeeInputsForQuote', () => {
  const baseBooking = {
    id: 'b1',
    customer_id: 'c1',
    pro_id: 'p1',
    service_date: '2026-06-01',
    service_time: '09:00',
    status: 'requested',
  };

  it('hybrid long job uses flat_hourly and matches subtotal cents', () => {
    const fi = buildFeeInputsForQuote(
      { ...baseBooking, duration_hours: 4, flat_fee_selected: false, hourly_selected: false },
      { pricing_model: 'hybrid', starting_price: 100, hourly_rate: 50, min_hours: 0 },
      0,
      0
    );
    assert.equal(fi.chargeModel, 'flat_hourly');
    assert.equal(calculateSubtotalCents(fi), 20_000);
  });
});
