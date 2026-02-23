# Stripe Connect Integration

Supports:
- **Create connected account (v2)** – platform as fee collector
- **Onboarding link** – Account Links
- **Check account status from API** – ready to receive payments
- **Checkout Session for booking** – destination charge + app fee
- **Webhook** – account thin events

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
| `POST /api/stripe/checkout` | Create Checkout Session for a booking (destination + app fee) |
| `POST /api/stripe/webhook-accounts` | Account thin events |

## Flow

1. **Pro** – Go to `/pro/connect` → redirects to onboard → Stripe hosted onboarding.
2. **Return** – Stripe redirects to `/api/stripe/connect-v2/return` → updates `stripe_charges_enabled` etc.
3. **Booking payment** – `POST /api/stripe/checkout` with `bookingId` → Checkout Session with destination charge + 15% platform fee.

## Account Webhooks (thin events)

1. Stripe Dashboard → Developers → Webhooks → + Add destination
2. Events from: **Connected accounts**
3. Advanced options → Payload style: **Thin**
4. Events: `v2.core.account[requirements].updated`, `v2.core.account[configuration.recipient].capability_status_updated`
5. Local:
   ```bash
   stripe listen --thin-events 'v2.core.account[requirements].updated,v2.core.account[configuration.recipient].capability_status_updated' --forward-thin-to http://localhost:3000/api/stripe/webhook-accounts
   ```
