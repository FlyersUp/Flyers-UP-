/**
 * When a customer may open the booking review flow (UI + review page + submit action).
 * Keep in sync across BookingActionsBar, review page, and submitReviewAction.
 */
export const CUSTOMER_BOOKING_REVIEW_ELIGIBLE_STATUSES: readonly string[] = [
  'completed',
  'completed_pending_payment',
  'awaiting_payment',
  'awaiting_remaining_payment',
  'awaiting_customer_confirmation',
  'review_pending',
  'paid',
  'fully_paid',
  'customer_confirmed',
  'auto_confirmed',
  'payout_released',
];

export function isCustomerBookingEligibleForReview(status: string): boolean {
  return CUSTOMER_BOOKING_REVIEW_ELIGIBLE_STATUSES.includes(status);
}
