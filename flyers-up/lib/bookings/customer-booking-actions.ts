import {
  isCustomerMoneyFullySettled,
  type CustomerMoneySettlementInput,
} from '@/lib/bookings/customer-payment-settled';

/**
 * Statuses where the customer may open final checkout (phase=final / pay/final).
 * Includes awaiting_customer_confirmation when a balance remains after job completion.
 */
export const CUSTOMER_FINAL_PAY_CHECKOUT_STATUSES: readonly string[] = [
  'completed_pending_payment',
  'awaiting_payment',
  'awaiting_remaining_payment',
  'awaiting_customer_confirmation',
];

export type CustomerPayRemainingCtaInput = {
  status: string;
  remainingDueCents: number;
} & CustomerMoneySettlementInput;

/** True when the customer should see a pay-remaining / release-payment control (not completion confirm). */
export function shouldShowCustomerPayRemainingCta(input: CustomerPayRemainingCtaInput): boolean {
  if (isCustomerMoneyFullySettled(input)) return false;
  const due = input.remainingDueCents;
  if (!Number.isFinite(due) || due <= 0) return false;
  return CUSTOMER_FINAL_PAY_CHECKOUT_STATUSES.includes(input.status);
}

export type CustomerConfirmCompletionCtaInput = {
  status: string;
  remainingDueCents: number;
  moneyFullySettled: boolean;
  customerConfirmed: boolean;
};

/**
 * True when the customer should confirm job completion (POST /confirm), not pay.
 * Requires full settlement, zero remaining, awaiting_customer_confirmation, and not yet confirmed.
 */
export function shouldShowCustomerConfirmCompletionCta(input: CustomerConfirmCompletionCtaInput): boolean {
  if (input.status !== 'awaiting_customer_confirmation') return false;
  if (input.customerConfirmed) return false;
  if (!input.moneyFullySettled) return false;
  const due = input.remainingDueCents;
  if (!Number.isFinite(due) || due !== 0) return false;
  return true;
}
