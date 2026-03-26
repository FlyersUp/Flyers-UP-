/**
 * Compute cents refunded in a Stripe charge.refunded webhook from previous_attributes.
 * Idempotent replays of the same event yield delta 0.
 */
export function computeChargeRefundedDeltaCents(eventData: {
  object: { amount_refunded?: number | null };
  previous_attributes?: { amount_refunded?: number | null };
}): number {
  const charge = eventData.object;
  const prevRaw = eventData.previous_attributes?.amount_refunded;
  const prev = typeof prevRaw === 'number' && Number.isFinite(prevRaw) ? Math.max(0, Math.round(prevRaw)) : 0;
  const current = typeof charge.amount_refunded === 'number' && Number.isFinite(charge.amount_refunded)
    ? Math.max(0, Math.round(charge.amount_refunded))
    : 0;
  return Math.max(0, current - prev);
}
