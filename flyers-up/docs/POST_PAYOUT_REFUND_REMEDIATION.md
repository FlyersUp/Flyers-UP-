# Post-payout customer refund remediation

## Problem

On Stripe Connect, refunding the **customer’s card** credits from the **platform** balance. An outbound **Transfer** to the professional’s connected account is **not** automatically reversed. When a refund runs after `payout_released` / a transfer id exists, operations must track **recovery / clawback** separately from “customer got money back.”

## Data model

- **Append-only events** — `booking_refund_remediation_events` (see migration `130_refund_after_payout_remediation.sql`): session anchor, refund succeeded, clawback / Connect recovery notes, admin resolution.
- **Booking flags** — `pro_clawback_remediation_status`, `stripe_outbound_recovery_status`, plus `refund_after_payout` / `requires_admin_review` when appropriate.
- **Payout review queue** — reason may include `post_payout_customer_refund` for queueing.

Implementation: `lib/bookings/refund-remediation.ts`, admin API `app/api/admin/bookings/[bookingId]/refund-remediation/route.ts`, UI `components/admin/RefundRemediationAdminPanel.tsx`.

## Admin resolution

Admins can record **resolve** / **waive** actions and notes via the remediation API; events are appended for audit. This does **not** imply Stripe automatically reversed a transfer — it records operational truth.

## Interaction with payout cron and stuck payout detection

- **Payout release cron** (`runPayoutReleaseCron`) — Skips bookings that are not eligible (e.g. `refund_pending`, `requires_admin_review`, remediation-blocked states). Refunded or blocked rows should not be treated as “ready to pay.”
- **Stuck payout detector** — Must not label **refunded** or **admin-review / remediation** bookings as silent payout misses; those paths have explicit reasons or exclusions.

Integration expectations are covered in `lib/bookings/__tests__/full-payment-lifecycle.test.ts` (cron parity + admin-review negative case) and `lib/bookings/__tests__/refund-remediation.test.ts`.

## Customer / pro copy

UI should **not** imply the professional’s payout was automatically reversed. Use calm, precise language: platform refund vs bank timing; recovery under review when relevant (see customer/pro payment components wired in the remediation work).
