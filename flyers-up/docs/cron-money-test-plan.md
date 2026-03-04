# Cron & Money System Test Plan

## Environment Variables

Ensure these are set (local `.env.local` or Vercel):

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

## CRON_SECRET

Set a random secret (e.g. `openssl rand -hex 32`) and use it for all cron calls.

## Manual Cron Invocation

Use header `x-cron-secret` or query param `?secret=`:

```bash
# Deposit timeout (expire unpaid deposits)
curl -H "x-cron-secret: YOUR_CRON_SECRET" http://localhost:3000/api/cron/deposit-timeout

# Auto-refunds (refund cancelled bookings with paid deposit)
curl -H "x-cron-secret: YOUR_CRON_SECRET" http://localhost:3000/api/cron/auto-refunds

# Release payouts (transfer to pro for completed bookings)
curl -H "x-cron-secret: YOUR_CRON_SECRET" http://localhost:3000/api/cron/release-payouts

# Reminders (deposit + remaining)
curl -H "x-cron-secret: YOUR_CRON_SECRET" http://localhost:3000/api/cron/reminders

# Auto-confirm (24h after work completed, if remaining paid)
curl -H "x-cron-secret: YOUR_CRON_SECRET" http://localhost:3000/api/cron/auto-confirm
```

Or with query param:

```bash
curl "http://localhost:3000/api/cron/deposit-timeout?secret=YOUR_CRON_SECRET"
```

## Stripe Webhook Testing

1. Start Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

2. Use the webhook signing secret printed by the CLI for `STRIPE_WEBHOOK_SECRET` when testing locally.

3. Trigger a test `payment_intent.succeeded` event with metadata:

```bash
stripe trigger payment_intent.succeeded
```

For a custom booking, create a PaymentIntent with metadata first, then trigger. Or use Stripe Dashboard to send a test event with metadata:

- `metadata.bookingId` = valid booking UUID
- `metadata.paymentType` = `deposit` or `remaining`

## Expected DB Changes

### deposit-timeout

- Bookings with `status` in (`awaiting_deposit_payment`, `payment_required`, `accepted`), `paid_deposit_at` null, `payment_due_at` < now → `status` = `cancelled_expired`, `cancelled_at` set, `cancel_reason` = `deposit_timeout`
- `booking_events` row with type `CANCELLED_EXPIRED`
- Notifications to customer and pro

### auto-refunds

- Cancelled bookings with `paid_deposit_at` set, `started_at` null, `refund_status` = `none` → Stripe refund created, `refund_status` = `succeeded`, `stripe_refund_deposit_id` set
- `booking_events` row with type `REFUND_CREATED`
- Notifications to customer and pro

### release-payouts

- Completed bookings with `payout_status` = `none`, `refund_status` not `pending` → Stripe transfer, `payout_status` = `succeeded`, `stripe_transfer_id` set
- `booking_events` row with type `PAYOUT_RELEASED`
- Notification to pro

### reminders

- Bookings awaiting deposit with `payment_due_at` within next 10 min → notification "Deposit expires in 10 minutes"
- `booking_events` row with type `DEPOSIT_REMINDER_SENT` (cooldown: 30 min)

## Late Pay After Cancel → Auto-Refund

1. Create a booking, accept it, set `status` = `cancelled_expired` (or any cancelled status).
2. Create a PaymentIntent with `metadata.bookingId` and `metadata.paymentType` = `deposit`.
3. Complete the payment (e.g. test card `4242 4242 4242 4242`).
4. Webhook receives `payment_intent.succeeded`.
5. Expected: booking stays cancelled, refund is created, notifications sent, `booking_events` type `LATE_PAYMENT_AUTO_REFUND`.

## Remaining Payment Test Path

1. Pro accepts → `awaiting_deposit_payment`, `payment_due_at` = now + 30 min
2. Customer pays deposit → `deposit_paid`
3. Pro marks work complete → `awaiting_remaining_payment`, `remaining_due_at` = now + 24h, `auto_confirm_at` = now + 24h
4. Customer pays remaining → `awaiting_customer_confirmation`
5. Customer confirms (or auto-confirm after 24h) → `completed`
6. Cron release-payouts → transfer `net_to_pro` to pro

## UI Updates

- **Customer booking page**: `BookingPaymentStatusCard` (total, deposit, remaining, countdowns, pay/confirm CTAs), `BookingCountdown`, realtime via `TrackBookingRealtime`.
- **Pro booking page**: `BookingPaymentStatusCard` (with platform fee, net to pro), `PayoutStatusBadge`, realtime via `ProBookingRealtime`.
- Countdown: deposit `mm:ss`; remaining `Xh Ym`; auto-confirm "Auto-confirm in Xh Ym".
- Payout badge: none / Pending / Paid / Failed.
