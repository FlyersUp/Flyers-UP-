/**
 * Committed booking states for calendar visibility.
 * Bookings in these states have a scheduled date/time and appear in calendar.
 * Excludes: draft, quote_sent, awaiting_deposit_payment, cancelled, declined, expired.
 */

export const CALENDAR_COMMITTED_STATUSES = [
  'deposit_paid',
  'accepted',
  'scheduled',
  'pro_en_route',
  'on_the_way',
  'arrived',
  'in_progress',
  'completed_pending_payment',
  'awaiting_payment',
  'awaiting_remaining_payment',
  'awaiting_customer_confirmation',
] as const;

export function isCalendarCommittedStatus(status: string): boolean {
  return (CALENDAR_COMMITTED_STATUSES as readonly string[]).includes(status);
}
