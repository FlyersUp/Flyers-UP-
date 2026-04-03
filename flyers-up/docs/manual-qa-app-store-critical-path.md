# Manual QA — App Store critical path (Flyers Up)

Use this checklist on **staging** with **Stripe test mode** unless noted. Record build/commit ID and environment URLs.

**Server checkpoints (Vercel / Node logs):** after certain steps, search logs for:

- `[booking] pro_accepted` — pro accepted; includes `bookingId`, `nextStatus`
- `[booking] deposit_intent_created` — deposit PaymentIntent created; includes `bookingId`, `paymentIntentStatus`, `amountDeposit`

---

## Global prerequisites

- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and server Stripe keys match **test** vs **live** for the environment  
- [ ] Supabase project matches environment  
- [ ] Two test accounts: **Customer** and **Pro** (pro has Stripe Connect **charges enabled** in test)  
- [ ] Physical device or emulator for sections **K** and **L**

**Canonical booking URLs (deep-link parity):**

- Customer detail: `/customer/bookings/{bookingId}`  
- Pro detail: `/pro/bookings/{bookingId}`  
- Post–deposit success: `/bookings/{bookingId}/confirmed`  
- Post–**final** payment success: `/bookings/{bookingId}/confirmed?phase=final` (copy differs from deposit)  
- Deposit pay: `/customer/bookings/{bookingId}/deposit`  
- Final checkout: `/bookings/{bookingId}/checkout?phase=final`

---

## A. Customer signup / login

| Step | Action | Expected | Pass? |
|------|--------|----------|:-----:|
| A1 | Open sign-up as customer | Account can be created or sign-in works | [ ] |
| A2 | Complete any required onboarding | Lands in customer home / browse | [ ] |
| A3 | Sign out; open deep link `/customer/bookings` while signed out | Redirect or sign-in prompt; no blank shell | [ ] |
| A4 | After sign-in with `?next=` | Returns to intended route | [ ] |

**Roles:** Customer only.

**Start state:** Logged out.

---

## B. Pro signup / login / onboarding readiness

| Step | Action | Expected | Pass? |
|------|--------|----------|:-----:|
| B1 | Sign in as pro | Pro shell (rail / pro nav) | [ ] |
| B2 | Stripe Connect complete (test) | Can accept jobs without “Complete Connect” blocker | [ ] |
| B3 | Open `/pro/settings/payments-payouts` | Payouts section loads; no dead “Tax” link | [ ] |
| B4 | Open `/pro/today` → **Settings** (header) | Navigates to `/pro/settings` | [ ] |

**Roles:** Pro.

**Start state:** Pro account with Connect ready (or note blocker).

---

## C. Booking creation

| Step | Action | Expected | Pass? |
|------|--------|----------|:-----:|
| C1 | As customer, create booking for test pro | Booking created; visible in customer list | [ ] |
| C2 | Open `/customer/bookings` → Active | Row appears; status appropriate (e.g. requested) | [ ] |
| C3 | Open booking detail | Timeline / summary loads; primary CTA makes sense | [ ] |

**Roles:** Customer.

**Start state:** Logged-in customer, valid pro/service.

---

## D. Pro acceptance

| Step | Action | Expected | Pass? |
|------|--------|----------|:-----:|
| D1 | As pro, open `/pro/bookings` → Active | Request appears in list | [ ] |
| D2 | Accept booking (UI or flow used in product) | Success; no silent failure | [ ] |
| D3 | Server log | `[booking] pro_accepted` with `nextStatus` `awaiting_deposit_payment` (or documented variant) | [ ] |
| D4 | Customer notification (if enabled) | Received; tapping opens `/customer/bookings/{id}` | [ ] |

**Roles:** Pro, then Customer for D4.

**Start state:** `requested` / `pending` booking assigned to pro.

---

## E. Deposit payment

| Step | Action | Expected | Pass? |
|------|--------|----------|:-----:|
| E1 | As customer, open booking detail | **Pay deposit** visible when deposit unpaid (even if deadline edge case) | [ ] |
| E2 | Tap **Pay deposit** → `/customer/bookings/{id}/deposit` | Summary shows service, pro, **deposit amount**, remaining if shown | [ ] |
| E3 | Complete Stripe Payment Element (test card) | No raw error JSON; user-readable errors on decline | [ ] |
| E4 | Server log | `[booking] deposit_intent_created` when intent is created | [ ] |

**Roles:** Customer.

**Start state:** `awaiting_deposit_payment` or equivalent; scope confirmed if job-request flow.

---

## F. Confirmed page

| Step | Action | Expected | Pass? |
|------|--------|----------|:-----:|
| F1 | After redirect from Stripe (deposit) | Lands on `/bookings/{id}/confirmed` (no query) | [ ] |
| F1b | After final payment redirect | Lands on `/bookings/{id}/confirmed?phase=final` | [ ] |
| F2 | Success / processing copy | Clear “what happens next”; processing state if webhook slow | [ ] |
| F3 | If load fails | Message + **Try again** + **View booking** | [ ] |
| F4 | Tap **View booking** | `/customer/bookings/{id}` shows paid deposit / updated status | [ ] |

**Roles:** Customer.

**Start state:** Just completed or returned from 3DS if applicable.

---

## G. Pro job visibility

| Step | Action | Expected | Pass? |
|------|--------|----------|:-----:|
| G1 | As pro, `/pro/bookings` → Active | Job still listed after deposit (e.g. `deposit_paid` / `payment_required` / workflow status) | [ ] |
| G2 | Open `/pro/bookings/{id}` | Detail loads; payment section coherent | [ ] |
| G3 | If detail empty after payment | **Try again** refetches (webhook delay) | [ ] |

**Roles:** Pro.

**Start state:** Customer paid deposit on accepted booking.

---

## H. Status progression

| Step | Action | Expected | Pass? |
|------|--------|----------|:-----:|
| H1 | Pro: mark en route / on the way (per product) | Customer detail updates (realtime or refresh) | [ ] |
| H2 | Pro: in progress → complete (per product) | Statuses align on both sides | [ ] |
| H3 | Customer timeline | Matches server status labels | [ ] |

**Roles:** Pro + Customer.

**Start state:** Deposit paid, job scheduled.

---

## I. Final payment

| Step | Action | Expected | Pass? |
|------|--------|----------|:-----:|
| I1 | When balance due, customer sees **Release remaining payment** (or equivalent) | Links to `/bookings/{id}/checkout?phase=final` | [ ] |
| I2 | Final checkout loads | Amounts consistent with booking | [ ] |
| I3 | Pay with test card | Success path; booking shows settled | [ ] |

**Roles:** Customer.

**Start state:** Job in final-payment-eligible status.

---

## J. Cancellation / expired deposit edge cases

| Step | Action | Expected | Pass? |
|------|--------|----------|:-----:|
| J1 | Customer cancels before deposit (if allowed) | Clear outcome; lists update | [ ] |
| J2 | Deposit window expired (if testable) | UI explains next step; not a blank screen | [ ] |
| J3 | Pro declines | Customer sees declined; no orphan CTAs | [ ] |

**Roles:** As needed.

**Start state:** Varies.

---

## K. Notification deep links

| Step | Action | Expected | Pass? |
|------|--------|----------|:-----:|
| K1 | In-app notification with `bookingId` | Opens `/customer/bookings/{id}` or `/pro/bookings/{id}` per role | [ ] |
| K2 | Toast tap | Same path as bell / list | [ ] |
| K3 | Payment-category notification without booking id | Opens `/customer/bookings` list (not 404) | [ ] |

**Roles:** Match notification recipient.

**Start state:** Notification row exists in DB or push test.

---

## L. Mobile layout checks

| Step | Action | Expected | Pass? |
|------|--------|----------|:-----:|
| L1 | Deposit page | Pay bar not hidden behind bottom nav; scroll works | [ ] |
| L2 | Booking detail primary CTA | Full width tap target; not clipped | [ ] |
| L3 | Confirmed page | Primary actions visible without horizontal scroll | [ ] |
| L4 | Pro bookings list | Cards readable; status badge not overlapping | [ ] |

**Device:** Narrow viewport (e.g. 390×844).

---

## M. Account deletion reachability

| Step | Action | Expected | Pass? |
|------|--------|----------|:-----:|
| M1 | Customer: Settings → Privacy & Security | **Delete account** flow reachable | [ ] |
| M2 | Copy matches policy | Pro restriction explained if applicable | [ ] |
| M3 | API errors | User sees message, not blank | [ ] |

**Roles:** Customer (and note pro policy).

---

## N. Legal / privacy / settings reachability

| Step | Action | Expected | Pass? |
|------|--------|----------|:-----:|
| N1 | Customer settings | Privacy, Terms, Help links open | [ ] |
| N2 | Pro settings | Same class of links under pro paths | [ ] |
| N3 | No disabled “placeholder” items on critical finance nav | Tax/payouts go to real screen | [ ] |

**Roles:** Both.

---

## Wrong-role / direct URL behavior (cross-cutting)

| Step | Action | Expected | Pass? |
|------|--------|----------|:-----:|
| X1 | Customer opens `/pro/bookings` while logged in as customer only | Forbidden empty list or redirect — **not** pro data | [ ] |
| X2 | Pro opens `/customer/bookings/{id}` for another customer’s job | Not found or access denied; graceful | [ ] |
| X3 | Logged out opens `/customer/bookings/{id}` | Sign-in prompt (not infinite skeleton) | [ ] |

---

## Sign-off

| | |
|--|--|
| Tester | |
| Date | |
| Environment | |
| **Result** | Pass / Fail |
| **Blockers** | |

---

## Appendix — fetch / refresh expectations

- Authenticated `fetch` to `/api/customer/bookings*` should use `credentials: 'include'` and `cache: 'no-store'` where data must be fresh.  
- After **confirm completion** / **accept** / payment return, if UI looks stale: pull-to-refresh not required; use **Try again** or navigate away and back.  
- **Realtime** updates booking rows when enabled; if Realtime disabled (proxy), rely on refresh / re-navigation.

## Appendix — automated checks (CTA + deep links)

From repo root (`flyers-up/`):

```bash
npx tsx --test lib/bookings/__tests__/customer-booking-actions-deposit.test.ts lib/bookings/__tests__/deep-link-parity.test.ts lib/bookings/__tests__/pro-visible-statuses.test.ts
```

- Deposit CTA helper: `shouldShowCustomerDepositPayCta`  
- Notification paths: must match `bookingDetailPathForRole` in `lib/bookings/booking-routes.ts`
