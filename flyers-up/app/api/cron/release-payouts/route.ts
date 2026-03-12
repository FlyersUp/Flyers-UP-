/**
 * Cron: release-payouts
 * Transfers net amount to pro for completed bookings.
 * net_to_pro = max(0, total_amount_cents - platform_fee_cents - refunded_total_cents)
 *
 * Eligibility:
 * - status = 'completed'
 * - job_completions has >= 2 after photos
 * - customer_confirmed = true OR auto_confirm_at < now()
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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) return authErr;

  const admin = createSupabaseAdmin();
  const now = new Date().toISOString();

  // Completed: paid_deposit + paid_remaining; payout_released = false; refund not pending
  const { data: eligible, error } = await admin
    .from('bookings')
    .select(
      'id, pro_id, total_amount_cents, amount_total, platform_fee_cents, refunded_total_cents, currency, paid_deposit_at, paid_remaining_at, stripe_destination_account_id, customer_confirmed, auto_confirm_at, service_pros(stripe_account_id, user_id)'
    )
    .eq('status', 'completed')
    .eq('payout_released', false)
    .not('refund_status', 'eq', 'pending')
    .not('paid_deposit_at', 'is', null)
    .not('paid_remaining_at', 'is', null);

  const toProcess: typeof eligible = [];
  for (const b of eligible ?? []) {
    const customerConfirmed = (b as { customer_confirmed?: boolean }).customer_confirmed === true;
    const autoConfirmAt = (b as { auto_confirm_at?: string | null }).auto_confirm_at;
    const autoConfirmPassed = autoConfirmAt != null && autoConfirmAt < now;

    if (!customerConfirmed && !autoConfirmPassed) continue;

    const { data: jc } = await admin
      .from('job_completions')
      .select('after_photo_urls')
      .eq('booking_id', b.id)
      .maybeSingle();
    const urls = (jc as { after_photo_urls?: string[] } | null)?.after_photo_urls ?? [];
    if (urls.length >= 2) toProcess.push(b);
  }

  if (error) {
    console.error('[cron/release-payouts] query failed', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
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

    // Set pending (idempotent) - only if not already released
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

  return NextResponse.json({ released, failed, total: eligible?.length ?? 0 });
}
