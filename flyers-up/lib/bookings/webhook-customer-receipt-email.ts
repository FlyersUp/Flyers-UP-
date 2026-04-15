/**
 * Customer receipt emails after payment webhooks.
 * Order: committed booking state → claim by Stripe event id → send → timestamp / notes.
 * Retries: stripe_events idempotency is separate; claims prevent duplicate sends per event.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getBookingReceipt } from '@/lib/bookings/booking-receipt-service';
import {
  sendUnifiedReceiptEmailDeposit,
  sendUnifiedReceiptEmailFinal,
} from '@/lib/email/customer-booking-receipt';
import { logWebhookReceiptEvent } from '@/lib/stripe/webhook-receipt-log';
import {
  coalesceBookingDepositPaymentIntentId,
  coalesceBookingFinalPaymentIntentId,
  type BookingFinalPaymentIntentIdRow,
} from '@/lib/bookings/money-state';

type Admin = SupabaseClient;

const RESEND_CONFIGURED = Boolean(process.env.RESEND_API_KEY);

export type ReceiptEmailWebhookContext = {
  bookingId: string;
  kind: 'deposit' | 'remaining' | 'legacy_full';
  stripeEventId: string;
  paymentIntentId: string;
  chargeId?: string | null;
};

function emailKindForClaim(kind: ReceiptEmailWebhookContext['kind']): 'deposit' | 'final' {
  return kind === 'deposit' ? 'deposit' : 'final';
}

async function releaseClaim(admin: Admin, stripeEventId: string): Promise<void> {
  await admin.from('booking_receipt_email_claims').delete().eq('stripe_event_id', stripeEventId);
}

function matchesCommittedPaymentState(
  row: Record<string, unknown>,
  ctx: ReceiptEmailWebhookContext
): boolean {
  const pi = ctx.paymentIntentId.trim();
  if (!pi) return false;

  if (ctx.kind === 'deposit') {
    const ps = String(row.payment_status ?? '').toUpperCase();
    if (ps !== 'PAID') return false;
    const dep = String(coalesceBookingDepositPaymentIntentId(row as BookingFinalPaymentIntentIdRow) ?? '').trim();
    return dep === pi;
  }

  if (ctx.kind === 'remaining') {
    const fs = String(row.final_payment_status ?? '').toUpperCase();
    if (fs !== 'PAID') return false;
    const rem = String(coalesceBookingFinalPaymentIntentId(row as BookingFinalPaymentIntentIdRow) ?? '').trim();
    return rem === pi;
  }

  const ps = String(row.payment_status ?? '').toUpperCase();
  if (ps !== 'PAID') return false;
  const legacyPi = String(row.payment_intent_id ?? '').trim();
  return legacyPi === pi;
}

export async function sendCustomerBookingReceiptEmailAfterCommit(
  admin: Admin,
  ctx: ReceiptEmailWebhookContext
): Promise<void> {
  const emailKind = emailKindForClaim(ctx.kind);

  const { data: row, error: fetchErr } = await admin
    .from('bookings')
    .select(
      [
        'id',
        'customer_id',
        'payment_status',
        'final_payment_status',
        'payment_intent_id',
        'final_payment_intent_id',
        'deposit_payment_intent_id',
        'stripe_payment_intent_deposit_id',
        'stripe_payment_intent_remaining_id',
        'customer_receipt_deposit_email_at',
        'customer_receipt_final_email_at',
        'customer_receipt_deposit_email_note',
        'customer_receipt_final_email_note',
      ].join(', ')
    )
    .eq('id', ctx.bookingId)
    .maybeSingle();

  if (fetchErr || !row) {
    logWebhookReceiptEvent({
      bookingId: ctx.bookingId,
      paymentPhase: ctx.kind,
      paymentIntentId: ctx.paymentIntentId,
      chargeId: ctx.chargeId ?? null,
      stripeEventId: ctx.stripeEventId,
      emailKind,
      emailResult: 'noop',
      detail: fetchErr?.message ?? 'booking_missing',
    });
    return;
  }

  const b = row as unknown as Record<string, unknown>;
  const customerId = b.customer_id as string | undefined;

  if (ctx.kind === 'deposit' && b.customer_receipt_deposit_email_at) {
    logWebhookReceiptEvent({
      bookingId: ctx.bookingId,
      paymentPhase: ctx.kind,
      paymentIntentId: ctx.paymentIntentId,
      chargeId: ctx.chargeId ?? null,
      stripeEventId: ctx.stripeEventId,
      emailKind,
      emailResult: 'skipped_already_sent',
    });
    return;
  }

  if (ctx.kind !== 'deposit' && b.customer_receipt_final_email_at) {
    logWebhookReceiptEvent({
      bookingId: ctx.bookingId,
      paymentPhase: ctx.kind,
      paymentIntentId: ctx.paymentIntentId,
      chargeId: ctx.chargeId ?? null,
      stripeEventId: ctx.stripeEventId,
      emailKind,
      emailResult: 'skipped_already_sent',
    });
    return;
  }

  if (!matchesCommittedPaymentState(b, ctx)) {
    logWebhookReceiptEvent({
      bookingId: ctx.bookingId,
      paymentPhase: ctx.kind,
      paymentIntentId: ctx.paymentIntentId,
      chargeId: ctx.chargeId ?? null,
      stripeEventId: ctx.stripeEventId,
      emailKind,
      emailResult: 'skipped_state',
    });
    return;
  }

  const { error: claimErr } = await admin.from('booking_receipt_email_claims').insert({
    stripe_event_id: ctx.stripeEventId,
    booking_id: ctx.bookingId,
    email_kind: emailKind,
  });

  if (claimErr) {
    if (claimErr.code === '23505') {
      logWebhookReceiptEvent({
        bookingId: ctx.bookingId,
        paymentPhase: ctx.kind,
        paymentIntentId: ctx.paymentIntentId,
        chargeId: ctx.chargeId ?? null,
        stripeEventId: ctx.stripeEventId,
        emailKind,
        emailResult: 'skipped_claim',
      });
      return;
    }
    logWebhookReceiptEvent({
      bookingId: ctx.bookingId,
      paymentPhase: ctx.kind,
      paymentIntentId: ctx.paymentIntentId,
      chargeId: ctx.chargeId ?? null,
      stripeEventId: ctx.stripeEventId,
      emailKind,
      emailResult: 'failed',
      detail: claimErr.message,
    });
    return;
  }

  if (!RESEND_CONFIGURED) {
    const note = 'skipped_resend_not_configured';
    if (ctx.kind === 'deposit') {
      await admin
        .from('bookings')
        .update({ customer_receipt_deposit_email_note: note })
        .eq('id', ctx.bookingId)
        .is('customer_receipt_deposit_email_note', null);
    } else {
      await admin
        .from('bookings')
        .update({ customer_receipt_final_email_note: note })
        .eq('id', ctx.bookingId)
        .is('customer_receipt_final_email_note', null);
    }
    logWebhookReceiptEvent({
      bookingId: ctx.bookingId,
      paymentPhase: ctx.kind,
      paymentIntentId: ctx.paymentIntentId,
      chargeId: ctx.chargeId ?? null,
      stripeEventId: ctx.stripeEventId,
      emailKind,
      emailResult: 'skipped_resend_not_configured',
    });
    return;
  }

  if (!customerId) {
    await releaseClaim(admin, ctx.stripeEventId);
    logWebhookReceiptEvent({
      bookingId: ctx.bookingId,
      paymentPhase: ctx.kind,
      paymentIntentId: ctx.paymentIntentId,
      chargeId: ctx.chargeId ?? null,
      stripeEventId: ctx.stripeEventId,
      emailKind,
      emailResult: 'skipped_no_customer_email',
    });
    return;
  }

  const receipt = await getBookingReceipt(admin, ctx.bookingId);
  if (!receipt) {
    await releaseClaim(admin, ctx.stripeEventId);
    logWebhookReceiptEvent({
      bookingId: ctx.bookingId,
      paymentPhase: ctx.kind,
      paymentIntentId: ctx.paymentIntentId,
      chargeId: ctx.chargeId ?? null,
      stripeEventId: ctx.stripeEventId,
      emailKind,
      emailResult: 'failed',
      detail: 'receipt_unavailable',
    });
    return;
  }

  const { data: prof } = await admin
    .from('profiles')
    .select('email')
    .eq('id', customerId)
    .maybeSingle();
  const to = (prof as { email?: string | null } | null)?.email?.trim();
  if (!to) {
    await releaseClaim(admin, ctx.stripeEventId);
    logWebhookReceiptEvent({
      bookingId: ctx.bookingId,
      paymentPhase: ctx.kind,
      paymentIntentId: ctx.paymentIntentId,
      chargeId: ctx.chargeId ?? null,
      stripeEventId: ctx.stripeEventId,
      emailKind,
      emailResult: 'skipped_no_customer_email',
    });
    return;
  }

  const now = new Date().toISOString();
  try {
    if (ctx.kind === 'deposit') {
      const sendResult = await sendUnifiedReceiptEmailDeposit({ to, receipt });
      if (!sendResult.success) {
        await releaseClaim(admin, ctx.stripeEventId);
        await admin
          .from('bookings')
          .update({ customer_receipt_deposit_email_note: sendResult.error ?? 'send_failed' })
          .eq('id', ctx.bookingId);
        logWebhookReceiptEvent({
          bookingId: ctx.bookingId,
          paymentPhase: ctx.kind,
          paymentIntentId: ctx.paymentIntentId,
          chargeId: ctx.chargeId ?? null,
          stripeEventId: ctx.stripeEventId,
          emailKind,
          emailResult: 'failed',
          detail: sendResult.error,
        });
        return;
      }
      await admin
        .from('bookings')
        .update({ customer_receipt_deposit_email_at: now })
        .eq('id', ctx.bookingId)
        .is('customer_receipt_deposit_email_at', null);
    } else {
      const sendResult = await sendUnifiedReceiptEmailFinal({ to, receipt });
      if (!sendResult.success) {
        await releaseClaim(admin, ctx.stripeEventId);
        await admin
          .from('bookings')
          .update({ customer_receipt_final_email_note: sendResult.error ?? 'send_failed' })
          .eq('id', ctx.bookingId);
        logWebhookReceiptEvent({
          bookingId: ctx.bookingId,
          paymentPhase: ctx.kind,
          paymentIntentId: ctx.paymentIntentId,
          chargeId: ctx.chargeId ?? null,
          stripeEventId: ctx.stripeEventId,
          emailKind,
          emailResult: 'failed',
          detail: sendResult.error,
        });
        return;
      }
      await admin
        .from('bookings')
        .update({ customer_receipt_final_email_at: now })
        .eq('id', ctx.bookingId)
        .is('customer_receipt_final_email_at', null);
    }

    logWebhookReceiptEvent({
      bookingId: ctx.bookingId,
      paymentPhase: ctx.kind,
      paymentIntentId: ctx.paymentIntentId,
      chargeId: ctx.chargeId ?? null,
      stripeEventId: ctx.stripeEventId,
      emailKind,
      emailResult: 'sent',
    });
  } catch (e) {
    await releaseClaim(admin, ctx.stripeEventId);
    logWebhookReceiptEvent({
      bookingId: ctx.bookingId,
      paymentPhase: ctx.kind,
      paymentIntentId: ctx.paymentIntentId,
      chargeId: ctx.chargeId ?? null,
      stripeEventId: ctx.stripeEventId,
      emailKind,
      emailResult: 'failed',
      detail: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}
