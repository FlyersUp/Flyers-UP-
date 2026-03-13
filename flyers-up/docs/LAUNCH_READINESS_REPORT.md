# Flyers Up — Launch Readiness Report

**Date:** March 12, 2025  
**Scope:** Production readiness audit for two-sided marketplace handling real payments, users, and disputes.

---

## 1. Critical Issues Discovered and Fixed

### 1.1 Remaining Payment Before Job Completion
- **Issue:** `POST /api/bookings/[bookingId]/pay/final` allowed remaining payment when status was `deposit_paid`, `pro_en_route`, or `in_progress`. Customers could pay the remaining balance before the pro had completed the job (with evidence).
- **Fix:** Restricted `ELIGIBLE_STATUSES` to `completed_pending_payment`, `awaiting_payment`, `awaiting_remaining_payment` only. Updated both `components/booking/PaymentStatusModule.tsx` and `components/bookings/customer/PaymentStatusModule.tsx` to match.
- **Files:** `app/api/bookings/[bookingId]/pay/final/route.ts`, `components/booking/PaymentStatusModule.tsx`, `components/bookings/customer/PaymentStatusModule.tsx`

### 1.2 Accept-Quote Race Condition
- **Issue:** No protection against double-accept of a quote. Two concurrent requests could both succeed.
- **Fix:** Added `.in('status', ['requested', 'pending']).eq('price_status', 'quoted')` to the update and return 409 when no rows matched.
- **Files:** `app/api/bookings/[bookingId]/accept-quote/route.ts`

### 1.3 Complete Route Race Condition
- **Issue:** Pro could double-submit completion; status update lacked optimistic locking.
- **Fix:** Added `.eq('status', 'in_progress')` to the update. If no rows matched (another request already completed), return success with `alreadyRecorded: true`.
- **Files:** `app/api/bookings/[bookingId]/complete/route.ts`

### 1.4 Stripe Webhook Logging
- **Issue:** `console.log` in webhook handler could leak booking IDs and payment phase into production logs.
- **Fix:** Removed `console.log` for payment succeeded/failed and unhandled event types.
- **Files:** `app/api/stripe/webhook/route.ts`

---

## 2. Important Issues Fixed (from prior audit)

- **Cancel route:** Block cancel when status is `completed`, `awaiting_customer_confirmation`, `paid`, or `fully_paid` — use dispute flow instead.
- **Accept route:** Added `.in('status', ['requested', 'pending'])` to prevent double-accept.
- **Accept-quote notification:** Fixed `createNotificationEvent` to use pro `user_id` instead of `pro_id`.
- **Auto-refunds cron:** Fixed `.or('refund_status.is.null,refund_status.eq.none')` so rows with `refund_status = NULL` are included.

---

## 3. Remaining Non-Blocking Issues

| Item | Location | Notes |
|------|----------|-------|
| TODO: Wire ActivityFeed | `components/admin/ActivityFeed.tsx` | Placeholder; wire to real-time when available |
| TODO: Wire DemandSupplyTable | `components/admin/DemandSupplyTable.tsx` | Placeholder; wire to backend aggregation |
| TODO: Wire AiOpsSuggestions | `components/admin/AiOpsSuggestions.tsx` | Placeholder; wire when backend supports |
| TODO: Wire AttentionJobsCard | `components/admin/AttentionJobsCard.tsx` | Placeholder; wire for long-wait requests |
| TODO: Platform fee logic | `lib/stripe/server.ts` | Comment only; release-payouts already uses `computeNetToPro` |
| TODO: Payout risk-check | `app/api/payouts/risk-check/route.ts` | Future internal tooling |
| OneSignal console.log | `components/notifications/OneSignalInit.tsx` | Debug logs; consider env-gating |
| Realtime hooks console.log | `hooks/useRealtimeBookings.ts`, `useProEarningsRealtime.ts` | Debug logs; consider env-gating |

---

## 4. Files Changed (this audit)

| File | Change |
|------|--------|
| `app/api/bookings/[bookingId]/pay/final/route.ts` | Restrict remaining payment to post-completion statuses |
| `app/api/bookings/[bookingId]/accept-quote/route.ts` | Race guard + clearer error handling |
| `app/api/bookings/[bookingId]/complete/route.ts` | Optimistic lock on status update |
| `app/api/stripe/webhook/route.ts` | Remove production console.log |
| `components/booking/PaymentStatusModule.tsx` | Align "Pay remaining" with backend |
| `components/bookings/customer/PaymentStatusModule.tsx` | Same |

---

## 5. Systems Strengthened

- **Payment flow:** Remaining payment only after pro completion; UI and API aligned.
- **Race conditions:** Accept, accept-quote, and complete routes hardened with optimistic locking.
- **Logging:** Stripe webhook no longer logs payment details in production.
- **State machine:** Cancel blocked for terminal states; dispute flow required.

---

## 6. Features Gated Before Launch

None. All critical flows are enforced server-side.

---

## 7. Remaining Operational Risks

| Risk | Mitigation |
|------|-------------|
| Admin manual refund | No dedicated admin refund API; refunds via Stripe Dashboard or auto-refunds cron. Consider adding `POST /api/admin/bookings/[id]/refund` for manual override. |
| Price adjustment abuse | Pro can submit arbitrary `new_price_cents`; customer must accept. No cap. Consider max multiplier (e.g. 2x original) if abuse observed. |
| Counter amount = 0 | Customer can counter with $0; pro would need to accept. Business decision; no technical block. |

---

## 8. Launch Critical Checklist

### Auth
- [x] Login
- [x] Signup
- [x] Session persistence

### Marketplace
- [x] Discovery
- [x] Requests
- [x] Offers
- [x] Bookings

### Payments
- [x] Deposit
- [x] Remaining (post-completion only)
- [x] Refunds (auto-refunds cron + policy)

### Trust
- [x] Cancellation rules
- [x] Reschedule rules
- [x] No-show rules
- [x] Dispute flow

### Admin
- [x] Moderation tools
- [x] Payout control (freeze via dispute resolve)
- [x] Dispute resolution (uphold_customer, uphold_pro, split_refund, request_evidence)

### UI
- [x] Loading states on critical actions
- [x] Disabled states during submit
- [x] Payment status modules aligned with backend

### Database
- [x] Schema consistent
- [x] RLS policies (pro_earnings, job_completions, job_arrivals, booking_events)
- [x] Indexes on bookings, job_completions, job_arrivals
- [x] UNIQUE(booking_id) on job_completions, job_arrivals

---

## 9. Summary

The Flyers Up marketplace is **production-ready** for launch. Critical payment and state-machine rules are enforced server-side. Race conditions on accept, accept-quote, and complete are mitigated. Remaining payment is only allowed after pro completion. Admin has dispute resolution, payout freeze, and strike issuance. Non-blocking TODOs and debug logs remain but do not affect correctness or security.
