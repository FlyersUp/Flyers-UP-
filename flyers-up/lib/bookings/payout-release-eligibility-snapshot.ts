/**
 * Single source of truth for automatic Stripe Connect payout release (cron + admin).
 *
 * Uses `payment_lifecycle_status`, `final_payment_status`, and payout columns — not
 * `bookings.status` or `service_status` — to classify where the booking sits in the payout
 * pipeline. `bookings.status` is passed into {@link isPayoutEligible} only for arrival/start/completion
 * and post-completion review timing; when lifecycle is `payout_ready` / `final_paid` / etc.,
 * {@link isPayoutEligible} skips the early-workflow blocklist on `status` so money truth wins.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { isPayoutEligible, PAYOUT_AUTO_RELEASE_REVIEW_HOURS } from '@/lib/bookings/state-machine';
import { resolveMilestonePayoutGate } from '@/lib/bookings/multi-day-payout';
import { evaluatePayoutRiskForPro } from '@/lib/payoutRisk';
import type { PayoutHoldReason } from '@/lib/bookings/payment-lifecycle-types';
import { countValidJobCompletionAfterPhotoUrls } from '@/lib/bookings/job-completion-photo-count';

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
  /** From `job_completions` when cron enforces photo proof; null = not loaded / admin bypass. */
  jobCompletion: { after_photo_urls?: string[]; booking_id?: string } | null;
  /** When `initiatedByAdmin`, photo proof is skipped — set `skipPhotoProof: true`. */
  skipPhotoProof: boolean;
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

function mapSmReasonToHold(smReason: string): { hold: PayoutHoldReason; missing: string[]; flag: boolean } {
  const r = smReason;
  if (r.includes('review window has not passed')) {
    return { hold: 'waiting_post_completion_review', missing: ['post_completion_review_window'], flag: false };
  }
  if (r.includes('Dispute')) return { hold: 'dispute_open', missing: ['dispute_clear'], flag: true };
  if (r.includes('no-show')) return { hold: 'no_show_review', missing: ['no_show_policy'], flag: true };
  if (r.includes('Suspicious') || r.includes('admin review')) {
    return { hold: 'fraud_review', missing: ['suspicious_completion_review'], flag: true };
  }
  if (r.includes('Payment not complete') || r.includes('deposit or remaining')) {
    return { hold: 'missing_final_payment', missing: ['deposit_and_remaining_paid'], flag: false };
  }
  if (r.includes('Refund already processed')) {
    return { hold: 'customer_refunded', missing: ['not_fully_refunded'], flag: false };
  }
  if (r.includes('Refund')) return { hold: 'refund_pending', missing: ['refund_not_pending'], flag: true };
  if (r.includes('not in')) return { hold: 'insufficient_completion_evidence', missing: ['workflow_status'], flag: false };
  if (r.includes('not arrived') || r.includes('not been started') || r.includes('not been completed')) {
    return {
      hold: 'insufficient_completion_evidence',
      missing: ['arrived_started_completed_timestamps'],
      flag: false,
    };
  }
  if (r.includes('Multi-day')) {
    return { hold: 'insufficient_completion_evidence', missing: ['multi_day_milestones'], flag: true };
  }
  return { hold: 'insufficient_completion_evidence', missing: ['payout_operational_gates'], flag: false };
}

/**
 * Pure evaluation from an already-loaded booking row + async-derived context (milestones, photos, risk).
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

  if (!ctx.initiatedByAdmin && row.requires_admin_review === true) {
    missing.push('admin_review_cleared');
    return {
      eligible: false,
      reason: 'Booking requires admin review before automatic payout.',
      lifecyclePhase: resolvePayoutReleaseLifecyclePhase(row),
      holdReason: 'admin_review_required',
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

  if (ctx.milestoneGate.fetchError) {
    missing.push('milestone_data');
    return {
      eligible: false,
      reason: 'Could not verify multi-day milestone schedule.',
      lifecyclePhase: 'final_settled_awaiting_transfer',
      holdReason: 'insufficient_completion_evidence',
      flagForAdminReview: true,
      missingRequirements: missing,
    };
  }

  const sm = isPayoutEligible({
    status: String(row.status ?? ''),
    payment_lifecycle_status: (row.payment_lifecycle_status as string | null | undefined) ?? null,
    arrived_at: (row.arrived_at as string) ?? null,
    started_at: (row.started_at as string) ?? null,
    completed_at: (row.completed_at as string) ?? null,
    customer_confirmed: row.customer_confirmed === true,
    auto_confirm_at: (row.auto_confirm_at as string) ?? null,
    dispute_open: row.dispute_open === true,
    cancellation_reason: (row.cancellation_reason as string) ?? null,
    paid_deposit_at: (row.paid_deposit_at as string) ?? null,
    paid_remaining_at: (row.paid_remaining_at as string) ?? null,
    refund_status: (row.refund_status as string) ?? null,
    suspicious_completion: row.suspicious_completion === true,
    is_multi_day: ctx.milestoneGate.enforceMilestoneGate,
    multi_day_schedule_ok: ctx.milestoneGate.scheduleOk,
    adminTransferOverride: ctx.initiatedByAdmin,
    autoReleaseAfterCompletionHours: ctx.initiatedByAdmin ? null : PAYOUT_AUTO_RELEASE_REVIEW_HOURS,
  });

  if (!sm.eligible) {
    const mapped = mapSmReasonToHold(sm.reason ?? '');
    missing.push(...mapped.missing);
    return {
      eligible: false,
      reason: sm.reason ?? 'Payout operational gates not satisfied.',
      lifecyclePhase: 'final_settled_awaiting_transfer',
      holdReason: mapped.hold,
      flagForAdminReview: mapped.flag,
      missingRequirements: missing,
    };
  }

  if (!ctx.skipPhotoProof) {
    const jc = ctx.jobCompletion;
    const rawUrls = (jc?.after_photo_urls ?? []) as string[];
    const validUrlsCount = countValidJobCompletionAfterPhotoUrls(rawUrls);
    const bid = String(row.id ?? '');
    if (validUrlsCount < 2 || String(jc?.booking_id ?? '') !== bid) {
      missing.push('two_valid_completion_photos');
      return {
        eligible: false,
        reason: 'At least two valid completion photos are required.',
        lifecyclePhase: 'final_settled_awaiting_transfer',
        holdReason: 'insufficient_completion_evidence',
        flagForAdminReview: true,
        missingRequirements: missing,
      };
    }
  }

  const dest =
    (row.stripe_destination_account_id as string) ??
    ((row.service_pros as { stripe_account_id?: string })?.stripe_account_id ?? '');
  if (!dest || !String(dest).trim()) {
    missing.push('stripe_connect_destination_account');
    return {
      eligible: false,
      reason: 'Pro has no Stripe Connect destination account.',
      lifecyclePhase: 'final_settled_awaiting_transfer',
      holdReason: 'missing_payment_method',
      flagForAdminReview: true,
      missingRequirements: missing,
    };
  }

  const chargesOn =
    (row.service_pros as { stripe_charges_enabled?: boolean })?.stripe_charges_enabled === true;
  if (!ctx.initiatedByAdmin && !chargesOn) {
    missing.push('stripe_charges_enabled');
    return {
      eligible: false,
      reason: 'Pro Stripe account cannot receive charges yet.',
      lifecyclePhase: 'final_settled_awaiting_transfer',
      holdReason: 'missing_payment_method',
      flagForAdminReview: true,
      missingRequirements: missing,
    };
  }

  if (ctx.proPayoutsOnHold) {
    missing.push('pro_payout_not_on_compliance_hold');
    return {
      eligible: false,
      reason: 'Pro payout is on compliance hold.',
      lifecyclePhase: 'final_settled_awaiting_transfer',
      holdReason: 'fraud_review',
      flagForAdminReview: true,
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
 * Loads booking + milestone gate + completion photos + risk, then returns a payout eligibility snapshot.
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
      jobCompletion: null,
      skipPhotoProof: initiatedByAdmin,
      proPayoutsOnHold: false,
    });
  }

  const row = b as unknown as Record<string, unknown>;
  const isMultiFlag = row.is_multi_day === true;
  const gate = await resolveMilestonePayoutGate(admin, bookingId, isMultiFlag);

  let jobCompletion: { after_photo_urls?: string[]; booking_id?: string } | null = null;
  if (!initiatedByAdmin) {
    const { data: jc } = await admin
      .from('job_completions')
      .select('after_photo_urls, booking_id')
      .eq('booking_id', bookingId)
      .maybeSingle();
    jobCompletion = (jc as { after_photo_urls?: string[]; booking_id?: string }) ?? null;
  }

  const proUser = (row.service_pros as { user_id?: string })?.user_id;
  let proPayoutsOnHold = false;
  if (proUser) {
    const risk = await evaluatePayoutRiskForPro(proUser);
    proPayoutsOnHold = risk.payoutsOnHold;
  }

  return buildPayoutReleaseEligibilitySnapshot(row, {
    initiatedByAdmin,
    milestoneGate: {
      fetchError: gate.fetchError,
      enforceMilestoneGate: gate.enforceMilestoneGate,
      scheduleOk: gate.scheduleOk,
    },
    jobCompletion,
    skipPhotoProof: initiatedByAdmin,
    proPayoutsOnHold,
  });
}
