# Post-Deposit Booking Flow Fix

## Summary

After a customer paid the deposit, the Pro received a notification but the booking did not appear in Pro Jobs (Incoming), Open Jobs, or Today at a Glance. The fix ensures deposit-paid bookings are visible everywhere they should be.

## Root Cause

**The bug:** Pro-facing queries filtered out `deposit_paid` status.

1. **Pro Dashboard "Today's jobs"** — `TODAY_STATUSES` excluded `deposit_paid`
2. **Today page (pro/today)** — `/api/pro/bookings` was called with statuses that excluded `deposit_paid`
3. **Pro Jobs "Incoming" tab** — Hardcoded "No incoming requests" placeholder; never fetched bookings
4. **canStartReal** — Excluded `deposit_paid`, so pros could not start a job whose deposit was just paid

## Status Mapping Used

| View | Statuses included |
|------|-------------------|
| **Incoming** | requested, deposit_paid, awaiting_deposit_payment, payment_required, accepted, pending_pro_acceptance, accepted_pending_payment |
| **Open Jobs** | deposit_paid, accepted, pro_en_route, on_the_way, arrived, in_progress, completed_pending_payment, awaiting_payment, awaiting_remaining_payment, awaiting_customer_confirmation |
| **Today at a Glance** | Same as Open Jobs, filtered by `service_date = today` |

## Post-Deposit Transition (Webhook)

When `payment_intent.succeeded` fires with `phase: 'deposit'`:

1. **Booking update:** `status` → `deposit_paid`, `payment_status` → `PAID`, `paid_deposit_at` set
2. **Timeline:** `DEPOSIT_PAID` event inserted into `booking_events`
3. **Notification:** Pro receives "Deposit received" notification
4. **Revalidation:** `revalidatePath` for `/pro`, `/pro/today`, `/pro/jobs`
5. **Logging:** `[webhook:deposit_paid]` with bookingId, proId, oldStatus, newStatus, notificationCreated

## Files Changed

| File | Change |
|------|--------|
| `lib/bookings/pro-visible-statuses.ts` | **New** — Single source of truth for pro-visible statuses |
| `lib/bookings/__tests__/pro-visible-statuses.test.ts` | **New** — Unit tests |
| `app/api/stripe/webhook/route.ts` | Logging, revalidatePath on deposit_paid |
| `components/dashboard/ProDashboard.tsx` | Add deposit_paid to TODAY_STATUSES, formatStatus, getStatusVariant |
| `app/(app)/pro/today/page.tsx` | Add deposit_paid to fetch statuses, canStartReal |
| `app/(app)/pro/jobs/page.tsx` | Incoming tab fetches and displays bookings from `/api/pro/bookings` |
| `package.json` | Add test scripts |
| `docs/POST_DEPOSIT_BOOKING_FLOW_FIX.md` | **New** — This doc |

## Query / Filter Fixes

- **Pro Dashboard:** `TODAY_STATUSES` string extended to include `deposit_paid`
- **Today page:** `/api/pro/bookings?statuses=...` extended with `deposit_paid`, `completed_pending_payment`, `awaiting_customer_confirmation`, `arrived`
- **Pro Jobs Incoming:** Fetches `/api/pro/bookings?statuses=requested,deposit_paid,...` instead of showing a static placeholder

## Tests

Run: `npm run test:statuses` or `npm run test`

- deposit_paid is visible in Incoming, Open Jobs, Today
- deposit_paid allows pro to Start
- old statuses (requested, accepted, in_progress, cancelled) behave correctly
