/**
 * Run: npx tsx --test lib/bookings/__tests__/frozen-booking-pricing.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeQuote, type BookingForQuote } from '@/lib/bookingQuote';
import type { BookingFrozenPricingRow } from '@/lib/bookings/frozen-booking-pricing';
import {
  bookingRowHasCompleteFrozenPricing,
  coerceCompleteFrozenPricingRow,
  tryBuildQuoteFromFrozenBookingRow,
} from '@/lib/bookings/frozen-booking-pricing';
import { buildBookingPaymentIntentStripeFields } from '@/lib/stripe/booking-payment-intent-metadata';

const baseBooking: BookingForQuote = {
  id: 'b1',
  customer_id: 'c1',
  pro_id: 'p1',
  service_date: '2026-06-01',
  service_time: '09:00',
  status: 'awaiting_deposit_payment',
  price: 100,
};

describe('bookingRowHasCompleteFrozenPricing', () => {
  it('false when pricing_version missing', () => {
    assert.equal(
      bookingRowHasCompleteFrozenPricing({
        id: 'b1',
        subtotal_cents: 1000,
        service_fee_cents: 1,
        convenience_fee_cents: 1,
        protection_fee_cents: 1,
        demand_fee_cents: 0,
        fee_total_cents: 3,
        customer_total_cents: 1003,
      }),
      false
    );
  });

  it('true when all required snapshot fields present', () => {
    assert.equal(
      bookingRowHasCompleteFrozenPricing({
        id: 'b1',
        pricing_version: 'tiered_v1',
        subtotal_cents: 10_000,
        service_fee_cents: 1500,
        convenience_fee_cents: 299,
        protection_fee_cents: 200,
        demand_fee_cents: 500,
        fee_total_cents: 2499,
        customer_total_cents: 12_499,
      }),
      true
    );
  });
});

describe('coerceCompleteFrozenPricingRow', () => {
  it('infers demand when fee lines and totals are stamped but demand column is null', () => {
    const row = {
      id: 'legacy1',
      pricing_version: 'tiered_v1',
      subtotal_cents: 10_000,
      service_fee_cents: 1500,
      convenience_fee_cents: 299,
      protection_fee_cents: 200,
      fee_total_cents: 1999,
      customer_total_cents: 11_999,
    } as BookingFrozenPricingRow;
    const c = coerceCompleteFrozenPricingRow(row);
    assert.ok(c);
    assert.equal(c!.demand_fee_cents, 0);
    const r = tryBuildQuoteFromFrozenBookingRow(c!, { deposit_percent_default: 50 }, null);
    assert.ok(r);
    assert.equal(r!.pricing.demandFeeCents, 0);
    assert.equal(r!.pricing.customerTotalCents, 11_999);
  });
});

describe('tryBuildQuoteFromFrozenBookingRow', () => {
  it('preserves frozen demand in fee total and customer total', () => {
    const row = {
      id: 'b1',
      pricing_version: 'tiered_v1',
      subtotal_cents: 10_000,
      service_fee_cents: 1500,
      convenience_fee_cents: 299,
      protection_fee_cents: 200,
      demand_fee_cents: 500,
      fee_total_cents: 2499,
      customer_total_cents: 12_499,
    };
    const r = tryBuildQuoteFromFrozenBookingRow(row, { deposit_percent_default: 50 }, null);
    assert.ok(r);
    assert.equal(r!.pricing.demandFeeCents, 500);
    assert.equal(r!.pricing.customerTotalCents, 12_499);
    assert.equal(r!.pricing.serviceSubtotalCents, 10_000);
  });

  it('Stripe metadata demand line matches frozen pricing object', () => {
    const row = {
      id: 'b-stripe',
      pricing_version: 'tiered_v1',
      subtotal_cents: 8000,
      service_fee_cents: 900,
      convenience_fee_cents: 199,
      protection_fee_cents: 100,
      demand_fee_cents: 250,
      fee_total_cents: 1449,
      customer_total_cents: 9449,
    };
    const built = tryBuildQuoteFromFrozenBookingRow(row, { deposit_percent_default: 50 }, null);
    assert.ok(built);
    const { pricing, quote } = built!;
    const stripe = buildBookingPaymentIntentStripeFields({
      bookingId: row.id,
      customerId: 'c',
      proId: 'p',
      paymentPhase: 'deposit',
      serviceTitle: 'Test',
      pricing: {
        service_subtotal_cents: pricing.serviceSubtotalCents,
        service_fee_cents: pricing.serviceFeeCents,
        convenience_fee_cents: pricing.convenienceFeeCents,
        protection_fee_cents: pricing.protectionFeeCents,
        demand_fee_cents: pricing.demandFeeCents,
        fee_total_cents: pricing.feeTotalCents,
        customer_total_cents: pricing.customerTotalCents,
        deposit_charge_cents: pricing.depositChargeCents,
        final_charge_cents: pricing.finalChargeCents,
      },
    });
    assert.equal(stripe.metadata.demand_fee_cents, String(pricing.demandFeeCents));
    assert.equal(Number(stripe.metadata.customer_total_cents), quote.amountTotal);
  });
});

describe('computeQuote frozen path', () => {
  it('uses frozen snapshot instead of live category min when complete', () => {
    const booking: BookingForQuote = {
      ...baseBooking,
      pricing_occupation_slug: 'cleaner',
      pricing_version: 'tiered_v1',
      subtotal_cents: 5000,
      service_fee_cents: 1100,
      convenience_fee_cents: 199,
      protection_fee_cents: 100,
      demand_fee_cents: 0,
      fee_total_cents: 1399,
      customer_total_cents: 6399,
    };
    const r = computeQuote(booking, { deposit_percent_default: 50 }, 'Cleaning', 'Pro');
    assert.equal(r.pricingSource, 'frozen');
    assert.equal(r.pricing.serviceSubtotalCents, 5000);
    assert.equal(r.quote.amountSubtotal, 5000);
    assert.equal(r.quote.amountTotal, r.pricing.customerTotalCents);
  });

  it('legacy incomplete snapshot falls back to computed', () => {
    const booking: BookingForQuote = {
      ...baseBooking,
      pricing_occupation_slug: 'tutor',
      pricing_version: null,
      service_fee_cents: null,
      convenience_fee_cents: null,
      protection_fee_cents: null,
    };
    const r = computeQuote(booking, { pricing_model: 'flat', starting_price: 100 }, 'Tutoring', 'Pro');
    assert.equal(r.pricingSource, 'computed');
    assert.ok(r.pricing.customerTotalCents > 0);
  });

  it('second call with same frozen row does not change customer total (no drift)', () => {
    const booking: BookingForQuote = {
      ...baseBooking,
      pricing_occupation_slug: 'cleaner',
      pricing_version: 'tiered_v1',
      subtotal_cents: 3333,
      service_fee_cents: 500,
      convenience_fee_cents: 199,
      protection_fee_cents: 100,
      demand_fee_cents: 50,
      fee_total_cents: 849,
      customer_total_cents: 4182,
    };
    const a = computeQuote(booking, { deposit_percent_default: 50 }, 'Cleaning', 'Pro');
    const b = computeQuote(booking, { deposit_percent_default: 50 }, 'Cleaning', 'Pro');
    assert.equal(a.pricingSource, 'frozen');
    assert.equal(b.quote.amountTotal, a.quote.amountTotal);
  });
});
