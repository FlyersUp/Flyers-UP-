/**
 * Structured logs for GET /api/cron/bookings/payout-release (Vercel / serverless friendly).
 */

import type { PayoutReleaseEligibilitySnapshot } from '@/lib/bookings/payout-release-eligibility-snapshot';

export const PAYOUT_CRON_LOG_TAG = 'payout_cron_v1';

export type PayoutCronFailureReason =
  | 'not_eligible'
  | 'missing_connected_account'
  | 'dispute_open'
  | 'admin_hold'
  | 'final_payment_not_settled'
  | 'stripe_transfer_failure'
  | 'duplicate_already_released'
  | 'insufficient_evidence'
  | 'other';

export function logPayoutCronEvent(payload: Record<string, unknown>): void {
  console.info(JSON.stringify({ tag: PAYOUT_CRON_LOG_TAG, ...payload }));
}

export function payoutCronFailureReasonFromSnapshot(snap: PayoutReleaseEligibilitySnapshot): PayoutCronFailureReason {
  switch (snap.holdReason) {
    case 'dispute_open':
      return 'dispute_open';
    case 'admin_hold':
    case 'admin_review_required':
    case 'payout_blocked':
      return 'admin_hold';
    case 'missing_payment_method':
      return 'missing_connected_account';
    case 'missing_final_payment':
    case 'requires_customer_action':
    case 'charge_failed':
      return 'final_payment_not_settled';
    case 'already_released':
      return 'duplicate_already_released';
    case 'insufficient_completion_evidence':
      return 'insufficient_evidence';
    default:
      return 'not_eligible';
  }
}
