/**
 * Payout-release cron: DB pre-filter for rows that *might* need a Stripe Connect transfer.
 *
 * Selection is **payment-lifecycle-driven** (not `bookings.status` / `service_status`):
 * - Primary: `payment_lifecycle_status` in {@link PAYOUT_RELEASE_CRON_LIFECYCLE_SCAN}
 * - Legacy: `payment_lifecycle_status` null with `final_payment_status = PAID` (older rows)
 *
 * Further gates (photos, timestamps, Connect, risk, admin review) live in
 * {@link getPayoutReleaseEligibilitySnapshot} / {@link releasePayout}.
 */

/** Final money recorded in lifecycle columns — cron should evaluate transfer eligibility. */
export const PAYOUT_RELEASE_CRON_LIFECYCLE_SCAN = ['payout_ready', 'final_paid'] as const;

/**
 * PostgREST `.or()` filter:
 * - (lifecycle in payout_ready|final_paid) OR
 * - (lifecycle unset AND final_payment_status PAID) for legacy rows.
 */
export function payoutReleaseCronCandidateOrFilter(): string {
  const lc = PAYOUT_RELEASE_CRON_LIFECYCLE_SCAN.join(',');
  return `payment_lifecycle_status.in.(${lc}),and(payment_lifecycle_status.is.null,final_payment_status.eq.PAID)`;
}
