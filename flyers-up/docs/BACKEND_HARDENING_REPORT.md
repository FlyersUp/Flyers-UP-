# Backend Hardening Report — Flyers Up

**Date:** March 12, 2025  
**Scope:** Database integrity, RLS, server-side business rules, payments, payouts, trust, operational safety

---

## A. Backend Hardening Report

### Schema Fixes

| Fix | Purpose |
|-----|---------|
| `profiles.role` CHECK constraint | Enforce valid enum values (customer, pro, admin) |
| `job_completions.after_photo_urls` comment | Document 2+ valid URLs requirement for payout release |

### Policy Fixes

| Table | Change | Why |
|-------|--------|-----|
| `pro_earnings` | **Removed** INSERT policy for pros | Earnings must only be created by Stripe webhook/cron (service role). Pros could previously insert fake earnings via client. |
| `job_completions` | **Removed** INSERT policy for pros | Completions must only be created by `/api/bookings/[id]/complete` (2+ photos enforced). Pros could previously insert fake completions. |
| `job_arrivals` | **Removed** INSERT policy for pros | Arrivals must only be created by `/api/bookings/[id]/arrive` (GPS validation). Pros could previously insert fake arrivals. |
| `booking_events` | **Enabled RLS**, added SELECT for participants, **no** INSERT for users | Events must only be created by API routes (service role). Prevents forged audit events. |
| `profiles` | **Trigger** `profiles_prevent_role_escalation` | Blocks client-driven role changes (customer↔pro, any→admin). Allows: null→customer/pro (onboarding), service_role (admin). |

### Server Rule Fixes

| Location | Change |
|----------|--------|
| `lib/bookingStatusTransition.ts` | Added arrival verification before `in_progress`; added completion photos check before `awaiting_remaining_payment` |
| `app/api/cron/release-payouts/route.ts` | Validate `after_photo_urls`: require 2+ non-empty, non-placeholder URLs before payout |
| `app/api/stripe/webhook/route.ts` | Use `total_amount_cents` / `amount_total` (cents) consistently for pro_earnings; fall back to `price` (legacy dollars) only when cents are 0 |

### Payment Fixes

| Fix | Purpose |
|-----|---------|
| Webhook pro_earnings amount | Prefer `total_amount_cents` / `amount_total` (divide by 100 for dollars); avoid wrong division when falling back to legacy `price` |
| Release-payouts photo validation | Reject placeholder/empty URLs; ensure `booking_id` matches |

### Trust & Safety Fixes

| Fix | Purpose |
|-----|---------|
| RLS: no user INSERT on `pro_earnings`, `job_completions`, `job_arrivals` | Trust/safety evidence only created server-side |
| Payout release: photo validation | Require 2+ valid URLs; reject `placeholder`, `n/a`, `none`, etc. |
| Role escalation trigger | Prevent privilege escalation via client |

---

## B. Migrations / Policies / Functions Changed

| File | Purpose |
|------|---------|
| `supabase/migrations/069_backend_hardening_rls.sql` | RLS policy removals, profiles trigger, booking_events RLS |
| `supabase/migrations/070_schema_integrity_constraints.sql` | profiles.role CHECK, job_completions comment |
| `lib/bookingStatusTransition.ts` | Arrival + completion checks |
| `app/api/cron/release-payouts/route.ts` | Photo URL validation |
| `app/api/stripe/webhook/route.ts` | Cents/dollars consistency for pro_earnings |

---

## C. Critical Rules Now Enforced Server-Side

| Rule | Status |
|------|--------|
| **Booking states** | Valid transitions enforced in `jobStatus` + `bookingStatusTransition` |
| **in_progress** | Requires `job_arrivals` (arrive API) |
| **awaiting_remaining_payment** | Requires `job_completions` with 2+ photos (complete API) |
| **Pricing** | Server-side in `createBookingWithPayment`; add-ons from DB |
| **Payments** | Stripe webhook; idempotency via `stripe_events` |
| **Refunds** | Late payment auto-refund; webhook + cron |
| **Reschedules** | Enforced via API routes |
| **No-shows** | Evidence via `/api/bookings/[id]/no-show` |
| **Availability** | `validateProAvailability` in deposit-pay flow; `validate-availability` route |
| **Disputes** | Admin actions; evidence bundles |
| **Payouts** | Cron only; requires `completed`, 2+ photos, customer_confirmed or auto_confirm |
| **Admin permissions** | Admin actions use service role; RLS policies restrict admin tables |

---

## D. Remaining Risks

| Risk | Mitigation |
|------|-------------|
| **Stripe webhook secret** | Ensure `STRIPE_WEBHOOK_SECRET` is set in production |
| **Cron secret** | Ensure release-payouts cron uses `CRON_SECRET` header |
| **Service role key** | Never expose to client; keep in server env only |
| **Admin role changes** | Use service role (admin API) or direct DB; trigger allows `service_role` JWT |
| **Photo URL validation** | Current check rejects obvious placeholders; consider adding URL format/storage-domain check |
| **Docker / Supabase** | Local migrations not run; verify with `supabase db push` or linked project |

---

## Success Definition

- Backend is strict and consistent.
- Money is accurate (cents preferred over legacy dollars).
- Permissions are tight (no user INSERT on earnings, completions, arrivals, events).
- Trust and payout decisions are evidence-based (2+ photos, customer_confirmed).
- Launch-critical operations are enforced server-side, not only in the UI.
