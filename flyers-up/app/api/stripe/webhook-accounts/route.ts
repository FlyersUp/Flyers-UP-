/**
 * Stripe Webhook: Account Requirements (Thin Events)
 *
 * Per Stripe docs: https://docs.stripe.com/webhooks/migrate-snapshot-to-thin-events
 * Uses webhooks.constructEvent + v2.core.events.retrieve()
 *
 * Event types: https://docs.stripe.com/api/v2/core/events/event-types
 * - v2.core.account[requirements].updated
 * - v2.core.account[configuration.recipient].capability_status_updated
 *
 * Local: stripe listen --thin-events 'v2.core.account[requirements].updated,v2.core.account[configuration.recipient].capability_status_updated' --forward-thin-to http://localhost:3000/api/stripe/webhook-accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeConnectClient } from '@/lib/stripeConnect';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_ACCOUNTS ?? process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    console.error(
      'STRIPE_WEBHOOK_SECRET_ACCOUNTS (or STRIPE_WEBHOOK_SECRET) not set. Add to .env.local for account webhooks.'
    );
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const stripeClient = getStripeConnectClient();
  if (!stripeClient) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let thinNotification: { id: string };
  try {
    thinNotification = stripeClient.webhooks.constructEvent(body, signature, webhookSecret) as { id: string };
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const event = await stripeClient.v2.core.events.retrieve(thinNotification.id);
    switch (event.type) {
      case 'v2.core.account[requirements].updated': {
        const accountId = event?.data?.object?.id;
        const requirements = event?.data?.object?.requirements;
        console.log('[Webhook] Account requirements updated:', accountId, requirements);
        // TODO: Collect any updated requirements - e.g. notify seller, update UI
        break;
      }
      case 'v2.core.account[configuration.recipient].capability_status_updated': {
        const accountId = event?.data?.object?.id;
        const capabilityStatus = event?.data?.object?.configuration?.recipient?.capabilities;
        console.log('[Webhook] Recipient capability status updated:', accountId, capabilityStatus);
        // TODO: Update seller dashboard, enable/disable selling
        break;
      }
      default:
        console.log('[Webhook] Unhandled event type:', event.type);
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
