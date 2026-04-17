/**
 * Admin payout review queue: CTA mode, scan labels, and copy for transfer-retry scenarios.
 * Server-safe — uses only {@link FlaggedPayoutReviewItem} fields from admin snapshots.
 */

import type { FlaggedPayoutReviewItem } from '@/lib/admin/flagged-payout-review';

const TRANSFER_FAIL_CODES = new Set(['transfer_failed', 'transfer_failed_partial']);

export function isBookingRefundedForAdminPayoutActions(item: FlaggedPayoutReviewItem): boolean {
  const rs = String(item.refundStatus ?? '').toLowerCase();
  if (rs === 'succeeded') return true;
  const lc = String(item.paymentLifecycleStatus ?? '').toLowerCase();
  return lc === 'refunded' || lc === 'partially_refunded';
}

/** True when a prior payout release attempt failed but the booking is still in manual review (retry path). */
export function flaggedPayoutReviewNeedsTransferRetry(item: FlaggedPayoutReviewItem): boolean {
  if (isBookingRefundedForAdminPayoutActions(item)) return false;
  if (item.payoutReleased === true) return false;

  const ps = String(item.payoutStatus ?? '').toLowerCase();
  if (ps === 'failed') return true;

  const bps = String(item.bookingPayoutRowStatus ?? '').toLowerCase();
  if (bps === 'failed' || bps === 'reversed') return true;

  const re = String(item.queueReleaseError ?? '').trim().toLowerCase();
  if (TRANSFER_FAIL_CODES.has(re)) return true;

  return false;
}

/** Signals that point to a Stripe Connect transfer failure (vs eligibility / booking-state blocks). */
export function payoutReviewLooksLikeStripeTransferIssue(item: FlaggedPayoutReviewItem): boolean {
  const ps = String(item.payoutStatus ?? '').toLowerCase();
  if (ps === 'failed') return true;
  const bps = String(item.bookingPayoutRowStatus ?? '').toLowerCase();
  if (bps === 'failed' || bps === 'reversed') return true;
  const re = String(item.queueReleaseError ?? '').trim().toLowerCase();
  return TRANSFER_FAIL_CODES.has(re);
}

export type AdminPayoutReleaseCtaMode = 'approve' | 'retry' | 'hidden';

/**
 * “Release payout” is for exception paths only: transfer failure (retry), explicit holds,
 * or lifecycle/queue states that indicate a payout is blocked — not routine
 * `requires_admin_review` rows that cron can auto-release when otherwise ready.
 */
export function getAdminPayoutReleaseCtaMode(item: FlaggedPayoutReviewItem): AdminPayoutReleaseCtaMode {
  if (isBookingRefundedForAdminPayoutActions(item)) return 'hidden';
  if (item.payoutReleased === true) return 'hidden';
  if (flaggedPayoutReviewNeedsTransferRetry(item)) return 'retry';

  const rs = String(item.refundStatus ?? '').toLowerCase();
  if (rs === 'pending') return 'hidden';

  const ds = String(item.disputeStatus ?? 'none').trim().toLowerCase();
  if (item.disputeOpen === true || (ds !== '' && ds !== 'none')) return 'hidden';

  const lc = String(item.paymentLifecycleStatus ?? '').toLowerCase();
  const hold = String(item.payoutHoldReason ?? '').trim().toLowerCase();
  const meaningfulHold =
    hold !== '' && hold !== 'none' && hold !== 'already_released';
  const onHoldLifecycle =
    lc === 'payout_on_hold' || lc === 'requires_customer_action' || lc === 'payment_failed';
  const qs = String(item.queueStatus ?? '').toLowerCase();
  const queueHeld = qs === 'held' || qs === 'escalated';

  if (item.payoutBlocked === true) return 'approve';
  if (onHoldLifecycle) return 'approve';
  if (meaningfulHold) return 'approve';
  if (queueHeld) return 'approve';
  if (item.suspiciousCompletion === true) return 'approve';

  return 'hidden';
}

/** Short pill for scanning the queue (orthogonal to payout_review_queue.status). */
export function getAdminPayoutReviewScanPill(item: FlaggedPayoutReviewItem): {
  label: string;
  tone: 'amber' | 'red' | 'emerald' | 'neutral';
} {
  if (isBookingRefundedForAdminPayoutActions(item)) {
    return { label: 'Refunded', tone: 'neutral' };
  }
  if (item.payoutReleased === true) {
    return { label: 'Released', tone: 'emerald' };
  }
  if (flaggedPayoutReviewNeedsTransferRetry(item)) {
    return { label: 'Retry needed', tone: 'red' };
  }
  const qs = String(item.queueStatus ?? 'pending_review');
  if (qs === 'held') return { label: 'Held', tone: 'amber' };
  if (qs === 'approved') return { label: 'Processing', tone: 'emerald' };
  if (qs === 'refunded') return { label: 'Refunded', tone: 'neutral' };
  if (qs === 'escalated') return { label: 'Escalated', tone: 'red' };
  return { label: 'Under review', tone: 'amber' };
}

export function getAdminPayoutTransferFailureHelper(item: FlaggedPayoutReviewItem): string {
  const stripeLikely = payoutReviewLooksLikeStripeTransferIssue(item);
  const parts: string[] = stripeLikely
    ? [
        'Previous payout attempt failed at Stripe (transfer declined or not created). Check the pro’s Connect account (requirements, payouts, bank), then retry.',
      ]
    : [
        'A payout release did not complete. This is often a booking-state or eligibility issue (final payment lifecycle, completion requirements, Connect destination), not necessarily a Stripe transfer decline. Open the booking, review flags and the error from your last attempt, then retry after fixing state.',
      ];
  const block = item.bookingPayoutBlockReason?.trim();
  if (block) {
    parts.push(`Last recorded detail: ${block}`);
  }
  const note = item.queueReleaseNote?.trim();
  if (note && note !== block) {
    parts.push(note);
  }
  return parts.join(' ');
}
