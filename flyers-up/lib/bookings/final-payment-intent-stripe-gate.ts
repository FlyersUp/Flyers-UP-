/**
 * Pure helpers for mapping Stripe PaymentIntent.status → customer payment-card UI.
 * Safe for client bundles (no Stripe SDK).
 */

/** Statuses where a charge is still in flight in Stripe’s view. */
export const STRIPE_FINAL_PAYMENT_INTENT_IN_FLIGHT_STATUSES = [
  'processing',
  'requires_capture',
  'requires_action',
] as const;

export function isStripeFinalPaymentIntentInFlightStatus(status: string | null | undefined): boolean {
  const s = String(status ?? '').trim().toLowerCase();
  return (STRIPE_FINAL_PAYMENT_INTENT_IN_FLIGHT_STATUSES as readonly string[]).includes(s);
}
