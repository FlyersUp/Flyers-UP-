/**
 * Stripe Webhook Handler
 * Idempotent via stripe_events. Signature verified with STRIPE_WEBHOOK_SECRET.
 * Handles: payment_intent.succeeded, charge.succeeded (ordering), payment_intent.payment_failed,
 * charge.refunded, disputes. DB updates + stripe_events mark run in-request; receipt email via `after()`.
 * Late pay after cancel → auto-refund.
 * stripe listen --forward-to localhost:3000/api/stripe/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import Stripe from 'stripe';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { recordServerErrorEvent } from '@/lib/serverError';
import { resolveWebhookPaymentKind } from '@/lib/stripe/webhook-payment-phase';
import { enqueueAfterResponse } from '@/lib/jobs/enqueue';
import { customerBookingReceiptEmailWorker } from '@/lib/jobs/workers';
import { applySucceededPaymentIntent } from '@/lib/stripe/apply-succeeded-payment-intent';
import { computeChargeRefundedDeltaCents } from '@/lib/stripe/charge-refund-delta';
import { logWebhookReceiptEvent } from '@/lib/stripe/webhook-receipt-log';
import {
  isStripeEventProcessed,
  markStripeEventProcessed,
} from '@/lib/stripe/webhook-idempotency';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';
import { applyDisputeHold } from '@/lib/payoutRisk';
import {
  handleDepositPaymentFailed,
  handleFinalPaymentFailed,
} from '@/lib/bookings/payment-lifecycle-service';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
  const admin = createSupabaseAdmin();
  const paymentIntentId = dispute.payment_intent as string | null;
  if (!paymentIntentId) return;

  const pi = await stripe!.paymentIntents.retrieve(paymentIntentId);
  const meta = (pi.metadata || {}) as { booking_id?: string; bookingId?: string };
  const bookingId = meta.booking_id ?? meta.bookingId;
  if (!bookingId) return;

  const { data: booking } = await admin
    .from('bookings')
    .select('pro_id, service_pros(user_id)')
    .eq('id', bookingId)
    .maybeSingle();
  const proUserId = (booking?.service_pros as { user_id?: string })?.user_id;
  if (!proUserId) return;

  await admin.from('stripe_disputes').upsert(
    {
      stripe_dispute_id: dispute.id,
      booking_id: bookingId,
      pro_user_id: proUserId,
      status: 'open',
      amount_cents: dispute.amount ?? null,
    },
    { onConflict: 'stripe_dispute_id' }
  );
  await applyDisputeHold({ proUserId, hasActiveDispute: true });
}

async function handleDisputeClosed(dispute: Stripe.Dispute): Promise<void> {
  const admin = createSupabaseAdmin();

  await admin
    .from('stripe_disputes')
    .update({ status: dispute.status ?? 'closed', resolved_at: new Date().toISOString() })
    .eq('stripe_dispute_id', dispute.id);

  const paymentIntentId = dispute.payment_intent as string | null;
  if (!paymentIntentId) return;
  const pi = await stripe!.paymentIntents.retrieve(paymentIntentId);
  const meta = (pi.metadata || {}) as { booking_id?: string; bookingId?: string };
  const bookingId = meta.booking_id ?? meta.bookingId;
  if (!bookingId) return;
  const { data: booking } = await admin
    .from('bookings')
    .select('service_pros(user_id)')
    .eq('id', bookingId)
    .maybeSingle();
  const proUserId = (booking?.service_pros as { user_id?: string })?.user_id;
  if (!proUserId) return;

  const { data: open } = await admin
    .from('stripe_disputes')
    .select('id')
    .eq('pro_user_id', proUserId)
    .eq('status', 'open')
    .limit(1);
  const hasActiveDispute = (open?.length ?? 0) > 0;
  await applyDisputeHold({ proUserId, hasActiveDispute });
}

export async function POST(req: NextRequest) {
  if (!stripe || !webhookSecret) {
    console.error('Stripe webhook secret not configured');
    void recordServerErrorEvent({
      message: 'Stripe webhook not configured',
      severity: 'error',
      route: '/api/stripe/webhook',
      meta: {
        stripeClientConfigured: Boolean(stripe),
        webhookSecretSet: Boolean(webhookSecret),
      },
    });
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    void recordServerErrorEvent({
      message: 'Stripe webhook missing signature',
      severity: 'warn',
      route: '/api/stripe/webhook',
    });
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe!.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    void recordServerErrorEvent({
      message: 'Stripe webhook signature verification failed',
      severity: 'warn',
      route: '/api/stripe/webhook',
      stack: err instanceof Error ? err.stack ?? null : null,
    });
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  // Idempotency: skip if already processed
  const eventId = event.id;
  if (await isStripeEventProcessed(eventId)) {
    return NextResponse.json({ received: true });
  }

  try {
    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const meta = paymentIntent.metadata as Record<string, string | undefined>;
        const bookingId = meta?.booking_id ?? meta?.bookingId;

        if (!bookingId) {
          await markStripeEventProcessed(eventId, event.type);
          break;
        }

        try {
          const admin = createSupabaseAdmin();
          const applied = await applySucceededPaymentIntent(admin, paymentIntent);

          if (!applied.handled) {
            await markStripeEventProcessed(eventId, event.type);
            break;
          }

          await markStripeEventProcessed(eventId, event.type);

          if (!applied.lateAutoRefund) {
            const chargeRef = paymentIntent.latest_charge;
            const chargeId =
              typeof chargeRef === 'string' ? chargeRef : chargeRef?.id ?? null;
            enqueueAfterResponse('customer-booking-receipt-email', () =>
              customerBookingReceiptEmailWorker({
                bookingId: applied.bookingId,
                kind: applied.paymentKind,
                stripeEventId: eventId,
                paymentIntentId: paymentIntent.id,
                chargeId,
              })
            );
          } else {
            logWebhookReceiptEvent({
              bookingId: applied.bookingId,
              paymentPhase: 'refund',
              paymentIntentId: paymentIntent.id,
              chargeId: null,
              stripeEventId: eventId,
              emailResult: 'noop',
              detail: 'late_auto_refund',
            });
          }
        } catch (e) {
          console.warn('Webhook persistence failed', e);
          throw e;
        }
        break;
      }

      case 'charge.succeeded': {
        const charge = event.data.object as Stripe.Charge;
        if (charge.status !== 'succeeded') {
          await markStripeEventProcessed(eventId, event.type);
          break;
        }
        const piRef = charge.payment_intent;
        const piId = typeof piRef === 'string' ? piRef : piRef?.id ?? null;
        if (!piId) {
          await markStripeEventProcessed(eventId, event.type);
          break;
        }
        try {
          const pi = await stripe!.paymentIntents.retrieve(piId);
          if (pi.status !== 'succeeded') {
            await markStripeEventProcessed(eventId, event.type);
            break;
          }
          const admin = createSupabaseAdmin();
          const applied = await applySucceededPaymentIntent(admin, pi);
          await markStripeEventProcessed(eventId, event.type);
          if (applied.handled && !applied.lateAutoRefund) {
            enqueueAfterResponse('customer-booking-receipt-email', () =>
              customerBookingReceiptEmailWorker({
                bookingId: applied.bookingId,
                kind: applied.paymentKind,
                stripeEventId: eventId,
                paymentIntentId: pi.id,
                chargeId: charge.id,
              })
            );
          }
        } catch (e) {
          console.warn('[webhook:charge.succeeded] failed', e);
          throw e;
        }
        break;
      }

      case 'payment_intent.processing': {
        const piProcessing = event.data.object as Stripe.PaymentIntent;
        const bidProcessing = (piProcessing.metadata as { booking_id?: string; bookingId?: string })?.booking_id
          ?? (piProcessing.metadata as { booking_id?: string; bookingId?: string })?.bookingId;
        if (bidProcessing) {
          try {
            const admin = createSupabaseAdmin();
            await admin
              .from('bookings')
              .update({ payment_status: 'PROCESSING' })
              .eq('id', bidProcessing);
          } catch (e) {
            console.warn('Webhook: failed to update booking to PROCESSING', e);
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const meta = paymentIntent.metadata as Record<string, string | undefined>;
        const bookingId = meta?.booking_id ?? meta?.bookingId;

        if (bookingId) {
          try {
            const admin = createSupabaseAdmin();
            const { data: bRow } = await admin
              .from('bookings')
              .select(
                'stripe_payment_intent_deposit_id, stripe_payment_intent_remaining_id, payment_intent_id, final_payment_intent_id'
              )
              .eq('id', bookingId)
              .maybeSingle();
            const kind = resolveWebhookPaymentKind(meta, paymentIntent.id, (bRow ?? {}) as {
              stripe_payment_intent_deposit_id?: string | null;
              stripe_payment_intent_remaining_id?: string | null;
              payment_intent_id?: string | null;
              final_payment_intent_id?: string | null;
            });
            const phase = (meta.payment_phase ?? meta.phase ?? '').toLowerCase();
            const isFinalPaymentFailure =
              kind === 'remaining' || phase === 'final' || phase === 'remaining';
            console.log('Payment failed for booking:', bookingId, 'kind:', kind, 'phase:', phase);
            if (isFinalPaymentFailure) {
              await admin
                .from('bookings')
                .update({ final_payment_intent_id: paymentIntent.id, final_payment_status: 'FAILED' })
                .eq('id', bookingId);
              try {
                await handleFinalPaymentFailed(admin, {
                  paymentIntentId: paymentIntent.id,
                  failureCode: paymentIntent.last_payment_error?.code ?? 'unknown',
                  failureMessage: paymentIntent.last_payment_error?.message ?? paymentIntent.status,
                });
              } catch (lcErr) {
                console.warn('[webhook] lifecycle final fail handler', lcErr);
              }
            } else {
              await admin
                .from('bookings')
                .update({ payment_intent_id: paymentIntent.id, payment_status: 'FAILED' })
                .eq('id', bookingId);
              try {
                await handleDepositPaymentFailed(admin, paymentIntent);
              } catch (lcErr) {
                console.warn('[webhook] lifecycle deposit fail handler', lcErr);
              }
            }
            await admin.from('booking_events').insert({
              booking_id: bookingId,
              type: 'PAYMENT_FAILED',
              data: { payment_intent_id: paymentIntent.id },
            });
            const { data: b } = await admin.from('bookings').select('customer_id').eq('id', bookingId).maybeSingle();
            // Final/remaining failures: handleFinalPaymentFailed already notifies (deduped by PaymentIntent id).
            if (b?.customer_id && !isFinalPaymentFailure) {
              void createNotificationEvent({
                userId: b.customer_id,
                type: NOTIFICATION_TYPES.PAYMENT_FAILED,
                bookingId,
                basePath: 'customer',
              });
            }
            await markStripeEventProcessed(eventId, event.type);
          } catch (e) {
            console.warn('Webhook: failed to update booking payment_status', e);
          }
        }
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeCreated(dispute);
        await markStripeEventProcessed(eventId, event.type);
        break;
      }

      case 'charge.dispute.closed': {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeClosed(dispute);
        await markStripeEventProcessed(eventId, event.type);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const delta = computeChargeRefundedDeltaCents(
          event.data as {
            object: Stripe.Charge;
            previous_attributes?: { amount_refunded?: number };
          }
        );
        if (delta <= 0) {
          logWebhookReceiptEvent({
            bookingId: '—',
            paymentPhase: 'refund',
            chargeId: charge.id,
            stripeEventId: eventId,
            emailResult: 'noop',
            detail: 'charge_refunded_zero_delta',
          });
          await markStripeEventProcessed(eventId, event.type);
          break;
        }
        const piRef = charge.payment_intent;
        const piId = typeof piRef === 'string' ? piRef : piRef?.id ?? null;
        if (!piId) {
          await markStripeEventProcessed(eventId, event.type);
          break;
        }
        try {
          const pi = await stripe!.paymentIntents.retrieve(piId);
          const pmeta = (pi.metadata || {}) as Record<string, string | undefined>;
          const bookingId = pmeta.booking_id ?? pmeta.bookingId;
          if (bookingId) {
            const admin = createSupabaseAdmin();
            const { data: b } = await admin
              .from('bookings')
              .select('refunded_total_cents')
              .eq('id', bookingId)
              .maybeSingle();
            const prevRef = Number((b as { refunded_total_cents?: number } | null)?.refunded_total_cents ?? 0);
            await admin
              .from('bookings')
              .update({
                refunded_total_cents: prevRef + delta,
                refund_status: 'succeeded',
              })
              .eq('id', bookingId);
            await admin.from('booking_events').insert({
              booking_id: bookingId,
              type: 'CHARGE_REFUNDED',
              data: {
                stripe_event_id: eventId,
                charge_id: charge.id,
                delta_cents: delta,
              },
            });
            logWebhookReceiptEvent({
              bookingId,
              paymentPhase: 'refund',
              paymentIntentId: piId,
              chargeId: charge.id,
              stripeEventId: eventId,
              emailResult: 'noop',
              detail: `refund_delta_cents_${delta}`,
            });
          }
        } catch (e) {
          console.warn('[webhook:charge.refunded] handler error', e);
        }
        await markStripeEventProcessed(eventId, event.type);
        break;
      }

      default:
        // Unhandled event types are acknowledged but not processed
        break;
    }
  } catch (err) {
    console.error('Stripe webhook handler failed:', err);
    void recordServerErrorEvent({
      message: 'Stripe webhook handler failed',
      severity: 'error',
      route: '/api/stripe/webhook',
      stack: err instanceof Error ? err.stack ?? null : null,
      meta: { eventType: event?.type, eventId: (event as any)?.id, livemode: (event as any)?.livemode },
    });
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

