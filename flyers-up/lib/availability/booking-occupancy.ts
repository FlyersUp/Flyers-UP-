/**
 * Customer-facing slot blocking: committed / paid pipeline stages hold the calendar.
 * Requested / pending / cancelled / expired do not block (multiple customers may request the same window).
 */

const HOLDS_SCHEDULED_SLOT = new Set<string>([
  'accepted',
  'accepted_pending_payment',
  'payment_required',
  'awaiting_deposit_payment',
  'deposit_paid',
  'fully_paid',
  'pro_en_route',
  'on_the_way',
  'arrived',
  'in_progress',
]);

/**
 * True if this booking status removes time from the customer-visible bookable grid
 * and should count as overlap at deposit validation.
 */
export function bookingStatusBlocksCustomerSlots(status: string | null | undefined): boolean {
  const s = (status ?? '').trim();
  if (!s) return false;
  return HOLDS_SCHEDULED_SLOT.has(s);
}
