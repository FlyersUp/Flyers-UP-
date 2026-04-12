/**
 * Payout review queue row statuses (see migration 122_payout_review_queue_status_workflow.sql).
 * Rows that still need admin attention remain visible with requires_admin_review on the booking.
 */

/** Newly flagged or not yet terminal — eligible for approve / keep on hold / deny / escalate. */
export const PAYOUT_REVIEW_QUEUE_OPEN_STATUSES = ['pending_review', 'held'] as const;

export type PayoutReviewQueueOpenStatus = (typeof PAYOUT_REVIEW_QUEUE_OPEN_STATUSES)[number];

export function isPayoutReviewQueueOpenStatus(status: string | null | undefined): boolean {
  const s = String(status ?? '').trim();
  return (PAYOUT_REVIEW_QUEUE_OPEN_STATUSES as readonly string[]).includes(s);
}
