/**
 * Money breakdown for bookings.
 * Computes platform fee, deposit, remaining at pricing time.
 * 15% platform fee = 1500 bps.
 */

export const PLATFORM_FEE_BPS = 1500; // 15%

export interface MoneyBreakdown {
  total_amount_cents: number;
  platform_fee_bps: number;
  /** Take-rate slice from quote total (bps); not the same as DB `customer_fees_retained_cents`. */
  platform_fee_cents: number;
  deposit_amount_cents: number;
  remaining_amount_cents: number;
  deposit_percent: number;
}

/**
 * Compute money breakdown once at pricing time (legacy quote split helper).
 * - platform_fee_cents = round(total * platform_fee_bps / 10000) — diagnostic only; deposit flow stores
 *   full customer fees in `customer_fees_retained_cents` from {@link computeBookingPricing}.
 * - deposit_amount_cents = round(total * deposit_percent / 100)
 * - remaining_amount_cents = total - deposit_amount_cents
 */
export function computeMoneyBreakdown(
  total_amount_cents: number,
  deposit_percent: number,
  platform_fee_bps: number = PLATFORM_FEE_BPS
): MoneyBreakdown {
  const total = Math.max(0, Math.round(total_amount_cents));
  const dp = Math.max(10, Math.min(100, Math.round(deposit_percent)));
  const bps = Math.max(0, Math.min(10000, platform_fee_bps));

  const platform_fee_cents = Math.round((total * bps) / 10000);
  const deposit_amount_cents = Math.round((total * dp) / 100);
  const remaining_amount_cents = Math.max(0, total - deposit_amount_cents);

  return {
    total_amount_cents: total,
    platform_fee_bps: bps,
    platform_fee_cents,
    deposit_amount_cents,
    remaining_amount_cents,
    deposit_percent: dp,
  };
}

/**
 * Net amount to transfer to pro: max(0, customer_total - customer_fees_retained - refunded).
 *
 * `total_amount_cents` = customer total charged (deposit + final).
 * `customerFeesRetainedCents` = DB `customer_fees_retained_cents`: full customer-facing fee bucket.
 */
export function computeNetToPro(
  total_amount_cents: number,
  customerFeesRetainedCents: number,
  refunded_total_cents: number
): number {
  return Math.max(
    0,
    total_amount_cents - customerFeesRetainedCents - refunded_total_cents
  );
}
