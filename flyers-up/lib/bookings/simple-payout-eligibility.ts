/**
 * Launch-simple automatic Stripe Connect payout gates (cron + lifecycle).
 *
 * Still blocks auto payout on: refund pending, suspicious completion (non-admin),
 * multi-day milestone schedule, arrival/start/completion timestamps, **24h cooling after
 * completed_at** (non-admin), **protected-category after-photo evidence** (non-admin),
 * pro no-show cancel, missing Connect destination, charges-disabled (non-admin),
 * pro-level payout compliance hold.
 */

import { getCategoryRule } from '@/lib/bookings/category-rules';
import { countValidJobCompletionAfterPhotoUrls } from '@/lib/bookings/job-completion-photo-count';
import type { PayoutHoldReason } from '@/lib/bookings/payment-lifecycle-types';

/** Non-admin automatic transfers wait this long after `completed_at` (Option A cron release). */
export const PAYOUT_AUTO_RELEASE_MIN_MS_AFTER_COMPLETION = 24 * 60 * 60 * 1000;

export type SimplePayoutMilestoneCtx = {
  fetchError: boolean;
  enforceMilestoneGate: boolean;
  scheduleOk: boolean;
};

export type SimplePayoutTransferCtx = {
  initiatedByAdmin: boolean;
  milestoneGate: SimplePayoutMilestoneCtx;
  proPayoutsOnHold: boolean;
  /** Wall clock for cooling-period checks; defaults to `Date.now()`. */
  nowMs?: number;
  /**
   * `bookings.pricing_category_slug` — when {@link getCategoryRule} requires before/after photos,
   * {@link validAfterPhotoUrls} must include at least two valid URLs (non-admin).
   */
  pricingCategorySlug?: string | null;
  /** Raw `job_completions.after_photo_urls` (optional; avoids an extra DB round-trip when caller already fetched). */
  afterPhotoUrls?: unknown;
  /**
   * Pre-computed valid after-photo count; when set, overrides counting from `afterPhotoUrls`.
   */
  validAfterPhotoCount?: number;
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

  const completedMs = Date.parse(String(completedAt));
  const nowMs = ctx.nowMs ?? Date.now();
  if (
    !ctx.initiatedByAdmin &&
    Number.isFinite(completedMs) &&
    nowMs - completedMs < PAYOUT_AUTO_RELEASE_MIN_MS_AFTER_COMPLETION
  ) {
    missing.push('payout_completion_cooling_period');
    return {
      eligible: false,
      reason: 'Automatic payout releases no sooner than 24 hours after the job is marked complete.',
      holdReason: 'booking_not_completed',
      flagForAdminReview: false,
      missingRequirements: missing,
    };
  }

  const slug =
    ctx.pricingCategorySlug ??
    ((row as { pricing_category_slug?: string | null }).pricing_category_slug ?? null);
  const rule = getCategoryRule(slug);
  if (!ctx.initiatedByAdmin && rule.requiresBeforeAfterPhotos) {
    const n =
      typeof ctx.validAfterPhotoCount === 'number'
        ? ctx.validAfterPhotoCount
        : countValidJobCompletionAfterPhotoUrls(ctx.afterPhotoUrls);
    if (n < 2) {
      missing.push('protected_category_after_photos');
      return {
        eligible: false,
        reason: 'This service category requires at least two after photos before automatic payout.',
        holdReason: 'insufficient_completion_evidence',
        flagForAdminReview: true,
        missingRequirements: missing,
      };
    }
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
