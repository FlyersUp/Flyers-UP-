/**
 * One-time / periodic historical payout audit (read-only).
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL).
 *
 * Usage (from `flyers-up/`):
 *   npx tsx scripts/payout-audit-historical.ts
 *   npx tsx scripts/payout-audit-historical.ts --summary-only
 *   npx tsx scripts/payout-audit-historical.ts --limit 2000
 *
 * Output: JSON to stdout — `{ summary, definite_overpayments, likely_safe, needs_manual_review, remediation }`.
 * Does not modify any rows.
 *
 * Sample summary shape:
 * {
 *   "summary": {
 *     "row_count": 42,
 *     "definite_overpayment": { "count": 3, "total_overpayment_cents": 1500 },
 *     "likely_safe": { "count": 30 },
 *     "needs_manual_review": { "count": 9 },
 *     "exposure_overpayment_cents": 1500,
 *     "exposure_overpayment_usd": "15.00",
 *     "audited_rows_with_positive_transfer": 42
 *   },
 *   "definite_overpayments": [ { "booking_id": "...", "expected_transfer_cents": 3000, ... } ],
 *   "likely_safe": [ ... ],
 *   "needs_manual_review": [ ... ],
 *   "remediation": "Recover overpaid amount: ..."
 * }
 */

import { createSupabaseAdmin } from '../lib/supabase/server-admin';
import {
  auditOneHistoricalPayout,
  REMEDIATION_OPTIONS_TEXT,
  summarizePayoutAudit,
  type HistoricalPayoutAuditRecord,
} from '../lib/bookings/payout-audit-historical';

const BOOKING_SELECT = [
  'id',
  'total_amount_cents',
  'amount_total',
  'customer_total_cents',
  'fee_total_cents',
  'service_fee_cents',
  'convenience_fee_cents',
  'protection_fee_cents',
  'demand_fee_cents',
  'subtotal_cents',
  'pro_earnings_cents',
  'customer_fees_retained_cents',
  'platform_fee_cents',
  'amount_platform_fee',
  'refunded_total_cents',
  'amount_refunded_cents',
  'amount_subtotal',
  'transferred_total_cents',
  'payout_amount_cents',
  'payout_released',
  'stripe_transfer_id',
  'payout_transfer_id',
  'booking_payouts(amount_cents)',
].join(', ');

function flattenBookingPayoutAmount(row: Record<string, unknown>): Record<string, unknown> {
  const bp = row.booking_payouts;
  let amount: number | null = null;
  if (Array.isArray(bp)) {
    amount = (bp[0] as { amount_cents?: number } | undefined)?.amount_cents ?? null;
  } else if (bp && typeof bp === 'object') {
    amount = (bp as { amount_cents?: number }).amount_cents ?? null;
  }
  const { booking_payouts: _, ...rest } = row;
  return {
    ...rest,
    booking_payouts_amount_cents: amount,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const summaryOnly = args.includes('--summary-only');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const maxRows = limitArg ? Math.max(1, parseInt(limitArg.split('=')[1] ?? '10000', 10)) : 100_000;

  const admin = createSupabaseAdmin();
  const pageSize = 500;
  const all: HistoricalPayoutAuditRecord[] = [];

  let from = 0;
  let done = false;
  while (!done && all.length < maxRows) {
    const { data, error } = await admin
      .from('bookings')
      .select(BOOKING_SELECT)
      .or(
        [
          'payout_released.eq.true',
          'transferred_total_cents.gt.0',
          'payout_amount_cents.gt.0',
          'stripe_transfer_id.not.is.null',
          'payout_transfer_id.not.is.null',
        ].join(',')
      )
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error(JSON.stringify({ error: error.message, details: error }));
      process.exit(1);
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      done = true;
      break;
    }

    for (const raw of rows) {
      const row = flattenBookingPayoutAmount(raw as unknown as Record<string, unknown>);
      const actual =
        Number(row.transferred_total_cents ?? 0) ||
        Number(row.booking_payouts_amount_cents ?? 0) ||
        Number(row.payout_amount_cents ?? 0);
      if (actual <= 0) continue;
      const rec = auditOneHistoricalPayout(row);
      if (rec) all.push(rec);
    }

    from += pageSize;
    if (rows.length < pageSize) done = true;
  }

  const summary = summarizePayoutAudit(all);
  const definite_overpayments = all.filter((r) => r.bucket === 'definite_overpayment');
  const likely_safe = all.filter((r) => r.bucket === 'likely_safe');
  const needs_manual_review = all.filter((r) => r.bucket === 'needs_manual_review');

  const exposureUsd = (summary.exposure_overpayment_cents / 100).toFixed(2);

  const out = {
    summary: {
      ...summary,
      exposure_overpayment_usd: exposureUsd,
      audited_rows_with_positive_transfer: all.length,
    },
    definite_overpayments: summaryOnly ? definite_overpayments.map((r) => r.booking_id) : definite_overpayments,
    likely_safe: summaryOnly ? likely_safe.map((r) => r.booking_id) : likely_safe,
    needs_manual_review: summaryOnly ? needs_manual_review.map((r) => r.booking_id) : needs_manual_review,
    remediation: REMEDIATION_OPTIONS_TEXT,
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
