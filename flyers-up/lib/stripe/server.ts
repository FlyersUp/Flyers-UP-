/**
 * Single Stripe client module for all server-side Stripe calls.
 * Uses STRIPE_SECRET_KEY. Never expose to client.
 */

import Stripe from 'stripe';

import {
  assertCanonicalRefundMetadataDev,
  assertCanonicalTransferMetadataDev,
} from '@/lib/stripe/payment-metadata';

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
 *
 * **Stripe Connect:** Refunding the charge credits the **customer** from the platform Stripe balance.
 * An outbound **Transfer** to a connected account is **not** reversed automatically — reconciling
 * post-payout refunds (recovery / clawback) is a separate operational step. Callers must not assume
 * the pro’s Connect balance was debited by this API alone.
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
    const meta = reasonMetadata ?? {};
    if (Object.keys(meta).length > 0) {
      assertCanonicalRefundMetadataDev(meta, 'refundPaymentIntent');
    }
    const refund = await s.refunds.create(
      {
        charge: chargeId,
        metadata: meta,
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
 * Partial (or exact-amount) refund against a PaymentIntent. Amount is in cents (smallest currency unit).
 * Prefer this for admin partial refunds; do not use full-charge refund for partial amounts.
 *
 * Same **Connect / Transfer** caveat as {@link refundPaymentIntent}: no automatic reversal of funds
 * already transferred to the connected account.
 */
export async function refundPaymentIntentPartial(
  paymentIntentId: string,
  amountCents: number,
  options?: {
    metadata?: Record<string, string>;
    /** Defaults to partial-refund-{pi}-{amount} for safe retries of the same partial */
    idempotencyKey?: string;
  }
): Promise<string | null> {
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    console.warn('[stripe] refundPaymentIntentPartial: invalid amount', amountCents);
    return null;
  }
  try {
    const s = getStripe();
    const idempotencyKey =
      options?.idempotencyKey ?? `partial-refund-${paymentIntentId}-${Math.round(amountCents)}`;
    const partialMeta = options?.metadata ?? {};
    if (Object.keys(partialMeta).length > 0) {
      assertCanonicalRefundMetadataDev(partialMeta, 'refundPaymentIntentPartial');
    }
    const refund = await s.refunds.create(
      {
        payment_intent: paymentIntentId,
        amount: Math.round(amountCents),
        metadata: partialMeta,
      },
      { idempotencyKey }
    );
    return refund.id;
  } catch (err) {
    console.error('[stripe] refundPaymentIntentPartial failed', paymentIntentId, amountCents, err);
    return null;
  }
}

/**
 * Stripe fee + net (cents) from the charge BalanceTransaction for a PaymentIntent.
 * `net` is Stripe's settled net on that balance transaction (after fees).
 * Returns null if the charge or balance transaction is not available yet.
 */
export async function retrieveStripeBalancePartsForPaymentIntent(
  paymentIntentId: string
): Promise<{ feeCents: number; netCents: number } | null> {
  try {
    const s = getStripe();
    const pi = await s.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge.balance_transaction'],
    });
    const lc = pi.latest_charge;
    if (!lc) return null;

    async function partsFromBalanceTransaction(
      bt: string | Stripe.BalanceTransaction | null
    ): Promise<{ feeCents: number; netCents: number } | null> {
      if (bt == null) return null;
      const obj =
        typeof bt === 'string' ? await s.balanceTransactions.retrieve(bt) : bt;
      if (typeof obj.fee !== 'number' || typeof obj.net !== 'number') return null;
      return { feeCents: obj.fee, netCents: obj.net };
    }

    if (typeof lc === 'string') {
      const charge = await s.charges.retrieve(lc, { expand: ['balance_transaction'] });
      return partsFromBalanceTransaction(charge.balance_transaction);
    }

    return partsFromBalanceTransaction(lc.balance_transaction);
  } catch (err) {
    console.warn(
      '[stripe] retrieveStripeBalancePartsForPaymentIntent failed',
      paymentIntentId,
      err
    );
    return null;
  }
}

/** @deprecated Prefer retrieveStripeBalancePartsForPaymentIntent for fee + net. */
export async function retrieveStripeProcessingFeeCentsForPaymentIntent(
  paymentIntentId: string
): Promise<number | null> {
  const p = await retrieveStripeBalancePartsForPaymentIntent(paymentIntentId);
  return p?.feeCents ?? null;
}

/**
 * Create transfer to connected account.
 * TODO: Platform fee logic - currently transfers full amount.
 */

export type CreateTransferParams = {
  amount: number; // cents
  currency: string;
  destinationAccountId: string;
  bookingId: string;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
};

type CreateTransferImpl = (params: CreateTransferParams) => Promise<string | null>;

let createTransferIntegrationTestOverride: CreateTransferImpl | null = null;

/** Replace Stripe Connect transfers (integration tests only). Pass null to restore default behavior. */
export function setCreateTransferForIntegrationTest(fn: CreateTransferImpl | null): void {
  createTransferIntegrationTestOverride = fn;
}

export async function createTransfer(params: CreateTransferParams): Promise<string | null> {
  if (createTransferIntegrationTestOverride) {
    return createTransferIntegrationTestOverride(params);
  }
  try {
    const s = getStripe();
    const idempotencyKey = params.idempotencyKey ?? `payout-${params.bookingId}`;
    const meta: Record<string, string> = {
      booking_id: params.bookingId,
      bookingId: params.bookingId,
      ...params.metadata,
    };
    if (params.metadata && Object.keys(params.metadata).length > 0) {
      assertCanonicalTransferMetadataDev(meta, 'createTransfer');
    }
    const t = await s.transfers.create(
      {
        amount: params.amount,
        currency: params.currency,
        destination: params.destinationAccountId,
        metadata: meta,
      },
      { idempotencyKey }
    );
    return t.id;
  } catch (err) {
    console.error('[stripe] createTransfer failed', params.bookingId, err);
    return null;
  }
}
