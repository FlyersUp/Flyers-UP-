import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHostedCheckoutPaymentIntentData } from '@/lib/stripe/hosted-checkout-payment-intent-data';

test('buildHostedCheckoutPaymentIntentData: platform-hold metadata, no Connect keys on object', () => {
  const data = buildHostedCheckoutPaymentIntentData({
    bookingId: '00000000-0000-4000-8000-000000000001',
    customerId: '00000000-0000-4000-8000-000000000002',
    proId: '00000000-0000-4000-8000-000000000003',
    serviceTitle: 'Lawn care',
    amountCents: 12_500,
  });

  assert.equal(data.metadata.booking_id, '00000000-0000-4000-8000-000000000001');
  assert.equal(data.metadata.customer_id, '00000000-0000-4000-8000-000000000002');
  assert.equal(data.metadata.pro_id, '00000000-0000-4000-8000-000000000003');
  assert.equal(data.metadata.payment_phase, 'full');
  assert.equal(data.metadata.phase, 'full');
  assert.equal(data.metadata.customer_total_cents, '12500');
  assert.equal(data.metadata.total_amount_cents, '12500');
  assert.ok(data.description.includes('Full payment'));
  assert.ok(data.statement_descriptor_suffix.length > 0);

  assert.equal('transfer_data' in data, false);
  assert.equal('application_fee_amount' in data, false);
  assert.equal('on_behalf_of' in data, false);
});

test('buildHostedCheckoutPaymentIntentData: amount cents rounded', () => {
  const data = buildHostedCheckoutPaymentIntentData({
    bookingId: '00000000-0000-4000-8000-000000000001',
    customerId: '00000000-0000-4000-8000-000000000002',
    proId: '00000000-0000-4000-8000-000000000003',
    serviceTitle: 'Service',
    amountCents: 99.7,
  });
  assert.equal(data.metadata.customer_total_cents, '100');
});

test('buildHostedCheckoutPaymentIntentData: bookingMoneySnapshot matches deposit/final cent key names', () => {
  const data = buildHostedCheckoutPaymentIntentData({
    bookingId: '00000000-0000-4000-8000-000000000001',
    customerId: '00000000-0000-4000-8000-000000000002',
    proId: '00000000-0000-4000-8000-000000000003',
    serviceTitle: 'Service',
    amountCents: 10_000,
    bookingMoneySnapshot: {
      pricingVersion: 'v-test',
      subtotalCents: 8500,
      platformFeeCents: 0,
      feeTotalCents: 1500,
    },
  });

  assert.equal(data.metadata.pricing_version, 'v-test');
  assert.equal(data.metadata.subtotal_cents, '8500');
  assert.equal(data.metadata.platform_fee_cents, '1500');
  assert.equal(data.metadata.deposit_amount_cents, '0');
  assert.equal(data.metadata.final_amount_cents, '10000');
  assert.equal(data.metadata.total_amount_cents, '10000');
  assert.equal(data.metadata.customer_total_cents, '10000');
});
