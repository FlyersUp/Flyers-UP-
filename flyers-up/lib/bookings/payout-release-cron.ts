/**
 * Scheduled automatic payout release (Stripe Connect transfer via releasePayout).
 * Invoked only from GET /api/cron/bookings/payout-release.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';
import {
  evaluatePayoutTransferEligibility,
  releasePayout,
} from '@/lib/bookings/payment-lifecycle-service';
import type { PayoutHoldReason } from '@/lib/bookings/payment-lifecycle-types';

export type PayoutReleaseCronResult = {
  released: number;
  failed: number;
  flagged: number;
  /** Candidates seen (payout not released, deposit+remaining paid, in completed-like status) */
  total: number;
};

type QueueReason =
  | 'dispute_open'
  | 'refund_pending'
  | 'payout_blocked'
  | 'missing_evidence'
  | 'stripe_not_ready'
  | 'pro_payout_hold'
  | 'suspicious_completion';

function payoutReviewQueueReason(hold: PayoutHoldReason): QueueReason {
  switch (hold) {
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

export async function runPayoutReleaseCron(admin: SupabaseClient): Promise<PayoutReleaseCronResult> {
  const { data: candidates, error } = await admin
    .from('bookings')
    .select('id, pro_id, service_pros(user_id)')
    .in('status', ['completed', 'customer_confirmed', 'auto_confirmed', 'payout_eligible'])
    .eq('payout_released', false)
    .or('requires_admin_review.is.null,requires_admin_review.eq.false')
    .not('refund_status', 'eq', 'pending')
    .not('paid_deposit_at', 'is', null)
    .not('paid_remaining_at', 'is', null);

  if (error) {
    console.error('[payout-release-cron] query failed', error);
    throw new Error('Query failed');
  }

  let released = 0;
  let failed = 0;
  let flagged = 0;

  for (const row of candidates ?? []) {
    const bookingId = row.id as string;
    const proUserId = (row as { service_pros?: { user_id?: string } }).service_pros?.user_id;
    const ev = await evaluatePayoutTransferEligibility(admin, bookingId, { initiatedByAdmin: false });
    if (ev.ok) {
      const out = await releasePayout(admin, { bookingId });
      if (out.ok) {
        await admin.from('booking_events').insert({
          booking_id: bookingId,
          type: 'PAYOUT_RELEASED',
          data: { transfer_id: out.transferId, via: 'payout_release_cron' },
        });
        if (proUserId) {
          void createNotificationEvent({
            userId: proUserId,
            type: NOTIFICATION_TYPES.PAYOUT_SENT,
            bookingId,
            basePath: 'pro',
          });
        }
        released++;
      } else {
        failed++;
        await flagForManualPayoutReview(admin, bookingId, 'missing_payment_method', {
          release_error: out.code ?? 'unknown',
          note: 'Automatic transfer attempt failed; needs admin or retry',
        });
        flagged++;
        if (proUserId && out.code === 'transfer_failed') {
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
      continue;
    }

    if (ev.flagForAdminReview) {
      await flagForManualPayoutReview(admin, bookingId, ev.holdReason);
      flagged++;
    }
  }

  return { released, failed, flagged, total: candidates?.length ?? 0 };
}
