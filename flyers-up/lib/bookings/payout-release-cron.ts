/**
 * Single implementation for scheduled payout release (job-completion + eligibility guards).
 * Invoked only from GET /api/cron/bookings/payout-release — not from the deprecated /api/cron/release-payouts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';
import { evaluatePayoutRiskForPro } from '@/lib/payoutRisk';
import { isPayoutEligible } from '@/lib/bookings/state-machine';
import { resolveMilestonePayoutGate } from '@/lib/bookings/multi-day-payout';
import { releasePayout } from '@/lib/bookings/payment-lifecycle-service';

export type PayoutReleaseCronResult = {
  released: number;
  failed: number;
  total: number;
};

export async function runPayoutReleaseCron(admin: SupabaseClient): Promise<PayoutReleaseCronResult> {
  const now = new Date().toISOString();

  const { data: candidates, error } = await admin
    .from('bookings')
    .select(
      'id, pro_id, status, total_amount_cents, amount_total, amount_subtotal, customer_fees_retained_cents, amount_platform_fee, refunded_total_cents, currency, paid_deposit_at, paid_remaining_at, stripe_destination_account_id, customer_confirmed, auto_confirm_at, arrived_at, started_at, completed_at, dispute_open, cancellation_reason, refund_status, suspicious_completion, is_multi_day, service_pros(stripe_account_id, user_id)'
    )
    .in('status', ['completed', 'customer_confirmed', 'auto_confirmed'])
    .eq('payout_released', false)
    .not('refund_status', 'eq', 'pending')
    .not('paid_deposit_at', 'is', null)
    .not('paid_remaining_at', 'is', null);

  if (error) {
    console.error('[payout-release-cron] query failed', error);
    throw new Error('Query failed');
  }

  const toProcess: NonNullable<typeof candidates> = [];
  for (const b of candidates ?? []) {
    const isMultiFlag = (b as { is_multi_day?: boolean }).is_multi_day === true;
    const gate = await resolveMilestonePayoutGate(admin, b.id, isMultiFlag);
    if (gate.fetchError) {
      console.warn('[payout-release-cron] skip booking (milestone gate query failed)', b.id);
      continue;
    }
    const eligibility = isPayoutEligible({
      status: b.status,
      arrived_at: (b as { arrived_at?: string | null }).arrived_at ?? null,
      started_at: (b as { started_at?: string | null }).started_at ?? null,
      completed_at: (b as { completed_at?: string | null }).completed_at ?? null,
      customer_confirmed: (b as { customer_confirmed?: boolean }).customer_confirmed === true,
      auto_confirm_at: (b as { auto_confirm_at?: string | null }).auto_confirm_at ?? null,
      dispute_open: (b as { dispute_open?: boolean }).dispute_open === true,
      cancellation_reason: (b as { cancellation_reason?: string | null }).cancellation_reason ?? null,
      paid_deposit_at: b.paid_deposit_at ?? null,
      paid_remaining_at: b.paid_remaining_at ?? null,
      refund_status: (b as { refund_status?: string | null }).refund_status ?? null,
      suspicious_completion: (b as { suspicious_completion?: boolean }).suspicious_completion === true,
      is_multi_day: gate.enforceMilestoneGate,
      multi_day_schedule_ok: gate.scheduleOk,
    });
    if (!eligibility.eligible) continue;

    const customerConfirmed = (b as { customer_confirmed?: boolean }).customer_confirmed === true;
    const autoConfirmAt = (b as { auto_confirm_at?: string | null }).auto_confirm_at;
    const autoConfirmPassed = autoConfirmAt != null && autoConfirmAt < now;
    if (!customerConfirmed && !autoConfirmPassed) continue;

    const { data: jc } = await admin
      .from('job_completions')
      .select('after_photo_urls, booking_id')
      .eq('booking_id', b.id)
      .maybeSingle();
    const rawUrls = (jc as { after_photo_urls?: string[] } | null)?.after_photo_urls ?? [];
    const validUrls = rawUrls.filter(
      (u): u is string =>
        typeof u === 'string' &&
        u.trim().length > 5 &&
        !/^(placeholder|n\/a|none|null|undefined)$/i.test(u.trim())
    );
    if (validUrls.length >= 2 && jc?.booking_id === b.id) toProcess.push(b);
  }

  let released = 0;
  let failed = 0;

  for (const b of toProcess) {
    const totalCents = Number(b.total_amount_cents ?? b.amount_total ?? 0) || 0;
    if (totalCents <= 0) continue;

    const proUser = (b.service_pros as { user_id?: string })?.user_id;
    if (proUser) {
      const risk = await evaluatePayoutRiskForPro(proUser);
      if (risk.payoutsOnHold) continue;
    }

    const out = await releasePayout(admin, { bookingId: b.id });
    if (out.ok) {
      await admin.from('booking_events').insert({
        booking_id: b.id,
        type: 'PAYOUT_RELEASED',
        data: { transfer_id: out.transferId, via: 'payout_release_cron' },
      });
      if (proUser) {
        void createNotificationEvent({
          userId: proUser,
          type: NOTIFICATION_TYPES.PAYOUT_SENT,
          bookingId: b.id,
          basePath: 'pro',
        });
      }
      released++;
    } else {
      failed++;
      if (proUser && out.code === 'transfer_failed') {
        void createNotificationEvent({
          userId: proUser,
          type: NOTIFICATION_TYPES.PAYOUT_FAILED,
          bookingId: b.id,
          titleOverride: 'Payout issue',
          bodyOverride: 'We could not process your payout. Please contact support.',
          basePath: 'pro',
        });
      }
    }
  }

  return { released, failed, total: candidates?.length ?? 0 };
}
