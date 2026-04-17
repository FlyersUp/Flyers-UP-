/**
 * Launch-simple automatic Stripe Connect payout gates (cron + lifecycle).
 *
 * Does **not** enforce: post-completion review window, customer confirmation timing,
 * or completion-photo counts. Those belong to product UX, not money release.
 *
 * Still blocks auto payout on: refund pending, suspicious completion (non-admin),
 * multi-day milestone schedule, arrival/start/completion timestamps, pro no-show cancel,
 * missing Connect destination, charges-disabled (non-admin), pro-level payout compliance hold.
 */

import type { PayoutHoldReason } from '@/lib/bookings/payment-lifecycle-types';

export type SimplePayoutMilestoneCtx = {
  fetchError: boolean;
  enforceMilestoneGate: boolean;
  scheduleOk: boolean;
};

export type SimplePayoutTransferCtx = {
  initiatedByAdmin: boolean;
  milestoneGate: SimplePayoutMilestoneCtx;
  proPayoutsOnHold: boolean;
};

export type SimplePayoutGateSnapshot =
  | { eligible: true }
  | {
      eligible: false;
      reason: string;
      holdReason: PayoutHoldReason;
      flagForAdminReview: boolean;
      missingRequirements: string[];
    };

export function evaluateSimplePayoutTransferGate(
  row: Record<string, unknown>,
  ctx: SimplePayoutTransferCtx
): SimplePayoutGateSnapshot {
  const missing: string[] = [];

  const refundStatus = String(row.refund_status ?? '').toLowerCase();
  if (refundStatus === 'pending') {
    missing.push('refund_not_pending');
    return {
      eligible: false,
      reason: 'Refund is pending.',
      holdReason: 'refund_pending',
      flagForAdminReview: true,
      missingRequirements: missing,
    };
  }

  if (!ctx.initiatedByAdmin && row.suspicious_completion === true) {
    missing.push('suspicious_completion_cleared');
    return {
      eligible: false,
      reason: 'Suspicious completion requires admin review before automatic payout.',
      holdReason: 'fraud_review',
      flagForAdminReview: true,
      missingRequirements: missing,
    };
  }

  if (ctx.milestoneGate.fetchError) {
    missing.push('milestone_data');
    return {
      eligible: false,
      reason: 'Could not verify multi-day milestone schedule.',
      holdReason: 'booking_not_completed',
      flagForAdminReview: true,
      missingRequirements: missing,
    };
  }

  if (ctx.milestoneGate.enforceMilestoneGate && !ctx.milestoneGate.scheduleOk) {
    missing.push('multi_day_milestones');
    return {
      eligible: false,
      reason: 'Multi-day milestones are not fully confirmed.',
      holdReason: 'booking_not_completed',
      flagForAdminReview: true,
      missingRequirements: missing,
    };
  }

  const arrivedAt = (row.arrived_at as string | null | undefined) ?? null;
  const startedAt = (row.started_at as string | null | undefined) ?? null;
  const completedAt = (row.completed_at as string | null | undefined) ?? null;
  if (!arrivedAt || !String(arrivedAt).trim()) {
    missing.push('arrived_at');
    return {
      eligible: false,
      reason: 'Pro has not arrived (arrived_at is null).',
      holdReason: 'booking_not_completed',
      flagForAdminReview: false,
      missingRequirements: missing,
    };
  }
  if (!startedAt || !String(startedAt).trim()) {
    missing.push('started_at');
    return {
      eligible: false,
      reason: 'Job has not been started (started_at is null).',
      holdReason: 'booking_not_completed',
      flagForAdminReview: false,
      missingRequirements: missing,
    };
  }
  if (!completedAt || !String(completedAt).trim()) {
    missing.push('completed_at');
    return {
      eligible: false,
      reason: 'Job has not been completed (completed_at is null).',
      holdReason: 'booking_not_completed',
      flagForAdminReview: false,
      missingRequirements: missing,
    };
  }

  if (String(row.cancellation_reason ?? '') === 'pro_no_show') {
    missing.push('cancellation_pro_no_show');
    return {
      eligible: false,
      reason: 'Booking was canceled for pro no-show.',
      holdReason: 'no_show_review',
      flagForAdminReview: true,
      missingRequirements: missing,
    };
  }

  const dest =
    (row.stripe_destination_account_id as string) ??
    ((row.service_pros as { stripe_account_id?: string })?.stripe_account_id ?? '');
  if (!dest || !String(dest).trim()) {
    missing.push('stripe_connect_destination_account');
    return {
      eligible: false,
      reason: 'Pro has no Stripe Connect destination account.',
      holdReason: 'missing_payment_method',
      flagForAdminReview: false,
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
      holdReason: 'missing_payment_method',
      flagForAdminReview: false,
      missingRequirements: missing,
    };
  }

  if (ctx.proPayoutsOnHold) {
    missing.push('pro_payout_not_on_compliance_hold');
    return {
      eligible: false,
      reason: 'Pro payout is on compliance hold.',
      holdReason: 'fraud_review',
      flagForAdminReview: true,
      missingRequirements: missing,
    };
  }

  return { eligible: true };
}
