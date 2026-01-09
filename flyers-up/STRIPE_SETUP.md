# Stripe Integration Setup Guide

This guide will help you set up Stripe payments with Supabase for Flyers Up.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. A Supabase project with the bookings table

## Step 1: Get Stripe API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Secret key** (starts with `sk_test_` for test mode)
3. Copy your **Publishable key** (starts with `pk_test_` for test mode)

## Step 2: Set Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Add your Stripe keys to `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_your_key_here
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
   ```

## Step 3: Set Up Stripe Webhook (Optional but Recommended)

Webhooks allow Stripe to notify your app when payments succeed or fail.

### For Local Development:

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. Copy the webhook signing secret (starts with `whsec_`) and add it to `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```

### For Production:

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the webhook signing secret and add it to your production environment variables

## Step 4: Update Database Schema (Optional)

If you want to store payment intent IDs in your bookings table, add this column:

```sql
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;
```

## Step 5: Test the Integration

1. Start your dev server: `npm run dev`
2. Go through the booking flow
3. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Requires authentication: `4000 0025 0000 3155`
   - Declined: `4000 0000 0000 9995`
   - Use any future expiry date and any 3-digit CVC

## How It Works

1. **Booking Creation**: When a customer creates a booking, a Stripe Payment Intent is created server-side
2. **Payment Processing**: The Payment Intent ID is stored in the booking record
3. **Webhook Events**: Stripe sends webhook events when payments succeed or fail
4. **Earnings**: When payment succeeds, you can create earnings records for the pro

## Files Modified

- `lib/stripe.ts` - Stripe utility functions
- `app/actions/bookings.ts` - Creates Payment Intents when bookings are created
- `app/api/stripe/webhook/route.ts` - Handles Stripe webhook events
- `app/customer/booking/payment/page.tsx` - Payment page with address display

## Security Notes

- Never expose your `STRIPE_SECRET_KEY` in client-side code
- Always validate webhook signatures
- Use test keys during development
- Switch to live keys only in production

## Support

- Stripe Docs: https://docs.stripe.com
- Stripe Support: https://support.stripe.com






