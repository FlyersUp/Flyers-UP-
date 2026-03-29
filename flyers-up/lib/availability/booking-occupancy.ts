/**
 * Customer-facing slot blocking: only firm commitments reduce availability.
 * Requested / pending requests do not block (multiple customers may request the same window).
 */

const BLOCKS_CUSTOMER_SLOTS = new Set<string>([
  'accepted',
  'pro_en_route',
  'on_the_way',
  'in_progress',
]);

/**
 * True if this booking status removes time from the customer-visible bookable grid.
 */
export function bookingStatusBlocksCustomerSlots(status: string | null | undefined): boolean {
  const s = (status ?? '').trim();
  if (!s) return false;
  return BLOCKS_CUSTOMER_SLOTS.has(s);
}
