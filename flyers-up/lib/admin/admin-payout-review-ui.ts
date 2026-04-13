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
  if (re.includes('transfer') && re.includes('fail')) return true;

  return false;
}

export type AdminPayoutReleaseCtaMode = 'approve' | 'retry' | 'hidden';

export function getAdminPayoutReleaseCtaMode(item: FlaggedPayoutReviewItem): AdminPayoutReleaseCtaMode {
  if (isBookingRefundedForAdminPayoutActions(item)) return 'hidden';
  if (item.payoutReleased === true) return 'hidden';
  if (flaggedPayoutReviewNeedsTransferRetry(item)) return 'retry';
  return 'approve';
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
  const parts: string[] = [
    'Previous payout attempt failed. This usually means the connected Stripe account is not fully ready or Stripe could not complete the transfer. Review account readiness, then retry.',
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
