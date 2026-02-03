/**
 * Stripe Webhook Handler
 * Handles Stripe events (payment_intent.succeeded, payment_intent.payment_failed, etc.)
 * 
 * To test locally, use Stripe CLI:
 * stripe listen --forward-to localhost:3000/api/stripe/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { recordServerErrorEvent } from '@/lib/serverError';

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
          // Update booking status or create earnings record
          // For now, we'll just log it - you can add more logic here
          console.log('Payment succeeded for booking:', bookingId);

          // TODO: Persist payment status (requires DB column + desired state machine).
          // If you choose to persist, use the admin client (webhooks are server-to-server).
          try {
            const admin = createAdminSupabaseClient();
            void admin; // intentionally unused until persistence logic is added
          } catch (e) {
            console.warn('SUPABASE_SERVICE_ROLE_KEY not set; skipping webhook persistence.', e);
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = (paymentIntent.metadata as any)?.booking_id ?? (paymentIntent.metadata as any)?.bookingId;

        if (bookingId) {
          console.log('Payment failed for booking:', bookingId);
          // Handle failed payment - maybe notify customer or update booking status
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

