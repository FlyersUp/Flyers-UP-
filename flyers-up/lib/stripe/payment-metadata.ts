/**
 * Canonical Stripe metadata contract for Flyers Up booking money flows.
 *
 * This module is the **stable import surface** for app code and docs. Implementation
 * details live in `payment-intent-metadata-unified.ts` (money keys on PIs, refunds,
 * transfers) and `booking-payment-metadata-lifecycle.ts` (lifecycle merges).
 *
 * ## Required keys (PaymentIntents — deposit | final | full)
 *
 * See {@link CANONICAL_BOOKING_STRIPE_MONEY_METADATA_KEYS} / {@link buildUnifiedBookingPaymentIntentMoneyMetadata}.
 *
 * ## Optional normalized keys (PaymentIntents)
 *
 * When present, fee / promo lines use stringified integer cents (including `"0"`):
 * `service_fee_cents`, `convenience_fee_cents`, `protection_fee_cents`, `demand_fee_cents`,
 * `promo_discount_cents` (see {@link stringifyPricingMetadata} in `booking-payment-intent-metadata.ts`).
 *
 * ## Refunds (`payment_phase: refund`)
 *
 * Same eight money keys as PIs, plus:
 * - `refunded_amount_cents` — amount this Stripe Refund object moves (full/partial).
 * - `refund_type` — `before_payout` | `after_payout` (operational timing vs Connect transfer).
 * - `refund_source_payment_phase` — optional: `deposit` | `final` | `full` (which PI was debited).
 *
 * ## Connect transfers (`payment_phase: transfer`)
 *
 * Same eight money keys, plus:
 * - `transferred_total_cents` — net cents moved to the connected account (mirrors payout amount).
 * - `payout_amount_cents` — retained for backward compatibility (same value as `transferred_total_cents`).
 * - `linked_final_payment_intent_id`, `pro_id` as applicable.
 */

export {
  assertCanonicalBookingStripeMoneyMetadata,
  buildCanonicalBookingStripeMoneyMetadata,
  buildUnifiedBookingPaymentIntentMoneyMetadata,
  CANONICAL_BOOKING_STRIPE_MONEY_METADATA_KEYS,
  centsToStripeMetadataString,
  mergeUnifiedBookingPaymentIntentMoneyMetadata,
  resolveCanonicalBookingStripeMoneyPhase,
  resolveEffectiveUnifiedPaymentPhase,
  type CanonicalBookingStripeMoneyMetadataKey,
  type CanonicalBookingStripeMoneyPhase,
  type UnifiedBookingPaymentPhase,
  UNIFIED_BOOKING_PAYMENT_INTENT_REQUIRED_METADATA_KEYS,
  type UnifiedBookingPaymentIntentRequiredMetadataKey,
} from '@/lib/stripe/payment-intent-metadata-unified';

import {
  assertRefundOrTransferBookingStripeMoneyMetadata,
  assertUnifiedBookingPaymentIntentMetadata,
} from '@/lib/stripe/payment-intent-metadata-unified';

/** @alias assertUnifiedBookingPaymentIntentMetadata */
export function assertCanonicalBookingPaymentMetadata(metadata: Record<string, string>): void {
  assertUnifiedBookingPaymentIntentMetadata(metadata);
}

/**
 * Stripe Refund objects: canonical money keys + refund operational fields.
 * Throws in dev/test/CI (via underlying asserts) when the contract is violated.
 */
export function assertCanonicalRefundMetadata(metadata: Record<string, string>): void {
  assertRefundOrTransferBookingStripeMoneyMetadata(metadata);
  if (metadata.payment_phase !== 'refund') {
    throw new Error(
      `assertCanonicalRefundMetadata: payment_phase must be \"refund\" (got ${JSON.stringify(metadata.payment_phase)})`
    );
  }
  const ramt = metadata.refunded_amount_cents;
  if (ramt === undefined || ramt === null || String(ramt).trim() === '') {
    throw new Error('assertCanonicalRefundMetadata: refunded_amount_cents is required');
  }
  const rt = metadata.refund_type;
  if (rt !== 'before_payout' && rt !== 'after_payout') {
    throw new Error(
      `assertCanonicalRefundMetadata: refund_type must be before_payout or after_payout (got ${JSON.stringify(rt)})`
    );
  }
}

/**
 * Stripe Connect Transfer objects: canonical money keys + net transfer cents.
 */
export function assertCanonicalTransferMetadata(metadata: Record<string, string>): void {
  assertRefundOrTransferBookingStripeMoneyMetadata(metadata);
  if (metadata.payment_phase !== 'transfer') {
    throw new Error(
      `assertCanonicalTransferMetadata: payment_phase must be \"transfer\" (got ${JSON.stringify(metadata.payment_phase)})`
    );
  }
  const tt = metadata.transferred_total_cents;
  if (tt === undefined || tt === null || String(tt).trim() === '') {
    throw new Error('assertCanonicalTransferMetadata: transferred_total_cents is required');
  }
  if (metadata.payout_amount_cents != null && String(metadata.payout_amount_cents) !== String(tt)) {
    throw new Error(
      `assertCanonicalTransferMetadata: payout_amount_cents must match transferred_total_cents (${metadata.payout_amount_cents} vs ${tt})`
    );
  }
}

export function assertCanonicalBookingPaymentMetadataDev(
  metadata: Record<string, string>,
  context: string
): void {
  const strict =
    process.env.NODE_ENV !== 'production' ||
    process.env.CI === 'true' ||
    process.env.VITEST === 'true';
  try {
    assertUnifiedBookingPaymentIntentMetadata(metadata);
  } catch (e) {
    if (strict) throw e;
    console.error('[stripe]', context, e);
  }
}

export function assertCanonicalRefundMetadataDev(
  metadata: Record<string, string>,
  context: string
): void {
  const strict =
    process.env.NODE_ENV !== 'production' ||
    process.env.CI === 'true' ||
    process.env.VITEST === 'true';
  try {
    assertCanonicalRefundMetadata(metadata);
  } catch (e) {
    if (strict) throw e;
    console.error('[stripe]', context, e);
  }
}

export function assertCanonicalTransferMetadataDev(
  metadata: Record<string, string>,
  context: string
): void {
  const strict =
    process.env.NODE_ENV !== 'production' ||
    process.env.CI === 'true' ||
    process.env.VITEST === 'true';
  try {
    assertCanonicalTransferMetadata(metadata);
  } catch (e) {
    if (strict) throw e;
    console.error('[stripe]', context, e);
  }
}

/** Optional PI metadata keys (when stamped). See module docblock. */
export const OPTIONAL_BOOKING_PAYMENT_INTENT_FEE_KEYS = [
  'service_fee_cents',
  'convenience_fee_cents',
  'protection_fee_cents',
  'demand_fee_cents',
  'promo_discount_cents',
] as const;

/** Refund-only keys (in addition to canonical money keys). */
export const CANONICAL_REFUND_EXTRA_METADATA_KEYS = [
  'refunded_amount_cents',
  'refund_type',
  'refund_source_payment_phase',
] as const;

/** Transfer-only keys (in addition to canonical money keys). */
export const CANONICAL_TRANSFER_EXTRA_METADATA_KEYS = [
  'transferred_total_cents',
  'payout_amount_cents',
  'linked_final_payment_intent_id',
  'pro_id',
] as const;
