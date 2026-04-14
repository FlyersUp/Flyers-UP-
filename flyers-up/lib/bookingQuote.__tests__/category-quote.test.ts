/**
 * Run: npx tsx --test lib/bookingQuote.__tests__/category-quote.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeQuote } from '@/lib/bookingQuote';

describe('computeQuote + category config', () => {
  const baseBooking = {
    id: 'b1',
    customer_id: 'c1',
    pro_id: 'p1',
    service_date: '2026-06-01',
    service_time: '09:00',
    status: 'requested',
    pricing_version: null as string | null,
    service_fee_cents: null as number | null,
    convenience_fee_cents: null as number | null,
    protection_fee_cents: null as number | null,
  };

  it('applies low fee profile for tutor (service fee below medium tier)', () => {
    const r = computeQuote(
      { ...baseBooking, pricing_occupation_slug: 'tutor' },
      { pricing_model: 'flat', starting_price: 100 },
      'Tutoring',
      'Pro'
    );
    assert.equal(r.quote.amountSubtotal, 10_000);
    assert.equal(r.pricing.serviceSubtotalCents, 10_000);
    assert.equal(r.pricing.serviceSubtotalCents, r.pricing.depositBaseCents + r.pricing.finalBaseCents);
    assert.equal(r.quote.serviceFeeCents, 1275);
    assert.equal(r.pricing.customerTotalCents, r.pricing.serviceSubtotalCents + r.pricing.feeTotalCents);
  });

  it('raises subtotal to occupation minimum for cleaner', () => {
    const r = computeQuote(
      { ...baseBooking, pricing_occupation_slug: 'cleaner' },
      { pricing_model: 'flat', starting_price: 50 },
      'Cleaning',
      'Pro'
    );
    assert.equal(r.quote.amountSubtotal, 8000);
    assert.ok(r.quote.serviceFeeCents > 0);
  });

  it('pro earnings track effective subtotal (no fee deduction from pro)', () => {
    const r = computeQuote(
      { ...baseBooking, pricing_occupation_slug: 'handyman' },
      { pricing_model: 'flat', starting_price: 120 },
      'Handyman',
      'Pro'
    );
    assert.equal(r.pricing.serviceSubtotalCents, r.quote.amountSubtotal);
    assert.equal(r.pricing.depositBaseCents + r.pricing.finalBaseCents, r.quote.amountSubtotal);
  });
});
