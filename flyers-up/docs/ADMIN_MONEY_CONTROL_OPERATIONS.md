# Admin money control operations

This document describes how Flyers Up surfaces and records **admin-triggered refunds**, **retry refund safety**, and **operator signals** (stuck payout vs needs attention).

## Unified admin refund instrumentation

All admin entry points that move money to the customer share the same append-only trace:

- `booking_payment_events`: `refund_batch_started`, per-leg `refund_leg_succeeded` / `refund_leg_failed`, `refund_batch_partial_failure`, `admin_review_required`, and `remediation_required` when post-payout remediation opens.
- `booking_refund_remediation_events`: the same batch/leg/admin-review vocabulary (see migration `131_money_control_remediation_event_types.sql` and `132_booking_refund_remediation_remediation_required.sql` for `remediation_required` on the remediation ledger).

**Entry points:**

| Path | Route `action` / service | `route_source` metadata |
|------|---------------------------|------------------------|
| Payout review “refund customer” | `refund_customer` → `runAdminRefundCustomer` | `admin_refund_customer` |
| Retry refund | `retry_refund_customer` → `runAdminRefundCustomer` (`intent: 'retry'`) | `admin_refund_customer` |
| Admin full refund | `full_refund` → `runAdminFullRefundRouteFlow` | `admin_full_refund_route` |
| Admin partial refund | `partial_refund` → `runAdminPartialRefundRouteFlow` | `admin_partial_refund` |

On partial Stripe failure, **`emitAdminRefundBatchFailureClosed`** records any successful legs, dual-writes review events, and updates booking flags fail-closed (`requires_admin_review`, `payout_blocked`, `refund_status`, etc.) — the same semantics as `refund_customer`.

**Intentional exceptions**

- `mark_manual_review_required` flags the booking and writes `admin_review_requested`-style events with `source: mark_manual_review_required`; it does not start a refund batch.
- Dispute resolution flows use their own lifecycle helpers (not the admin refund batch emitters).

## Retry refund preflight (`getRefundRetryEligibilitySnapshot`)

Retry is **app-truth first**: booking row + recent `booking_refund_events` (PIs that already have a `stripe_refund_id`). It does **not** call Stripe live.

| Outcome | Meaning |
|---------|---------|
| `retry_allowed` | Expected leg(s) still lack a Stripe refund id in the ledger; retry may hit all of them. |
| `retry_partial_remaining_only` | At least one leg already refunded in ledger; Stripe calls are limited to remaining legs. |
| `retry_not_needed` | Ledger shows refund ids for every expected PI (or booking already reads fully refunded). |
| `retry_blocked_manual_review` | Ambiguous ledger (e.g. rows without `stripe_refund_id`), clawback remediation open after payout, or missing PIs. |
| `retry_conflicts_with_existing_refund_state` | Ledger shows activity but booking is not in a failed / partially-failed retry posture — confirm in Stripe before changing app state. |

**HTTP mapping (retry path)**

- `409` — `retry_not_needed`, `retry_conflicts_with_existing_refund_state`, `already_refunded`, `already_released`
- `422` — `retry_blocked_manual_review`
- `502` — `stripe_refund_failed`, `stripe_refund_partial_failure`

Responses include a `retry` object when preflight or a successful partial-retry wants to surface context for the admin UI.

When in doubt, **confirm balances in the Stripe Dashboard** before clearing flags.

## “Stuck payout” vs “Needs attention”

- **Stuck payout** comes from `evaluateAdminStuckPayoutForBooking` / cron-style detection: eligible for automatic release but `payout_released` stayed false past the threshold. Rows with `requires_admin_review` are **excluded** on purpose so the stuck list stays a “silent miss” signal.
- **Needs attention** (`deriveAdminMoneyAttentionState` on the money control panel) is a separate layer for anything that still needs a human even when not “stuck”: manual review, remediation/clawback, refund partial failure, or payout blocked with a hold reason.

Use **stuck** to chase cron/eligibility bugs; use **needs attention** for review queues, refunds, and remediation.

## Route-level tests

`runAdminBookingPaymentLifecycleAction` (`lib/admin/admin-booking-payment-lifecycle-actions.ts`) mirrors the Next route handler so we can assert **HTTP status codes and JSON** for `mark_manual_review_required` and `retry_refund_customer` without relying only on service unit tests.
