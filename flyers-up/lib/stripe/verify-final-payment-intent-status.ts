/**
 * Live Stripe read for final (remaining) PaymentIntent — UI accuracy only; does not change payment flow.
 */

import { stripe } from '@/lib/stripe';

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
   * True when we performed a live Stripe read for this payload (only when lifecycle is final_processing
   * and a final PI id exists). When false, customer UI must not show “processing payment”.
   */
  finalPaymentIntentStripeLiveChecked: boolean;
};

/**
 * When the booking is in final_processing with a stored PI id, load live status from Stripe for the UI gate.
 * Otherwise skip the network call and mark liveChecked false (normalization ignores for non-processing states).
 */
export async function resolveFinalPaymentIntentStripeSnapshotForCustomerUi(input: {
  paymentLifecycleStatus: string | null | undefined;
  finalPaymentIntentId: string | null | undefined;
}): Promise<FinalPaymentIntentStripeSnapshot> {
  const lc = String(input.paymentLifecycleStatus ?? '').trim().toLowerCase();
  const pi = String(input.finalPaymentIntentId ?? '').trim();
  if (lc !== 'final_processing' || !pi) {
    return { finalPaymentIntentStripeStatus: null, finalPaymentIntentStripeLiveChecked: false };
  }
  const { exists, status } = await verifyFinalPaymentIntentStatus(pi);
  return {
    finalPaymentIntentStripeStatus: exists ? status : null,
    finalPaymentIntentStripeLiveChecked: true,
  };
}
