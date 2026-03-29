/**
 * Cron: release-payouts
 * Transfers net amount to pro for completed bookings.
 * net_to_pro = max(0, total_amount_cents - platform_fee_cents - refunded_total_cents)
 *
 * HARD GUARDS - payout NEVER allowed before:
 * - arrived_at IS NOT NULL (pro checked in)
 * - started_at IS NOT NULL (job started)
 * - completed_at IS NOT NULL (job completed)
 * - customer_confirmed = true OR auto_confirm_at < now()
 * - dispute_open = false
 * - cancellation_reason != 'pro_no_show'
 * - job_completions has >= 2 after photos
 * - payout_released = false
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron/auth';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';
import { createTransfer } from '@/lib/stripe/server';
import { computeNetToPro } from '@/lib/bookings/money';
import { evaluatePayoutRiskForPro } from '@/lib/payoutRisk';
import { isPayoutEligible } from '@/lib/bookings/state-machine';
import { resolveMilestonePayoutGate } from '@/lib/bookings/multi-day-payout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) return authErr;

  const admin = createSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: candidates, error } = await admin
    .from('bookings')
    .select(
      'id, pro_id, status, total_amount_cents, amount_total, platform_fee_cents, refunded_total_cents, currency, paid_deposit_at, paid_remaining_at, stripe_destination_account_id, customer_confirmed, auto_confirm_at, arrived_at, started_at, completed_at, dispute_open, cancellation_reason, refund_status, suspicious_completion, is_multi_day, service_pros(stripe_account_id, user_id)'
    )
    .in('status', ['completed', 'customer_confirmed', 'auto_confirmed'])
    .eq('payout_released', false)
    .not('refund_status', 'eq', 'pending')
    .not('paid_deposit_at', 'is', null)
    .not('paid_remaining_at', 'is', null);

  if (error) {
    console.error('[cron/release-payouts] query failed', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  const toProcess: typeof candidates = [];
  for (const b of candidates ?? []) {
    const isMultiFlag = (b as { is_multi_day?: boolean }).is_multi_day === true;
    const gate = await resolveMilestonePayoutGate(admin, b.id, isMultiFlag);
    if (gate.fetchError) {
      console.warn('[cron/release-payouts] skip booking (milestone gate query failed)', b.id);
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

    // Mirrors isPayoutEligible confirmation clause (defense in depth if logic diverges).
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
    // Require 2+ valid non-empty URLs (reject placeholders, empty strings)
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

    const destAccount =
      b.stripe_destination_account_id ??
      (b.service_pros as { stripe_account_id?: string })?.stripe_account_id;
    if (!destAccount) {
      console.warn('[cron/release-payouts] no destination for booking', b.id);
      failed++;
      continue;
    }

    const platformFeeCents = Number(b.platform_fee_cents ?? 0);
    const refundedCents = Number(b.refunded_total_cents ?? 0);
    const netToPro = computeNetToPro(totalCents, platformFeeCents, refundedCents);
    if (netToPro <= 0) continue;

    const currency = (b.currency ?? 'usd').toLowerCase();
    const idempotencyKey = `payout-${b.id}-${now}`;

    let skipPayoutTable = false;
    try {
      const { data: payoutRow } = await admin
        .from('booking_payouts')
        .select('id, stripe_transfer_id, status')
        .eq('booking_id', b.id)
        .maybeSingle();

      if (payoutRow?.stripe_transfer_id) continue;
      if (payoutRow?.status === 'released') continue;

      await admin.from('booking_payouts').upsert(
        {
          booking_id: b.id,
          amount_cents: netToPro,
          currency,
          status: 'queued',
          idempotency_key: idempotencyKey,
          updated_at: now,
        },
        { onConflict: 'booking_id' }
      );
    } catch {
      skipPayoutTable = true;
    }

    const { error: updErr } = await admin
      .from('bookings')
      .update({ payout_status: 'pending' })
      .eq('id', b.id)
      .eq('payout_released', false);

    if (updErr) continue;

    const transferId = await createTransfer({
      amount: netToPro,
      currency,
      destinationAccountId: destAccount,
      bookingId: b.id,
    });

    if (transferId) {
      await admin
        .from('bookings')
        .update({
          payout_status: 'succeeded',
          payout_released: true,
          payout_timestamp: now,
          stripe_transfer_id: transferId,
          transferred_total_cents: netToPro,
        })
        .eq('id', b.id);

      if (!skipPayoutTable) {
        try {
          await admin
            .from('booking_payouts')
            .update({
              stripe_transfer_id: transferId,
              status: 'released',
              updated_at: now,
            })
            .eq('booking_id', b.id);
        } catch {
          // ignore
        }
      }

      await admin.from('booking_events').insert({
        booking_id: b.id,
        type: 'PAYOUT_RELEASED',
        data: { transfer_id: transferId, amount_cents: netToPro },
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
      await admin
        .from('bookings')
        .update({ payout_status: 'failed' })
        .eq('id', b.id);

      await admin.from('booking_events').insert({
        booking_id: b.id,
        type: 'PAYOUT_FAILED',
        data: {},
      });

      if (proUser) {
        void createNotificationEvent({
          userId: proUser,
          type: NOTIFICATION_TYPES.PAYOUT_FAILED,
          bookingId: b.id,
          titleOverride: 'Payout issue',
          bodyOverride: 'We could not process your payout. Please contact support.',
          basePath: 'pro',
        });
      }
      failed++;
    }
  }

  return NextResponse.json({ released, failed, total: candidates?.length ?? 0 });
}
