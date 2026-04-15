# Stripe booking money metadata (canonical contract)

## Purpose

Stripe `metadata` on **PaymentIntents**, **Refunds**, and **Connect Transfers** carries a **time-stamped copy** of booking money fields so support, the Stripe Dashboard, webhooks, and operational tooling share one shape. It is **not** the ledger of record for refund math — always use `bookings` + internal ledgers for amounts — but it must be **complete and consistent** for audits and search.

## Module map

| Concern | Module |
|--------|--------|
| Stable import surface (re-exports + refund/transfer asserts) | `lib/stripe/payment-metadata.ts` |
| Required cent keys + `payment_phase` for all money objects | `lib/stripe/payment-intent-metadata-unified.ts` |
| PI builders, 50-key cap, `normalizeBookingPaymentMetadata` | `lib/stripe/booking-payment-intent-metadata.ts` |
| Lifecycle merges (deposit/final PI rows, refunds, transfers) | `lib/stripe/booking-payment-metadata-lifecycle.ts` |
| Hosted / legacy full checkout PI assembly | `lib/stripe/hosted-checkout-payment-intent-data.ts` |

## Required keys (every money-moving Stripe object)

String values; cent fields are decimal integer strings, including `"0"`:

- `booking_id`
- `payment_phase` — `deposit` \| `final` \| `full` on checkout PIs; `refund` on refunds; `transfer` on Connect transfers
- `subtotal_cents`, `total_amount_cents`, `platform_fee_cents`, `deposit_amount_cents`, `final_amount_cents`
- `pricing_version` — use `unknown` when not stamped on the booking

Helpers: `buildUnifiedBookingPaymentIntentMoneyMetadata`, `assertUnifiedBookingPaymentIntentMetadata` (PIs), `assertCanonicalRefundMetadata` / `assertCanonicalTransferMetadata` (refunds / transfers).

## Refund-specific keys

In addition to the eight money keys (with `payment_phase: refund`):

- `refunded_amount_cents` — cents moved by **this** Stripe Refund object
- `refund_type` — `before_payout` \| `after_payout` (operational timing vs outbound transfer)
- `refund_source_payment_phase` — optional: `deposit` \| `final` \| `full` (which PI was debited)

Built via `refundLifecycleMetadata` in `booking-payment-metadata-lifecycle.ts`.

## Transfer-specific keys

With `payment_phase: transfer`:

- `transferred_total_cents` — net cents sent to the connected account (mirrors `payout_amount_cents`)
- `linked_final_payment_intent_id`, `pro_id` as applicable

Built via `transferLifecycleStripeMetadata`.

## Optional PI keys

Per-line fees and promo lines (when present), e.g. `service_fee_cents`, `convenience_fee_cents`, `protection_fee_cents`, `demand_fee_cents`, `promo_discount_cents` — see `OPTIONAL_BOOKING_PAYMENT_INTENT_FEE_KEYS` in `payment-metadata.ts`. They may be dropped when trimming to Stripe’s 50-key limit; protected keys are never dropped first.

## Who consumes this

- **Support / ops** — Dashboard search on `booking_id`, `payment_phase`, `pricing_version`
- **Receipts / UI** — Prefer frozen `bookings` + quote sources; metadata is a diagnostic copy
- **Analytics** — Join on `pricing_version` + phase; do not treat analytics-only keys as financial truth
- **Refunds / remediation** — Amount decisions use DB + Stripe objects; metadata documents scope and timing (`refund_type`, `refunded_amount_cents`)

## Refund caller behavior when `refundPaymentIntent*` returns `null`

`null` means the refund was **not** created in Stripe (metadata validation abort in production, Stripe/network error, or missing charge). Callers must not treat `null` like a successful refund id.

| Caller | On `null` |
|--------|-----------|
| **Admin `partial_refund` route** | `502` + `refund_not_created`; structured `console.error` with `booking_id` / PI / cents. |
| **Admin `full_refund` route** | Per-PI `console.error`; if any attempted PI fails, **no** booking `refunded`/`succeeded` update; `502` + `stripe_refund_incomplete` with attempted/succeeded counts. |
| **`runAdminRefundCustomer`** | Per-PI `console.error`; batch guard returns `stripe_refund_failed` or `stripe_refund_partial_failure`; **no** booking refund lifecycle update. |
| **`resolveDispute` (partial refund)** | `console.error`; dispute resolution still proceeds (dispute row + booking flags already updated); **no** ledger/remediation without a refund id. |
| **Cron `auto-refunds`** | `console.error`; `refund_status: failed` + customer notification (existing `else` branch). |
| **`applySucceededPI` (late cancel)** | `console.error`; **no** “refunded” customer/pro push; `refund_status` may stay `pending` for ops follow-up. |
| **`executeNoShowCancel` (deposit)** | `console.error`; `refund_status: failed` on booking (cancel RPC already succeeded). |
| **`maybeRefundDepositAfterReviewWindowCancel`** | Existing branch sets `refund_status: failed` + `manual_review_required` + returns error (now also logs). |

**Intentional difference:** `resolveDispute` does not roll back dispute resolution when the Stripe partial refund fails — the admin has already chosen an outcome; ops must reconcile money separately.

## Drift prevention

- `lib/stripe/server.ts` — `validateRefundCreateMetadata` runs before every Stripe refund create:
  - **Dev / CI:** throws if metadata is `{}` / omitted (normalized to empty) or if `booking_id` is missing/blank, then `assertCanonicalRefundMetadataDev` for complete objects.
  - **Production:** empty or `booking_id`-less metadata logs an error and **does not** call Stripe (returns `null` from `refundPaymentIntent` / `refundPaymentIntentPartial`) unless the documented escape hatch is enabled.
- **Documented exception:** set `ALLOW_EMPTY_STRIPE_REFUND_METADATA=1` (see `REFUND_METADATA_LEGACY_ALLOW_ENV` in `server.ts`) only for legacy or emergency paths; prefer `refundLifecycleMetadata` on all callers.
- `createTransfer` — non-empty metadata still validated via `assertCanonicalTransferMetadataDev`.
- `lib/stripe/__tests__/metadata-guardrail.test.ts` — scans `lib/` and `app/` (excluding tests and `server.ts`) and fails if `refundPaymentIntent*` is used without `refundLifecycleMetadata`, or `createTransfer` without `transferLifecycleStripeMetadata`.
- `lib/stripe/__tests__/refund-metadata-guard.test.ts` — unit coverage for empty metadata and missing `booking_id` behavior.

## Backward compatibility

Legacy camelCase id keys (`bookingId`) may still appear on **reads** via coalescing parsers; **new writes** use snake_case canonical keys. Older PaymentIntents without full cent lines are not rewritten automatically; new code paths always merge the unified builder before create/update.
