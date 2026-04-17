/**
 * Single source of truth for automatic Stripe Connect payout release (cron + admin).
 *
 * Uses `payment_lifecycle_status`, `final_payment_status`, and payout columns — not
 * `bookings.status` or `service_status` — to classify where the booking sits in the payout
 * pipeline. Operational gates use {@link evaluateVersionBPayoutEligibility} (Version B); there is no
 * post-completion review window or completion-photo requirement on the automatic path.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { evaluateVersionBPayoutEligibility } from '@/lib/bookings/version-b-payout';
import { resolveMilestonePayoutGate } from '@/lib/bookings/multi-day-payout';
import { evaluatePayoutRiskForPro } from '@/lib/payoutRisk';
import type { PayoutHoldReason } from '@/lib/bookings/payment-lifecycle-types';

export const PAYOUT_TRANSFER_SNAPSHOT_SELECT_FIELDS = [
  'id',
  'status',
  'arrived_at',
  'started_at',
  'completed_at',
  'customer_confirmed',
  'auto_confirm_at',
  'dispute_open',
  'cancellation_reason',
  'paid_deposit_at',
  'paid_remaining_at',
  'refund_status',
  'suspicious_completion',
  'is_multi_day',
  'payout_released',
  'admin_hold',
  'dispute_status',
  'payment_lifecycle_status',
  'final_payment_status',
  'payout_blocked',
  'payout_hold_reason',
  'requires_admin_review',
  'stripe_destination_account_id',
  'service_pros(stripe_account_id, user_id, stripe_charges_enabled)',
] as const;

export type PayoutReleaseLifecyclePhase =
  | 'missing_booking'
  | 'customer_refunded'
  | 'payout_transfer_complete'
  | 'payout_pipeline_blocked'
  | 'pre_final_settlement'
  | 'final_settled_awaiting_transfer';

export type PayoutReleaseEligibilitySnapshot = {
  eligible: boolean;
  /** Short human-readable summary (UI / logs). */
  reason: string;
  lifecyclePhase: PayoutReleaseLifecyclePhase;
  holdReason: PayoutHoldReason;
  flagForAdminReview: boolean;
  /** Stable machine keys for dashboards and support tooling. */
  missingRequirements: string[];
};

export type PayoutReleaseSnapshotBuildContext = {
  initiatedByAdmin: boolean;
  milestoneGate: { fetchError: boolean; enforceMilestoneGate: boolean; scheduleOk: boolean };
  proPayoutsOnHold: boolean;
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
 * Classify payout pipeline position from payment lifecycle + settlement flags (not booking.status).
 */
export function resolvePayoutReleaseLifecyclePhase(row: Record<string, unknown> | null): PayoutReleaseLifecyclePhase {
  if (!row) return 'missing_booking';
  if (row.payout_released === true || String(row.payment_lifecycle_status ?? '') === 'payout_sent') {
    return 'payout_transfer_complete';
  }
  const lc = String(row.payment_lifecycle_status ?? '').toLowerCase();
  const refundLower = String(row.refund_status ?? '').toLowerCase();
  if (lc === 'refunded' || lc === 'partially_refunded' || refundLower === 'succeeded') {
    return 'customer_refunded';
  }
  if (
    lc === 'payout_on_hold' ||
    ['requires_customer_action', 'payment_failed'].includes(lc) ||
    row.admin_hold === true
  ) {
    return 'payout_pipeline_blocked';
  }
  if (paidFinalSettled(row)) {
    return 'final_settled_awaiting_transfer';
  }
  return 'pre_final_settlement';
}

/**
 * Pure evaluation from an already-loaded booking row + async-derived context (milestones, risk).
 * Prefer {@link getPayoutReleaseEligibilitySnapshot} from routes/cron.
 */
export function buildPayoutReleaseEligibilitySnapshot(
  row: Record<string, unknown> | null,
  ctx: PayoutReleaseSnapshotBuildContext
): PayoutReleaseEligibilitySnapshot {
  const missing: string[] = [];
  const phase = resolvePayoutReleaseLifecyclePhase(row);

  if (!row) {
    return {
      eligible: false,
      reason: 'Booking not found.',
      lifecyclePhase: 'missing_booking',
      holdReason: 'missing_final_payment',
      flagForAdminReview: false,
      missingRequirements: ['booking_row'],
    };
  }

  const lifecycleCancelledReview = String(row.payment_lifecycle_status ?? '').trim() === 'cancelled_during_review';
  if (lifecycleCancelledReview) {
    missing.push('not_cancelled_during_review');
    return {
      eligible: false,
      reason: 'Booking was cancelled during the post-completion review window; no automatic payout.',
      lifecyclePhase: 'payout_pipeline_blocked',
      holdReason: 'customer_refunded',
      flagForAdminReview: false,
      missingRequirements: missing,
    };
  }

  if (row.payout_released === true) {
    return {
      eligible: false,
      reason: 'Payout already released for this booking.',
      lifecyclePhase: 'payout_transfer_complete',
      holdReason: 'already_released',
      flagForAdminReview: false,
      missingRequirements: ['payout_not_released'],
    };
  }

  const lifecycleEarly = String(row.payment_lifecycle_status ?? '');
  const refundStatusLower = String(row.refund_status ?? '').toLowerCase();
  if (lifecycleEarly === 'refunded' || refundStatusLower === 'succeeded') {
    missing.push('not_customer_refunded');
    return {
      eligible: false,
      reason: 'Customer refund completed; no payout.',
      lifecyclePhase: 'customer_refunded',
      holdReason: 'customer_refunded',
      flagForAdminReview: false,
      missingRequirements: missing,
    };
  }

  if (row.admin_hold === true) {
    missing.push('admin_hold_released');
    return {
      eligible: false,
      reason: 'Admin hold is active.',
      lifecyclePhase: 'payout_pipeline_blocked',
      holdReason: 'admin_hold',
      flagForAdminReview: true,
      missingRequirements: missing,
    };
  }

  const disputeClear =
    row.dispute_status == null ||
    String(row.dispute_status).trim() === '' ||
    String(row.dispute_status) === 'none';
  if (!disputeClear || row.dispute_open === true) {
    missing.push('dispute_clear');
    return {
      eligible: false,
      reason: 'Open dispute blocks payout.',
      lifecyclePhase: 'payout_pipeline_blocked',
      holdReason: 'dispute_open',
      flagForAdminReview: true,
      missingRequirements: missing,
    };
  }

  if (!paidFinalSettled(row)) {
    missing.push('final_payment_settled');
    return {
      eligible: false,
      reason: 'Final payment is not recorded as settled (lifecycle or final_payment_status).',
      lifecyclePhase: 'pre_final_settlement',
      holdReason: 'missing_final_payment',
      flagForAdminReview: false,
      missingRequirements: missing,
    };
  }

  if (!ctx.initiatedByAdmin && row.payout_blocked === true) {
    missing.push('payout_not_blocked');
    return {
      eligible: false,
      reason: 'Payout is blocked on this booking.',
      lifecyclePhase: 'payout_pipeline_blocked',
      holdReason: 'payout_blocked',
      flagForAdminReview: true,
      missingRequirements: missing,
    };
  }

  const vb = evaluateVersionBPayoutEligibility(row, {
    initiatedByAdmin: ctx.initiatedByAdmin,
    milestoneGate: ctx.milestoneGate,
    proPayoutsOnHold: ctx.proPayoutsOnHold,
  });

  if (!vb.eligible) {
    missing.push(...vb.missingRequirements);
    return {
      eligible: false,
      reason: vb.reason,
      lifecyclePhase: 'final_settled_awaiting_transfer',
      holdReason: vb.holdReason,
      flagForAdminReview: vb.flagForAdminReview,
      missingRequirements: missing,
    };
  }

  return {
    eligible: true,
    reason: 'Eligible for Stripe Connect transfer.',
    lifecyclePhase: 'final_settled_awaiting_transfer',
    holdReason: 'none',
    flagForAdminReview: false,
    missingRequirements: [],
  };
}

/**
 * Loads booking + milestone gate + pro risk, then returns a payout eligibility snapshot.
 * This is the canonical entry for cron and should stay aligned with {@link evaluatePayoutTransferEligibility}.
 */
export async function getPayoutReleaseEligibilitySnapshot(
  admin: SupabaseClient,
  bookingId: string,
  opts: { initiatedByAdmin?: boolean } = {}
): Promise<PayoutReleaseEligibilitySnapshot> {
  const initiatedByAdmin = opts.initiatedByAdmin === true;
  const { data: b, error } = await admin
    .from('bookings')
    .select(PAYOUT_TRANSFER_SNAPSHOT_SELECT_FIELDS.join(', '))
    .eq('id', bookingId)
    .maybeSingle();

  if (error || !b) {
    return buildPayoutReleaseEligibilitySnapshot(null, {
      initiatedByAdmin,
      milestoneGate: { fetchError: false, enforceMilestoneGate: false, scheduleOk: true },
      proPayoutsOnHold: false,
    });
  }

  const row = b as unknown as Record<string, unknown>;
  const isMultiFlag = row.is_multi_day === true;
  const milestoneGate = await resolveMilestonePayoutGate(admin, bookingId, isMultiFlag);

  const proUser = (row.service_pros as { user_id?: string })?.user_id;
  let proPayoutsOnHold = false;
  if (proUser) {
    const risk = await evaluatePayoutRiskForPro(proUser);
    proPayoutsOnHold = risk.payoutsOnHold;
  }

  return buildPayoutReleaseEligibilitySnapshot(row, {
    initiatedByAdmin,
    milestoneGate: {
      fetchError: milestoneGate.fetchError,
      enforceMilestoneGate: milestoneGate.enforceMilestoneGate,
      scheduleOk: milestoneGate.scheduleOk,
    },
    proPayoutsOnHold,
  });
}
