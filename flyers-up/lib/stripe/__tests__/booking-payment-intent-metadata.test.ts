import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildBookingPaymentIntentStripeFields,
  buildLegacyFullPaymentIntentStripeFields,
  capStripeBookingPaymentMetadata,
  mergeDynamicPricingReasonsCsv,
  parseDynamicPricingReasonsCsv,
  STRIPE_PAYMENT_INTENT_METADATA_MAX_KEYS,
  type BookingPaymentIntentPricingMetadata,
} from '../booking-payment-intent-metadata';
import { appendLifecyclePaymentIntentMetadata } from '../booking-payment-metadata-lifecycle';

/** Every optional pricing field set (worst case for Stripe metadata key count). */
const fullPricing: BookingPaymentIntentPricingMetadata = {
  fee_profile: 'standard',
  subtotal_tier: 'tier_a',
  service_subtotal_cents: 1,
  service_fee_cents: 2,
  convenience_fee_cents: 3,
  protection_fee_cents: 4,
  demand_fee_cents: 5,
  promo_discount_cents: 6,
  fee_total_cents: 7,
  platform_fee_total_cents: 8,
  customer_total_cents: 9,
  deposit_base_cents: 10,
  deposit_platform_fee_cents: 11,
  deposit_charge_cents: 12,
  final_base_cents: 13,
  final_platform_fee_cents: 14,
  final_charge_cents: 15,
  deposit_service_fee_cents: 16,
  final_service_fee_cents: 17,
  deposit_convenience_fee_cents: 18,
  final_convenience_fee_cents: 19,
  deposit_protection_fee_cents: 20,
  final_protection_fee_cents: 21,
  deposit_demand_fee_cents: 22,
  final_demand_fee_cents: 23,
  deposit_fee_total_cents: 24,
  final_fee_total_cents: 25,
  deposit_promo_discount_cents: 26,
  final_promo_discount_cents: 27,
  dynamic_pricing_reasons: 'a,b',
  urgency: 'normal',
  area_demand_score: 1,
  supply_tightness_score: 2,
  conversion_risk_score: 3,
  trust_risk_score: 4,
  is_first_booking: '0',
  is_repeat_customer: '1',
  booking_fee_profile_stamped: 'standard',
  booking_pricing_occupation_slug: 'cleaning',
  booking_pricing_category_slug: 'residential',
};

describe('Stripe metadata key limit (max 50)', () => {
  it('deposit + full pricing stays at or under 50 keys', () => {
    const { metadata } = buildBookingPaymentIntentStripeFields({
      bookingId: '00000000-0000-4000-8000-000000000001',
      customerId: '00000000-0000-4000-8000-000000000002',
      proId: '00000000-0000-4000-8000-000000000003',
      paymentPhase: 'deposit',
      serviceTitle: 'Test',
      pricing: fullPricing,
    });
    assert.ok(
      Object.keys(metadata).length <= STRIPE_PAYMENT_INTENT_METADATA_MAX_KEYS,
      `expected <= ${STRIPE_PAYMENT_INTENT_METADATA_MAX_KEYS} metadata keys, got ${Object.keys(metadata).length}`
    );
  });

  it('legacy full + full pricing stays at or under 50 keys', () => {
    const { metadata } = buildLegacyFullPaymentIntentStripeFields({
      bookingId: '00000000-0000-4000-8000-000000000001',
      customerId: '00000000-0000-4000-8000-000000000002',
      proId: '00000000-0000-4000-8000-000000000003',
      serviceTitle: 'Test',
      pricing: fullPricing,
    });
    assert.ok(
      Object.keys(metadata).length <= STRIPE_PAYMENT_INTENT_METADATA_MAX_KEYS,
      `expected <= ${STRIPE_PAYMENT_INTENT_METADATA_MAX_KEYS} metadata keys, got ${Object.keys(metadata).length}`
    );
  });

  it('deposit + pricing + lifecycle merge caps to Stripe limit (production path)', () => {
    const pricing: BookingPaymentIntentPricingMetadata = {
      ...fullPricing,
      pricing_version: 'v1_2026_04',
      subtotal_cents: 5000,
    };
    const { metadata } = buildBookingPaymentIntentStripeFields({
      bookingId: '00000000-0000-4000-8000-000000000001',
      customerId: '00000000-0000-4000-8000-000000000002',
      proId: '00000000-0000-4000-8000-000000000003',
      paymentPhase: 'deposit',
      serviceTitle: 'Test',
      pricing,
    });
    Object.assign(
      metadata,
      appendLifecyclePaymentIntentMetadata(
        {
          booking_id: '00000000-0000-4000-8000-000000000001',
          customer_id: '00000000-0000-4000-8000-000000000002',
          pro_id: '00000000-0000-4000-8000-000000000003',
          booking_service_status: 'accepted',
          pricing_version: 'v1_2026_04',
          subtotal_cents: 5000,
          platform_fee_cents: 600,
          deposit_amount_cents: 2500,
          final_amount_cents: 3500,
          total_amount_cents: 6000,
        },
        'deposit'
      )
    );
    assert.ok(
      Object.keys(metadata).length > STRIPE_PAYMENT_INTENT_METADATA_MAX_KEYS,
      'fixture should overflow without cap (regression guard)'
    );
    const capped = capStripeBookingPaymentMetadata(metadata);
    assert.ok(capped.booking_id);
    assert.ok(capped.deposit_charge_cents || capped.deposit_amount_cents);
    assert.ok(
      Object.keys(capped).length <= STRIPE_PAYMENT_INTENT_METADATA_MAX_KEYS,
      `expected <= ${STRIPE_PAYMENT_INTENT_METADATA_MAX_KEYS} after cap, got ${Object.keys(capped).length}`
    );
  });
});

describe('dynamic pricing reasons metadata', () => {
  it('parses CSV reasons', () => {
    assert.deepStrictEqual(parseDynamicPricingReasonsCsv('a,b,, a '), ['a', 'b', 'a']);
  });

  it('merges deposit then final with dedupe preserving order', () => {
    assert.deepStrictEqual(
      mergeDynamicPricingReasonsCsv('fee_cap_applied_under_25,demand_fee_cap_applied', 'demand_fee_cap_applied,new_reason'),
      ['fee_cap_applied_under_25', 'demand_fee_cap_applied', 'new_reason']
    );
  });
});
