/**
 * Maps Stripe final-charge failures to a coarse retry reason for cron + UX.
 * NULL on legacy rows: treat as unknown for scheduling (full legacy retry window).
 */

export const FINAL_PAYMENT_RETRY_REASONS = [
  'insufficient_funds',
  'card_declined',
  'requires_action',
  'unknown',
] as const;

export type FinalPaymentRetryReason = (typeof FINAL_PAYMENT_RETRY_REASONS)[number];

export function isFinalPaymentRetryReason(v: string | null | undefined): v is FinalPaymentRetryReason {
  return (
    v === 'insufficient_funds' ||
    v === 'card_declined' ||
    v === 'requires_action' ||
    v === 'unknown'
  );
}

export function mapStripeFailureCodeToFinalPaymentRetryReason(
  code: string | null | undefined
): FinalPaymentRetryReason {
  const c = String(code ?? 'unknown')
    .trim()
    .toLowerCase();
  if (c === 'insufficient_funds') return 'insufficient_funds';
  if (c === 'card_declined') return 'card_declined';
  if (c === 'authentication_required' || c === 'requires_action') return 'requires_action';
  return 'unknown';
}

/** `final_charge_retry_count` must stay strictly below this for cron auto-retry. */
export function finalPaymentAutoRetryCountCeiling(
  reason: FinalPaymentRetryReason | null | undefined
): number {
  if (reason === 'card_declined') return 2;
  return 3;
}

/**
 * Hours after `payment_failed_at` before the next cron attempt.
 * `failureCount` = `bookings.final_charge_retry_count` while row is still `payment_failed`.
 */
export function hoursBeforeNextFinalPaymentCronAttempt(failureCount: number): number {
  return failureCount <= 1 ? 12 : 48;
}
