/**
 * Cron: auto-refunds
 * Refunds deposit for cancelled bookings where job never started.
 * Idempotent. Secured by CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron/auth';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';
import { refundPaymentIntent } from '@/lib/stripe/server';
import { refundLifecycleMetadata } from '@/lib/stripe/booking-payment-metadata-lifecycle';
import { recordRefundAfterPayoutRemediation } from '@/lib/bookings/refund-remediation';
import { logBookingPaymentEvent } from '@/lib/bookings/payment-lifecycle-service';
import { appendBookingRefundEvent } from '@/lib/bookings/booking-refund-ledger';
import { STATUS } from '@/lib/bookings/booking-status';
import {
  coalesceBookingDepositPaymentIntentId,
  type BookingFinalPaymentIntentIdRow,
} from '@/lib/bookings/money-state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CANCELLED_STATUSES = [
  STATUS.CANCELLED_EXPIRED,
  STATUS.CANCELLED_BY_CUSTOMER,
  STATUS.CANCELLED_BY_PRO,
  STATUS.CANCELLED_ADMIN,
  'cancelled',
  'declined',
  'expired_unpaid',
];

/** Supabase `select` row — explicit so array elements are not inferred as `GenericStringError`. */
type AutoRefundBookingRow = {
  id: string;
  customer_id: string;
  pro_id: string | null;
  deposit_amount_cents?: number | null;
  amount_deposit?: number | null;
  subtotal_cents?: number | null;
  total_amount_cents?: number | null;
  amount_total?: number | null;
  amount_platform_fee?: number | null;
  final_amount_cents?: number | null;
  remaining_amount_cents?: number | null;
  pricing_version?: string | null;
  refunded_total_cents?: number | null;
  stripe_payment_intent_deposit_id?: string | null;
  payment_intent_id?: string | null;
  payout_released?: boolean | null;
  stripe_transfer_id?: string | null;
  payout_transfer_id?: string | null;
  service_pros?: { user_id?: string } | null;
};

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) return authErr;

  const admin = createSupabaseAdmin();

  // Cancelled bookings with paid deposit, job never started, no refund yet
  const { data: toRefund, error } = await admin
    .from('bookings')
    .select(
      [
        'id',
        'customer_id',
        'pro_id',
        'deposit_amount_cents',
        'amount_deposit',
        'subtotal_cents',
        'total_amount_cents',
        'amount_total',
        'amount_platform_fee',
        'final_amount_cents',
        'remaining_amount_cents',
        'pricing_version',
        'refunded_total_cents',
        'stripe_payment_intent_deposit_id',
        'payment_intent_id',
        'payout_released',
        'stripe_transfer_id',
        'payout_transfer_id',
        'service_pros(user_id)',
      ].join(', ')
    )
    .in('status', CANCELLED_STATUSES)
    .or('refund_status.is.null,refund_status.eq.none')
    .not('paid_deposit_at', 'is', null)
    .is('started_at', null)
    .or('stripe_payment_intent_deposit_id.not.is.null,payment_intent_id.not.is.null');

  if (error) {
    console.error('[cron/auto-refunds] query failed', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  const eligible = (toRefund ?? []) as unknown as AutoRefundBookingRow[];
  let succeeded = 0;
  let failed = 0;

  for (const b of eligible) {
    const piId = coalesceBookingDepositPaymentIntentId(b as BookingFinalPaymentIntentIdRow);
    if (!piId) continue;

    // Set pending first (idempotent)
    const { error: updErr } = await admin
      .from('bookings')
      .update({ refund_status: 'pending' })
      .eq('id', b.id)
      .or('refund_status.is.null,refund_status.eq.none');

    if (updErr) continue; // Already pending or processing

    const row = b as unknown as Record<string, string | number | boolean | null | undefined>;
    const depC = Number(row.deposit_amount_cents ?? row.amount_deposit ?? 0) || 0;
    const finC = Number(row.final_amount_cents ?? row.remaining_amount_cents ?? 0) || 0;
    const subC = Number(row.subtotal_cents ?? 0) || 0;
    const totC = Number(row.total_amount_cents ?? row.amount_total ?? 0) || 0;
    const feeC = Number(row.amount_platform_fee ?? 0) || 0;
    const pv = typeof row.pricing_version === 'string' ? row.pricing_version : null;
    const afterPayoutRow = (b as { payout_released?: boolean }).payout_released === true;
    const refundId = await refundPaymentIntent(
      piId,
      refundLifecycleMetadata({
        booking_id: String(b.id),
        refund_scope: 'deposit',
        resolution_type: 'cron_auto_refund',
        refunded_amount_cents: depC,
        refund_type: afterPayoutRow ? 'after_payout' : 'before_payout',
        refund_source_payment_phase: 'deposit',
        subtotal_cents: subC,
        total_amount_cents: totC,
        platform_fee_cents: feeC,
        deposit_amount_cents: depC,
        final_amount_cents: finC,
        pricing_version: pv,
        extra: { reason: 'requested_by_customer' },
      })
    );

    const proUserId = (b.service_pros as { user_id?: string })?.user_id;

    if (refundId) {
      const depCents =
        Number((b as { deposit_amount_cents?: number }).deposit_amount_cents ?? 0) ||
        Number((b as { amount_deposit?: number }).amount_deposit ?? 0) ||
        0;
      void appendBookingRefundEvent(admin, {
        bookingId: b.id as string,
        refundType: afterPayoutRow ? 'after_payout' : 'before_payout',
        amountCents: depCents,
        stripeRefundId: refundId,
        paymentIntentId: piId,
        requiresClawback: afterPayoutRow,
        source: 'cron',
      });
      await admin
        .from('bookings')
        .update({
          refund_status: 'succeeded',
          stripe_refund_deposit_id: refundId,
          ...(afterPayoutRow ? { refund_after_payout: true, requires_admin_review: true } : {}),
        })
        .eq('id', b.id);

      if (afterPayoutRow) {
        const tid =
          typeof row.stripe_transfer_id === 'string' && String(row.stripe_transfer_id).trim()
            ? String(row.stripe_transfer_id).trim()
            : typeof row.payout_transfer_id === 'string' && String(row.payout_transfer_id).trim()
              ? String(row.payout_transfer_id).trim()
              : null;
        const rem = await recordRefundAfterPayoutRemediation(admin, {
          bookingId: String(b.id),
          idempotencyKey: `cron:${String(b.id)}:${refundId}`,
          source: 'cron_auto_refund',
          refundScope: 'full',
          amountCents: depCents,
          stripeRefundIds: [refundId],
          payoutReleased: true,
          stripeTransferId: tid,
          actorType: 'cron',
        });
        if (rem.ok && !rem.skipped) {
          await logBookingPaymentEvent(admin, {
            bookingId: String(b.id),
            eventType: 'post_payout_refund_remediation_opened',
            phase: 'refund',
            status: 'pending_review',
            metadata: { remediation: 'cron_auto_refund' },
          });
        }
      }

      await admin.from('booking_events').insert({
        booking_id: b.id,
        type: 'REFUND_CREATED',
        data: { refund_id: refundId },
      });

      void createNotificationEvent({
        userId: b.customer_id,
        type: NOTIFICATION_TYPES.PAYMENT_REFUNDED,
        bookingId: b.id,
        basePath: 'customer',
      });
      if (proUserId) {
        void createNotificationEvent({
          userId: proUserId,
          type: NOTIFICATION_TYPES.PAYMENT_REFUNDED,
          bookingId: b.id,
          titleOverride: 'Refund processed',
          bodyOverride: 'Deposit refunded to customer.',
          basePath: 'pro',
        });
      }
      succeeded++;
    } else {
      await admin
        .from('bookings')
        .update({ refund_status: 'failed' })
        .eq('id', b.id);

      await admin.from('booking_events').insert({
        booking_id: b.id,
        type: 'REFUND_FAILED',
        data: {},
      });

      void createNotificationEvent({
        userId: b.customer_id,
        type: NOTIFICATION_TYPES.PAYMENT_FAILED,
        bookingId: b.id,
        titleOverride: 'Refund issue',
        bodyOverride: 'We could not process your refund automatically. Please contact support.',
        basePath: 'customer',
      });
      failed++;
    }
  }

  return NextResponse.json({
    succeeded,
    failed,
    total: eligible.length,
  });
}
