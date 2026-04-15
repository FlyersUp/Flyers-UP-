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

## Drift prevention

- `lib/stripe/server.ts` — in dev/CI, `refundPaymentIntent` / `refundPaymentIntentPartial` / `createTransfer` validate non-empty metadata via `assertCanonical*MetadataDev`.
- `lib/stripe/__tests__/metadata-guardrail.test.ts` — scans `lib/` and `app/` (excluding tests and `server.ts`) and fails if `refundPaymentIntent*` is used without `refundLifecycleMetadata`, or `createTransfer` without `transferLifecycleStripeMetadata`.

## Backward compatibility

Legacy camelCase id keys (`bookingId`) may still appear on **reads** via coalescing parsers; **new writes** use snake_case canonical keys. Older PaymentIntents without full cent lines are not rewritten automatically; new code paths always merge the unified builder before create/update.
