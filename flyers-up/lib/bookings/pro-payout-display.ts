/**
 * Pro-facing payout UI — delegates lifecycle to {@link getMoneyState}.
 * Client-safe (no Stripe SDK).
 */

import {
  bookingDetailsToMoneyStateInput,
  getMoneyState,
  type MoneyPayoutPhase,
  type MoneyState,
  type MoneyStateBookingInput,
  type MoneyStripeSnapshot,
} from '@/lib/bookings/money-state';

export type ProPayoutStripeSnapshot = {
  payoutTransferStripeStatus: string | null;
  /** True after server attempted a live Stripe transfers.retrieve for this booking. */
  payoutTransferStripeLiveChecked: boolean;
  /**
   * True when the server resolved a non-empty transfer id (bookings.payout_transfer_id or
   * legacy booking_payouts.stripe_transfer_id). Lets the UI treat legacy payouts correctly
   * when the anon client cannot read booking_payouts.
   */
  payoutTransferIdPresent?: boolean;
};

export function isStripeTransferPaidStatus(status: string | null | undefined): boolean {
  return String(status ?? '').trim().toLowerCase() === 'paid';
}

/** Map live transfer verify hook output into {@link getMoneyState} stripe snapshot. */
export function proPayoutStripeToMoneySnapshot(s: ProPayoutStripeSnapshot): MoneyStripeSnapshot {
  if (s.payoutTransferStripeLiveChecked !== true) return {};
  return { transferStatus: s.payoutTransferStripeStatus ?? null };
}

function proYouGotPaidBookingInput(
  input: {
    payoutReleased: boolean;
    payoutTransferId?: string | null;
    requiresAdminReview?: boolean | null;
    paidRemainingAt?: string | null;
    fullyPaidAt?: string | null;
    finalPaymentStatus?: string | null;
    paymentLifecycleStatus?: string | null;
    status?: string;
    paymentStatus?: string | null;
    paidDepositAt?: string | null;
    paidAt?: string | null;
    completedAt?: string | null;
    amountRemaining?: number | null;
    remainingDueAt?: string | null;
  }
): MoneyStateBookingInput {
  return {
    status: input.status,
    paymentStatus: input.paymentStatus,
    paymentLifecycleStatus: input.paymentLifecycleStatus,
    finalPaymentStatus: input.finalPaymentStatus,
    paidDepositAt: input.paidDepositAt,
    paidAt: input.paidAt,
    paidRemainingAt: input.paidRemainingAt,
    fullyPaidAt: input.fullyPaidAt,
    completedAt: input.completedAt,
    amountRemaining: input.amountRemaining,
    remainingDueAt: input.remainingDueAt,
    requiresAdminReview: input.requiresAdminReview,
    payoutReleased: input.payoutReleased,
    payoutTransferId: input.payoutTransferId,
  };
}

/**
 * Show “You got paid” only when {@link getMoneyState} reports `payout_paid` (Stripe transfer paid).
 */
export function computeProYouGotPaidVisible(
  input: {
    proEarningsCents: number;
    payoutReleased: boolean;
    payoutTransferId?: string | null;
    requiresAdminReview?: boolean | null;
    paidRemainingAt?: string | null;
    fullyPaidAt?: string | null;
    finalPaymentStatus?: string | null;
    paymentLifecycleStatus?: string | null;
    status?: string;
    paymentStatus?: string | null;
    paidDepositAt?: string | null;
    paidAt?: string | null;
    completedAt?: string | null;
    amountRemaining?: number | null;
    remainingDueAt?: string | null;
  } & ProPayoutStripeSnapshot
): boolean {
  if (input.proEarningsCents <= 0) return false;
  const money = getMoneyState(proYouGotPaidBookingInput(input), proPayoutStripeToMoneySnapshot(input));
  return computeProYouGotPaidVisibleFromMoney(input.proEarningsCents, money);
}

export function computeProYouGotPaidVisibleFromMoney(proEarningsCents: number, money: MoneyState): boolean {
  return proEarningsCents > 0 && money.payout === 'payout_paid';
}

/**
 * Effective payoutStatus string for {@link PayoutTimeline} from {@link getMoneyState}.
 */
export function computeProPayoutTimelineStatus(
  input: {
    customerPaid: boolean;
    payoutReleased: boolean;
    payoutTransferId?: string | null;
    dbPayoutStatus?: string | null;
    requiresAdminReview?: boolean | null;
    paidRemainingAt?: string | null;
    fullyPaidAt?: string | null;
    finalPaymentStatus?: string | null;
    paymentLifecycleStatus?: string | null;
    status?: string;
    paymentStatus?: string | null;
    paidDepositAt?: string | null;
    paidAt?: string | null;
    completedAt?: string | null;
    amountRemaining?: number | null;
    remainingDueAt?: string | null;
  } & ProPayoutStripeSnapshot
): string {
  const dbRaw = input.dbPayoutStatus ?? 'none';

  if (!input.customerPaid) {
    return dbRaw;
  }

  const money = getMoneyState(proYouGotPaidBookingInput(input), proPayoutStripeToMoneySnapshot(input));

  if (money.payout === 'inactive') {
    return dbRaw;
  }

  if (money.payout === 'payout_held') {
    return dbRaw;
  }

  if (money.payout === 'payout_scheduled') {
    return 'pending';
  }

  if (money.payout === 'payout_paid') {
    return 'paid';
  }

  if (money.payout === 'payout_failed') {
    return 'failed';
  }

  const st = String(input.payoutTransferStripeStatus ?? '').trim().toLowerCase();
  if (st === 'in_transit') return 'in_transit';

  return 'pending';
}

/**
 * Convenience: full {@link BookingDetails} + live transfer snapshot.
 */
export function getProMoneyStateFromBooking(
  booking: Parameters<typeof bookingDetailsToMoneyStateInput>[0],
  payoutStripe: ProPayoutStripeSnapshot
) {
  return getMoneyState(bookingDetailsToMoneyStateInput(booking), proPayoutStripeToMoneySnapshot(payoutStripe));
}

const VERIFY_TRANSFER_PHASES: MoneyPayoutPhase[] = [
  'payout_processing',
  'payout_paid',
  'payout_failed',
];

export function proShouldFetchTransferStripeVerify(payoutPhase: MoneyPayoutPhase): boolean {
  return VERIFY_TRANSFER_PHASES.includes(payoutPhase);
}
