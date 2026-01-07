/**
 * Stripe Integration Utilities
 * Server-side Stripe configuration and helpers
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled.');
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
    })
  : null;

/**
 * Create a Payment Intent for a booking
 */
export async function createPaymentIntent(
  amountCents: number,
  metadata: {
    bookingId: string;
    customerId: string;
    proId: string;
  }
): Promise<{ success: boolean; paymentIntentId?: string; clientSecret?: string; error?: string }> {
  if (!stripe) {
    return {
      success: false,
      error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables.',
    };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || undefined,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment intent',
    };
  }
}

/**
 * Retrieve a Payment Intent
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent | null> {
  if (!stripe) {
    return null;
  }

  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    return null;
  }
}

/**
 * Confirm a Payment Intent (for server-side confirmation)
 */
export async function confirmPaymentIntent(
  paymentIntentId: string
): Promise<{ success: boolean; error?: string }> {
  if (!stripe) {
    return {
      success: false,
      error: 'Stripe is not configured',
    };
  }

  try {
    await stripe.paymentIntents.confirm(paymentIntentId);
    return { success: true };
  } catch (error) {
    console.error('Error confirming payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to confirm payment',
    };
  }
}


