# Historical payout audit — operations runbook

Read-only scripts. Requires `SUPABASE_SERVICE_ROLE_KEY` and Supabase URL env vars for step 1 only.

## 1) Generate the audit file

From `flyers-up/`:

```bash
npx tsx scripts/payout-audit-historical.ts > payout-audit-full.json
```

## 2) Turn it into review files

```bash
npx tsx scripts/payout-audit-review.ts
```

Outputs (same directory as `payout-audit-full.json`, usually `flyers-up/`):

- `payout-audit-definite-overpayments.csv`
- `payout-audit-needs-manual-review-sorted.csv`
- `payout-audit-review-summary.json`

## 3) What to open first

1. `payout-audit-review-summary.json`
2. `payout-audit-definite-overpayments.csv`
3. `payout-audit-needs-manual-review-sorted.csv`

## 4) How to review

### First pass

Use **only** `payout-audit-definite-overpayments.csv` — highest-confidence issues.

Focus on:

- `booking_id`
- `delta_actual_minus_expected_usd`
- `recommended_action`

### Second pass

Open `payout-audit-needs-manual-review-sorted.csv`. Rows are sorted by **largest absolute delta** first; work from top to bottom.

## 5) Decision rule (exact)

Use **absolute** dollar delta (`delta_actual_minus_expected_usd` magnitude) for tiering:

| Amount        | Tier                      |
|---------------|---------------------------|
| Under $5      | `write_off`               |
| $5 to &lt; $25 | `offset_future_payout`   |
| $25+          | `manual_recovery_review` |

The CSV columns `bucket` and `recommended_action` already apply this policy.

## 6) Track final decisions

Copy `payout-audit-decisions-tracker.template.csv` to a new file (e.g. `payout-audit-decisions.csv`) and fill in as you go.

Suggested columns:

| Column              | Purpose                          |
|---------------------|----------------------------------|
| `booking_id`        | From audit CSVs                  |
| `overpayment_usd`   | Amount to recover (if any)       |
| `recommended_action`| From audit                       |
| `final_decision`    | What you actually did            |
| `status`            | Workflow state                   |
| `notes`             | Free text                        |

Example **status** values: `open`, `reviewed`, `resolved`, `written_off`.

## 7) What not to do yet

Do **not** run legacy fee-column backfills until you have:

1. Run the audit
2. Reviewed definite overpayments
3. Decided what to recover vs write off

Only then consider data repair migrations.
