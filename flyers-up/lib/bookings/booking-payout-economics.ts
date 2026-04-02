import { computeNetToPro } from '@/lib/bookings/money';

/**
 * Canonical booking-row inputs for payout / finance summaries.
 * On modern checkout, `total_amount_cents` = full customer total and
 * `customer_fees_retained_cents` = **all** customer-facing Flyers Up fees
 * (service + convenience + protection + demand). Pro intended share ≈ `amount_subtotal`.
 */
export type BookingEconomicsRow = {
  total_amount_cents?: number | null;
  amount_total?: number | null;
  customer_fees_retained_cents?: number | null;
  amount_platform_fee?: number | null;
  refunded_total_cents?: number | null;
  amount_subtotal?: number | null;
};

export type ProPayoutResolution = {
  payoutCents: number;
  cappedToSubtotal: boolean;
  warnings: string[];
};

/**
 * Stripe.transfer amount to the pro's Connect account (before eligibility / risk gates).
 * Formula: max(0, customer_total - platform_fees_retained - refunded).
 * If `amount_subtotal` is present and the formula exceeds it (bad/missing fee columns), payout is **capped** to subtotal.
 */
export function resolveProPayoutTransferCents(row: BookingEconomicsRow): ProPayoutResolution {
  const warnings: string[] = [];
  const customerTotal = Math.max(
    0,
    Math.round(Number(row.total_amount_cents ?? row.amount_total ?? 0) || 0)
  );
  const platformFees = Math.max(
    0,
    Math.round(
      Number(row.customer_fees_retained_cents ?? row.amount_platform_fee ?? 0) || 0
    )
  );
  const refunded = Math.max(0, Math.round(Number(row.refunded_total_cents ?? 0) || 0));
  const subtotal =
    row.amount_subtotal != null ? Math.max(0, Math.round(Number(row.amount_subtotal) || 0)) : 0;

  let payout = computeNetToPro(customerTotal, platformFees, refunded);
  let cappedToSubtotal = false;

  if (subtotal > 0 && payout > subtotal) {
    warnings.push('pro_payout_exceeded_amount_subtotal_capped');
    payout = subtotal;
    cappedToSubtotal = true;
  }

  return { payoutCents: Math.max(0, payout), cappedToSubtotal, warnings };
}

/** Finance snapshot for admin / reporting (Stripe fees are optional — not stored on booking row). */
export type BookingPayoutEconomicsSnapshot = {
  customerTotalCents: number;
  platformFeesRetainedCents: number;
  proServiceSubtotalCents: number | null;
  refundedTotalCents: number;
  proPayoutTransferCents: number;
  /** customer_total - pro_payout (before Stripe processing). Ignores refund nuance; use ledger for refunds. */
  platformGrossRevenueCents: number;
  stripeProcessingFeesCents: number | null;
  /** customer_total - stripe_fees - pro_payout when stripe fees provided. */
  platformNetRevenueCents: number | null;
  cappedProPayoutToSubtotal: boolean;
  warnings: string[];
};

export function buildBookingPayoutEconomicsSnapshot(
  row: BookingEconomicsRow,
  stripeProcessingFeesCents: number | null = null
): BookingPayoutEconomicsSnapshot {
  const customerTotalCents = Math.max(
    0,
    Math.round(Number(row.total_amount_cents ?? row.amount_total ?? 0) || 0)
  );
  const platformFeesRetainedCents = Math.max(
    0,
    Math.round(
      Number(row.customer_fees_retained_cents ?? row.amount_platform_fee ?? 0) || 0
    )
  );
  const refundedTotalCents = Math.max(0, Math.round(Number(row.refunded_total_cents ?? 0) || 0));
  const rawSub = row.amount_subtotal != null ? Math.round(Number(row.amount_subtotal) || 0) : null;
  const proServiceSubtotalCents = rawSub != null && rawSub >= 0 ? rawSub : null;

  const { payoutCents, cappedToSubtotal, warnings } = resolveProPayoutTransferCents(row);

  const platformGrossRevenueCents = Math.max(0, customerTotalCents - payoutCents);
  const platformNetRevenueCents =
    stripeProcessingFeesCents != null && Number.isFinite(stripeProcessingFeesCents)
      ? Math.max(0, customerTotalCents - Math.round(stripeProcessingFeesCents) - payoutCents)
      : null;

  return {
    customerTotalCents,
    platformFeesRetainedCents,
    proServiceSubtotalCents,
    refundedTotalCents,
    proPayoutTransferCents: payoutCents,
    platformGrossRevenueCents,
    stripeProcessingFeesCents,
    platformNetRevenueCents,
    cappedProPayoutToSubtotal: cappedToSubtotal,
    warnings,
  };
}
