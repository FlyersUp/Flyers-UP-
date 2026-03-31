/**
 * Single Stripe client module for all server-side Stripe calls.
 * Uses STRIPE_SECRET_KEY. Never expose to client.
 */

import Stripe from 'stripe';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.trim()) {
    throw new Error('STRIPE_SECRET_KEY is required for Stripe operations.');
  }
  return new Stripe(key);
}

/** Lazy-initialized Stripe client. Throws if STRIPE_SECRET_KEY missing. */
export const stripe = (() => {
  try {
    return getStripe();
  } catch {
    return null as unknown as Stripe;
  }
})();

/**
 * Refund a PaymentIntent or its latest charge.
 * Safe to call; logs errors. Returns refund id or null.
 */
export async function refundPaymentIntent(
  paymentIntentId: string,
  reasonMetadata?: Record<string, string>
): Promise<string | null> {
  try {
    const s = getStripe();
    const pi = await s.paymentIntents.retrieve(paymentIntentId);
    const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id;
    if (!chargeId) {
      console.warn('[stripe] No charge to refund for PI', paymentIntentId);
      return null;
    }
    const refund = await s.refunds.create(
      {
        charge: chargeId,
        metadata: reasonMetadata ?? {},
      },
      { idempotencyKey: `refund-${paymentIntentId}` }
    );
    return refund.id;
  } catch (err) {
    console.error('[stripe] refundPaymentIntent failed', paymentIntentId, err);
    return null;
  }
}

/**
 * Create transfer to connected account.
 * TODO: Platform fee logic - currently transfers full amount.
 */
export async function createTransfer(params: {
  amount: number; // cents
  currency: string;
  destinationAccountId: string;
  bookingId: string;
}): Promise<string | null> {
  try {
    const s = getStripe();
    const idempotencyKey = `payout-${params.bookingId}`;
    const t = await s.transfers.create(
      {
        amount: params.amount,
        currency: params.currency,
        destination: params.destinationAccountId,
        metadata: { bookingId: params.bookingId },
      },
      { idempotencyKey }
    );
    return t.id;
  } catch (err) {
    console.error('[stripe] createTransfer failed', params.bookingId, err);
    return null;
  }
}
