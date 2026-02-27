/**
 * Stripe Webhook Handler
 * payment_intent.succeeded: sets payment_status=PAID, paid_at, status=completed, pro_earnings.
 * payment_intent.payment_failed: sets payment_status=FAILED.
 * Idempotent. Verify signature with STRIPE_WEBHOOK_SECRET.
 * stripe listen --forward-to localhost:3000/api/stripe/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { recordServerErrorEvent } from '@/lib/serverError';
import { sendProPaymentReceipt } from '@/lib/email';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
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

  try {
    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = (paymentIntent.metadata as any)?.booking_id ?? (paymentIntent.metadata as any)?.bookingId;

        if (bookingId) {
          console.log('Payment succeeded for booking:', bookingId);

          try {
            const admin = createAdminSupabaseClient();

            // Load booking + current status_history.
            const { data: booking, error: bErr } = await admin
              .from('bookings')
              .select('id, status, status_history, pro_id, price')
              .eq('id', bookingId)
              .maybeSingle();

            const proId = booking?.pro_id;

            if (bErr || !booking) {
              console.warn('Webhook: booking not found for payment', { bookingId, bErr });
              break;
            }

            const history = Array.isArray(booking.status_history) ? booking.status_history : [];
            const shouldFinalize = booking.status === 'awaiting_payment';
            const alreadyCompleted = history.some((e: any) => e?.status === 'completed');
            const nextHistory =
              shouldFinalize && !alreadyCompleted
                ? [...history, { status: 'completed', at: new Date().toISOString() }]
                : history;

            // Persist PaymentIntent ID, payment_status, paid_at; finalize booking status if applicable.
            const updatePayload: Record<string, unknown> = {
              payment_intent_id: paymentIntent.id,
              payment_status: 'PAID',
              paid_at: new Date().toISOString(),
              ...(shouldFinalize ? { status: 'completed', status_history: nextHistory } : {}),
            };
            await admin
              .from('bookings')
              .update(updatePayload)
              .eq('id', bookingId);

            // Create earnings record (idempotent).
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

            // Send pro payment receipt email.
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
          } catch (e) {
            console.warn('Webhook persistence failed', e);
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = (paymentIntent.metadata as { booking_id?: string; bookingId?: string })?.booking_id
          ?? (paymentIntent.metadata as { booking_id?: string; bookingId?: string })?.bookingId;

        if (bookingId) {
          console.log('Payment failed for booking:', bookingId);
          try {
            const admin = createAdminSupabaseClient();
            await admin
              .from('bookings')
              .update({
                payment_intent_id: paymentIntent.id,
                payment_status: 'FAILED',
              })
              .eq('id', bookingId);
          } catch (e) {
            console.warn('Webhook: failed to update booking payment_status', e);
          }
        }
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

