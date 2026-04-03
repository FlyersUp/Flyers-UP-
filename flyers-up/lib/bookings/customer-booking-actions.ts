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

/** Aligns with POST /api/bookings/[id]/pay/deposit eligible + pre-work recovery statuses. */
export const CUSTOMER_DEPOSIT_PAY_STATUSES: readonly string[] = [
  'payment_required',
  'accepted',
  'accepted_pending_payment',
  'awaiting_deposit_payment',
];

const CUSTOMER_DEPOSIT_RECOVERY_STATUSES: readonly string[] = ['pro_en_route', 'on_the_way', 'arrived'];

export type CustomerDepositPayCtaInput = {
  status: string;
  paidDepositAt?: string | null;
  /** Legacy: some rows set this when deposit captured */
  paidAt?: string | null;
  paymentStatus?: string;
};

/** True when customer should see Pay deposit (server still allows deposit intent). */
export function shouldShowCustomerDepositPayCta(input: CustomerDepositPayCtaInput): boolean {
  const st = input.status;
  const depositPaid =
    !!(input.paidDepositAt || input.paidAt) || String(input.paymentStatus ?? '').toUpperCase() === 'PAID';
  if (depositPaid) return false;
  if (CUSTOMER_DEPOSIT_PAY_STATUSES.includes(st)) return true;
  if (CUSTOMER_DEPOSIT_RECOVERY_STATUSES.includes(st)) return true;
  return false;
}
