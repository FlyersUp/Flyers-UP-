import { bookingReferenceFromUuid } from '@/lib/stripe/booking-payment-intent-metadata';

export type UnifiedReceiptOverallStatus =
  | 'unpaid'
  | 'deposit_paid'
  | 'partially_paid'
  | 'fully_paid'
  | 'refunded'
  | 'partially_refunded';

export type PhasePaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'processing';

export interface UnifiedBookingReceipt {
  bookingId: string;
  bookingReference: string;
  currency: string;
  serviceTitle: string;
  proName: string;
  customerName: string | null;
  serviceDate: string | null;
  serviceTime: string | null;
  address: string | null;
  /** Full booking total in cents (deposit + remaining when split). */
  totalBookingCents: number;
  depositScheduledCents: number;
  remainingScheduledCents: number;
  depositPaidCents: number;
  remainingPaidCents: number;
  totalPaidCents: number;
  remainingDueCents: number;
  refundedTotalCents: number;
  depositPhaseStatus: PhasePaymentStatus;
  remainingPhaseStatus: PhasePaymentStatus;
  paidDepositAt: string | null;
  paidRemainingAt: string | null;
  overallStatus: UnifiedReceiptOverallStatus;
  stripePaymentIntentDepositId: string | null;
  stripePaymentIntentRemainingId: string | null;
  /** True when this booking uses split deposit + remaining (vs legacy single charge). */
  isSplitPayment: boolean;
  /** Non-customer-facing diagnostics (support / logs). */
  warnings: string[];
}

function safeInt(n: unknown): number {
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x);
}

function priceToCentsIfDollars(price: unknown): number {
  const raw = safeInt(price);
  if (raw <= 0) return 0;
  // Legacy: price often stored as dollars when < 10000
  if (raw > 0 && raw < 10000) return raw * 100;
  return raw;
}

export interface UnifiedReceiptBookingInput {
  bookingId: string;
  status: string;
  paymentStatus: string;
  finalPaymentStatus?: string | null;
  paidAt?: string | null;
  paidDepositAt?: string | null;
  paidRemainingAt?: string | null;
  fullyPaidAt?: string | null;
  amountDeposit?: number | null;
  amountRemaining?: number | null;
  amountTotal?: number | null;
  totalAmountCents?: number | null;
  price?: number | null;
  refundedTotalCents?: number | null;
  refundStatus?: string | null;
  serviceTitle: string;
  proName: string;
  customerName?: string | null;
  serviceDate?: string | null;
  serviceTime?: string | null;
  address?: string | null;
  stripePaymentIntentDepositId?: string | null;
  stripePaymentIntentRemainingId?: string | null;
  paymentIntentId?: string | null;
  finalPaymentIntentId?: string | null;
  currency?: string | null;
  /** Latest successful deposit PI from booking_events.DEPOSIT_PAID (preferred truth for PI alignment). */
  ledgerDepositPaidPaymentIntentId?: string | null;
  /** Latest successful remaining PI from booking_events.REMAINING_PAID. */
  ledgerRemainingPaidPaymentIntentId?: string | null;
}

function normalizeCurrencyCode(raw: string | null | undefined): { code: string; normalizedFallback: boolean } {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!s || s === 'usd') return { code: 'usd', normalizedFallback: false };
  if (/^[a-z]{3}$/.test(s)) return { code: s, normalizedFallback: false };
  return { code: 'usd', normalizedFallback: true };
}

/**
 * Infer deposit vs remaining PaymentIntent when Stripe metadata is missing (older bookings).
 */
export function inferPaymentPhaseFromBookingIds(
  paymentIntentId: string,
  booking: {
    stripe_payment_intent_deposit_id?: string | null;
    stripe_payment_intent_remaining_id?: string | null;
    payment_intent_id?: string | null;
    final_payment_intent_id?: string | null;
  }
): 'deposit' | 'remaining' | 'unknown' {
  const pid = paymentIntentId.trim();
  if (!pid) return 'unknown';
  const dep =
    (booking.stripe_payment_intent_deposit_id ?? booking.payment_intent_id ?? '')
      .trim();
  const rem =
    (booking.stripe_payment_intent_remaining_id ?? booking.final_payment_intent_id ?? '')
      .trim();
  if (dep && pid === dep) return 'deposit';
  if (rem && pid === rem) return 'remaining';
  return 'unknown';
}

function phaseStatus(
  paid: boolean,
  stripeStatus: string | undefined,
  failed: boolean
): PhasePaymentStatus {
  if (paid) return 'paid';
  if (failed) return 'failed';
  const s = (stripeStatus ?? '').toUpperCase();
  if (s === 'PROCESSING') return 'processing';
  if (s === 'REQUIRES_ACTION' || s === 'PENDING') return 'pending';
  return 'unpaid';
}

/**
 * Pure builder: unified booking receipt for UI, API, and email. All money in integer cents.
 */
export function buildUnifiedBookingReceipt(
  input: UnifiedReceiptBookingInput
): UnifiedBookingReceipt {
  const bookingId = input.bookingId;
  const ref = bookingReferenceFromUuid(bookingId);
  const { code: currency, normalizedFallback: currencyNormalized } = normalizeCurrencyCode(
    input.currency ?? null
  );
  const warnings: string[] = [];
  if (currencyNormalized) warnings.push('currency_normalized_to_usd');

  const depositScheduled = safeInt(input.amountDeposit);
  const remainingScheduled = safeInt(input.amountRemaining);
  const totalFromCols = safeInt(
    input.totalAmountCents ?? input.amountTotal
  );
  const priceCents = priceToCentsIfDollars(input.price);

  const isSplitPayment = depositScheduled > 0;

  let totalBookingCents = totalFromCols;
  if (totalBookingCents <= 0 && isSplitPayment) {
    totalBookingCents = depositScheduled + remainingScheduled;
  }
  if (totalBookingCents <= 0 && priceCents > 0) {
    totalBookingCents = priceCents;
  }
  if (totalBookingCents <= 0 && isSplitPayment) {
    totalBookingCents = depositScheduled + remainingScheduled;
  }

  const payStatus = (input.paymentStatus ?? 'UNPAID').toUpperCase();
  const finalStatus = (input.finalPaymentStatus ?? 'UNPAID').toUpperCase();

  const currentDepPi = (
    input.stripePaymentIntentDepositId ??
    input.paymentIntentId ??
    ''
  )
    .trim();
  const currentRemPi = (
    input.stripePaymentIntentRemainingId ??
    input.finalPaymentIntentId ??
    ''
  )
    .trim();
  const ledgerDep = (input.ledgerDepositPaidPaymentIntentId ?? '').trim();
  const ledgerRem = (input.ledgerRemainingPaidPaymentIntentId ?? '').trim();

  const depositAlignedWithLedger =
    !ledgerDep || !currentDepPi || ledgerDep === currentDepPi;
  const remainingAlignedWithLedger =
    !ledgerRem || !currentRemPi || ledgerRem === currentRemPi;

  const depositPaidBase = isSplitPayment
    ? payStatus === 'PAID' || Boolean(input.paidDepositAt)
    : payStatus === 'PAID';
  const remainingPaidBase =
    finalStatus === 'PAID' ||
    Boolean(input.paidRemainingAt) ||
    Boolean(input.fullyPaidAt);

  if (!depositAlignedWithLedger && depositPaidBase) {
    warnings.push('deposit_pi_mismatch_vs_ledger');
  }
  if (!remainingAlignedWithLedger && remainingPaidBase) {
    warnings.push('remaining_pi_mismatch_vs_ledger');
  }

  const depositPaid = depositPaidBase && depositAlignedWithLedger;
  const remainingPaid = remainingPaidBase && remainingAlignedWithLedger;

  const depositPaidCents =
    depositPaid && depositScheduled > 0
      ? depositScheduled
      : depositPaid && !isSplitPayment
        ? totalBookingCents
        : 0;

  let remainingPaidCents = 0;
  if (isSplitPayment && remainingPaid) {
    remainingPaidCents =
      remainingScheduled > 0
        ? remainingScheduled
        : Math.max(0, totalBookingCents - depositPaidCents);
  } else if (!isSplitPayment && remainingPaid) {
    remainingPaidCents = totalBookingCents;
  }

  let totalPaidCents = depositPaidCents + remainingPaidCents;
  if (!isSplitPayment && depositPaid && totalPaidCents === 0 && totalBookingCents > 0) {
    totalPaidCents = totalBookingCents;
  }

  const remainingDueCents = Math.max(0, totalBookingCents - totalPaidCents);
  const refundedTotalCents = Math.max(0, safeInt(input.refundedTotalCents));

  const depositPhaseStatus = phaseStatus(
    depositPaid,
    payStatus,
    payStatus === 'FAILED'
  );
  const remainingPhaseStatus = isSplitPayment
    ? phaseStatus(remainingPaid, finalStatus, finalStatus === 'FAILED')
    : depositPaid
      ? 'paid'
      : phaseStatus(false, finalStatus, finalStatus === 'FAILED');

  const stripeDepositId =
    (input.stripePaymentIntentDepositId ?? input.paymentIntentId ?? null) ||
    null;
  const stripeRemainingId =
    (input.stripePaymentIntentRemainingId ?? input.finalPaymentIntentId ?? null) ||
    null;

  let overallStatus: UnifiedReceiptOverallStatus = 'unpaid';

  if (refundedTotalCents > 0) {
    if (totalPaidCents > 0 && refundedTotalCents >= totalPaidCents) {
      overallStatus = 'refunded';
    } else {
      overallStatus = 'partially_refunded';
    }
  } else if (
    isSplitPayment &&
    remainingPaid &&
    (remainingDueCents === 0 || totalPaidCents >= totalBookingCents)
  ) {
    overallStatus = 'fully_paid';
  } else if (!isSplitPayment && (remainingPaid || payStatus === 'PAID')) {
    overallStatus = 'fully_paid';
  } else if (isSplitPayment && depositPaid && !remainingPaid) {
    overallStatus = 'deposit_paid';
  } else if (totalPaidCents > 0 && totalPaidCents < totalBookingCents) {
    overallStatus = 'partially_paid';
  }

  return {
    bookingId,
    bookingReference: ref,
    currency,
    serviceTitle: input.serviceTitle.trim() || 'Service',
    proName: input.proName.trim() || 'Provider',
    customerName: input.customerName?.trim() || null,
    serviceDate: input.serviceDate ?? null,
    serviceTime: input.serviceTime ?? null,
    address: input.address?.trim() || null,
    totalBookingCents,
    depositScheduledCents: depositScheduled,
    remainingScheduledCents: remainingScheduled,
    depositPaidCents,
    remainingPaidCents,
    totalPaidCents,
    remainingDueCents,
    refundedTotalCents,
    depositPhaseStatus,
    remainingPhaseStatus,
    paidDepositAt: depositPaid
      ? isSplitPayment
        ? input.paidDepositAt ?? null
        : input.paidAt ?? input.paidDepositAt ?? null
      : null,
    paidRemainingAt: remainingPaid
      ? input.paidRemainingAt ?? input.fullyPaidAt ?? null
      : null,
    overallStatus,
    stripePaymentIntentDepositId: stripeDepositId,
    stripePaymentIntentRemainingId: stripeRemainingId,
    isSplitPayment,
    warnings,
  };
}
