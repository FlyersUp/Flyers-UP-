/**
 * Version B — launch payout model (single source of truth for eligibility + display mapping).
 *
 * - Paid in full is the customer-money gate for automatic pro payout (deposit alone never pays out).
 * - Payout is blocked only for the enumerated Version B reasons (see {@link VersionBPayoutBlockReason}).
 * - `processing` / `paid` / `failed` are derived from booking + optional `booking_payouts` row + Stripe hints,
 *   not duplicated as separate DB enums in v1.
 */

import type { PayoutHoldReason } from '@/lib/bookings/payment-lifecycle-types';
import type { SimplePayoutMilestoneCtx, SimplePayoutTransferCtx } from '@/lib/bookings/simple-payout-eligibility';
import { evaluateSimplePayoutTransferGate } from '@/lib/bookings/simple-payout-eligibility';

/** Canonical Version B payment milestone (maps from legacy `payment_lifecycle_status`). */
export type VersionBPaymentState =
  | 'deposit_pending'
  | 'deposit_paid'
  | 'final_pending'
  | 'paid_in_full'
  | 'refund_pending'
  | 'refunded';

/** Canonical Version B pro-payout bucket for UI and ops. */
export type VersionBPayoutState = 'blocked' | 'ready' | 'processing' | 'paid' | 'failed';

export type VersionBPayoutBlockReason =
  | 'open_dispute'
  | 'refund_pending'
  | 'admin_hold'
  | 'fraud_hold'
  | 'pro_not_ready_for_payout'
  | 'booking_not_completed'
  | 'final_payment_pending';

export type VersionBPayoutEligibilityContext = {
  initiatedByAdmin: boolean;
  milestoneGate: SimplePayoutMilestoneCtx;
  proPayoutsOnHold: boolean;
  nowMs?: number;
  pricingCategorySlug?: string | null;
  afterPhotoUrls?: unknown;
  validAfterPhotoCount?: number;
};

export type VersionBPayoutEligibilityResult =
  | {
      eligible: true;
      versionBPayout: VersionBPayoutState;
      versionBPayment: VersionBPaymentState;
      reason: string;
      holdReason: 'none';
      flagForAdminReview: false;
      missingRequirements: [];
    }
  | {
      eligible: false;
      versionBPayout: 'blocked';
      versionBPayment: VersionBPaymentState;
      versionBBlock: VersionBPayoutBlockReason;
      reason: string;
      holdReason: PayoutHoldReason;
      flagForAdminReview: boolean;
      missingRequirements: string[];
    };

function paidFinalSettled(row: Record<string, unknown>): boolean {
  const lc = String(row.payment_lifecycle_status ?? '');
  const finalPaidLegacy =
    String((row as { final_payment_status?: string }).final_payment_status ?? '').toUpperCase() === 'PAID';
  return (
    lc === 'paid' || ['final_paid', 'payout_ready', 'payout_sent'].includes(lc) || finalPaidLegacy
  );
}

/**
 * Maps legacy `payment_lifecycle_status` (+ refund columns) to Version B payment states for display.
 */
export function deriveVersionBPaymentState(row: Record<string, unknown> | null): VersionBPaymentState {
  if (!row) return 'deposit_pending';
  const lc = String(row.payment_lifecycle_status ?? '').toLowerCase();
  const rs = String(row.refund_status ?? '').toLowerCase();
  if (lc === 'refunded' || rs === 'succeeded') return 'refunded';
  if (lc === 'refund_pending' || rs === 'pending') return 'refund_pending';
  if (lc === 'deposit_pending' || lc === 'unpaid') return 'deposit_pending';
  if (paidFinalSettled(row)) return 'paid_in_full';
  if (lc === 'deposit_paid') return 'deposit_paid';
  return 'final_pending';
}

function mapHoldToVersionBBlock(hold: PayoutHoldReason): VersionBPayoutBlockReason {
  switch (hold) {
    case 'dispute_open':
      return 'open_dispute';
    case 'refund_pending':
      return 'refund_pending';
    case 'admin_hold':
    case 'payout_blocked':
      return 'admin_hold';
    case 'fraud_review':
    case 'no_show_review':
      return 'fraud_hold';
    case 'missing_payment_method':
      return 'pro_not_ready_for_payout';
    case 'missing_final_payment':
    case 'requires_customer_action':
    case 'charge_failed':
      return 'final_payment_pending';
    case 'booking_not_completed':
    case 'insufficient_completion_evidence':
      return 'booking_not_completed';
    default:
      return 'booking_not_completed';
  }
}

/**
 * Single source of truth: after the booking row reflects **paid in full** (lifecycle / legacy final PAID),
 * evaluates whether a Stripe Connect transfer may run automatically (or with admin override flags in ctx).
 */
export function evaluateVersionBPayoutEligibility(
  row: Record<string, unknown>,
  ctx: VersionBPayoutEligibilityContext
): VersionBPayoutEligibilityResult {
  const payment = deriveVersionBPaymentState(row);

  if (row.admin_hold === true) {
    return {
      eligible: false,
      versionBPayout: 'blocked',
      versionBPayment: payment,
      versionBBlock: 'admin_hold',
      reason: 'Admin hold is active.',
      holdReason: 'admin_hold',
      flagForAdminReview: true,
      missingRequirements: ['admin_hold_released'],
    };
  }

  const disputeClear =
    row.dispute_status == null ||
    String(row.dispute_status).trim() === '' ||
    String(row.dispute_status) === 'none';
  if (!disputeClear || row.dispute_open === true) {
    return {
      eligible: false,
      versionBPayout: 'blocked',
      versionBPayment: payment,
      versionBBlock: 'open_dispute',
      reason: 'Open dispute blocks payout.',
      holdReason: 'dispute_open',
      flagForAdminReview: true,
      missingRequirements: ['dispute_clear'],
    };
  }

  if (!ctx.initiatedByAdmin && row.payout_blocked === true) {
    return {
      eligible: false,
      versionBPayout: 'blocked',
      versionBPayment: payment,
      versionBBlock: 'admin_hold',
      reason: 'Payout is blocked on this booking.',
      holdReason: 'payout_blocked',
      flagForAdminReview: true,
      missingRequirements: ['payout_not_blocked'],
    };
  }

  if (!paidFinalSettled(row)) {
    return {
      eligible: false,
      versionBPayout: 'blocked',
      versionBPayment: payment,
      versionBBlock: 'final_payment_pending',
      reason: 'Final payment is not recorded as settled.',
      holdReason: 'missing_final_payment',
      flagForAdminReview: false,
      missingRequirements: ['final_payment_settled'],
    };
  }

  const gateCtx: SimplePayoutTransferCtx = {
    initiatedByAdmin: ctx.initiatedByAdmin,
    milestoneGate: ctx.milestoneGate,
    proPayoutsOnHold: ctx.proPayoutsOnHold,
    nowMs: ctx.nowMs,
    pricingCategorySlug: ctx.pricingCategorySlug,
    afterPhotoUrls: ctx.afterPhotoUrls,
    validAfterPhotoCount: ctx.validAfterPhotoCount,
  };
  const gate = evaluateSimplePayoutTransferGate(row, gateCtx);

  if (!gate.eligible) {
    const block = mapHoldToVersionBBlock(gate.holdReason);
    return {
      eligible: false,
      versionBPayout: 'blocked',
      versionBPayment: 'paid_in_full',
      versionBBlock: block,
      reason: gate.reason,
      holdReason: gate.holdReason,
      flagForAdminReview: gate.flagForAdminReview,
      missingRequirements: gate.missingRequirements,
    };
  }

  return {
    eligible: true,
    versionBPayout: 'ready',
    versionBPayment: 'paid_in_full',
    reason: 'Eligible for Stripe Connect transfer.',
    holdReason: 'none',
    flagForAdminReview: false,
    missingRequirements: [],
  };
}

export type VersionBPayoutStripeHints = {
  /** From Stripe Transfer retrieve when available */
  transferStatus?: string | null;
};

/**
 * Derives Version B payout **movement** state from persisted booking (+ optional booking_payouts row).
 * Use after {@link evaluateVersionBPayoutEligibility} when `eligible` — or for read models regardless.
 */
export function deriveVersionBPayoutState(
  row: Record<string, unknown> | null,
  opts?: {
    bookingPayoutStatus?: string | null;
    stripeHints?: VersionBPayoutStripeHints;
  }
): VersionBPayoutState {
  if (!row) return 'blocked';
  const released = row.payout_released === true;
  const lc = String(row.payment_lifecycle_status ?? '').toLowerCase();
  const payoutStatus = String(row.payout_status ?? '').toLowerCase();
  const bp = String(opts?.bookingPayoutStatus ?? '').toLowerCase();
  const ts = String(opts?.stripeHints?.transferStatus ?? '').toLowerCase();
  const hasTransferId =
    String(row.stripe_transfer_id ?? '').trim() !== '' || String(row.payout_transfer_id ?? '').trim() !== '';

  if (payoutStatus === 'failed' || bp === 'failed' || bp === 'reversed') return 'failed';
  if (released || lc === 'payout_sent') {
    if (ts === 'paid' || ts === 'succeeded' || !ts) return 'paid';
    if (['pending', 'in_transit', 'processing'].includes(ts)) return 'processing';
    return 'paid';
  }
  /** `bookings.payout_status` may be `pending` before any Connect transfer exists — that is "ready", not in-flight. */
  const transferInFlight =
    hasTransferId &&
    (['pending', 'in_transit', 'processing'].includes(payoutStatus) ||
      ['pending', 'processing', 'in_transit'].includes(bp));
  if (transferInFlight) return 'processing';
  if (lc === 'payout_ready' || lc === 'final_paid') return 'ready';
  if (lc === 'payout_on_hold') return 'blocked';
  return 'blocked';
}
