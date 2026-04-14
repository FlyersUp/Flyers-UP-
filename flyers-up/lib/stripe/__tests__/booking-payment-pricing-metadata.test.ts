/**
 * Run: npx tsx --test lib/stripe/__tests__/booking-payment-pricing-metadata.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildBookingPaymentIntentPricingMetadata } from '@/lib/stripe/booking-payment-pricing-metadata';
import { getFeeRuleForBooking } from '@/lib/bookings/fee-rules';
import { computeBookingPricing } from '@/lib/bookings/pricing';
import type { QuoteBreakdown } from '@/lib/bookingQuote';

const quote: QuoteBreakdown = {
  amountSubtotal: 8000,
  amountPlatformFee: 1200,
  amountTravelFee: 0,
  amountTotal: 9200,
  serviceFeeCents: 800,
  convenienceFeeCents: 199,
  protectionFeeCents: 100,
  demandFeeCents: 101,
  feeTotalCents: 1200,
  promoDiscountCents: 0,
  amountDeposit: 4600,
  amountRemaining: 4600,
  depositPercent: 50,
  dynamicPricingReasons: [],
  currency: 'usd',
};

describe('buildBookingPaymentIntentPricingMetadata', () => {
  it('uses stamped fee_profile when frozen snapshot is complete', () => {
    const pricing = computeBookingPricing({
      serviceSubtotalCents: 8000,
      depositPercent: 0.5,
      frozenCoreFeesCents: {
        serviceFeeCents: 800,
        convenienceFeeCents: 199,
        protectionFeeCents: 100,
      },
      demandFeeCents: 101,
      promoDiscountCents: 0,
    });
    const liveRule = getFeeRuleForBooking({
      serviceSubtotalCents: 8000,
      categoryName: 'Cleaning',
      occupationSlug: 'cleaner',
    });
    const meta = buildBookingPaymentIntentPricingMetadata({
      bookingId: 'b1',
      booking: {
        fee_profile: 'premium_trust',
        pricing_version: 'tiered_v1',
        pricing_band: 'mid',
        pricing_occupation_slug: 'cleaner',
        subtotal_cents: 8000,
        service_fee_cents: 800,
        convenience_fee_cents: 199,
        protection_fee_cents: 100,
        demand_fee_cents: 101,
        fee_total_cents: 1200,
        customer_total_cents: 9200,
      },
      liveFeeRule: liveRule,
      quote,
      pricing,
      dynamic: {
        dynamicReasonsCsv: '',
        urgency: null,
        areaDemandScore: 1,
        supplyTightnessScore: 1,
        conversionRiskScore: 1,
        trustRiskScore: 1,
        isFirstBooking: true,
        isRepeatCustomer: false,
      },
    });
    assert.equal(meta.fee_profile, 'premium_trust');
    assert.notEqual(meta.fee_profile, liveRule.profile);
    assert.equal(meta.demand_fee_cents, pricing.demandFeeCents);
    assert.equal(meta.customer_total_cents, pricing.customerTotalCents);
  });

  it('falls back to live fee_profile when snapshot incomplete', () => {
    const pricing = computeBookingPricing({
      serviceSubtotalCents: 8000,
      depositPercent: 0.5,
      frozenCoreFeesCents: {
        serviceFeeCents: 800,
        convenienceFeeCents: 199,
        protectionFeeCents: 100,
      },
      demandFeeCents: 101,
      promoDiscountCents: 0,
    });
    const liveRule = getFeeRuleForBooking({
      serviceSubtotalCents: 8000,
      categoryName: 'Cleaning',
    });
    const meta = buildBookingPaymentIntentPricingMetadata({
      bookingId: 'b2',
      booking: {
        fee_profile: 'premium_trust',
        pricing_version: null,
        subtotal_cents: 8000,
      },
      liveFeeRule: liveRule,
      quote,
      pricing,
      dynamic: {
        dynamicReasonsCsv: '',
        urgency: null,
        areaDemandScore: 0,
        supplyTightnessScore: 0,
        conversionRiskScore: 0,
        trustRiskScore: 0,
        isFirstBooking: false,
        isRepeatCustomer: false,
      },
    });
    assert.equal(meta.fee_profile, liveRule.profile);
  });
});
