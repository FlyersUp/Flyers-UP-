import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildBookingPaymentIntentStripeFields,
  buildLegacyFullPaymentIntentStripeFields,
  capStripeBookingPaymentMetadata,
  mergeDynamicPricingReasonsCsv,
  normalizeBookingPaymentMetadata,
  parseDynamicPricingReasonsCsv,
  receiptMoneyFieldsFromNormalizedPaymentMetadata,
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

describe('normalizeBookingPaymentMetadata', () => {
  it('prefers canonical customer_total_cents over total_amount_cents when both set', () => {
    const n = normalizeBookingPaymentMetadata({
      booking_id: 'b1',
      customer_total_cents: '9200',
      total_amount_cents: '9000',
    });
    assert.equal(n.financial.customerTotalCents, 9200);
  });

  it('falls back to total_amount_cents when customer_total_cents missing', () => {
    const n = normalizeBookingPaymentMetadata({
      booking_id: 'b1',
      total_amount_cents: '8800',
    });
    assert.equal(n.financial.customerTotalCents, 8800);
  });

  it('uses deposit_amount_cents when deposit_charge_cents missing (legacy lifecycle)', () => {
    const n = normalizeBookingPaymentMetadata({
      booking_id: 'b1',
      deposit_amount_cents: '2500',
    });
    assert.equal(n.financial.depositChargeCents, 2500);
  });

  it('prefers deposit_charge_cents over deposit_amount_cents', () => {
    const n = normalizeBookingPaymentMetadata({
      booking_id: 'b1',
      deposit_charge_cents: '2600',
      deposit_amount_cents: '2500',
    });
    assert.equal(n.financial.depositChargeCents, 2600);
  });

  it('uses service_subtotal_cents before subtotal_cents', () => {
    const n = normalizeBookingPaymentMetadata({
      booking_id: 'b1',
      service_subtotal_cents: '8000',
      subtotal_cents: '7500',
    });
    assert.equal(n.financial.serviceSubtotalCents, 8000);
  });

  it('does not let analytics-only fee_profile change financial totals', () => {
    const a = normalizeBookingPaymentMetadata({
      booking_id: 'b1',
      customer_total_cents: '10000',
      fee_profile: 'light',
    });
    const b = normalizeBookingPaymentMetadata({
      booking_id: 'b1',
      customer_total_cents: '10000',
      fee_profile: 'premium_trust',
    });
    assert.equal(a.financial.customerTotalCents, b.financial.customerTotalCents);
    assert.notEqual(a.analyticsOnly.feeProfile, b.analyticsOnly.feeProfile);
  });

  it('parses without analytics keys (lifecycle must not break)', () => {
    const n = normalizeBookingPaymentMetadata({
      booking_id: 'b1',
      payment_phase: 'deposit',
      customer_total_cents: '5000',
    });
    assert.equal(n.financial.bookingId, 'b1');
    assert.equal(n.financial.phase, 'deposit');
    assert.equal(n.analyticsOnly.areaDemandScore, null);
  });

  it('resolves canonical aggregate line-item fees on financial', () => {
    const n = normalizeBookingPaymentMetadata({
      booking_id: 'b1',
      service_subtotal_cents: '10000',
      subtotal_cents: '9000',
      service_fee_cents: '800',
      convenience_fee_cents: '100',
      protection_fee_cents: '50',
      demand_fee_cents: '50',
      promo_discount_cents: '200',
      fee_total_cents: '1000',
      customer_total_cents: '10800',
      deposit_charge_cents: '5400',
      final_charge_cents: '5400',
    });
    assert.equal(n.financial.serviceSubtotalCents, 10000);
    assert.equal(n.financial.subtotalCents, 10000);
    assert.equal(n.financial.serviceFeeCents, 800);
    assert.equal(n.financial.convenienceFeeCents, 100);
    assert.equal(n.financial.protectionFeeCents, 50);
    assert.equal(n.financial.demandFeeCents, 50);
    assert.equal(n.financial.promoDiscountCents, 200);
    assert.equal(n.financial.feeTotalCents, 1000);
    assert.equal(n.financial.customerTotalCents, 10800);
    assert.equal(n.financial.depositChargeCents, 5400);
    assert.equal(n.financial.finalChargeCents, 5400);
  });

  it('sums lifecycle split fee lines when aggregate keys are absent', () => {
    const n = normalizeBookingPaymentMetadata({
      booking_id: 'b1',
      deposit_service_fee_cents: '400',
      final_service_fee_cents: '600',
      deposit_convenience_fee_cents: '50',
      final_convenience_fee_cents: '50',
      deposit_protection_fee_cents: '25',
      final_protection_fee_cents: '25',
      deposit_demand_fee_cents: '10',
      final_demand_fee_cents: '15',
      deposit_promo_discount_cents: '30',
      final_promo_discount_cents: '70',
      deposit_fee_total_cents: '300',
      final_fee_total_cents: '500',
    });
    assert.equal(n.financial.serviceFeeCents, 1000);
    assert.equal(n.financial.convenienceFeeCents, 100);
    assert.equal(n.financial.protectionFeeCents, 50);
    assert.equal(n.financial.demandFeeCents, 25);
    assert.equal(n.financial.promoDiscountCents, 100);
    assert.equal(n.financial.feeTotalCents, 800);
  });

  it('prefers aggregate service_fee_cents over conflicting split lines', () => {
    const n = normalizeBookingPaymentMetadata({
      booking_id: 'b1',
      service_fee_cents: '200',
      deposit_service_fee_cents: '900',
      final_service_fee_cents: '900',
    });
    assert.equal(n.financial.serviceFeeCents, 200);
  });

  it('receipt money fields match financial when financial line items are present', () => {
    const n = normalizeBookingPaymentMetadata({
      booking_id: 'b1',
      service_subtotal_cents: '5000',
      service_fee_cents: '300',
      convenience_fee_cents: '100',
      fee_total_cents: '500',
      customer_total_cents: '5500',
    });
    const r = receiptMoneyFieldsFromNormalizedPaymentMetadata(n);
    assert.equal(r.serviceSubtotalCents, n.financial.subtotalCents);
    assert.equal(r.serviceFeeCents, n.financial.serviceFeeCents);
    assert.equal(r.convenienceFeeCents, n.financial.convenienceFeeCents);
    assert.equal(r.feeTotalCents, n.financial.feeTotalCents);
    assert.equal(r.customerTotalCents, n.financial.customerTotalCents);
  });

  it('omitting analytics metadata does not change financial line-item cents', () => {
    const base = {
      booking_id: 'b1',
      service_fee_cents: '120',
      convenience_fee_cents: '80',
      fee_total_cents: '200',
    };
    const a = normalizeBookingPaymentMetadata(base);
    const b = normalizeBookingPaymentMetadata({
      ...base,
      dynamic_pricing_reasons: 'demand_spike,urgent',
      fee_profile: 'premium_trust',
      area_demand_score: '99',
    });
    assert.equal(a.financial.serviceFeeCents, b.financial.serviceFeeCents);
    assert.equal(a.financial.feeTotalCents, b.financial.feeTotalCents);
    assert.equal(a.analyticsOnly.dynamicPricingReasons, null);
    assert.ok(b.analyticsOnly.dynamicPricingReasons);
  });

  it('receipt money does not let corrupted raw parse override normalized financial', () => {
    const n = normalizeBookingPaymentMetadata({
      booking_id: 'b1',
      service_fee_cents: '200',
    });
    const tampered = {
      ...n,
      raw: { ...n.raw, serviceFeeCents: 999999 },
    };
    const r = receiptMoneyFieldsFromNormalizedPaymentMetadata(tampered);
    assert.equal(r.serviceFeeCents, 200);
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
