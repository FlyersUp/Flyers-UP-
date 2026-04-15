/**
 * Idempotent booking updates for a succeeded Stripe PaymentIntent.
 * Safe to call from both payment_intent.succeeded and charge.succeeded (ordering).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { revalidatePath } from 'next/cache';
import { isCancelled } from '@/lib/bookings/booking-status';
import { resolveWebhookPaymentKind } from '@/lib/stripe/webhook-payment-phase';
import { normalizeBookingPaymentMetadata } from '@/lib/stripe/booking-payment-intent-metadata';
import { recordBookingStripeFeeSnapshot } from '@/lib/stripe/booking-stripe-fee-snapshot';
import { refundPaymentIntent } from '@/lib/stripe/server';
import { refundLifecycleMetadata } from '@/lib/stripe/booking-payment-metadata-lifecycle';
import { recordRefundAfterPayoutRemediation } from '@/lib/bookings/refund-remediation';
import { logBookingPaymentEvent } from '@/lib/bookings/payment-lifecycle-service';
import { appendBookingRefundEvent } from '@/lib/bookings/booking-refund-ledger';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';
import { sendProPaymentReceipt } from '@/lib/email';
import {
  handleDepositPaymentSucceeded,
  handleFinalPaymentSucceeded,
} from '@/lib/bookings/payment-lifecycle-service';
import { getBookingWorkflowStatusAfterFinalPayment } from '@/lib/bookings/final-payment-post-success-model';
import {
  coalesceBookingFinalPaymentIntentId,
  type BookingFinalPaymentIntentIdRow,
} from '@/lib/bookings/money-state';

export type ApplySucceededPaymentIntentResult =
  | { handled: false }
  | {
      handled: true;
      bookingId: string;
      paymentKind: 'deposit' | 'remaining' | 'legacy_full';
      lateAutoRefund: boolean;
    };

/** Prefer frozen `bookings` cents, then canonical metadata ({@link normalizeBookingPaymentMetadata}), then legacy parse. */
function pickNonNegativeCents(
  dbVal: unknown,
  metaVal: number | null | undefined,
  legacyVal: number | null | undefined
): number {
  if (typeof dbVal === 'number' && Number.isFinite(dbVal) && dbVal >= 0) return Math.round(dbVal);
  if (typeof metaVal === 'number' && Number.isFinite(metaVal) && metaVal >= 0) return Math.round(metaVal);
  if (typeof legacyVal === 'number' && Number.isFinite(legacyVal) && legacyVal >= 0) return Math.round(legacyVal);
  return 0;
}

function proEarningsDollarsFromFrozenRowAndMetadata(
  booking: Record<string, unknown>,
  financial: ReturnType<typeof normalizeBookingPaymentMetadata>['financial'],
  rawServiceSub: number | null,
  rawPlatformFee: number | null
): number {
  const totalCents = Number(booking.total_amount_cents ?? booking.amount_total ?? 0);
  const platformFeeCents = pickNonNegativeCents(
    booking.fee_total_cents ?? booking.amount_platform_fee,
    financial.feeTotalCents,
    rawPlatformFee
  );
  const impliedSub =
    totalCents > 0 && platformFeeCents >= 0 ? Math.max(0, Math.round(totalCents - platformFeeCents)) : 0;
  const serviceSubtotalCents = pickNonNegativeCents(
    booking.subtotal_cents,
    financial.subtotalCents ?? financial.serviceSubtotalCents,
    rawServiceSub ?? (impliedSub > 0 ? impliedSub : null)
  );
  const amountDollars = serviceSubtotalCents > 0 ? serviceSubtotalCents / 100 : Number(booking.price ?? 0);
  return amountDollars > 0 ? amountDollars : 0;
}

async function bookingEventExistsForPi(
  admin: SupabaseClient,
  bookingId: string,
  type: string,
  paymentIntentId: string
): Promise<boolean> {
  const { data, error } = await admin
    .from('booking_events')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('type', type)
    .contains('data', { payment_intent_id: paymentIntentId })
    .limit(1)
    .maybeSingle();
  if (error) {
    const { data: rows } = await admin
      .from('booking_events')
      .select('data')
      .eq('booking_id', bookingId)
      .eq('type', type)
      .limit(50);
    return (rows ?? []).some(
      (r) => (r as { data?: { payment_intent_id?: string } }).data?.payment_intent_id === paymentIntentId
    );
  }
  return !!data;
}

export async function applySucceededPaymentIntent(
  admin: SupabaseClient,
  paymentIntent: Stripe.PaymentIntent
): Promise<ApplySucceededPaymentIntentResult> {
  const meta = paymentIntent.metadata as Record<string, string | undefined>;
  const normalized = normalizeBookingPaymentMetadata(meta);
  const bookingId = meta?.booking_id ?? meta?.bookingId;
  if (!bookingId) {
    return { handled: false };
  }

  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select(
      [
        'id',
        'status',
        'status_history',
        'pro_id',
        'customer_id',
        'price',
        'amount_total',
        'amount_platform_fee',
        'total_amount_cents',
        'refunded_total_cents',
        'payment_status',
        'final_payment_status',
        'stripe_payment_intent_deposit_id',
        'stripe_payment_intent_remaining_id',
        'payment_intent_id',
        'final_payment_intent_id',
        'deposit_payment_intent_id',
        'subtotal_cents',
        'customer_total_cents',
        'fee_total_cents',
        'deposit_amount_cents',
        'amount_deposit',
        'final_amount_cents',
        'remaining_amount_cents',
        'pricing_version',
        'payout_released',
        'stripe_transfer_id',
        'payout_transfer_id',
        'service_pros(user_id)',
      ].join(', ')
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (bErr || !booking) {
    console.warn('[applySucceededPI] booking not found', { bookingId, bErr });
    return { handled: false };
  }

  /** Narrow Supabase row — `data` is otherwise inferred as `GenericStringError`. */
  const b = booking as unknown as Record<string, unknown> & {
    id: string;
    status: string;
    pro_id: string;
    customer_id: string;
    status_history: unknown;
    payment_status?: string | null;
    service_pros?: { user_id?: string } | null;
  };

  const paymentKind = resolveWebhookPaymentKind(meta, paymentIntent.id, b as BookingFinalPaymentIntentIdRow);

  const proId = b.pro_id;
  const history = Array.isArray(b.status_history) ? b.status_history : [];
  const now = new Date().toISOString();
  const proUserId = (b.service_pros as { user_id?: string })?.user_id;

  if (isCancelled(b.status)) {
    const bRow = b as Record<string, string | number | boolean | null | undefined>;
    const depC = Number(bRow.deposit_amount_cents ?? bRow.amount_deposit ?? 0) || 0;
    const finC = Number(bRow.final_amount_cents ?? bRow.remaining_amount_cents ?? 0) || 0;
    const subC = Number(bRow.subtotal_cents ?? 0) || 0;
    const totC = Number(bRow.total_amount_cents ?? bRow.amount_total ?? 0) || 0;
    const feeC = Number(bRow.amount_platform_fee ?? bRow.fee_total_cents ?? 0) || 0;
    const pv = typeof bRow.pricing_version === 'string' ? bRow.pricing_version : null;
    const afterPayout = (b as { payout_released?: boolean }).payout_released === true;
    const refundId = await refundPaymentIntent(
      paymentIntent.id,
      refundLifecycleMetadata({
        booking_id: bookingId,
        refund_scope:
          paymentKind === 'deposit' ? 'deposit' : paymentKind === 'remaining' ? 'final' : 'full',
        resolution_type: 'cancelled_after_capture',
        refunded_amount_cents: Math.round(Number(paymentIntent.amount) || 0),
        refund_type: afterPayout ? 'after_payout' : 'before_payout',
        refund_source_payment_phase:
          paymentKind === 'deposit' ? 'deposit' : paymentKind === 'remaining' ? 'final' : 'full',
        subtotal_cents: subC,
        total_amount_cents: totC,
        platform_fee_cents: feeC,
        deposit_amount_cents: depC,
        final_amount_cents: finC,
        pricing_version: pv,
        extra: { reason: 'requested_by_customer' },
      })
    );
    const upd: Record<string, unknown> = {
      refund_status: refundId ? 'succeeded' : 'pending',
    };
    if (paymentKind === 'deposit') upd.stripe_refund_deposit_id = refundId ?? undefined;
    else if (paymentKind === 'remaining') upd.stripe_refund_remaining_id = refundId ?? undefined;
    else upd.stripe_refund_remaining_id = refundId ?? undefined;
    if (afterPayout) {
      upd.refund_after_payout = true;
      upd.requires_admin_review = true;
    }
    await admin.from('bookings').update(upd).eq('id', bookingId);
    if (refundId) {
      const ins = await appendBookingRefundEvent(admin, {
        bookingId,
        refundType: afterPayout ? 'after_payout' : 'before_payout',
        amountCents: paymentIntent.amount,
        stripeRefundId: refundId,
        paymentIntentId: paymentIntent.id,
        requiresClawback: afterPayout,
        source: 'system',
      });
      if (ins.ok === false && 'error' in ins) {
        console.warn('[applySucceededPI] refund ledger', ins.error);
      }
      if (afterPayout && refundId) {
        const tr = b as { stripe_transfer_id?: string | null; payout_transfer_id?: string | null };
        const tid =
          typeof tr.stripe_transfer_id === 'string' && tr.stripe_transfer_id.trim()
            ? tr.stripe_transfer_id.trim()
            : typeof tr.payout_transfer_id === 'string' && tr.payout_transfer_id.trim()
              ? tr.payout_transfer_id.trim()
              : null;
        const rem = await recordRefundAfterPayoutRemediation(admin, {
          bookingId,
          idempotencyKey: `late-capture-cancel:${paymentIntent.id}:${refundId}`,
          source: 'system_cancel',
          refundScope: 'full',
          amountCents: paymentIntent.amount,
          stripeRefundIds: [refundId],
          payoutReleased: true,
          stripeTransferId: tid,
          actorType: 'system',
        });
        if (rem.ok && !rem.skipped) {
          await logBookingPaymentEvent(admin, {
            bookingId,
            eventType: 'post_payout_refund_remediation_opened',
            phase: 'refund',
            status: 'pending_review',
            metadata: { remediation: 'cancelled_after_capture' },
          });
        }
      }
    } else {
      console.error('[applySucceededPI] late-cancel refund not created (Stripe returned null)', {
        bookingId,
        payment_intent_id: paymentIntent.id,
        payment_kind: paymentKind,
        note: 'Booking refund_status may be pending; do not send refund-success notifications.',
      });
    }
    await admin.from('booking_events').insert({
      booking_id: bookingId,
      type: 'LATE_PAYMENT_AUTO_REFUND',
      data: { payment_intent_id: paymentIntent.id, refund_id: refundId ?? null },
    });
    if (refundId) {
      void createNotificationEvent({
        userId: b.customer_id,
        type: NOTIFICATION_TYPES.PAYMENT_REFUNDED,
        bookingId,
        titleOverride: 'Payment refunded',
        bodyOverride: 'Payment arrived after cancellation — automatically refunded',
        basePath: 'customer',
      });
      if (proUserId) {
        void createNotificationEvent({
          userId: proUserId,
          type: NOTIFICATION_TYPES.PAYMENT_REFUNDED,
          bookingId,
          titleOverride: 'Late payment refunded',
          bodyOverride: 'Customer paid after cancellation — refunded',
          basePath: 'pro',
        });
      }
    }
    return {
      handled: true,
      bookingId,
      paymentKind: paymentKind === 'remaining' ? 'remaining' : paymentKind === 'deposit' ? 'deposit' : 'legacy_full',
      lateAutoRefund: true,
    };
  }

  if (paymentKind === 'deposit') {
    const already =
      String(b.payment_status ?? '').toUpperCase() === 'PAID' &&
      ((b as { stripe_payment_intent_deposit_id?: string }).stripe_payment_intent_deposit_id ===
        paymentIntent.id ||
        (b as { payment_intent_id?: string }).payment_intent_id === paymentIntent.id);

    if (!already) {
      const updatePayload: Record<string, unknown> = {
        payment_intent_id: paymentIntent.id,
        stripe_payment_intent_deposit_id: paymentIntent.id,
        payment_status: 'PAID',
        paid_at: now,
        paid_deposit_at: now,
        awaiting_pro_arrival_at: now,
        status: 'deposit_paid',
        status_history: [...history, { status: 'deposit_paid', at: now }],
      };
      await admin.from('bookings').update(updatePayload).eq('id', bookingId);
    }

    const hasEv = await bookingEventExistsForPi(admin, bookingId, 'DEPOSIT_PAID', paymentIntent.id);
    if (!hasEv) {
      await admin.from('booking_events').insert({
        booking_id: bookingId,
        type: 'DEPOSIT_PAID',
        data: { payment_intent_id: paymentIntent.id },
      });
      if (!already) {
        void createNotificationEvent({
          userId: b.customer_id,
          type: NOTIFICATION_TYPES.PAYMENT_DEPOSIT_PAID,
          bookingId,
          basePath: 'customer',
        });
        if (proUserId) {
          void createNotificationEvent({
            userId: proUserId,
            type: NOTIFICATION_TYPES.PAYMENT_DEPOSIT_PAID,
            bookingId,
            titleOverride: 'Deposit secured',
            bodyOverride:
              'Customer paid the deposit. You will be paid after verified arrival, start, and completion.',
            basePath: 'pro',
          });
        }
        console.log('[applySucceededPI:deposit_paid]', {
          bookingId,
          proId: proId ?? null,
          oldStatus: b.status,
          paymentIntentId: paymentIntent.id,
        });
      }
    }

    try {
      revalidatePath('/pro');
      revalidatePath('/pro/today');
      revalidatePath('/pro/jobs');
      revalidatePath('/pro/calendar');
      revalidatePath('/customer');
      revalidatePath('/customer/calendar');
    } catch (revErr) {
      console.warn('[applySucceededPI:deposit] revalidatePath failed', revErr);
    }

    try {
      await recordBookingStripeFeeSnapshot(admin, {
        bookingId,
        paymentIntentId: paymentIntent.id,
        finalizeContributionMargin: false,
        metadata: meta,
      });
    } catch (feeErr) {
      console.warn('[applySucceededPI:deposit] stripe fee snapshot failed', feeErr);
    }

    try {
      await handleDepositPaymentSucceeded(admin, paymentIntent);
    } catch (lcErr) {
      console.warn('[applySucceededPI:deposit] lifecycle sync failed', lcErr);
    }

    return { handled: true, bookingId, paymentKind: 'deposit', lateAutoRefund: false };
  }

  if (paymentKind === 'remaining') {
    const already =
      String((b as { final_payment_status?: string }).final_payment_status ?? '').toUpperCase() ===
        'PAID' &&
      coalesceBookingFinalPaymentIntentId(b as BookingFinalPaymentIntentIdRow) === paymentIntent.id;

    const isAwaitingRemaining = b.status === 'awaiting_remaining_payment';
    const nextStatus = isAwaitingRemaining ? 'awaiting_customer_confirmation' : 'fully_paid';
    const nextHistory = [...history, { status: nextStatus, at: now }];

    if (!already) {
      const updatePayload: Record<string, unknown> = {
        final_payment_intent_id: paymentIntent.id,
        stripe_payment_intent_remaining_id: paymentIntent.id,
        final_payment_status: 'PAID',
        fully_paid_at: now,
        paid_remaining_at: now,
        status: nextStatus,
        status_history: nextHistory,
      };
      await admin.from('bookings').update(updatePayload).eq('id', bookingId);
    }

    const hasEv = await bookingEventExistsForPi(admin, bookingId, 'REMAINING_PAID', paymentIntent.id);
    if (!hasEv) {
      await admin.from('booking_events').insert({
        booking_id: bookingId,
        type: 'REMAINING_PAID',
        data: { payment_intent_id: paymentIntent.id },
      });
      if (!already) {
        void createNotificationEvent({
          userId: b.customer_id,
          type: NOTIFICATION_TYPES.PAYMENT_REMAINING_PAID,
          bookingId,
          titleOverride:
            nextStatus === 'awaiting_customer_confirmation' ? 'Remaining paid' : 'Payment complete',
          bodyOverride:
            nextStatus === 'awaiting_customer_confirmation'
              ? 'Remaining paid — confirm completion'
              : 'Remaining balance has been paid.',
          basePath: 'customer',
        });
        if (proUserId) {
          void createNotificationEvent({
            userId: proUserId,
            type: NOTIFICATION_TYPES.PAYMENT_REMAINING_PAID,
            bookingId,
            titleOverride: 'Customer paid remaining',
            bodyOverride:
              nextStatus === 'awaiting_customer_confirmation'
                ? 'Customer paid remaining — awaiting confirmation'
                : 'Customer paid the remaining balance.',
            basePath: 'pro',
          });
        }
      }
    }

    const { data: existing } = await admin
      .from('pro_earnings')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (!existing) {
      const amount = proEarningsDollarsFromFrozenRowAndMetadata(
        b as Record<string, unknown>,
        normalized.financial,
        normalized.raw.serviceSubtotalCents,
        normalized.raw.platformFeeTotalCents
      );
      await admin.from('pro_earnings').insert({
        pro_id: b.pro_id,
        booking_id: bookingId,
        amount: amount,
      });

      if (proId) {
        const { data: proRow } = await admin
          .from('service_pros')
          .select('user_id, display_name')
          .eq('id', proId)
          .maybeSingle();
        if (proRow?.user_id) {
          const { data: profile } = await admin
            .from('profiles')
            .select('email')
            .eq('id', proRow.user_id)
            .maybeSingle();
          const proEmail = (profile as { email?: string | null } | null)?.email;
          if (proEmail?.trim()) {
            void sendProPaymentReceipt({
              to: proEmail.trim(),
              proName: (proRow.display_name as string) || 'Pro',
              amount: String(amount.toFixed(2)),
              bookingId,
            });
          }
        }
      }
    }

    try {
      await recordBookingStripeFeeSnapshot(admin, {
        bookingId,
        paymentIntentId: paymentIntent.id,
        finalizeContributionMargin: true,
        metadata: meta,
      });
    } catch (feeErr) {
      console.warn('[applySucceededPI:remaining] stripe fee snapshot failed', feeErr);
    }

    try {
      await handleFinalPaymentSucceeded(admin, paymentIntent);
    } catch (lcErr) {
      console.warn('[applySucceededPI:remaining] lifecycle sync failed', lcErr);
    }

    return { handled: true, bookingId, paymentKind: 'remaining', lateAutoRefund: false };
  }

  // legacy_full
  const shouldFinalize =
    b.status === 'awaiting_payment' || b.status === 'completed_pending_payment';
  const alreadyCompleted = history.some((e: { status?: string }) => e?.status === 'completed');
  const nextHistory =
    shouldFinalize && !alreadyCompleted ? [...history, { status: 'completed', at: now }] : history;

  const payOk = String(b.payment_status ?? '').toUpperCase() === 'PAID';
  const samePi =
    (b as { payment_intent_id?: string }).payment_intent_id === paymentIntent.id;
  const fullyDone = b.status === 'fully_paid';
  const legacyNeedsUpdate =
    !payOk ||
    !samePi ||
    (shouldFinalize && !fullyDone && !alreadyCompleted);

  if (legacyNeedsUpdate) {
    const updatePayload: Record<string, unknown> = {
      payment_intent_id: paymentIntent.id,
      payment_status: 'PAID',
      paid_at: now,
      ...(shouldFinalize ? { status: 'fully_paid', status_history: nextHistory } : {}),
    };
    await admin.from('bookings').update(updatePayload).eq('id', bookingId);
  }

  const { data: existing } = await admin
    .from('pro_earnings')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (shouldFinalize && !existing) {
    const amount = proEarningsDollarsFromFrozenRowAndMetadata(
      b as Record<string, unknown>,
      normalized.financial,
      normalized.raw.serviceSubtotalCents,
      normalized.raw.platformFeeTotalCents
    );
    await admin.from('pro_earnings').insert({
      pro_id: b.pro_id,
      booking_id: bookingId,
      amount,
    });

    if (proId) {
      const { data: proRow } = await admin
        .from('service_pros')
        .select('user_id, display_name')
        .eq('id', proId)
        .maybeSingle();
      if (proRow?.user_id) {
        const { data: profile } = await admin
          .from('profiles')
          .select('email')
          .eq('id', proRow.user_id)
          .maybeSingle();
        const proEmail = (profile as { email?: string | null } | null)?.email;
        if (proEmail?.trim()) {
          void sendProPaymentReceipt({
            to: proEmail.trim(),
            proName: (proRow.display_name as string) || 'Pro',
            amount: String(amount.toFixed(2)),
            bookingId,
          });
        }
      }
    }
  }

  try {
    await recordBookingStripeFeeSnapshot(admin, {
      bookingId,
      paymentIntentId: paymentIntent.id,
      finalizeContributionMargin: true,
      metadata: meta,
    });
  } catch (feeErr) {
    console.warn('[applySucceededPI:legacy_full] stripe fee snapshot failed', feeErr);
  }

  return { handled: true, bookingId, paymentKind: 'legacy_full', lateAutoRefund: false };
}
