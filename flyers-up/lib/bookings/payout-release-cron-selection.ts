/**
 * Payout-release cron: DB pre-filter for rows that *might* need a Stripe Connect transfer **retry**
 * (or legacy rows with no synchronous release path).
 *
 * Selection is **payment-lifecycle-driven** (not `bookings.status` / `service_status`):
 * - Primary: `payment_lifecycle_status` in {@link PAYOUT_RELEASE_CRON_LIFECYCLE_SCAN} (includes `paid`
 *   when that value is used as a settled-remainder lifecycle — avoids missing rows the eligibility layer
 *   would still treat as final-settled)
 * - Legacy: `payment_lifecycle_status` null with `final_payment_status = PAID` (older rows)
 *
 * {@link payoutReleaseCronShouldAttemptAfterImmediateGrace} skips very fresh `payout_eligible_at` rows so
 * {@link handleFinalPaymentSucceeded} can run {@link releasePayout} first without racing this job.
 *
 * Further gates (24h cooling, `requires_admin_review`, milestones, Connect, risk, protected-category
 * photos, disputes, …) live in {@link getPayoutReleaseEligibilitySnapshot} / {@link releasePayout}.
 * The cron query also requires `completed_at` as a cheap prefilter (always re-validated in code).
 */

/** Seconds after `payout_eligible_at` before cron may attempt (immediate release runs first). */
export const PAYOUT_RELEASE_CRON_IMMEDIATE_GRACE_SEC = 90;

/** Final money recorded in lifecycle columns — cron should evaluate transfer eligibility. */
export const PAYOUT_RELEASE_CRON_LIFECYCLE_SCAN = ['payout_ready', 'final_paid', 'paid'] as const;

/**
 * Returns false for rows that just became `payout_ready` (fresh `payout_eligible_at`) so the synchronous
 * {@link releasePayout} path from final settlement is not double-invoked. Legacy rows without
 * `payout_eligible_at` are always allowed.
 */
export function payoutReleaseCronShouldAttemptAfterImmediateGrace(
  row: Record<string, unknown>,
  nowMs: number = Date.now()
): boolean {
  const lc = String(row.payment_lifecycle_status ?? '').trim();
  const finalPaid = String((row as { final_payment_status?: string | null }).final_payment_status ?? '').toUpperCase() === 'PAID';
  const legacyNullLifecycle = (!lc || lc === 'null') && finalPaid;
  if (legacyNullLifecycle) return true;

  const eligibleAt = (row as { payout_eligible_at?: string | null }).payout_eligible_at;
  if (eligibleAt == null || !String(eligibleAt).trim()) return true;
  const ts = Date.parse(String(eligibleAt));
  if (!Number.isFinite(ts)) return true;
  return nowMs - ts >= PAYOUT_RELEASE_CRON_IMMEDIATE_GRACE_SEC * 1000;
}

/**
 * PostgREST `.or()` filter:
 * - (lifecycle in payout_ready|final_paid|paid) OR
 * - (lifecycle unset AND final_payment_status PAID) for legacy rows.
 */
export function payoutReleaseCronCandidateOrFilter(): string {
  const lc = PAYOUT_RELEASE_CRON_LIFECYCLE_SCAN.join(',');
  return `payment_lifecycle_status.in.(${lc}),and(payment_lifecycle_status.is.null,final_payment_status.eq.PAID)`;
}
