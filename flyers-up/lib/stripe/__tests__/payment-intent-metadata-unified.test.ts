/**
 * Run: npx tsx --test lib/stripe/__tests__/payment-intent-metadata-unified.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBookingPaymentIntentStripeFields,
  buildLegacyFullPaymentIntentStripeFields,
  capStripeBookingPaymentMetadata,
} from '@/lib/stripe/booking-payment-intent-metadata';
import { appendLifecyclePaymentIntentMetadata } from '@/lib/stripe/booking-payment-metadata-lifecycle';
import { buildHostedCheckoutPaymentIntentData } from '@/lib/stripe/hosted-checkout-payment-intent-data';
import {
  assertRefundOrTransferBookingStripeMoneyMetadata,
  assertUnifiedBookingPaymentIntentMetadata,
  buildUnifiedBookingPaymentIntentMoneyMetadata,
  CANONICAL_BOOKING_STRIPE_MONEY_METADATA_KEYS,
  mergeUnifiedBookingPaymentIntentMoneyMetadata,
} from '@/lib/stripe/payment-intent-metadata-unified';
import {
  refundLifecycleMetadata,
  transferLifecycleStripeMetadata,
} from '@/lib/stripe/booking-payment-metadata-lifecycle';

function unifiedMoneySnapshot(meta: Record<string, string>) {
  return Object.fromEntries(
    CANONICAL_BOOKING_STRIPE_MONEY_METADATA_KEYS.map((k) => [k, meta[k]])
  );
}

test('unified metadata snapshot: deposit + lifecycle + cap', () => {
  const bookingId = '00000000-0000-4000-8000-000000000001';
  const { metadata } = buildBookingPaymentIntentStripeFields({
    bookingId,
    customerId: '00000000-0000-4000-8000-000000000002',
    proId: '00000000-0000-4000-8000-000000000003',
    paymentPhase: 'deposit',
    serviceTitle: 'Lawn',
    pricing: { subtotal_cents: 10_000, pricing_version: 'v1' },
  });
  Object.assign(
    metadata,
    appendLifecyclePaymentIntentMetadata(
      {
        booking_id: bookingId,
        customer_id: '00000000-0000-4000-8000-000000000002',
        pro_id: '00000000-0000-4000-8000-000000000003',
        pricing_version: 'v1',
        subtotal_cents: 10_000,
        platform_fee_cents: 500,
        deposit_amount_cents: 2500,
        final_amount_cents: 7500,
        total_amount_cents: 10_500,
      },
      'deposit'
    )
  );
  const capped = capStripeBookingPaymentMetadata(metadata);
  assertUnifiedBookingPaymentIntentMetadata(capped);
  assert.deepEqual(unifiedMoneySnapshot(capped), {
    booking_id: bookingId,
    payment_phase: 'deposit',
    subtotal_cents: '10000',
    total_amount_cents: '10500',
    platform_fee_cents: '500',
    deposit_amount_cents: '2500',
    final_amount_cents: '7500',
    pricing_version: 'v1',
  });
});

test('unified metadata snapshot: final (stripe remaining) + lifecycle + cap', () => {
  const bookingId = '00000000-0000-4000-8000-000000000099';
  const { metadata } = buildBookingPaymentIntentStripeFields({
    bookingId,
    customerId: '00000000-0000-4000-8000-000000000002',
    proId: '00000000-0000-4000-8000-000000000003',
    paymentPhase: 'remaining',
    serviceTitle: 'Lawn',
    pricing: { subtotal_cents: 10_000 },
  });
  Object.assign(
    metadata,
    appendLifecyclePaymentIntentMetadata(
      {
        booking_id: bookingId,
        customer_id: '00000000-0000-4000-8000-000000000002',
        pro_id: '00000000-0000-4000-8000-000000000003',
        pricing_version: 'v1',
        subtotal_cents: 10_000,
        platform_fee_cents: 500,
        deposit_amount_cents: 2500,
        final_amount_cents: 7500,
        total_amount_cents: 10_500,
        linked_deposit_payment_intent_id: 'pi_dep',
      },
      'final'
    )
  );
  const capped = capStripeBookingPaymentMetadata(metadata);
  assertUnifiedBookingPaymentIntentMetadata(capped);
  assert.deepEqual(unifiedMoneySnapshot(capped), {
    booking_id: bookingId,
    payment_phase: 'final',
    subtotal_cents: '10000',
    total_amount_cents: '10500',
    platform_fee_cents: '500',
    deposit_amount_cents: '2500',
    final_amount_cents: '7500',
    pricing_version: 'v1',
  });
});

test('unified metadata snapshot: legacy full + merge + cap', () => {
  const bookingId = '00000000-0000-4000-8000-000000000055';
  const stripeMeta = buildLegacyFullPaymentIntentStripeFields({
    bookingId,
    customerId: 'c',
    proId: 'p',
    serviceTitle: 'S',
    pricing: { subtotal_cents: 8000, customer_total_cents: 9200 },
  });
  mergeUnifiedBookingPaymentIntentMoneyMetadata(
    stripeMeta.metadata,
    buildUnifiedBookingPaymentIntentMoneyMetadata({
      bookingId,
      paymentPhase: 'full',
      subtotalCents: 8000,
      totalAmountCents: 9200,
      platformFeeCents: 1200,
      depositAmountCents: 0,
      finalAmountCents: 9200,
      pricingVersion: 'v2',
    })
  );
  stripeMeta.metadata.customer_total_cents = '9200';
  const capped = capStripeBookingPaymentMetadata(stripeMeta.metadata);
  assertUnifiedBookingPaymentIntentMetadata(capped);
  assert.deepEqual(unifiedMoneySnapshot(capped), {
    booking_id: bookingId,
    payment_phase: 'full',
    subtotal_cents: '8000',
    total_amount_cents: '9200',
    platform_fee_cents: '1200',
    deposit_amount_cents: '0',
    final_amount_cents: '9200',
    pricing_version: 'v2',
  });
});

test('unified metadata snapshot: hosted checkout (full)', () => {
  const data = buildHostedCheckoutPaymentIntentData({
    bookingId: '00000000-0000-4000-8000-000000000071',
    customerId: '00000000-0000-4000-8000-000000000072',
    proId: '00000000-0000-4000-8000-000000000073',
    serviceTitle: 'Service',
    amountCents: 12_500,
  });
  assert.deepEqual(unifiedMoneySnapshot(data.metadata), {
    booking_id: '00000000-0000-4000-8000-000000000071',
    payment_phase: 'full',
    subtotal_cents: '12500',
    total_amount_cents: '12500',
    platform_fee_cents: '0',
    deposit_amount_cents: '0',
    final_amount_cents: '12500',
    pricing_version: 'unknown',
  });
});

test('canonical money snapshot: refund lifecycle + cap', () => {
  const meta = refundLifecycleMetadata({
    booking_id: '00000000-0000-4000-8000-0000000000aa',
    refund_scope: 'full',
    resolution_type: 'admin_refund_customer',
    refunded_amount_cents: 3500,
    refund_type: 'before_payout',
    refund_source_payment_phase: 'final',
    subtotal_cents: 5000,
    total_amount_cents: 5500,
    platform_fee_cents: 500,
    deposit_amount_cents: 2000,
    final_amount_cents: 3500,
    pricing_version: 'pv1',
  });
  assertRefundOrTransferBookingStripeMoneyMetadata(meta);
  assert.equal(meta.refunded_amount_cents, '3500');
  assert.equal(meta.refund_type, 'before_payout');
  assert.deepEqual(unifiedMoneySnapshot(meta), {
    booking_id: '00000000-0000-4000-8000-0000000000aa',
    payment_phase: 'refund',
    subtotal_cents: '5000',
    total_amount_cents: '5500',
    platform_fee_cents: '500',
    deposit_amount_cents: '2000',
    final_amount_cents: '3500',
    pricing_version: 'pv1',
  });
});

test('canonical money snapshot: transfer lifecycle + cap', () => {
  const meta = transferLifecycleStripeMetadata({
    booking_id: '00000000-0000-4000-8000-0000000000bb',
    linked_final_payment_intent_id: 'pi_final',
    payout_amount_cents: 4000,
    pro_id: 'pro-1',
    subtotal_cents: 10_000,
    total_amount_cents: 11_000,
    platform_fee_cents: 1000,
    deposit_amount_cents: 3000,
    final_amount_cents: 8000,
    pricing_version: '',
  });
  assertRefundOrTransferBookingStripeMoneyMetadata(meta);
  assert.equal(meta.transferred_total_cents, '4000');
  assert.equal(meta.payout_amount_cents, '4000');
  assert.deepEqual(unifiedMoneySnapshot(meta), {
    booking_id: '00000000-0000-4000-8000-0000000000bb',
    payment_phase: 'transfer',
    subtotal_cents: '10000',
    total_amount_cents: '11000',
    platform_fee_cents: '1000',
    deposit_amount_cents: '3000',
    final_amount_cents: '8000',
    pricing_version: 'unknown',
  });
});
