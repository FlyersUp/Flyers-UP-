/**
 * Offline review pack for historical payout audit (read-only; no DB).
 *
 * Reads JSON produced by `payout-audit-historical.ts` (redirect stdout to payout-audit-full.json),
 * then writes CSVs + a compact summary for operations.
 *
 * Usage (from `flyers-up/`):
 *   npx tsx scripts/payout-audit-review.ts
 *   npx tsx scripts/payout-audit-review.ts path/to/payout-audit-full.json
 *
 * Default input: ./payout-audit-full.json (current working directory)
 * Outputs (same directory as input):
 *   - payout-audit-definite-overpayments.csv
 *   - payout-audit-needs-manual-review-sorted.csv
 *   - payout-audit-review-summary.json
 * Full workflow: scripts/PAYOUT_AUDIT_RUNBOOK.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

type AuditRow = {
  booking_id: string;
  actual_transfer_cents: number;
  expected_transfer_cents: number;
  delta_actual_minus_expected_cents: number;
  actual_transfer_source: string;
  customer_total_cents: number;
  resolved_subtotal_cents: number;
  resolved_marketplace_fees_cents: number;
  platform_gross_retained_cents: number;
  flags: Record<string, boolean>;
};

type FullAuditJson = {
  summary?: {
    definite_overpayment?: { count?: number; total_overpayment_cents?: number };
    exposure_overpayment_cents?: number;
  };
  definite_overpayments?: AuditRow[];
  needs_manual_review?: AuditRow[];
};

const CSV_COLUMNS = [
  'booking_id',
  'actual_transfer_cents',
  'actual_transfer_usd',
  'expected_transfer_cents',
  'expected_transfer_usd',
  'delta_actual_minus_expected_cents',
  'delta_actual_minus_expected_usd',
  'actual_transfer_source',
  'customer_total_cents',
  'resolved_subtotal_cents',
  'resolved_marketplace_fees_cents',
  'platform_gross_retained_cents',
  'bucket',
  'recommended_action',
  'flags',
] as const;

function centsToUsd(cents: number): string {
  return (Math.round(cents) / 100).toFixed(2);
}

function absDeltaCents(delta: number): number {
  return Math.abs(Math.round(delta));
}

/**
 * Remediation tiers by absolute dollar delta (customer ↔ resolved economics).
 * - Under $5: write_off
 * - $5 to under $25: offset_future_payout
 * - $25 and above: manual_recovery_review
 */
function remediationFromAbsDeltaUsd(absUsd: number): { bucket: string; recommended_action: string } {
  if (absUsd < 5) {
    return {
      bucket: 'write_off',
      recommended_action: 'Immaterial exposure (under $5); document in ops/finance notes and close.',
    };
  }
  if (absUsd < 25) {
    return {
      bucket: 'offset_future_payout',
      recommended_action: 'Recover via future Connect payout offset to the same account when policy allows.',
    };
  }
  return {
    bucket: 'manual_recovery_review',
    recommended_action: 'Escalate to finance: Stripe recovery, reverse transfer, or negotiated settlement.',
  };
}

function rowToCsvLine(row: Record<string, string | number>): string {
  const cells = CSV_COLUMNS.map((col) => {
    const v = row[col] ?? '';
    const s = String(v);
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  });
  return cells.join(',');
}

function auditRowToCsvRecord(r: AuditRow): Record<string, string | number> {
  const absC = absDeltaCents(r.delta_actual_minus_expected_cents);
  const absUsd = absC / 100;
  const { bucket, recommended_action } = remediationFromAbsDeltaUsd(absUsd);
  return {
    booking_id: r.booking_id,
    actual_transfer_cents: r.actual_transfer_cents,
    expected_transfer_cents: r.expected_transfer_cents,
    delta_actual_minus_expected_cents: r.delta_actual_minus_expected_cents,
    actual_transfer_usd: centsToUsd(r.actual_transfer_cents),
    expected_transfer_usd: centsToUsd(r.expected_transfer_cents),
    delta_actual_minus_expected_usd: (r.delta_actual_minus_expected_cents / 100).toFixed(2),
    actual_transfer_source: r.actual_transfer_source,
    customer_total_cents: r.customer_total_cents,
    resolved_subtotal_cents: r.resolved_subtotal_cents,
    resolved_marketplace_fees_cents: r.resolved_marketplace_fees_cents,
    platform_gross_retained_cents: r.platform_gross_retained_cents,
    bucket,
    recommended_action,
    flags: JSON.stringify(r.flags ?? {}),
  };
}

function writeCsv(filePath: string, rows: AuditRow[]): void {
  const header = CSV_COLUMNS.join(',');
  const lines = [header, ...rows.map((r) => rowToCsvLine(auditRowToCsvRecord(r)))];
  fs.writeFileSync(filePath, lines.join('\r\n') + '\r\n', 'utf8');
}

function main(): void {
  const inputArg = process.argv[2];
  const inputPath = path.resolve(process.cwd(), inputArg ?? 'payout-audit-full.json');

  if (!fs.existsSync(inputPath)) {
    console.error(`Input not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  const data = JSON.parse(raw) as FullAuditJson;

  const definite = Array.isArray(data.definite_overpayments) ? data.definite_overpayments : [];
  const manual = Array.isArray(data.needs_manual_review) ? [...data.needs_manual_review] : [];

  manual.sort(
    (a, b) =>
      absDeltaCents(b.delta_actual_minus_expected_cents) -
      absDeltaCents(a.delta_actual_minus_expected_cents)
  );

  const outDir = path.dirname(inputPath);
  const overPath = path.join(outDir, 'payout-audit-definite-overpayments.csv');
  const manualPath = path.join(outDir, 'payout-audit-needs-manual-review-sorted.csv');
  const summaryPath = path.join(outDir, 'payout-audit-review-summary.json');

  writeCsv(overPath, definite);
  writeCsv(manualPath, manual);

  let exposureCents = 0;
  for (const r of definite) {
    exposureCents += Math.max(0, Math.round(r.delta_actual_minus_expected_cents));
  }

  const countByAction: Record<string, number> = {};
  const tally = (rows: AuditRow[]) => {
    for (const r of rows) {
      const absUsd = absDeltaCents(r.delta_actual_minus_expected_cents) / 100;
      const { bucket } = remediationFromAbsDeltaUsd(absUsd);
      countByAction[bucket] = (countByAction[bucket] ?? 0) + 1;
    }
  };
  tally(definite);
  tally(manual);

  const top10 = manual.slice(0, 10).map((r) => ({
    booking_id: r.booking_id,
    delta_actual_minus_expected_cents: r.delta_actual_minus_expected_cents,
    delta_abs_cents: absDeltaCents(r.delta_actual_minus_expected_cents),
    delta_actual_minus_expected_usd: (r.delta_actual_minus_expected_cents / 100).toFixed(2),
    delta_abs_usd: (absDeltaCents(r.delta_actual_minus_expected_cents) / 100).toFixed(2),
  }));

  const summaryOut = {
    total_definite_overpayments_count: definite.length,
    total_definite_overpayments_exposure_cents: exposureCents,
    total_definite_overpayments_exposure_usd: (exposureCents / 100).toFixed(2),
    total_needs_manual_review_count: manual.length,
    top_10_largest_manual_review_abs_deltas: top10,
    count_by_recommended_action: countByAction,
  };

  fs.writeFileSync(summaryPath, JSON.stringify(summaryOut, null, 2) + '\n', 'utf8');

  console.log(
    JSON.stringify(
      {
        wrote: [overPath, manualPath, summaryPath],
        ...summaryOut,
      },
      null,
      2
    )
  );
}

main();
