/**
 * Stripe Webhook Handler
 * Idempotent via stripe_events. Signature verified with STRIPE_WEBHOOK_SECRET.
 * Handles: payment_intent.succeeded, payment_intent.payment_failed.
 * Late pay after cancel → auto-refund.
 * stripe listen --forward-to localhost:3000/api/stripe/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import Stripe from 'stripe';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { recordServerErrorEvent } from '@/lib/serverError';
import { sendProPaymentReceipt } from '@/lib/email';
import {
  isStripeEventProcessed,
  markStripeEventProcessed,
} from '@/lib/stripe/webhook-idempotency';
import { refundPaymentIntent } from '@/lib/stripe/server';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';
import { isCancelled } from '@/lib/bookings/booking-status';
import { applyDisputeHold } from '@/lib/payoutRisk';

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
        const meta = paymentIntent.metadata as {
          booking_id?: string;
          bookingId?: string;
          phase?: string;
          paymentType?: string;
        };
        const bookingId = meta?.booking_id ?? meta?.bookingId;
        const paymentType =
          meta?.paymentType ?? (meta?.phase === 'final' ? 'remaining' : meta?.phase ?? 'deposit');

        if (bookingId) {
          console.log('Payment succeeded for booking:', bookingId, 'paymentType:', paymentType);

          try {
            const admin = createSupabaseAdmin();

            const { data: booking, error: bErr } = await admin
              .from('bookings')
              .select(
                'id, status, status_history, pro_id, customer_id, price, amount_total, total_amount_cents, refunded_total_cents, payment_status, service_pros(user_id)'
              )
              .eq('id', bookingId)
              .maybeSingle();

            const proId = booking?.pro_id;

            if (bErr || !booking) {
              console.warn('Webhook: booking not found for payment', { bookingId, bErr });
              break;
            }

            const history = Array.isArray(booking.status_history) ? booking.status_history : [];
            const now = new Date().toISOString();
            const proUserId = (booking.service_pros as { user_id?: string })?.user_id;

            // Late pay after cancel → auto-refund (do not reopen booking)
            if (isCancelled(booking.status)) {
              const refundId = await refundPaymentIntent(paymentIntent.id, {
                reason: 'requested_by_customer',
                booking_id: bookingId,
              });
              const amountRefunded = paymentIntent.amount ?? 0;
              const prevRefunded = Number((booking as { refunded_total_cents?: number }).refunded_total_cents ?? 0);
              const upd: Record<string, unknown> = {
                refund_status: refundId ? 'succeeded' : 'pending',
                refunded_total_cents: prevRefunded + amountRefunded,
              };
              if (paymentType === 'deposit') upd.stripe_refund_deposit_id = refundId ?? undefined;
              else upd.stripe_refund_remaining_id = refundId ?? undefined;
              await admin.from('bookings').update(upd).eq('id', bookingId);
              await admin.from('booking_events').insert({
                booking_id: bookingId,
                type: 'LATE_PAYMENT_AUTO_REFUND',
                data: { refund_id: refundId ?? null },
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
              await markStripeEventProcessed(eventId, event.type);
              break;
            }

            if (paymentType === 'deposit') {
              const updatePayload: Record<string, unknown> = {
                payment_intent_id: paymentIntent.id,
                stripe_payment_intent_deposit_id: paymentIntent.id,
                payment_status: 'PAID',
                paid_at: now,
                paid_deposit_at: now,
                status: 'deposit_paid',
                status_history: [...history, { status: 'deposit_paid', at: now }],
              };
              await admin.from('bookings').update(updatePayload).eq('id', bookingId);
              await admin.from('booking_events').insert({
                booking_id: bookingId,
                type: 'DEPOSIT_PAID',
                data: { payment_intent_id: paymentIntent.id },
              });
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
                  titleOverride: 'Deposit received',
                  bodyOverride: 'Customer paid the deposit.',
                  basePath: 'pro',
                });
              }
            } else if (paymentType === 'remaining' || paymentType === 'final') {
              const isAwaitingRemaining = booking.status === 'awaiting_remaining_payment';
              const nextStatus = isAwaitingRemaining ? 'awaiting_customer_confirmation' : 'fully_paid';
              const nextHistory = [...history, { status: nextStatus, at: now }];

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
              await admin.from('booking_events').insert({
                booking_id: bookingId,
                type: 'REMAINING_PAID',
                data: { payment_intent_id: paymentIntent.id },
              });
              void createNotificationEvent({
                userId: booking.customer_id,
                type: NOTIFICATION_TYPES.PAYMENT_REMAINING_PAID,
                bookingId,
                titleOverride: isAwaitingRemaining ? 'Remaining paid' : 'Payment complete',
                bodyOverride: isAwaitingRemaining ? 'Remaining paid — confirm completion' : 'Remaining balance has been paid.',
                basePath: 'customer',
              });
              if (proUserId) {
                void createNotificationEvent({
                  userId: proUserId,
                  type: NOTIFICATION_TYPES.PAYMENT_REMAINING_PAID,
                  bookingId,
                  titleOverride: 'Customer paid remaining',
                  bodyOverride: isAwaitingRemaining ? 'Customer paid remaining — awaiting confirmation' : 'Customer paid the remaining balance.',
                  basePath: 'pro',
                });
              }

              const { data: existing } = await admin
                .from('pro_earnings')
                .select('id')
                .eq('booking_id', bookingId)
                .maybeSingle();

              if (!existing) {
                const amount = Number(booking.amount_total ?? booking.price ?? 0) / 100;
                await admin.from('pro_earnings').insert({
                  pro_id: booking.pro_id,
                  booking_id: bookingId,
                  amount: amount > 0 ? amount : 0,
                });
              }

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
                    const amount = Number(booking.amount_total ?? booking.price ?? 0) / 100;
                    void sendProPaymentReceipt({
                      to: proEmail.trim(),
                      proName: (proRow.display_name as string) || 'Pro',
                      amount: String(amount.toFixed(2)),
                      bookingId,
                    });
                  }
                }
              }
            } else {
              // Legacy: full payment (no phase)
              const shouldFinalize = booking.status === 'awaiting_payment' || booking.status === 'completed_pending_payment';
              const alreadyCompleted = history.some((e: { status?: string }) => e?.status === 'completed');
              const nextHistory =
                shouldFinalize && !alreadyCompleted
                  ? [...history, { status: 'completed', at: now }]
                  : history;

              const updatePayload: Record<string, unknown> = {
                payment_intent_id: paymentIntent.id,
                payment_status: 'PAID',
                paid_at: now,
                ...(shouldFinalize ? { status: 'fully_paid', status_history: nextHistory } : {}),
              };
              await admin.from('bookings').update(updatePayload).eq('id', bookingId);

              const { data: existing } = await admin
                .from('pro_earnings')
                .select('id')
                .eq('booking_id', bookingId)
                .maybeSingle();

              if (shouldFinalize && !existing) {
                const amount = Number(booking.price ?? 0);
                await admin.from('pro_earnings').insert({
                  pro_id: booking.pro_id,
                  booking_id: bookingId,
                  amount: amount > 0 ? amount : 0,
                });
              }

              if (shouldFinalize && proId) {
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
                      amount: String(Number(booking.price ?? 0).toFixed(2)),
                      bookingId,
                    });
                  }
                }
              }
            }
            await markStripeEventProcessed(eventId, event.type);
          } catch (e) {
            console.warn('Webhook persistence failed', e);
          }
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
        const meta = paymentIntent.metadata as { booking_id?: string; bookingId?: string; phase?: string; paymentType?: string };
        const bookingId = meta?.booking_id ?? meta?.bookingId;
        const phase = meta?.phase ?? meta?.paymentType ?? 'legacy';

        if (bookingId) {
          console.log('Payment failed for booking:', bookingId, 'phase:', phase);
          try {
            const admin = createSupabaseAdmin();
            if (phase === 'final' || phase === 'remaining') {
              await admin
                .from('bookings')
                .update({ final_payment_intent_id: paymentIntent.id, final_payment_status: 'FAILED' })
                .eq('id', bookingId);
            } else {
              await admin
                .from('bookings')
                .update({ payment_intent_id: paymentIntent.id, payment_status: 'FAILED' })
                .eq('id', bookingId);
            }
            await admin.from('booking_events').insert({
              booking_id: bookingId,
              type: 'PAYMENT_FAILED',
              data: { payment_intent_id: paymentIntent.id },
            });
            const { data: b } = await admin.from('bookings').select('customer_id').eq('id', bookingId).maybeSingle();
            if (b?.customer_id) {
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

      default:
        console.log(`Unhandled event type: ${event.type}`);
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

