/**
 * Whether the customer has no further balance to pay on a booking (aligns with receipt "Paid in full" / remaining $0).
 * Used to hide misleading “pay balance” CTAs while status may still be awaiting_customer_confirmation.
 */
export type CustomerMoneySettlementInput = {
  finalPaymentStatus?: string | null;
  paidRemainingAt?: string | null;
  fullyPaidAt?: string | null;
  amountRemaining?: number | null;
};

export function isCustomerMoneyFullySettled(s: CustomerMoneySettlementInput): boolean {
  if (String(s.finalPaymentStatus ?? '').toUpperCase() === 'PAID') return true;
  if (s.paidRemainingAt) return true;
  if (s.fullyPaidAt) return true;
  const r = s.amountRemaining;
  if (typeof r === 'number' && Number.isFinite(r) && r <= 0) return true;
  return false;
}
