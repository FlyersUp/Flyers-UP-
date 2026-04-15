/**
 * Multi–PaymentIntent full refunds must succeed on every PI before the booking is marked fully refunded.
 * Single-PI flows pass `attempted === 1` (or 0 when no PI).
 */
export function refundBatchIsComplete(attempted: number, succeededCount: number): boolean {
  if (attempted <= 0) return true;
  return succeededCount === attempted;
}
