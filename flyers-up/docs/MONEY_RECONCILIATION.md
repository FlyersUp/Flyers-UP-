# Money reconciliation & reporting (v1)

## Purpose

The reconciliation layer answers, from **app-known data**:

1. Which bookings look **financially inconsistent or risky** (refund drift, payout signals, remediation, manual review).
2. What should get **operator attention this week** (aggregates + sortable issue list).
3. A **per-booking money summary** line (lifecycle, refund status, latest payment event, recommended next step).

It is built for **weekly ops review**, not only single-booking debugging.

## Where it lives

| Piece | Location |
|-------|----------|
| Classification & snapshot | `lib/bookings/money-reconciliation.ts` |
| Window load + aggregates | `lib/bookings/money-reconciliation-report.ts` |
| Admin UI | `app/(app)/admin/reconciliation/page.tsx` |
| CSV export (admin) | `GET /api/admin/reconciliation/export` |
| Ops queue (assign / review / note) | Table `booking_money_reconciliation_ops`, `PATCH /api/admin/reconciliation/ops/[bookingId]` |
| Queue merge helper | `lib/bookings/money-reconciliation-queue.ts` |

## Categories

| Category | Meaning (short) |
|----------|-----------------|
| `healthy` | No stuck payout, attention, refund failure, or obvious lifecycle/refund drift in v1 heuristics. |
| `partial_refund_attention` | Refund pipeline failed / partially failed — align with Stripe and ledger. |
| `remediation_open` | Post-payout / clawback remediation attention (composed from money control attention). |
| `payout_state_mismatch` | Stuck-style payout signal from the **same** stuck detector used elsewhere (eligible but unreleased past threshold). |
| `needs_manual_review` | `requires_admin_review` — may **not** appear on the stuck list by design. |
| `payout_blocked_attention` | Payout blocked with a hold reason, without the manual-review path taking precedence. |
| `refund_state_mismatch` | Lifecycle vs `refund_status` looks inconsistent when attention is otherwise clear. |
| `payment_state_mismatch` | Deposit/final flags vs lifecycle look inconsistent when attention is otherwise clear. |
| `reconciliation_unknown` | Fallback when classification cannot be determined cleanly. |

## How this differs from stuck payout detection

- **Stuck payout detector** (`findStuckPayoutBookings`, `evaluateAdminStuckPayoutForBooking`) targets **silent cron misses**: eligible for automatic release, past age gate, and **excludes** `requires_admin_review`, disputes, holds, etc. It is the right signal for **“why didn’t payout release?”**
- **Reconciliation** composes that detector plus **money control / attention** semantics and light **drift heuristics**, so operators also see **manual review**, **remediation**, **refund failures**, and **blocked payouts** in one weekly view.

## Snapshot fields (weekly ops)

Each row is a **`MoneyReconciliationSnapshot`**: lifecycle/refund/payout flags, **`category`**, **`reason`**, **`recommendedNextAction`**, plus:

| Field | Meaning |
|-------|---------|
| **`firstDetectedAt`** | Earliest relevant signal among configured `booking_payment_events` types, `booking_refund_remediation_events` types, then **`bookings.created_at`** if nothing else matched. |
| **`ageInHours` / `ageBucket`** | Derived from `firstDetectedAt` vs “now” when the snapshot was built (`computeReconciliationAge`). Buckets: **&lt;24h**, **1–3d**, **3–7d**, **7–14d**, **14d+**. |
| **`priorityScore` / `priorityTier`** | From `computeReconciliationPriority` (category weights) and tier helper — table sorts **priority high → low**, then **older issues first**. |
| **`resolved`** | App-truth “cleared” heuristic (`isMoneyReconciliationResolved`): e.g. remediation no longer needs attention, refund no longer failed, payout released, review flag cleared. Used for **Unresolved only**. |
| **`assignedToUserId` / `assignedToLabel`** | Admin **owner** from `booking_money_reconciliation_ops.assigned_to` → `profiles` display label. |
| **`lastReviewedAt`** | Last time an operator hit **Mark reviewed** (stored on the ops row). |
| **`opsNote`** | Short free-text note on the ops row (max 2000 chars); meant for handoff, not customer-facing. |

## Ops queue (lightweight case management)

- **Storage:** `booking_money_reconciliation_ops` keyed by `booking_id` (`assigned_to` → `auth.users`, `last_reviewed_at`, `ops_note`, `updated_at`). RLS is on; server routes use the **service role** admin client.
- **UI:** Reconciliation table **Queue** column — assign from admin list, **Mark reviewed**, **Save note**.
- **API:** `PATCH /api/admin/reconciliation/ops/[bookingId]` with JSON `{ assigned_to?, ops_note?, mark_reviewed? }`. Assignee must be a `profiles` row with `role = 'admin'`.

## How operators should use it (weekly)

1. Open **Admin → Money reconciliation** (`/admin/reconciliation`).
2. Read **This week’s financial health** (bookings in window, healthy %, issue vs unresolved counts, oldest unresolved age, top unresolved category).
3. Turn on **Unresolved only** to hide rows that are already cleared in app truth (resolved remediation, completed refunds, released payouts where the heuristic applies).
4. Work the **issue table** top-down (priority + age): use **Queue** (owner, last reviewed, ops note) so issues behave like a small case queue; use **Ops** for the suggested next step (retry refund, remediation, payout hold, payout review list, Stripe checks).
5. Narrow **7d / 30d / 90d**, **category**, and **age** quick filters (**3d+ / 7d+ / 14d+** on issue age) for neglected work.
6. Use **Export CSV** (or `GET /api/admin/reconciliation/export`) to share the window. Params: **`days`** (1–365), optional **`from`** / **`to`**, **`category`**, **`unresolved_only`**, **`min_age_days`** (whole days vs `ageInHours`).
7. **Weekly red-flag export:** `preset=weekly_red_flags` → same as **unresolved only** plus **issue age ≥ 7 days**; filename prefix `money-reconciliation-red-flags-…`. The UI button **Export red flags (7d+ unresolved)** uses this preset.

### CSV columns (queue)

After money columns, exports include **`assigned_to`** (user id), **`assigned_to_label`**, **`last_reviewed_at`**, **`ops_note`**.

### Interpreting age buckets

Buckets measure **time since the first detected money signal** in the append-only tables (or booking creation). **Short ages** often mean a fresh incident; **14d+** means something has been wrong or idle for a long time and should be escalated or closed intentionally.

### Prioritizing issues

Use **priority tier** as a first pass (remediation and refund/payout risk surface as **High**), then **age** within the same tier. **Unresolved only** keeps the list aligned with “still needs action today.”

## Limitations (v1)

- **App truth first**: bookings, `booking_payment_events`, refund/remediation ledgers, and existing detectors. There is **no live Stripe reconciliation** in this pass (no balance/PI fetch).
- **Window scan** loads up to **500** most recently **created** bookings in the window; very old activity outside that sample may not appear. CSV export raises the cap (**2000**) but is still bounded for safety.
- **`stuck_payout_count`** on the summary row comes from the **global** stuck detector run (bounded scan), not strictly “stuck inside the date window only” — use the issue table’s `payout_state_mismatch` rows for window-scoped stuck signals on loaded bookings.

### Performance (when volume grows)

The dominant cost in the window loader is still **sequential per-booking `evaluateAdminStuckPayoutForBooking`** (eligibility snapshot per candidate). That is intentional for correctness today; the **first optimization** should be here (e.g. batch or cache eligibility, narrow the prefilter, or cap concurrent snapshot work) before adding heavier analytics on this path.

When Stripe truth disagrees with the app, **Stripe Dashboard + ledger rows** remain the source of manual correction; then align booking flags and events.
