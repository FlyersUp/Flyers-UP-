# Flyers Up — Final launch readiness report

**Purpose:** Single pre-submission verification snapshot for App Store / Play Store.  
**Honesty:** This document states **GO / NO-GO / MANUAL** with explicit conditions. Code review and prior hardening passes are **not** a substitute for staging QA.

---

## Executive verdict

**Overall:** **CONDITIONAL — MANUAL QA REQUIRED** before declaring production GO.

The codebase is **structurally ready** for reviewers to complete the core customer ↔ pro ↔ payment story **if** staging credentials, Stripe Connect, and webhooks are correct. **No automated proof** exists that end-to-end payment + webhook + mobile Safari behave correctly in your production-like environment.

---

## Critical path coverage (code + docs)

| Area | Coverage | Notes |
|------|----------|--------|
| Customer booking detail | Strong | `/customer/bookings/[id]`, client fallback fetch, realtime refresh patterns |
| Deposit pay | Strong | `/customer/bookings/[id]/deposit`, `BookingLoadErrorPage`, Stripe `return_url` via `bookingConfirmedPath` |
| Post-deposit / post-final confirmed | **Improved this pass** | `/bookings/[id]/confirmed` + **`?phase=final`** for remaining balance; distinct copy + polling uses `finalPaymentStatus` / `amount_remaining` |
| Final checkout | Strong | `/bookings/[id]/checkout?phase=final`, `POST /api/bookings/[id]/pay/final` |
| Canonical `/bookings/[id]` entry | **Improved this pass** | Server redirect: customer with **final due** → `/checkout?phase=final` (uses `CUSTOMER_FINAL_PAY_CHECKOUT_STATUSES` + `amount_remaining`) |
| Pro booking detail | Strong | RLS-backed `getBookingById`, “Try again” on empty |
| Pro active list | Strong | `PRO_BOOKINGS_ACTIVE_TAB_STATUSES` |
| Notifications → path | Strong | `getTargetPathForNotification` delegates to `bookingDetailPathForRole` |
| Account deletion | Documented | Customer flow in settings; pro restrictions in API + UI |
| Manual QA playbook | Strong | `docs/manual-qa-app-store-critical-path.md` |

---

## Environment / config dependencies

| Risk | Symptom | Env / config to verify | Where used (indicative) |
|------|---------|------------------------|-------------------------|
| Stripe key mismatch (pub vs secret, test vs live) | Payment never completes, 401/invalid_request in logs | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` | `lib/stripe`, deposit/final routes, client `loadStripe` |
| Webhook secret wrong | Paid in Stripe, booking row never updates | `STRIPE_WEBHOOK_SECRET` (or project-specific name) | `app/api/stripe/webhook/route.ts` |
| Connect not finished | Pro cannot accept | Pro `stripe_charges_enabled` / account id | `accept` route, Connect onboard URLs under `app/api/stripe/connect*` |
| Wrong site URL / return URL | 404 after 3DS or redirect to wrong host | Vercel **production URL**, Stripe Dashboard allowed redirect URLs | `return_url` built from `window.location.origin` in deposit + checkout; fallback `https://www.flyersup.app` in code |
| OneSignal / push deep link | Push opens wrong screen | OneSignal dashboard **Launch URL** vs DB `notifications.deep_link` | `lib/notifications/engine.ts`, `lib/notifications/routing.ts` |
| Supabase auth + cookies (mobile Safari) | Random 401, empty lists | SameSite / secure cookie settings, custom domain | `createServerSupabaseClient`, client `credentials: 'include'` on booking fetches |
| Missing columns / migrations | 500 on booking GET | DB in sync with `app/api/customer/bookings/[bookingId]/route.ts` selects | Extended columns fallback in API |

---

## Remaining manual QA blockers

These **cannot** be closed from code review alone:

1. **Full Stripe test-mode run:** request → accept → deposit → confirmed → pro visibility → progress → final pay → confirmed `?phase=final` → booking row matches money + status.  
2. **Webhook latency:** Confirmed page polling + copy assume ≤ ~1 min sync; validate on real Vercel + Stripe.  
3. **Mobile Safari:** Payment Element, return to `/bookings/.../confirmed`, session persistence.  
4. **Push notification tap:** URL matches in-app notification routing (especially non-booking payment types → list).  
5. **Wrong-role URLs:** Customer opens `/pro/bookings/...` and vice versa — expect empty/forbidden, not data leak.  
6. **Account deletion + legal links:** Live copy matches actual data retention; links resolve on production host.

---

## Store-review rejection risks (residual)

| Risk | Mitigation already in repo | Still possible if… |
|------|----------------------------|---------------------|
| “Broken” payments | Error pages, retry, `credentials: 'include'` | Keys/webhooks wrong in prod |
| Misleading post-pay UI | Separate **final** vs **deposit** confirmed copy | QA skips final flow |
| Incomplete account controls | Deletion + privacy settings | Reviewer cannot find or flow errors |
| Dead ends | Try again on lists, pro booking, confirmed | New regressions introduced later |

---

## Files changed in this pass

| File | Change |
|------|--------|
| `docs/final-launch-readiness-report.md` | This report (new) |
| `lib/bookings/booking-routes.ts` | `bookingConfirmedPath(id, { phase: 'final' })` |
| `app/(app)/bookings/[bookingId]/checkout/page.tsx` | Stripe `return_url` + fallback navigation use canonical confirmed URL + `phase=final` when paying remaining |
| `app/(app)/bookings/[bookingId]/confirmed/page.tsx` | Thin shell + `Suspense` + `ConfirmedPageClient` |
| `app/(app)/bookings/[bookingId]/confirmed/ConfirmedPageClient.tsx` | **New** — `useSearchParams`, final vs deposit polling, footnote copy |
| `components/checkout/BookingConfirmedContent.tsx` | `paymentPhase` prop; final-specific headlines, payment block, next steps |
| `app/(app)/bookings/[bookingId]/page.tsx` | Customer with balance due → `checkout?phase=final` before legacy checkout redirect |
| `app/(app)/customer/bookings/[bookingId]/deposit/page.tsx` | Uses `bookingConfirmedPath` for redirects |
| `app/api/bookings/[bookingId]/pay/final/route.ts` | `console.info('[booking] final_intent_created', …)` |
| `app/(app)/customer/bookings/[bookingId]/CustomerBookingPageClient.tsx` | `onRetry` → reload on 404 load error |
| `lib/bookings/__tests__/booking-routes.test.ts` | **New** — URL helpers |

---

## Go / no-go criteria

### GO (production submission) **only if all true**

- [ ] Staging (or release candidate) **manual QA playbook** completed: `docs/manual-qa-app-store-critical-path.md` — **no open P0/P1** items.  
- [ ] **Stripe:** Test-mode (or controlled live) run completes deposit **and** final payment; Dashboard shows PaymentIntents succeeded.  
- [ ] **Webhook:** After payment, booking row updates (`payment_status` / `final_payment_status`, `amount_remaining`, timestamps) without manual DB edit.  
- [ ] **Pro Connect:** Test pro can **accept** with charges enabled; no 409 “Complete Connect” on happy path.  
- [ ] **Confirmed URLs:** Deposit returns to `/bookings/{id}/confirmed`; final returns to `/bookings/{id}/confirmed?phase=final` and copy matches.  
- [ ] **Legal / account:** Privacy, terms, help, and **customer account deletion** reachable and accurate.  
- [ ] **Mobile:** Primary CTAs visible above bottom nav on deposit, checkout, confirmed, booking detail (spot-check).  

### NO-GO if **any** true

- Payments succeed in Stripe UI but **booking record does not update** (webhook or server bug).  
- **Accept booking** or **pay deposit** fails for a correctly configured test pro/customer in staging.  
- **Confirmed** or **checkout** shows raw errors, blank screen, or **misleading** paid/unpaid state after successful payment.  
- **Account deletion** or required legal links **404** or error in production build.  
- **Known** wrong Stripe mode (test keys on “live” app or inverse) on store build.

### MANUAL CHECK REQUIRED (even if GO)

- **OneSignal** (or other push) **URL** matches in-app notification paths.  
- **First-time** install on **iOS Safari** (or WKWebView) through full pay + return.  
- **App Review region** — taxes, disclosures, and copy for your target stores.  
- **Load / cold start** on mid-tier device (subjective reviewer experience).

---

## Log markers for ops (server)

| Marker | When |
|--------|------|
| `[booking] pro_accepted` | After successful accept |
| `[booking] deposit_intent_created` | After deposit PaymentIntent created |
| `[booking] final_intent_created` | After final PaymentIntent created |

---

## Sign-off

| Field | Value |
|-------|--------|
| Report date | 2026-04-02 |
| Verdict | Conditional — manual QA required |
| Next action | Run manual QA playbook on staging; grep logs for `[booking]` markers during payment tests |
