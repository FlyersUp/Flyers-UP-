import { getMoneyState, type MoneyStateBookingInput, type MoneyStripeSnapshot } from '@/lib/bookings/money-state';
import { getProAutomatedPayoutStatusMessageFromMoney } from '@/lib/bookings/money-presentation';

type PayoutStripeFields = {
  paidRemainingAt?: string | null;
  payoutReleased?: boolean | null;
  payoutTransferStripeLiveChecked?: boolean;
  payoutTransferStripeStatus?: string | null;
};

function payoutMessageToMoney(input: PayoutStripeFields): {
  booking: MoneyStateBookingInput;
  stripe: MoneyStripeSnapshot;
} {
  const stripe: MoneyStripeSnapshot =
    input.payoutTransferStripeLiveChecked === true
      ? { transferStatus: input.payoutTransferStripeStatus ?? null }
      : {};

  const booking: MoneyStateBookingInput = {
    status: 'fully_paid',
    paymentStatus: 'PAID',
    paymentLifecycleStatus: 'final_paid',
    finalPaymentStatus: 'PAID',
    paidRemainingAt: input.paidRemainingAt ?? null,
    fullyPaidAt: input.paidRemainingAt ?? null,
    amountRemaining: 0,
    payoutReleased: input.payoutReleased === true,
    requiresAdminReview: false,
    payoutTransferId: null,
  };

  return { booking, stripe };
}

/**
 * Short status line for pros: marketplace review window → transfer initiated → paid out.
 * Implemented via {@link getMoneyState} so wording stays aligned with payout UI.
 */
export function getProAutomatedPayoutStatusMessage(input: {
  completedAt?: string | null;
  paidRemainingAt?: string | null;
  payoutReleased?: boolean | null;
  payoutStatus?: string | null;
  payoutTransferStripeStatus?: string | null;
  payoutTransferStripeLiveChecked?: boolean;
}): string | null {
  const { booking, stripe } = payoutMessageToMoney(input);
  const money = getMoneyState(booking, stripe);
  return getProAutomatedPayoutStatusMessageFromMoney(money, input.completedAt, input.paidRemainingAt);
}
