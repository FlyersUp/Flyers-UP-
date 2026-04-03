# Flyers Up — App Store readiness audit

**Date:** 2026-04-02  
**Scope:** Next.js App Router, Supabase, Stripe, customer / pro / admin flows  
**Method:** Static code review + targeted flow tracing (deposit, bookings lists, confirmed redirect, navigation).

---

## Files inspected (representative)

| Area | Paths |
|------|--------|
| Deposit & payment UI | `app/(app)/customer/bookings/[bookingId]/deposit/page.tsx`, `app/(app)/bookings/[bookingId]/checkout/page.tsx`, `app/(app)/bookings/[bookingId]/confirmed/page.tsx`, `components/checkout/BookingSummaryDeposit.tsx`, `components/checkout/BookingConfirmedContent.tsx`, `components/checkout/DepositPayBar.tsx`, `components/checkout/BookingLoadErrorPage.tsx` |
| Deposit / pay APIs | `app/api/bookings/[bookingId]/pay/deposit/route.ts`, `app/api/bookings/[bookingId]/deposit/create-intent/route.ts`, `app/api/bookings/[bookingId]/pay/final/route.ts`, `app/api/customer/bookings/[bookingId]/route.ts` |
| Customer booking UX | `app/(app)/customer/bookings/[bookingId]/BookingDetailContent.tsx`, `components/bookings/TrackBookingRealtime.tsx` |
| Pro bookings & today | `app/(app)/pro/bookings/page.tsx`, `lib/bookings/pro-visible-statuses.ts`, `app/(app)/pro/today/page.tsx`, `app/api/pro/bookings/route.ts` |
| Status truth | `lib/bookings/customer-booking-actions.ts`, `lib/bookings/state-machine.ts`, `lib/calendar/committed-states.ts` |
| Account / legal | `app/(app)/settings/privacy-security/page.tsx`, `app/api/account/delete/route.ts`, `components/ui/SideMenu.tsx` |
| Legacy checkout | `app/api/stripe/checkout/route.ts` |

---

## Critical issues

| ID | Finding | Risk |
|----|---------|------|
| C1 | **Pro “Active” bookings list omitted `awaiting_deposit_payment`, `deposit_paid`, `accepted_pending_payment`, `arrived`, and other open-job statuses.** Pros could accept a job and then not see it in Bookings while waiting on deposit, or after deposit — contradicts `pro-visible-statuses` tests and payout UX. | **Submission / trust:** “accepted jobs don’t appear” |
| C2 | **Customer “Pay deposit” CTA required `paymentDueAt` and non-expired deadline.** If `paymentDueAt` was null or expired while status still allowed deposit (including API recovery paths), the primary CTA disappeared — dead end for payment. | **Broken core flow** |

---

## High issues

| ID | Finding |
|----|---------|
| H1 | Post-deposit **confirmed** page fetched booking without `credentials: 'include'` — inconsistent with deposit page; could fail in stricter cookie contexts. |
| H2 | Confirmed page **error state** had no retry; only “View booking”. |
| H3 | Pro sidebar **“Tax documents”** was a disabled link to `/settings/payments` — looks incomplete to reviewers. |
| H4 | Pro **Today** header **Settings** control was a disabled button — dead UI. |

---

## Medium issues (not auto-fixed)

| ID | Finding |
|----|---------|
| M1 | **Today** alerts use `Button` with `disabled` when `ctaLabel` missing — still feels inert; needs product rules for each alert type. |
| M2 | **Legacy** `app/api/stripe/checkout/route.ts` success URL uses `/customer/booking/paid` — verify still wired and consistent with Embedded Element flows if any entry points remain. |
| M3 | **Role guards:** No `middleware.ts` in repo; reliance on layout/API `403` — acceptable if consistent; recommend manual QA on deep links (`/pro/...` as customer). |
| M4 | **Notification deep links** — not fully traced; verify each push/email target resolves and matches booking status after open. |
| M5 | **Performance:** Heavy booking pages use multiple client fetches; consider loading skeletons on first paint (incremental improvement). |

---

## What we fixed (this pass)

1. **`PRO_BOOKINGS_ACTIVE_TAB_STATUSES`** in `lib/bookings/pro-visible-statuses.ts` — union of incoming + open-job statuses + `pending`; **Pro Bookings active tab** now queries this set.
2. **`shouldShowCustomerDepositPayCta`** in `lib/bookings/customer-booking-actions.ts` — single rule for deposit CTA (includes deposit recovery statuses aligned with deposit API); **BookingDetailContent** uses it and drops the `paymentDueAt` gate and unused hydration hack.
3. **`confirmed/page.tsx`** — `credentials: 'include'` on fetch, clearer error copy, **Try again** button.
4. **`SideMenu.tsx`** — Tax documents → `/pro/settings/payments-payouts` (enabled).
5. **`pro/today/page.tsx`** — Settings → working **Link** to `/pro/settings`.
6. **Pro bookings fetches** — `credentials: 'include'`.
7. **Tests** — `PRO_BOOKINGS_ACTIVE_TAB_STATUSES` coverage in `lib/bookings/__tests__/pro-visible-statuses.test.ts`.

### Files touched

- `lib/bookings/pro-visible-statuses.ts`
- `lib/bookings/customer-booking-actions.ts`
- `lib/bookings/__tests__/pro-visible-statuses.test.ts`
- `app/(app)/pro/bookings/page.tsx`
- `app/(app)/customer/bookings/[bookingId]/BookingDetailContent.tsx`
- `app/(app)/bookings/[bookingId]/confirmed/page.tsx`
- `components/ui/SideMenu.tsx`
- `app/(app)/pro/today/page.tsx`
- `docs/app-store-readiness-audit.md` (this file)

---

## Needs product / manual QA

- End-to-end: **accept → customer deposit → confirmed → pro sees job → en route → complete → final pay** on **staging** with real Stripe test mode.
- **Apple / Google:** account deletion path for **customers** (`/settings/privacy-security` → delete) — confirm copy matches actual backend behavior; **pro** deletion policy is documented as restricted (see API + settings page).
- **Deep links** from email/push with expired sessions.
- **iOS Safari** Payment Element + `return_url` to `/bookings/[id]/confirmed` (same-origin).

---

## Needs product decision (TODOs in product backlog, not code)

- Whether **Today** alert rows without `ctaLabel` should hide the button or link to a default help/booking URL.
- Whether **tax documents** should eventually deep-link to Stripe Express Dashboard vs in-app payouts page only.
- Standardize **one** canonical customer URL prefix for post-payment success if branding prefers `/customer/bookings/...` everywhere (currently `/bookings/.../confirmed` is intentional shared route).

---

## Positive findings (already strong)

- Dedicated **deposit** page with pre-check, intent creation, **BookingLoadErrorPage** (retry, sign-in), Stripe **PaymentElement**, and shared **confirmed** flow with webhook polling.
- **Deposit API** documents platform hold, scope lock, idempotency, and recovery statuses.
- **Account deletion** API + settings UI for customers; pro/admin restrictions documented.
- **Realtime** subscription on customer booking detail for server-truth updates.
