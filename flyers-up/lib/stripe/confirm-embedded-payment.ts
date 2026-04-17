import type { Stripe, StripeElements } from '@stripe/stripe-js';

export type ConfirmEmbeddedPaymentResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Shared confirm for Payment Element + Express Checkout Element (same Elements + clientSecret).
 * Matches existing confirmPayment({ elements, confirmParams: { return_url } }) behavior.
 */
export async function confirmEmbeddedPayment(args: {
  stripe: Stripe | null;
  elements: StripeElements | null;
  returnUrl: string;
}): Promise<ConfirmEmbeddedPaymentResult> {
  const { stripe, elements, returnUrl } = args;
  if (!stripe || !elements) {
    return { ok: false, message: 'Payment is still loading. Please wait a moment.' };
  }

  const { error } = await stripe.confirmPayment({
    elements,
    confirmParams: {
      return_url: returnUrl,
      receipt_email: undefined,
    },
  });

  if (error) {
    return { ok: false, message: error.message ?? 'Payment failed' };
  }
  return { ok: true };
}
