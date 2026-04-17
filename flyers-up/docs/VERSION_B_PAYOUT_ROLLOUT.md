# Version B payout & final payment rollout

## 1. Root cause (old system)

- **Payout** was coupled to a **24-hour post-completion “review” window**, customer confirmation timing, and **completion-photo** checks, so money logic, product UX, and ops tooling all overlapped.
- **Final charge** was effectively **gated on `customer_review_deadline_at`** in `attemptFinalCharge`, so “save card and auto-charge later” behaved like “wait for the window,” which made the product feel heavy and delayed **paid in full** and therefore **pro payout**.
- Multiple helpers (`isPayoutEligible`, snapshot builders, cron filters) repeated similar rules with different names (`insufficient_completion_evidence` covered many unrelated cases).

## 2. Files changed (high level)

| Area | Files |
|------|--------|
| Version B core | `lib/bookings/version-b-payout.ts` (new), `lib/bookings/__tests__/version-b-payout.test.ts` |
| Gates / holds | `lib/bookings/simple-payout-eligibility.ts`, `lib/bookings/payout-release-eligibility-snapshot.ts`, `lib/bookings/payment-lifecycle-types.ts` |
| Final charge at completion | `lib/bookings/payment-lifecycle-service.ts` (`markBookingCompleted`, `attemptFinalCharge`, `releasePayout` hard-holds, reconcile helper) |
| Customer UX | `lib/bookings/customer-remaining-payment-ui.ts`, `lib/bookings/__tests__/customer-remaining-payment-ui.test.ts`, `components/bookings/customer/PaymentCountdown.tsx`, `components/bookings/customer/PaymentStatusModule.tsx`, `app/api/bookings/[bookingId]/complete/route.ts` |
| Copy / held reasons | `lib/bookings/payout-hold-explanations.ts`, `lib/bookings/payment-held-ui-state.ts`, `lib/bookings/payout-release-cron.ts` |
| Types test | `lib/bookings/__tests__/payment-lifecycle-types-hold.test.ts` |

## 3. Version B state model

### Target payment states (product)

`deposit_pending` · `deposit_paid` · `final_pending` · `paid_in_full` · `refund_pending` · `refunded`

**Rollout mapping** (derived, no new DB enum required): see `deriveVersionBPaymentState()` in `version-b-payout.ts` from `payment_lifecycle_status` + `refund_status`. Legacy values such as `final_paid`, `payout_ready`, `payout_sent` map to **`paid_in_full`**.

### Target payout states (product)

`blocked` · `ready` · `processing` · `paid` · `failed`

**Rollout mapping**: see `deriveVersionBPayoutState()` from `payout_released`, `payment_lifecycle_status`, `payout_status`, optional `booking_payouts.status`, and optional Stripe transfer status hints. Cron + `releasePayout` still persist existing columns; Version B states are primarily **read/UX** until you add dedicated columns.

### Version B block reasons (when payout is `blocked`)

**True holds (exception / risk):** `open_dispute` · `refund_pending` · `admin_hold` · `fraud_hold`

**Not ready yet (do not label “on hold” in pro UI):** `booking_not_completed` · `final_payment_pending` · `pro_not_ready_for_payout`

Mapped in `mapHoldToVersionBBlock` from internal `PayoutHoldReason` / gates. Pro-facing copy uses `deriveSimplePayoutState` so “not ready” reasons never reuse payout-hold wording.

## 4. Exact logic changes

1. **`evaluateVersionBPayoutEligibility(row, ctx)`** (`version-b-payout.ts`): single entry for “may we run Connect transfer?” after money settled: checks **admin hold**, **dispute**, **payout_blocked** (non-admin), **paid in full**, then reuses **`evaluateSimplePayoutTransferGate`** for operational gates.
2. **`buildPayoutReleaseEligibilitySnapshot`** calls **`evaluateVersionBPayoutEligibility`** instead of calling the simple gate directly.
3. **`evaluatePayoutEligibility`** uses **`evaluateVersionBPayoutEligibility`** (aligned with cron).
4. **Operational holds**: `arrived_at` / `started_at` / `completed_at` / multi-day milestone failures now write **`booking_not_completed`** instead of **`insufficient_completion_evidence`** (legacy ICE still read for old rows).
5. **`markBookingCompleted`**: sets `customer_review_deadline_at` to **now** (no artificial 24h wait for charging), logs `final_charge_scheduled`, then **`attemptFinalCharge(..., { skipReviewWindow: true })`** so off-session final runs immediately when card is saved.
6. **`attemptFinalCharge`**: new **`skipReviewWindow`** bypasses the deadline guard used for the old “charge after review” behavior.
7. **Customer derive**: `final_pending` + job complete → **`final_pending_after_completion`** so UI routes to **pay remaining balance** immediately (no `review_window_auto` countdown as the primary path).
8. **`releasePayout`**: `hardHolds` includes **`booking_not_completed`** and **`insufficient_completion_evidence`** so blocked rows stay safe.

## 5. Migration notes

- **No SQL migration required** for Version B v1: `payout_hold_reason` remains `text`; new value **`booking_not_completed`** is allowed via `assertPayoutHoldReason`.
- **Existing rows** with `insufficient_completion_evidence` continue to work; `mapHoldToVersionBBlock` maps ICE → `booking_not_completed` for display/analytics.
- **`reconcileStalePayoutOnHoldForCompletionEvidence`** treats **`booking_not_completed`** like ICE for the narrow “stale evidence hold” reconciliation path.
- If you later add **columns** `version_b_payment_state` / `version_b_payout_state`, backfill from the derive helpers and switch UI reads to those columns.

## 6. Manual QA checklist

1. **Deposit only**: booking `deposit_paid`, no `paid_remaining_at` → VB payment `deposit_paid` / final not settled; cron must **not** release payout; eligibility **`final_payment_pending`**.
2. **Completion + saved card + off-session succeeds**: after pro completes, final PI succeeds without customer returning to app → lifecycle reaches paid-in-full family → **`payout_ready`** / cron releases when Connect ready.
3. **Completion + no saved card / off-session fails**: customer sees **Pay remaining balance** path (`final_pending_after_completion` / `final_due`); no 24h countdown as blocker for that UX.
4. **Dispute / refund pending / admin_hold / fraud (suspicious) / pro not Connect-ready**: payout **`blocked`** with the matching Version B block reason.
5. **Transfer failure**: `payout_status` / `booking_payouts` failed → **`deriveVersionBPayoutState` = `failed`**; admin queue shows retry where applicable.
6. **Transfer in flight**: **`processing`** when status pending/in_transit/processing.
7. **Transfer settled**: **`paid`** when released + succeeded.

## 7. Simple explanation

Customers still pay a **deposit**, then the **remainder at completion**. As soon as the platform records **paid in full**, we try to move the pro’s payout automatically. We **stopped tying the final card charge and the payout to a 24-hour review window** and stopped using **completion photos as a default payout gate**. Before payout can start, the job must be complete, the customer must pay the remainder, and the pro must be Connect-ready — those are **“not ready yet”**, not payout holds. **True holds** are disputes, refunds in flight, admin pause, or fraud review. Admin payout review stays for **exceptions**, not the happy path. Stale unpaid final balances: **`/api/cron/bookings/final-charge-scheduler`** sends a deduped **balance due** reminder to the customer after **24h** (`stale-final-payment-reminder.ts`) while continuing to **retry** off-session final charges for eligible rows.
