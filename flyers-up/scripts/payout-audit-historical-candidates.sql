-- Read-only candidate set for historical payout audit.
-- Economics resolution and flags are applied in TypeScript:
--   lib/bookings/payout-audit-historical.ts
--   scripts/payout-audit-historical.ts
--
-- Join payout rows so analysts can compare booking_payouts.amount_cents vs bookings.transferred_total_cents.

SELECT
  b.id,
  b.created_at,
  b.total_amount_cents,
  b.amount_total,
  b.customer_total_cents,
  b.fee_total_cents,
  b.service_fee_cents,
  b.convenience_fee_cents,
  b.protection_fee_cents,
  b.demand_fee_cents,
  b.subtotal_cents,
  b.pro_earnings_cents,
  b.customer_fees_retained_cents,
  b.platform_fee_cents,
  b.amount_platform_fee,
  b.amount_subtotal,
  b.refunded_total_cents,
  b.amount_refunded_cents,
  b.transferred_total_cents,
  b.payout_amount_cents,
  b.payout_released,
  b.stripe_transfer_id,
  b.payout_transfer_id,
  bp.amount_cents AS booking_payouts_amount_cents,
  bp.stripe_transfer_id AS booking_payouts_stripe_transfer_id
FROM public.bookings b
LEFT JOIN public.booking_payouts bp ON bp.booking_id = b.id
WHERE
  b.payout_released = TRUE
  OR COALESCE(b.transferred_total_cents, 0) > 0
  OR COALESCE(b.payout_amount_cents, 0) > 0
  OR (b.stripe_transfer_id IS NOT NULL AND btrim(b.stripe_transfer_id) <> '')
  OR (b.payout_transfer_id IS NOT NULL AND btrim(b.payout_transfer_id) <> '')
ORDER BY b.created_at ASC;
