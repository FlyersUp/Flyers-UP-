/**
 * True when the app is wired to Stripe **test** publishable keys (pk_test_…).
 * Used for Apple App Review copy: reviewers should use Stripe test cards only.
 */
export function isStripeTestPublishableKey(): boolean {
  const k = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return typeof k === 'string' && k.startsWith('pk_test_');
}
