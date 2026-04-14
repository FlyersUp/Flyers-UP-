/**
 * Pure helpers for Pro earnings rows: gross `pro_earnings.amount` (USD) vs booking-level
 * `refunded_total_cents` / lifecycle. Keeps UI + aggregates honest without double-counting fees.
 */

export type ProEarningListRefundUi =
  | 'none'
  | 'partial'
  | 'full'
  /** Customer refund recorded; payout may have already been sent — we do not infer Stripe transfer reversal. */
  | 'full_after_payout';

export function proEarningGrossCents(grossAmountDollars: number): number {
  const n = Number(grossAmountDollars);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(0, Math.round(n * 100));
}

/** Refund cents attributed to this earning line (cannot exceed gross service shown to the Pro). */
export function attributedRefundCents(
  grossAmountDollars: number,
  bookingRefundedTotalCents: number | null | undefined
): number {
  const grossCents = proEarningGrossCents(grossAmountDollars);
  if (grossCents <= 0) return 0;
  const ref = Math.max(0, Math.round(Number(bookingRefundedTotalCents ?? 0) || 0));
  return Math.min(grossCents, ref);
}

export function netProEarningDollars(
  grossAmountDollars: number,
  bookingRefundedTotalCents: number | null | undefined
): number {
  const grossCents = proEarningGrossCents(grossAmountDollars);
  if (grossCents <= 0) return 0;
  const netCents = grossCents - attributedRefundCents(grossAmountDollars, bookingRefundedTotalCents);
  return Math.max(0, netCents / 100);
}

export function resolveProEarningListRefundUi(input: {
  grossAmountDollars: number;
  bookingRefundedTotalCents: number | null | undefined;
  paymentLifecycleStatus: string | null | undefined;
  payoutReleased: boolean | null | undefined;
}): { ui: ProEarningListRefundUi; statusLabel: string; detail: string | null } {
  const net = netProEarningDollars(input.grossAmountDollars, input.bookingRefundedTotalCents);
  const gross = Number(input.grossAmountDollars) > 0 ? Number(input.grossAmountDollars) : 0;
  const lc = String(input.paymentLifecycleStatus ?? '').toLowerCase();
  const attr = attributedRefundCents(input.grossAmountDollars, input.bookingRefundedTotalCents);
  const grossCents = proEarningGrossCents(input.grossAmountDollars);
  const released = input.payoutReleased === true;

  if (attr <= 0 && lc !== 'refunded' && lc !== 'partially_refunded') {
    return { ui: 'none', statusLabel: 'Paid', detail: null };
  }

  const fullyByLifecycle = lc === 'refunded';
  const partialByLifecycle = lc === 'partially_refunded';
  const fullyByMath = grossCents > 0 && attr >= grossCents;
  const partialByMath = attr > 0 && !fullyByMath;

  const isFull = fullyByLifecycle || fullyByMath;
  const isPartial = !isFull && (partialByLifecycle || partialByMath);

  if (isFull) {
    if (released) {
      return {
        ui: 'full_after_payout',
        statusLabel: 'Refunded to customer',
        detail: 'If a payout already went out for this job, a follow-up adjustment may still be processing.',
      };
    }
    return {
      ui: 'full',
      statusLabel: 'Refunded',
      detail: null,
    };
  }

  if (isPartial) {
    if (released && net < gross) {
      return {
        ui: 'partial',
        statusLabel: 'Partially refunded',
        detail: 'Customer received a partial refund. Net shown is after that refund.',
      };
    }
    return {
      ui: 'partial',
      statusLabel: 'Partially refunded',
      detail: net < gross ? 'Net shown is after the refund.' : null,
    };
  }

  if (attr > 0) {
    return {
      ui: 'partial',
      statusLabel: 'Adjusted',
      detail: null,
    };
  }

  return { ui: 'none', statusLabel: 'Paid', detail: null };
}
