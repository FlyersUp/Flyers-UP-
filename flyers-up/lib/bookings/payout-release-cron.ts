/**
 * Scheduled automatic payout **retry / verify** path (Stripe Connect transfer via {@link releasePayout}).
 * Invoked only from GET /api/cron/bookings/payout-release.
 *
 * Scope: attempt release for rows that already satisfy eligibility; flag failures for admin.
 * This cron must **not** be the primary decider of “when payout starts” — normal flow is lifecycle +
 * synchronous release; this job catches retries and stuck edges.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';
import { releasePayout } from '@/lib/bookings/payment-lifecycle-service';
import {
  payoutReleaseCronCandidateOrFilter,
  payoutReleaseCronShouldAttemptAfterImmediateGrace,
} from '@/lib/bookings/payout-release-cron-selection';
import { getPayoutReleaseEligibilitySnapshot } from '@/lib/bookings/payout-release-eligibility-snapshot';
import type { PayoutHoldReason } from '@/lib/bookings/payment-lifecycle-types';
import { warnStuckPayoutsForCron } from '@/lib/bookings/stuck-payout-detector';
import {
  logPayoutCronEvent,
  payoutCronFailureReasonFromSnapshot,
  type PayoutCronFailureReason,
} from '@/lib/bookings/payout-cron-telemetry';

export type PayoutReleaseCronResult = {
  released: number;
  failed: number;
  flagged: number;
  /** Rows matching the DB prefilter before the immediate-release grace skip. */
  total: number;
  /** Skipped: `payout_eligible_at` too fresh — synchronous {@link releasePayout} owns first attempt. */
  skipped_immediate_grace: number;
  /** `releasePayout` returned `already_released` (webhook or prior run won the race) — not a failure. */
  skipped_already_released: number;
  /** Snapshot said not eligible (re-checked in code; SQL prefilter is not authoritative). */
  skipped_ineligible: number;
  /** Post-run: eligible + unreleased past grace (see {@link findStuckPayoutBookings}). */
  stuck_payout_count: number;
  stuck_payout_sample: string[];
};

type QueueReason =
  | 'dispute_open'
  | 'refund_pending'
  | 'payout_blocked'
  | 'missing_evidence'
  | 'stripe_not_ready'
  | 'pro_payout_hold'
  | 'suspicious_completion';

function proUserIdFromCronRow(row: { service_pros?: unknown }): string | null {
  const sp = row.service_pros;
  if (sp == null || typeof sp !== 'object') return null;
  if (Array.isArray(sp)) {
    const u = (sp[0] as { user_id?: string } | undefined)?.user_id;
    return u && String(u).trim() ? String(u) : null;
  }
  const u = (sp as { user_id?: string }).user_id;
  return u && String(u).trim() ? String(u) : null;
}

function payoutHoldReasonFromFailedRelease(out: {
  code?: string;
  details?: Record<string, unknown>;
}): PayoutHoldReason {
  const d = out.details;
  if (d && typeof d.holdReason === 'string' && d.holdReason.length > 0) {
    return d.holdReason as PayoutHoldReason;
  }
  const c = String(out.code ?? '').toLowerCase();
  if (c === 'admin_hold') return 'admin_hold';
  if (c === 'dispute' || c === 'payout_blocked') return 'payout_blocked';
  if (c === 'no_destination' || c === 'missing_payment_method') return 'missing_payment_method';
  if (c === 'transfer_failed' || c === 'transfer_failed_partial') return 'missing_payment_method';
  if (c === 'already_released') return 'already_released';
  return 'payout_blocked';
}

function payoutReviewQueueReason(hold: PayoutHoldReason): QueueReason {
  switch (hold) {
    case 'already_released':
      return 'stripe_not_ready';
    case 'dispute_open':
      return 'dispute_open';
    case 'refund_pending':
      return 'refund_pending';
    case 'payout_blocked':
      return 'payout_blocked';
    case 'fraud_review':
      return 'pro_payout_hold';
    case 'missing_payment_method':
      return 'stripe_not_ready';
    case 'no_show_review':
    case 'admin_hold':
      return 'payout_blocked';
    case 'insufficient_completion_evidence':
    case 'booking_not_completed':
      return 'missing_evidence';
    default:
      return 'missing_evidence';
  }
}

async function flagForManualPayoutReview(
  admin: SupabaseClient,
  bookingId: string,
  holdReason: PayoutHoldReason,
  extra?: Record<string, unknown>
): Promise<void> {
  const reason = payoutReviewQueueReason(holdReason);
  const now = new Date().toISOString();
  try {
    await admin.from('bookings').update({ requires_admin_review: true }).eq('id', bookingId);
  } catch (e) {
    console.warn('[payout-release-cron] requires_admin_review update failed', bookingId, e);
  }
  try {
    const { data: existing } = await admin
      .from('payout_review_queue')
      .select('status, details')
      .eq('booking_id', bookingId)
      .maybeSingle();
    const ex = existing as { status?: string; details?: Record<string, unknown> } | null;
    const st = String(ex?.status ?? '');
    if (st === 'held' || st === 'escalated') {
      const prev = ex?.details != null && typeof ex.details === 'object' && !Array.isArray(ex.details) ? ex.details : {};
      await admin
        .from('payout_review_queue')
        .update({
          details: {
            ...prev,
            holdReason,
            source: 'payout_release_cron',
            flagged_at: now,
            ...extra,
          },
        })
        .eq('booking_id', bookingId);
      return;
    }
    await admin.from('payout_review_queue').upsert(
      {
        booking_id: bookingId,
        reason,
        details: { holdReason, source: 'payout_release_cron', flagged_at: now, ...extra },
        status: 'pending_review',
      },
      { onConflict: 'booking_id' }
    );
  } catch (e) {
    console.warn('[payout-release-cron] payout_review_queue upsert failed', bookingId, e);
  }
}

function transferFailureReason(code: string | undefined): PayoutCronFailureReason {
  const c = String(code ?? '').toLowerCase();
  if (c === 'already_released') return 'duplicate_already_released';
  if (c === 'transfer_failed' || c === 'stripe_api_error') return 'stripe_transfer_failure';
  if (c === 'no_destination') return 'missing_connected_account';
  return 'other';
}

export async function runPayoutReleaseCron(admin: SupabaseClient): Promise<PayoutReleaseCronResult> {
  const runStartedAt = new Date().toISOString();
  logPayoutCronEvent({ event: 'cron_start', at: runStartedAt });

  const { data: candidates, error } = await admin
    .from('bookings')
    .select(
      'id, pro_id, payout_eligible_at, payment_lifecycle_status, final_payment_status, service_pros(user_id)'
    )
    .or(payoutReleaseCronCandidateOrFilter())
    .eq('payout_released', false)
    .not('refund_status', 'eq', 'pending')
    .not('paid_deposit_at', 'is', null)
    .not('paid_remaining_at', 'is', null)
    // Cheap prefilter: eligibility still requires completed_at for transfer. Imported/legacy rows with
    // null completed_at are skipped here — backfill completed_at (or a service-completed timestamp) before launch.
    .not('completed_at', 'is', null);

  if (error) {
    console.error('[payout-release-cron] query failed', error);
    throw new Error('Query failed');
  }

  let released = 0;
  let failed = 0;
  let flagged = 0;
  let skippedImmediateGrace = 0;
  let skippedAlreadyReleased = 0;
  let skippedIneligible = 0;

  for (const row of candidates ?? []) {
    const bookingId = row.id as string;
    const proUserId = proUserIdFromCronRow(row);
    const r = row as unknown as Record<string, unknown>;
    if (!payoutReleaseCronShouldAttemptAfterImmediateGrace(r)) {
      skippedImmediateGrace++;
      logPayoutCronEvent({
        event: 'payout_skipped',
        booking_id: bookingId,
        reason: 'immediate_release_grace',
      });
      continue;
    }
    const snap = await getPayoutReleaseEligibilitySnapshot(admin, bookingId, { initiatedByAdmin: false });
    if (!snap.eligible) {
      skippedIneligible++;
      logPayoutCronEvent({
        event: 'payout_skipped',
        booking_id: bookingId,
        failure_reason: payoutCronFailureReasonFromSnapshot(snap),
        hold_reason: snap.holdReason,
        lifecycle_phase: snap.lifecyclePhase,
        missing_requirements: snap.missingRequirements,
      });
      if (snap.flagForAdminReview) {
        await flagForManualPayoutReview(admin, bookingId, snap.holdReason);
        flagged++;
      }
      continue;
    }

    logPayoutCronEvent({
      event: 'payout_eligible',
      booking_id: bookingId,
      lifecycle_phase: snap.lifecyclePhase,
    });

    const out = await releasePayout(admin, { bookingId });
    if (out.ok) {
      await admin.from('booking_events').insert({
        booking_id: bookingId,
        type: 'PAYOUT_RELEASED',
        data: { transfer_id: out.transferId, via: 'payout_release_cron' },
      });
      released++;
      logPayoutCronEvent({
        event: 'payout_released',
        booking_id: bookingId,
        transfer_id: out.transferId ?? null,
        release_outcome: out.releaseOutcome ?? null,
      });
    } else if (out.code === 'already_released') {
      skippedAlreadyReleased++;
      logPayoutCronEvent({
        event: 'payout_skipped',
        booking_id: bookingId,
        failure_reason: 'duplicate_already_released',
        release_code: out.code,
        transfer_id: out.transferId ?? null,
      });
    } else {
      failed++;
      const fr = transferFailureReason(out.code);
      logPayoutCronEvent({
        event: 'payout_failed',
        booking_id: bookingId,
        failure_reason: fr,
        release_code: out.code ?? null,
        error_phase: out.errorPhase ?? null,
        message: out.message ?? null,
        transfer_id: out.transferId ?? null,
      });
      const hold = payoutHoldReasonFromFailedRelease(out);
      await flagForManualPayoutReview(admin, bookingId, hold, {
        release_error: out.code ?? 'unknown',
        note: 'Automatic transfer attempt failed; needs admin or retry',
      });
      flagged++;
      if (
        proUserId &&
        (out.code === 'transfer_failed' || out.code === 'no_destination' || out.code === 'transfer_failed_partial')
      ) {
        void createNotificationEvent({
          userId: proUserId,
          type: NOTIFICATION_TYPES.PAYOUT_FAILED,
          bookingId,
          titleOverride: 'Payout issue',
          bodyOverride: 'We could not process your payout. Please contact support.',
          basePath: 'pro',
        });
      }
    }
  }

  const { stuck } = await warnStuckPayoutsForCron(admin, {
    route: '/api/cron/bookings/payout-release',
    maxScan: 200,
    limit: 25,
  });

  const result: PayoutReleaseCronResult = {
    released,
    failed,
    flagged,
    total: candidates?.length ?? 0,
    skipped_immediate_grace: skippedImmediateGrace,
    skipped_already_released: skippedAlreadyReleased,
    skipped_ineligible: skippedIneligible,
    stuck_payout_count: stuck.length,
    stuck_payout_sample: stuck.map((s) => s.bookingId).slice(0, 12),
  };

  logPayoutCronEvent({
    event: 'cron_end',
    at: new Date().toISOString(),
    candidate_count: result.total,
    released: result.released,
    failed: result.failed,
    flagged: result.flagged,
    skipped_immediate_grace: result.skipped_immediate_grace,
    skipped_already_released: result.skipped_already_released,
    skipped_ineligible: result.skipped_ineligible,
    stuck_payout_count: result.stuck_payout_count,
  });

  return result;
}
