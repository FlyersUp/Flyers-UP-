/**
 * Idempotent booking updates for a succeeded Stripe PaymentIntent.
 * Safe to call from both payment_intent.succeeded and charge.succeeded (ordering).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { revalidatePath } from 'next/cache';
import { isCancelled } from '@/lib/bookings/booking-status';
import { resolveWebhookPaymentKind } from '@/lib/stripe/webhook-payment-phase';
import { refundPaymentIntent } from '@/lib/stripe/server';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';
import { sendProPaymentReceipt } from '@/lib/email';

export type ApplySucceededPaymentIntentResult =
  | { handled: false }
  | {
      handled: true;
      bookingId: string;
      paymentKind: 'deposit' | 'remaining' | 'legacy_full';
      lateAutoRefund: boolean;
    };

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
  const bookingId = meta?.booking_id ?? meta?.bookingId;
  if (!bookingId) {
    return { handled: false };
  }

  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select(
      'id, status, status_history, pro_id, customer_id, price, amount_total, total_amount_cents, refunded_total_cents, payment_status, final_payment_status, stripe_payment_intent_deposit_id, stripe_payment_intent_remaining_id, payment_intent_id, final_payment_intent_id, service_pros(user_id)'
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (bErr || !booking) {
    console.warn('[applySucceededPI] booking not found', { bookingId, bErr });
    return { handled: false };
  }

  const paymentKind = resolveWebhookPaymentKind(
    meta,
    paymentIntent.id,
    booking as {
      stripe_payment_intent_deposit_id?: string | null;
      stripe_payment_intent_remaining_id?: string | null;
      payment_intent_id?: string | null;
      final_payment_intent_id?: string | null;
    }
  );

  const proId = booking.pro_id;
  const history = Array.isArray(booking.status_history) ? booking.status_history : [];
  const now = new Date().toISOString();
  const proUserId = (booking.service_pros as { user_id?: string })?.user_id;

  if (isCancelled(booking.status)) {
    const refundId = await refundPaymentIntent(paymentIntent.id, {
      reason: 'requested_by_customer',
      booking_id: bookingId,
    });
    const upd: Record<string, unknown> = {
      refund_status: refundId ? 'succeeded' : 'pending',
    };
    if (paymentKind === 'deposit') upd.stripe_refund_deposit_id = refundId ?? undefined;
    else if (paymentKind === 'remaining') upd.stripe_refund_remaining_id = refundId ?? undefined;
    else upd.stripe_refund_remaining_id = refundId ?? undefined;
    await admin.from('bookings').update(upd).eq('id', bookingId);
    await admin.from('booking_events').insert({
      booking_id: bookingId,
      type: 'LATE_PAYMENT_AUTO_REFUND',
      data: { payment_intent_id: paymentIntent.id, refund_id: refundId ?? null },
    });
    void createNotificationEvent({
      userId: booking.customer_id,
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
    return {
      handled: true,
      bookingId,
      paymentKind: paymentKind === 'remaining' ? 'remaining' : paymentKind === 'deposit' ? 'deposit' : 'legacy_full',
      lateAutoRefund: true,
    };
  }

  if (paymentKind === 'deposit') {
    const already =
      String(booking.payment_status ?? '').toUpperCase() === 'PAID' &&
      ((booking as { stripe_payment_intent_deposit_id?: string }).stripe_payment_intent_deposit_id ===
        paymentIntent.id ||
        (booking as { payment_intent_id?: string }).payment_intent_id === paymentIntent.id);

    if (!already) {
      const oldStatus = booking.status;
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
          userId: booking.customer_id,
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
          oldStatus: booking.status,
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

    return { handled: true, bookingId, paymentKind: 'deposit', lateAutoRefund: false };
  }

  if (paymentKind === 'remaining') {
    const already =
      String((booking as { final_payment_status?: string }).final_payment_status ?? '').toUpperCase() ===
        'PAID' &&
      ((booking as { stripe_payment_intent_remaining_id?: string }).stripe_payment_intent_remaining_id ===
        paymentIntent.id ||
        (booking as { final_payment_intent_id?: string }).final_payment_intent_id === paymentIntent.id);

    const isAwaitingRemaining = booking.status === 'awaiting_remaining_payment';
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
          userId: booking.customer_id,
          type: NOTIFICATION_TYPES.PAYMENT_REMAINING_PAID,
          bookingId,
          titleOverride: isAwaitingRemaining ? 'Remaining paid' : 'Payment complete',
          bodyOverride: isAwaitingRemaining
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
            bodyOverride: isAwaitingRemaining
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
      const totalCents = Number(booking.total_amount_cents ?? booking.amount_total ?? 0);
      const amountDollars = totalCents > 0 ? totalCents / 100 : Number(booking.price ?? 0);
      const amount = amountDollars > 0 ? amountDollars : 0;
      await admin.from('pro_earnings').insert({
        pro_id: booking.pro_id,
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

    return { handled: true, bookingId, paymentKind: 'remaining', lateAutoRefund: false };
  }

  // legacy_full
  const shouldFinalize =
    booking.status === 'awaiting_payment' || booking.status === 'completed_pending_payment';
  const alreadyCompleted = history.some((e: { status?: string }) => e?.status === 'completed');
  const nextHistory =
    shouldFinalize && !alreadyCompleted ? [...history, { status: 'completed', at: now }] : history;

  const payOk = String(booking.payment_status ?? '').toUpperCase() === 'PAID';
  const samePi =
    (booking as { payment_intent_id?: string }).payment_intent_id === paymentIntent.id;
  const fullyDone = booking.status === 'fully_paid';
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
    const totalCents = Number(booking.total_amount_cents ?? booking.amount_total ?? 0);
    const amountDollars = totalCents > 0 ? totalCents / 100 : Number(booking.price ?? 0);
    const amount = amountDollars > 0 ? amountDollars : 0;
    await admin.from('pro_earnings').insert({
      pro_id: booking.pro_id,
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

  return { handled: true, bookingId, paymentKind: 'legacy_full', lateAutoRefund: false };
}
