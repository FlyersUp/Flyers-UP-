/**
 * Run: npx tsx --test lib/stripe/__tests__/payment-metadata.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCanonicalRefundMetadata,
  assertCanonicalTransferMetadata,
} from '@/lib/stripe/payment-metadata';

test('assertCanonicalRefundMetadata enforces refund extras', () => {
  assert.throws(() =>
    assertCanonicalRefundMetadata({
      booking_id: 'b',
      payment_phase: 'refund',
      subtotal_cents: '0',
      total_amount_cents: '0',
      platform_fee_cents: '0',
      deposit_amount_cents: '0',
      final_amount_cents: '0',
      pricing_version: 'unknown',
    })
  );
});

test('assertCanonicalTransferMetadata enforces transferred_total_cents', () => {
  assert.throws(() =>
    assertCanonicalTransferMetadata({
      booking_id: 'b',
      payment_phase: 'transfer',
      subtotal_cents: '0',
      total_amount_cents: '0',
      platform_fee_cents: '0',
      deposit_amount_cents: '0',
      final_amount_cents: '0',
      pricing_version: 'unknown',
      payout_amount_cents: '100',
    })
  );
});
