/**
 * Unified money state: customer final payment + pro payout lifecycle.
 * Single source of truth for UI and guards — does not change how charges/transfers are executed.
 */

import type { BookingDetails } from '@/lib/api';
import {
  deriveCustomerRemainingPaymentUiState,
  type CustomerRemainingPaymentUiInput,
  type CustomerRemainingPaymentUiState,
} from '@/lib/bookings/customer-remaining-payment-ui';
import { isStripeFinalPaymentIntentInFlightStatus } from '@/lib/bookings/final-payment-intent-stripe-gate';

const POST_COMPLETION_STATUSES = new Set([
  'awaiting_remaining_payment',
  'awaiting_customer_confirmation',
  'completed_pending_payment',
  'awaiting_payment',
]);

/** Live Stripe reads. `undefined` = not fetched yet; `null` | string = fetch completed. */
export type MoneyStripeSnapshot = {
  finalPaymentIntentStatus?: string | null;
  transferStatus?: string | null;
};

/**
 * Booking fields that drive money state (snake_case names map to these camelCase props).
 */
export type MoneyStateBookingInput = {
  /** For diagnostics only (console warnings). */
  id?: string;
  status?: string;
  paymentStatus?: string | null;
  paymentLifecycleStatus?: string | null;
  finalPaymentStatus?: string | null;
  paidDepositAt?: string | null;
  paidAt?: string | null;
  paidRemainingAt?: string | null;
  fullyPaidAt?: string | null;
  completedAt?: string | null;
  amountRemaining?: number | null;
  remainingDueAt?: string | null;
  customerReviewDeadlineAt?: string | null;
  requiresAdminReview?: boolean | null;
  payoutReleased?: boolean | null;
  /** `stripe_transfer_id` / `payout_transfer_id` */
  stripeTransferId?: string | null;
  payoutTransferId?: string | null;
  finalPaymentIntentId?: string | null;
};

export type MoneyFinalPhase =
  | 'none'
  | 'before_completion'
  | 'final_review_window'
  | 'final_due'
  | 'final_processing'
  | 'final_paid'
  | 'final_failed'
  | 'final_requires_action';

export type MoneyPayoutPhase =
  | 'inactive'
  | 'payout_held'
  | 'payout_scheduled'
  | 'payout_processing'
  | 'payout_paid'
  | 'payout_failed';

/** Customer payment-card edge cases (legacy rows / ambiguous derive). */
export type MoneyCustomerCardVariant = 'unknown_balance' | 'legacy_pending_manual';

export type MoneyState = {
  final: MoneyFinalPhase;
  payout: MoneyPayoutPhase;
  remainingCents: number;
  /** ISO deadline for review-window countdown when applicable */
  reviewDeadlineIso: string | null;
  raw: CustomerRemainingPaymentUiState;
  /**
   * When set, customer UI should use variant-specific copy while keeping {@link final} for guards.
   * Derived only from booking + derive output — not from Stripe.
   */
  customerCardVariant?: MoneyCustomerCardVariant;
};

function depositPaid(input: CustomerRemainingPaymentUiInput): boolean {
  return (
    !!(input.paidDepositAt || input.paidAt) ||
    String(input.paymentStatus ?? '').toUpperCase() === 'PAID'
  );
}

function jobMarkedComplete(input: CustomerRemainingPaymentUiInput): boolean {
  if (input.completedAt) return true;
  return POST_COMPLETION_STATUSES.has(String(input.status ?? ''));
}

function moneyFullySettled(input: CustomerRemainingPaymentUiInput, remainingCents: number): boolean {
  if (remainingCents <= 0) return true;
  if (String(input.finalPaymentStatus ?? '').toUpperCase() === 'PAID') return true;
  if (input.paidRemainingAt || input.fullyPaidAt) return true;
  return false;
}

/** DB / lifecycle says final payment already succeeded (or downstream payout phase). */
function isFinalPaymentAlreadySucceededDb(
  input: CustomerRemainingPaymentUiInput,
  remainingCents: number
): boolean {
  if (moneyFullySettled(input, remainingCents)) return true;
  const lc = String(input.paymentLifecycleStatus ?? '').trim().toLowerCase();
  if (lc === 'final_paid' || lc === 'payout_ready' || lc === 'payout_sent' || lc === 'payout_on_hold') return true;
  const st = String(input.status ?? '').trim().toLowerCase();
  if (st === 'fully_paid' || st === 'payout_released') return true;
  return false;
}

function isStripeTransferPaid(status: string | null | undefined): boolean {
  return String(status ?? '').trim().toLowerCase() === 'paid';
}

function trimTransferId(b: MoneyStateBookingInput): string {
  return String(b.stripeTransferId ?? b.payoutTransferId ?? '').trim();
}

function toDeriveInput(booking: MoneyStateBookingInput): CustomerRemainingPaymentUiInput {
  return {
    status: String(booking.status ?? ''),
    paymentStatus: booking.paymentStatus,
    finalPaymentStatus: booking.finalPaymentStatus,
    paymentLifecycleStatus: booking.paymentLifecycleStatus,
    paidDepositAt: booking.paidDepositAt,
    paidAt: booking.paidAt,
    paidRemainingAt: booking.paidRemainingAt,
    fullyPaidAt: booking.fullyPaidAt,
    completedAt: booking.completedAt,
    remainingDueAt: booking.remainingDueAt,
    customerReviewDeadlineAt: booking.customerReviewDeadlineAt,
    amountRemaining: booking.amountRemaining,
    finalPaymentIntentId: booking.finalPaymentIntentId,
  };
}

function mapProcessingToFinalPhase(
  input: CustomerRemainingPaymentUiInput,
  remainingCents: number,
  stripe: MoneyStripeSnapshot
): MoneyFinalPhase {
  if (isFinalPaymentAlreadySucceededDb(input, remainingCents)) return 'final_paid';

  const pi = String(input.finalPaymentIntentId ?? '').trim();
  if (!pi) return 'final_due';

  const piResolved = stripe.finalPaymentIntentStatus !== undefined;
  if (!piResolved) return 'final_due';

  const piStatus = String(stripe.finalPaymentIntentStatus ?? '').trim().toLowerCase();
  if (piStatus === 'succeeded') return 'final_paid';
  if (isStripeFinalPaymentIntentInFlightStatus(stripe.finalPaymentIntentStatus)) return 'final_processing';
  return 'final_due';
}

function mapRawToFinalPhase(
  raw: CustomerRemainingPaymentUiState,
  input: CustomerRemainingPaymentUiInput,
  remainingCents: number,
  stripe: MoneyStripeSnapshot
): MoneyFinalPhase {
  switch (raw.kind) {
    case 'none':
      return 'none';
    case 'before_completion':
      return 'before_completion';
    case 'review_window_auto':
      return 'final_review_window';
    case 'post_review_auto_pending':
      // After the review window, derive stays `post_review_auto_pending` while DB lifecycle may
      // still lag (e.g. `final_pending`). If the final PI already succeeded in Stripe, funds are on
      // the platform account — do not show `final_due` / "pay again"; align with PI + settlement flags.
      return mapProcessingToFinalPhase(input, remainingCents, stripe);
    case 'processing':
      return mapProcessingToFinalPhase(input, remainingCents, stripe);
    case 'success':
      return 'final_paid';
    case 'failed':
      return 'final_failed';
    case 'requires_action':
      return 'final_requires_action';
  }
}

function isCustomerFinalPaidForPayout(booking: MoneyStateBookingInput, finalPhase: MoneyFinalPhase): boolean {
  if (finalPhase === 'final_paid') return true;
  if (booking.paidRemainingAt || booking.fullyPaidAt) return true;
  if (String(booking.finalPaymentStatus ?? '').toUpperCase() === 'PAID') return true;
  const lc = String(booking.paymentLifecycleStatus ?? '').trim().toLowerCase();
  if (['final_paid', 'payout_ready', 'payout_sent', 'payout_on_hold'].includes(lc)) return true;
  const st = String(booking.status ?? '').trim().toLowerCase();
  if (['fully_paid', 'paid'].includes(st)) return true;
  return false;
}

function computePayoutPhase(
  booking: MoneyStateBookingInput,
  stripe: MoneyStripeSnapshot,
  customerFinalPaid: boolean
): MoneyPayoutPhase {
  if (!customerFinalPaid) return 'inactive';
  const lc = String(booking.paymentLifecycleStatus ?? '').trim().toLowerCase();
  if (booking.payoutReleased !== true && lc === 'payout_on_hold') return 'payout_held';
  if (booking.requiresAdminReview === true) return 'payout_held';
  if (booking.payoutReleased !== true) return 'payout_scheduled';

  const transferChecked = stripe.transferStatus !== undefined;
  const ts = String(stripe.transferStatus ?? '').trim().toLowerCase();

  if (transferChecked && isStripeTransferPaid(ts)) return 'payout_paid';
  if (transferChecked && ['failed', 'canceled', 'cancelled', 'reversed'].includes(ts)) {
    return 'payout_failed';
  }

  const tid = trimTransferId(booking);
  if (transferChecked && tid && !isStripeTransferPaid(ts)) return 'payout_processing';
  if (transferChecked && !tid) return 'payout_processing';
  if (!transferChecked && tid) return 'payout_processing';
  return 'payout_processing';
}

function reviewDeadlineIso(
  raw: CustomerRemainingPaymentUiState,
  input: CustomerRemainingPaymentUiInput
): string | null {
  const fromInput = (input.customerReviewDeadlineAt || input.remainingDueAt || '').trim();
  if (fromInput) return fromInput;
  if (raw.kind === 'review_window_auto') {
    return new Date(raw.deadlineMs).toISOString();
  }
  return null;
}

function hasExplicitNewLifecycleColumns(booking: MoneyStateBookingInput): boolean {
  return (
    String(booking.paymentLifecycleStatus ?? '').trim().length > 0 ||
    String(booking.customerReviewDeadlineAt ?? '').trim().length > 0
  );
}

function computeCustomerCardVariant(
  booking: MoneyStateBookingInput,
  input: CustomerRemainingPaymentUiInput,
  raw: CustomerRemainingPaymentUiState,
  final: MoneyFinalPhase,
  remainingCents: number
): MoneyCustomerCardVariant | undefined {
  if (
    final === 'none' &&
    depositPaid(input) &&
    jobMarkedComplete(input) &&
    remainingCents > 0 &&
    !moneyFullySettled(input, remainingCents) &&
    raw.kind === 'none'
  ) {
    return 'unknown_balance';
  }
  if (
    final === 'final_due' &&
    raw.kind === 'post_review_auto_pending' &&
    !hasExplicitNewLifecycleColumns(booking)
  ) {
    return 'legacy_pending_manual';
  }
  return undefined;
}

function logMoneyStateAnomalies(
  booking: MoneyStateBookingInput,
  stripe: MoneyStripeSnapshot,
  final: MoneyFinalPhase,
  payout: MoneyPayoutPhase
): void {
  if (typeof console === 'undefined' || typeof console.warn !== 'function') return;
  const bid = String(booking.id ?? '').trim();
  const tag = bid ? `[getMoneyState][booking ${bid}]` : '[getMoneyState]';

  if (booking.payoutReleased === true && !trimTransferId(booking)) {
    console.warn(`${tag} PAYOUT_RELEASED_WITHOUT_TRANSFER_ID`);
  }

  if (final === 'final_processing' && !String(booking.finalPaymentIntentId ?? '').trim()) {
    console.warn(`${tag} FINAL_PROCESSING_WITHOUT_PAYMENT_INTENT_ID`);
  }

  const transferResolved = stripe.transferStatus !== undefined;
  if (transferResolved && booking.payoutReleased === true && !trimTransferId(booking)) {
    console.warn(`${tag} STRIPE_TRANSFER_CHECKED_BUT_BOOKING_MISSING_TRANSFER_ID`);
  }

  const piResolved = stripe.finalPaymentIntentStatus !== undefined;
  if (piResolved && final === 'final_processing' && !String(booking.finalPaymentIntentId ?? '').trim()) {
    console.warn(`${tag} STRIPE_FINAL_PI_CHECKED_BUT_BOOKING_MISSING_INTENT_ID`);
  }

  if (payout === 'payout_processing' && !trimTransferId(booking) && transferResolved) {
    console.warn(`${tag} PAYOUT_PROCESSING_BUT_NO_TRANSFER_ID_AFTER_STRIPE_CHECK`);
  }
}

/**
 * Full payment + payout lifecycle from booking row + optional live Stripe snapshot.
 */
export function getMoneyState(
  booking: MoneyStateBookingInput,
  stripe: MoneyStripeSnapshot,
  nowMs: number = Date.now()
): MoneyState {
  const input = toDeriveInput(booking);
  const raw = deriveCustomerRemainingPaymentUiState(input, nowMs);
  const remainingCents = Math.max(0, Math.round(Number(booking.amountRemaining ?? 0)));
  const final = mapRawToFinalPhase(raw, input, remainingCents, stripe);
  const customerFinalPaid = isCustomerFinalPaidForPayout(booking, final);
  const payout = computePayoutPhase(booking, stripe, customerFinalPaid);

  logMoneyStateAnomalies(booking, stripe, final, payout);

  return {
    final,
    payout,
    remainingCents,
    reviewDeadlineIso: reviewDeadlineIso(raw, input),
    raw,
    customerCardVariant: computeCustomerCardVariant(booking, input, raw, final, remainingCents),
  };
}

export function getMoneyStateNow(booking: MoneyStateBookingInput, stripe: MoneyStripeSnapshot): MoneyState {
  return getMoneyState(booking, stripe, Date.now());
}

/** Map Track / customer payment inputs into {@link MoneyStateBookingInput}. */
export function customerRemainingUiToMoneyStateBooking(
  input: CustomerRemainingPaymentUiInput
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
    customerReviewDeadlineAt: input.customerReviewDeadlineAt,
    requiresAdminReview: input.requiresAdminReview,
    payoutReleased: input.payoutReleased,
    payoutTransferId: input.payoutTransferId,
    finalPaymentIntentId: input.finalPaymentIntentId,
  };
}

/**
 * Stripe snapshot for final PI from customer verify hook fields.
 * `undefined` finalPaymentIntentStatus until live check completes.
 */
export function moneyStripeSnapshotFromCustomerFinalIntent(
  input: Pick<
    CustomerRemainingPaymentUiInput,
    'finalPaymentIntentStripeLiveChecked' | 'finalPaymentIntentStripeStatus' | 'finalPaymentIntentStatus'
  >
): MoneyStripeSnapshot {
  if (input.finalPaymentIntentStripeLiveChecked === true) {
    const st = input.finalPaymentIntentStripeStatus ?? input.finalPaymentIntentStatus ?? null;
    return { finalPaymentIntentStatus: st };
  }
  return {};
}

export function bookingDetailsToMoneyStateInput(b: BookingDetails): MoneyStateBookingInput {
  return {
    id: b.id,
    status: b.status,
    paymentStatus: b.paymentStatus,
    paymentLifecycleStatus: b.paymentLifecycleStatus,
    finalPaymentStatus: b.finalPaymentStatus,
    paidDepositAt: b.paidDepositAt,
    paidAt: b.paidAt,
    paidRemainingAt: b.paidRemainingAt,
    fullyPaidAt: b.fullyPaidAt,
    completedAt: b.completedAt,
    amountRemaining: b.amountRemaining,
    remainingDueAt: b.remainingDueAt,
    customerReviewDeadlineAt: b.customerReviewDeadlineAt,
    requiresAdminReview: b.requiresAdminReview,
    payoutReleased: b.payoutReleased,
    payoutTransferId: b.payoutTransferId,
    finalPaymentIntentId: b.finalPaymentIntentId,
  };
}
