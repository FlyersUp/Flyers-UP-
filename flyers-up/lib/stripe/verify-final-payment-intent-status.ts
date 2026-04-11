/**
 * Live Stripe read for final (remaining) PaymentIntent — UI accuracy only; does not change payment flow.
 */

import { stripe } from '@/lib/stripe';
import {
  deriveCustomerRemainingPaymentUiState,
  type CustomerRemainingPaymentUiInput,
} from '@/lib/bookings/customer-remaining-payment-ui';

export type VerifyFinalPaymentIntentStatusResult = {
  exists: boolean;
  /** Stripe PaymentIntent.status when retrieved; null if missing / error / Stripe off. */
  status: string | null;
};

/**
 * Retrieve a PaymentIntent by id. Returns exists=false when Stripe is off, id empty, or retrieve fails.
 */
export async function verifyFinalPaymentIntentStatus(
  paymentIntentId: string | null | undefined
): Promise<VerifyFinalPaymentIntentStatusResult> {
  const id = String(paymentIntentId ?? '').trim();
  if (!id || !stripe) {
    return { exists: false, status: null };
  }
  try {
    const pi = await stripe.paymentIntents.retrieve(id);
    return { exists: true, status: pi.status };
  } catch (e) {
    console.warn('[verifyFinalPaymentIntentStatus] retrieve failed', {
      id,
      message: e instanceof Error ? e.message : String(e),
    });
    return { exists: false, status: null };
  }
}

export type FinalPaymentIntentStripeSnapshot = {
  finalPaymentIntentStripeStatus: string | null;
  /**
   * True when we performed a live Stripe read for this payload (final PI id present and lifecycle is in a
   * phase where post-review / processing truth matters). When false, customer UI must not treat Stripe
   * status as confirmed (e.g. must not show “processing payment” from a stale guess).
   */
  finalPaymentIntentStripeLiveChecked: boolean;
};

/** Lifecycle values where a stored final PI may exist and Stripe should back {@link getMoneyState} on the customer path. */
export const CUSTOMER_FINAL_PI_STRIPE_VERIFY_LIFECYCLES = new Set([
  'final_processing',
  /** After completion; auto-charge may have run while DB still lags — same PI truth as post-review `final_due`. */
  'final_pending',
  'requires_customer_action',
]);

/** When derive says post-review / processing / requires_action, we must read Stripe even if lifecycle column lags. */
export function deriveRequiresLiveFinalPaymentIntentRead(
  input: CustomerRemainingPaymentUiInput,
  nowMs: number = Date.now()
): boolean {
  if (!String(input.finalPaymentIntentId ?? '').trim()) return false;
  const raw = deriveCustomerRemainingPaymentUiState(input, nowMs);
  return (
    raw.kind === 'post_review_auto_pending' ||
    raw.kind === 'processing' ||
    raw.kind === 'requires_action'
  );
}

/**
 * When the booking is in a final-payment phase with a stored PI id, load live PaymentIntent.status from Stripe.
 * Skips the network call when there is no PI, unless {@link deriveRequiresLiveFinalPaymentIntentRead} says the
 * customer remaining-payment derive needs PI truth (e.g. `post_review_auto_pending` with a stale lifecycle).
 */
export async function resolveFinalPaymentIntentStripeSnapshotForCustomerUi(input: {
  paymentLifecycleStatus: string | null | undefined;
  finalPaymentIntentId: string | null | undefined;
  /** Same fields as the client uses for {@link deriveCustomerRemainingPaymentUiState}; enables derive-based verify. */
  deriveMoneyInput?: CustomerRemainingPaymentUiInput;
  deriveNowMs?: number;
}): Promise<FinalPaymentIntentStripeSnapshot> {
  const lc = String(input.paymentLifecycleStatus ?? '').trim().toLowerCase();
  const pi = String(input.finalPaymentIntentId ?? '').trim();
  if (!pi) {
    return { finalPaymentIntentStripeStatus: null, finalPaymentIntentStripeLiveChecked: false };
  }

  const forceFromDerive =
    input.deriveMoneyInput != null &&
    deriveRequiresLiveFinalPaymentIntentRead(input.deriveMoneyInput, input.deriveNowMs ?? Date.now());

  if (!CUSTOMER_FINAL_PI_STRIPE_VERIFY_LIFECYCLES.has(lc) && !forceFromDerive) {
    return { finalPaymentIntentStripeStatus: null, finalPaymentIntentStripeLiveChecked: false };
  }

  const { exists, status } = await verifyFinalPaymentIntentStatus(pi);
  return {
    finalPaymentIntentStripeStatus: exists ? status : null,
    finalPaymentIntentStripeLiveChecked: true,
  };
}
