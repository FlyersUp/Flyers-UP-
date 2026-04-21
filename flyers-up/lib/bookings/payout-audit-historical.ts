/**
 * One-time / periodic historical payout audit: compare resolved economics vs recorded Stripe transfer amounts.
 * Read-only — does not mutate bookings.
 */

import { computeNetToPro } from '@/lib/bookings/money';
import {
  resolveMarketplaceFeesRetainedCents,
  resolveProPayoutTransferCents,
  resolveProServiceSubtotalCents,
  sumMarketplaceFeeComponents,
  type BookingEconomicsRow,
} from '@/lib/bookings/booking-payout-economics';

const CENTS_TOLERANCE = 2;

export type PayoutAuditSourceFields = {
  has_fee_total_cents: boolean;
  has_service_fee_cents: boolean;
  has_convenience_fee_cents: boolean;
  has_protection_fee_cents: boolean;
  has_demand_fee_cents: boolean;
  has_subtotal_cents: boolean;
  has_pro_earnings_cents: boolean;
  has_amount_subtotal: boolean;
  has_customer_fees_retained_cents: boolean;
  has_platform_fee_cents: boolean;
  has_amount_platform_fee: boolean;
};

export type PayoutAuditFlags = {
  /** actual transfer > resolved expected */
  actual_over_expected: boolean;
  /** customer_net - actual_transfer < resolved marketplace fees (platform kept less than pricing snapshot) */
  platform_gross_below_expected_fees: boolean;
  /** fee_total_cents set and differs materially from legacy single-field chain */
  legacy_fee_mismatch_vs_fee_total: boolean;
  /** uncapped net (resolved fees) exceeded pro subtotal but transfer matches uncapped (cap should have applied) */
  subtotal_cap_would_have_reduced_payout: boolean;
};

export type PayoutAuditBucket = 'definite_overpayment' | 'likely_safe' | 'needs_manual_review';

export type HistoricalPayoutAuditRecord = {
  booking_id: string;
  customer_total_cents: number;
  customer_net_cents: number;
  resolved_subtotal_cents: number;
  resolved_marketplace_fees_cents: number;
  uncapped_net_with_resolved_fees_cents: number;
  expected_transfer_cents: number;
  actual_transfer_cents: number;
  actual_transfer_source: 'booking_payouts.amount_cents' | 'bookings.transferred_total_cents' | 'bookings.payout_amount_cents' | 'unknown';
  delta_actual_minus_expected_cents: number;
  platform_gross_retained_cents: number;
  flags: PayoutAuditFlags;
  bucket: PayoutAuditBucket;
  source_fields: PayoutAuditSourceFields;
  fee_total_cents: number | null;
  legacy_fee_chain_cents: number;
  component_fees_sum_cents: number;
  resolution_warnings: string[];
};

export type PayoutAuditSummary = {
  row_count: number;
  definite_overpayment: { count: number; total_overpayment_cents: number };
  likely_safe: { count: number };
  needs_manual_review: { count: number };
  /** Sum of positive deltas (actual − expected) for definite overpayments only */
  exposure_overpayment_cents: number;
};

function nonNegInt(x: unknown): number {
  const n = Math.round(Number(x) || 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Legacy single-field fee bucket (before implied / fee_total / component aggregation). */
export function legacyFeeChainCents(row: BookingEconomicsRow): number {
  return nonNegInt(row.customer_fees_retained_cents ?? row.platform_fee_cents ?? row.amount_platform_fee);
}

export function sourceFieldsPresent(row: Record<string, unknown>): PayoutAuditSourceFields {
  const has = (k: string) => row[k] != null && Number.isFinite(Number(row[k]));
  return {
    has_fee_total_cents: has('fee_total_cents'),
    has_service_fee_cents: has('service_fee_cents'),
    has_convenience_fee_cents: has('convenience_fee_cents'),
    has_protection_fee_cents: has('protection_fee_cents'),
    has_demand_fee_cents: has('demand_fee_cents'),
    has_subtotal_cents: has('subtotal_cents'),
    has_pro_earnings_cents: has('pro_earnings_cents'),
    has_amount_subtotal: has('amount_subtotal'),
    has_customer_fees_retained_cents: has('customer_fees_retained_cents'),
    has_platform_fee_cents: has('platform_fee_cents'),
    has_amount_platform_fee: has('amount_platform_fee'),
  };
}

/**
 * Coalesce actual transfer from booking_payouts row or bookings columns (same precedence as ops review).
 */
export function resolveActualTransferCents(input: {
  booking_payouts_amount_cents?: number | null;
  transferred_total_cents?: number | null;
  payout_amount_cents?: number | null;
}): { cents: number; source: HistoricalPayoutAuditRecord['actual_transfer_source'] } {
  const bp = nonNegInt(input.booking_payouts_amount_cents);
  if (bp > 0) return { cents: bp, source: 'booking_payouts.amount_cents' };
  const tt = nonNegInt(input.transferred_total_cents);
  if (tt > 0) return { cents: tt, source: 'bookings.transferred_total_cents' };
  const pa = nonNegInt(input.payout_amount_cents);
  if (pa > 0) return { cents: pa, source: 'bookings.payout_amount_cents' };
  return { cents: 0, source: 'unknown' };
}

export function bookingRowToEconomicsRow(row: Record<string, unknown>): BookingEconomicsRow {
  return {
    total_amount_cents: row.total_amount_cents as number | null,
    amount_total: row.amount_total as number | null,
    customer_total_cents: row.customer_total_cents as number | null,
    fee_total_cents: row.fee_total_cents as number | null,
    service_fee_cents: row.service_fee_cents as number | null,
    convenience_fee_cents: row.convenience_fee_cents as number | null,
    protection_fee_cents: row.protection_fee_cents as number | null,
    demand_fee_cents: row.demand_fee_cents as number | null,
    subtotal_cents: row.subtotal_cents as number | null,
    pro_earnings_cents: row.pro_earnings_cents as number | null,
    customer_fees_retained_cents: row.customer_fees_retained_cents as number | null,
    platform_fee_cents: row.platform_fee_cents as number | null,
    amount_platform_fee: row.amount_platform_fee as number | null,
    refunded_total_cents: (row.amount_refunded_cents ?? row.refunded_total_cents) as number | null,
    amount_subtotal: row.amount_subtotal as number | null,
  };
}

export function auditOneHistoricalPayout(row: Record<string, unknown>): HistoricalPayoutAuditRecord | null {
  const id = String(row.id ?? '').trim();
  if (!id) return null;

  const econ = bookingRowToEconomicsRow(row);
  const customerTotal = Math.max(
    0,
    nonNegInt(econ.total_amount_cents ?? econ.amount_total)
  );
  const refunded = nonNegInt(econ.refunded_total_cents);
  const customerNet = Math.max(0, customerTotal - refunded);

  const feeRes = resolveMarketplaceFeesRetainedCents(econ);
  const payoutRes = resolveProPayoutTransferCents(econ);
  const proSub = resolveProServiceSubtotalCents(econ);
  const uncapped = computeNetToPro(customerTotal, feeRes.feeCents, refunded);

  const actual = resolveActualTransferCents({
    booking_payouts_amount_cents: row.booking_payouts_amount_cents as number | null | undefined,
    transferred_total_cents: row.transferred_total_cents as number | null | undefined,
    payout_amount_cents: row.payout_amount_cents as number | null | undefined,
  });

  const expected = payoutRes.payoutCents;
  const delta = actual.cents - expected;
  const platformGrossRetained = Math.max(0, customerNet - actual.cents);

  const feeTotal = nonNegInt(econ.fee_total_cents);
  const legacy = legacyFeeChainCents(econ);
  const componentSum = sumMarketplaceFeeComponents(econ);

  const flags: PayoutAuditFlags = {
    actual_over_expected: actual.cents > expected + CENTS_TOLERANCE,
    platform_gross_below_expected_fees:
      platformGrossRetained + CENTS_TOLERANCE < feeRes.feeCents && feeRes.feeCents > 0,
    /** Both legacy chain and fee_total populated but disagree (missing legacy is a different issue). */
    legacy_fee_mismatch_vs_fee_total:
      feeTotal > 0 && legacy > 0 && Math.abs(feeTotal - legacy) > 5,
    subtotal_cap_would_have_reduced_payout:
      proSub > 0 &&
      uncapped > proSub + CENTS_TOLERANCE &&
      Math.abs(actual.cents - uncapped) <= CENTS_TOLERANCE &&
      Math.abs(expected - proSub) <= CENTS_TOLERANCE,
  };

  const underPaidPro =
    expected > 0 && actual.cents + CENTS_TOLERANCE < expected && actual.cents > 0;

  let bucket: PayoutAuditBucket = 'needs_manual_review';
  if (flags.actual_over_expected) {
    bucket = 'definite_overpayment';
  } else if (
    Math.abs(delta) <= CENTS_TOLERANCE &&
    !underPaidPro &&
    !flags.platform_gross_below_expected_fees &&
    !flags.legacy_fee_mismatch_vs_fee_total &&
    !flags.subtotal_cap_would_have_reduced_payout
  ) {
    bucket = 'likely_safe';
  } else {
    bucket = 'needs_manual_review';
  }

  const ft = row.fee_total_cents;
  return {
    booking_id: id,
    customer_total_cents: customerTotal,
    customer_net_cents: customerNet,
    resolved_subtotal_cents: proSub,
    resolved_marketplace_fees_cents: feeRes.feeCents,
    uncapped_net_with_resolved_fees_cents: uncapped,
    expected_transfer_cents: expected,
    actual_transfer_cents: actual.cents,
    actual_transfer_source: actual.source,
    delta_actual_minus_expected_cents: delta,
    platform_gross_retained_cents: platformGrossRetained,
    flags,
    bucket,
    source_fields: sourceFieldsPresent(row),
    fee_total_cents: typeof ft === 'number' && Number.isFinite(ft) ? Math.round(ft) : null,
    legacy_fee_chain_cents: legacy,
    component_fees_sum_cents: componentSum,
    resolution_warnings: [...feeRes.warnings, ...payoutRes.warnings],
  };
}

export function summarizePayoutAudit(records: HistoricalPayoutAuditRecord[]): PayoutAuditSummary {
  let overCount = 0;
  let overCents = 0;
  let safe = 0;
  let review = 0;

  for (const r of records) {
    if (r.bucket === 'definite_overpayment') {
      overCount++;
      overCents += Math.max(0, r.delta_actual_minus_expected_cents);
    } else if (r.bucket === 'likely_safe') {
      safe++;
    } else {
      review++;
    }
  }

  return {
    row_count: records.length,
    definite_overpayment: { count: overCount, total_overpayment_cents: overCents },
    likely_safe: { count: safe },
    needs_manual_review: { count: review },
    exposure_overpayment_cents: overCents,
  };
}

export const REMEDIATION_OPTIONS_TEXT = [
  'Recover overpaid amount: Stripe Connect reverse transfer / clawback where Stripe policy allows, or offset against future payouts to the same connected account (document in booking notes).',
  'Customer / pro communication: if the error was one-sided, coordinate with support before debiting.',
  'Data repair: backfill fee_total_cents / customer_fees_retained_cents from authoritative pricing snapshot for reporting; do not change transferred_total_cents without finance sign-off.',
  'Prevent recurrence: ensure releasePayout uses resolveProPayoutTransferCents with full snapshot columns (already deployed in booking-payout-economics).',
].join(' ');
