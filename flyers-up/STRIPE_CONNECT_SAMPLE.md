# Stripe Connect Integration

Supports:

- **Create connected account (v2)** – platform as fee collector
- **Onboarding link** – Account Links
- **Check account status from API** – ready to receive payments
- **Checkout Session for booking** – **platform-held charge** (no destination split at charge time)
- **Webhook** – account thin events

## Critical: customer charges vs payouts

**Flyers Up uses platform-held funds for customer payments.**

- **Do NOT** put `transfer_data` or `on_behalf_of` on **customer-facing** PaymentIntents or Checkout Session `payment_intent_data` to send money straight to a connected account at charge time.
- **Do NOT** use `application_fee_amount` on those PaymentIntents for a “destination charge + app fee” model for booking checkout.
- **Do** charge the **platform** Stripe account, attach canonical **booking metadata** (see `lib/stripe/booking-payment-intent-metadata.ts`), and let **`payment_intent.succeeded`** → `applySucceededPaymentIntent` update the database.
- **Do** pay pros later via the existing **transfer / payout release** flow (e.g. `releasePayout` → `createTransfer` to the pro’s Connect **destination**). That transfer is a **separate** step after eligibility checks—not part of the customer checkout request.

Copy-pasting old “destination charge + 15%” checkout snippets **will** break accounting, webhooks, and payout assumptions.

## Environment Variables

Add to `.env.local`:

- `STRIPE_SECRET_KEY` – Required for Stripe
- `STRIPE_WEBHOOK_SECRET` – For payment webhooks
- `STRIPE_WEBHOOK_SECRET_ACCOUNTS` – Optional; for account webhooks

## Routes

| Route | Purpose |
|-------|---------|
| `GET /api/stripe/connect-v2/onboard` | Start Connect onboarding (redirects to Stripe) |
| `GET /api/stripe/connect-v2/return` | Return from Stripe; updates `service_pros` status |
| `GET /api/stripe/connect-v2/status?accountId=` | Account status from Stripe API |
| `GET /api/stripe/connect-v2/me` | Current user's Stripe account ID |
| `POST /api/stripe/checkout` | Create Checkout Session for a booking (**platform charge**; PI metadata for webhooks) |
| `POST /api/stripe/webhook-accounts` | Account thin events |

## Flow

1. **Pro** – Go to `/pro/connect` → redirects to onboard → Stripe hosted onboarding.
2. **Return** – Stripe redirects to `/api/stripe/connect-v2/return` → updates `stripe_charges_enabled` etc.
3. **Booking payment (hosted)** – `POST /api/stripe/checkout` with `bookingId` → Checkout Session whose PaymentIntent is created on the **platform** account (no `transfer_data` on the PI). Success URL: `/customer/booking/paid`.
4. **Booking payment (embedded)** – Prefer `/bookings/[id]/checkout` → `POST /api/bookings/[id]/pay/deposit` or `.../pay/final`; same platform-hold model.

## Account Webhooks (thin events)

1. Stripe Dashboard → Developers → Webhooks → + Add destination
2. Events from: **Connected accounts**
3. Advanced options → Payload style: **Thin**
4. Events: `v2.core.account[requirements].updated`, `v2.core.account[configuration.recipient].capability_status_updated`
5. Local:

   ```bash
   stripe listen --thin-events 'v2.core.account[requirements].updated,v2.core.account[configuration.recipient].capability_status_updated' --forward-thin-to http://localhost:3000/api/stripe/webhook-accounts
   ```
