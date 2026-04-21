/**
 * Detects bookings where remainder money is settled and automatic payout *should* have run
 * (same eligibility as payout-release cron) but `payout_released` is still false after a grace period.
 *
 * Use for admin visibility and cron warnings — not a substitute for fixing root cause in cron/selection.
 * Candidate discovery uses {@link payoutReleaseCronCandidateOrFilter} (aligned with the payout-release cron).
 * Rows that are **paid in Stripe/DB** but sit in a non-scanned lifecycle state may still need a future
 * “money reconciliation” or broader stuck scan; see ops runbooks.
 *
 * **Threshold:** `STUCK_PAYOUT_THRESHOLD_HOURS` (default 6). Age is measured from `payout_eligible_at` when set,
 * otherwise `paid_remaining_at`. Customer final-review must be over: `customer_review_deadline_at` absent or ≤ now.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { payoutReleaseCronCandidateOrFilter } from '@/lib/bookings/payout-release-cron-selection';
import { getPayoutReleaseEligibilitySnapshot } from '@/lib/bookings/payout-release-eligibility-snapshot';
import { recordServerErrorEvent } from '@/lib/serverError';

/** Default: remainder settled and still unreleased 6h after reference time (override with STUCK_PAYOUT_THRESHOLD_HOURS). */
export const DEFAULT_STUCK_PAYOUT_THRESHOLD_MS = 6 * 60 * 60 * 1000;

export type StuckPayoutBooking = {
  bookingId: string;
  status: string;
  paymentLifecycleStatus: string | null;
  completedAt: string | null;
  customerReviewDeadlineAt: string | null;
  reason: string;
};

export type FindStuckPayoutBookingsOptions = {
  now?: Date;
  thresholdMs?: number;
  /** Max candidate rows loaded from DB (each may trigger one eligibility snapshot). */
  maxScan?: number;
  /** Max stuck rows returned. */
  limit?: number;
};

export function stuckPayoutThresholdMsFromEnv(): number {
  const raw = process.env.STUCK_PAYOUT_THRESHOLD_HOURS;
  if (raw == null || raw === '') return DEFAULT_STUCK_PAYOUT_THRESHOLD_MS;
  const h = Number(raw);
  if (!Number.isFinite(h) || h < 0.5) return DEFAULT_STUCK_PAYOUT_THRESHOLD_MS;
  return h * 60 * 60 * 1000;
}

function parseMs(iso: string | null | undefined): number | null {
  if (iso == null || String(iso).trim() === '') return null;
  const t = Date.parse(String(iso));
  return Number.isFinite(t) ? t : null;
}

/** Mirrors payout snapshot “final settled” without importing private helper. */
export function isFinalPaymentSettledForStuckRow(row: {
  payment_lifecycle_status?: string | null;
  final_payment_status?: string | null;
}): boolean {
  const lc = String(row.payment_lifecycle_status ?? '');
  const legacy = String(row.final_payment_status ?? '').toUpperCase() === 'PAID';
  return (
    lc === 'paid' || ['final_paid', 'payout_ready', 'payout_sent'].includes(lc) || legacy
  );
}

/**
 * Pure gate: customer final-review window is over (or unknown / not applicable).
 * When `customer_review_deadline_at` is set, it must be <= now. When unset, we rely on
 * `payout_eligible_at` or age from `paid_remaining_at` only after snapshot says eligible.
 */
export function customerReviewWindowPassedForStuck(
  customerReviewDeadlineAt: string | null | undefined,
  nowMs: number
): boolean {
  const d = parseMs(customerReviewDeadlineAt ?? null);
  if (d == null) return true;
  return d <= nowMs;
}

/**
 * Reference clock for “how long has automatic release been overdue?”.
 * Prefer `payout_eligible_at` (set when lifecycle becomes payout-ready); else remainder paid time.
 */
export function stuckPayoutReferenceTimeMs(row: {
  payout_eligible_at?: string | null;
  paid_remaining_at?: string | null;
}): number | null {
  return parseMs(row.payout_eligible_at ?? null) ?? parseMs(row.paid_remaining_at ?? null);
}

export function passesStuckAgeGate(
  row: { payout_eligible_at?: string | null; paid_remaining_at?: string | null },
  nowMs: number,
  thresholdMs: number
): boolean {
  const ref = stuckPayoutReferenceTimeMs(row);
  if (ref == null) return false;
  return nowMs - ref >= thresholdMs;
}

function buildStuckReason(row: Record<string, unknown>, refMs: number): string {
  const lc = String(row.payment_lifecycle_status ?? '');
  const refIso = new Date(refMs).toISOString();
  return (
    `Eligible for automatic Connect payout (lifecycle ${lc || 'unknown'}) since ${refIso}, ` +
    `but payout_released is still false — check cron logs, Stripe transfer errors, or selection filters.`
  );
}

/**
 * Row shape after DB prefilter; `snapEligible` comes from {@link getPayoutReleaseEligibilitySnapshot}.
 * Exported for unit tests.
 */
export function evaluateStuckPayoutFromPrefilteredRow(args: {
  row: Record<string, unknown>;
  snapEligible: boolean;
  nowMs: number;
  thresholdMs: number;
}): StuckPayoutBooking | null {
  const { row, snapEligible, nowMs, thresholdMs } = args;
  if (row.payout_released === true) return null;
  if (row.requires_admin_review === true) return null;
  const refund = String(row.refund_status ?? '').toLowerCase();
  if (refund === 'succeeded' || refund === 'pending') return null;
  if (row.admin_hold === true) return null;
  const dispute = String(row.dispute_status ?? '').trim().toLowerCase();
  if (row.dispute_open === true || (dispute !== '' && dispute !== 'none')) return null;
  const lc = String(row.payment_lifecycle_status ?? '');
  if (lc === 'payout_on_hold') return null;
  if (row.payout_blocked === true) return null;
  if (!isFinalPaymentSettledForStuckRow(row)) return null;
  if (!snapEligible) return null;
  if (!customerReviewWindowPassedForStuck(String(row.customer_review_deadline_at ?? '') || null, nowMs)) {
    return null;
  }
  if (!passesStuckAgeGate(row, nowMs, thresholdMs)) return null;

  const refMs = stuckPayoutReferenceTimeMs(row);
  if (refMs == null) return null;

  return {
    bookingId: String(row.id ?? ''),
    status: String(row.status ?? ''),
    paymentLifecycleStatus: row.payment_lifecycle_status != null ? String(row.payment_lifecycle_status) : null,
    completedAt: row.completed_at != null ? String(row.completed_at) : null,
    customerReviewDeadlineAt:
      row.customer_review_deadline_at != null ? String(row.customer_review_deadline_at) : null,
    reason: buildStuckReason(row, refMs),
  };
}

const STUCK_CANDIDATE_SELECT = [
  'id',
  /** `bookings.status` — display / support only; stuck logic does not filter on it. */
  'status',
  'completed_at',
  'customer_review_deadline_at',
  'paid_remaining_at',
  'payout_eligible_at',
  'payout_released',
  'requires_admin_review',
  'refund_status',
  'dispute_status',
  'dispute_open',
  'admin_hold',
  'payment_lifecycle_status',
  'final_payment_status',
  'payout_blocked',
].join(', ');

/**
 * Loads payout-release cron-shaped candidates, then re-checks eligibility with the same snapshot
 * used by {@link runPayoutReleaseCron}. Rows that are eligible but still unreleased past the threshold
 * are “stuck”.
 */
export async function findStuckPayoutBookings(
  admin: SupabaseClient,
  opts: FindStuckPayoutBookingsOptions = {}
): Promise<StuckPayoutBooking[]> {
  const now = opts.now ?? new Date();
  const nowMs = now.getTime();
  const thresholdMs = opts.thresholdMs ?? stuckPayoutThresholdMsFromEnv();
  const maxScan = opts.maxScan ?? 200;
  const limit = opts.limit ?? 25;

  const { data: rows, error } = await admin
    .from('bookings')
    .select(STUCK_CANDIDATE_SELECT)
    .or(payoutReleaseCronCandidateOrFilter())
    .eq('payout_released', false)
    .or('requires_admin_review.is.null,requires_admin_review.eq.false')
    .not('refund_status', 'eq', 'pending')
    .not('refund_status', 'eq', 'succeeded')
    .or('admin_hold.is.null,admin_hold.eq.false')
    .or('dispute_open.is.null,dispute_open.eq.false')
    .or('dispute_status.is.null,dispute_status.eq.none')
    .not('paid_deposit_at', 'is', null)
    .not('paid_remaining_at', 'is', null)
    .not('payment_lifecycle_status', 'eq', 'payout_on_hold')
    .limit(maxScan);

  if (error) {
    console.warn('[stuck-payout-detector] candidate query failed', error);
    return [];
  }

  const out: StuckPayoutBooking[] = [];

  for (const raw of rows ?? []) {
    if (out.length >= limit) break;
    const row = raw as unknown as Record<string, unknown>;
    const id = String(row.id ?? '');
    if (!id) continue;

    if (!passesStuckAgeGate(row, nowMs, thresholdMs)) continue;
    if (!customerReviewWindowPassedForStuck(String(row.customer_review_deadline_at ?? '') || null, nowMs)) {
      continue;
    }
    if (row.payout_blocked === true) continue;

    const snap = await getPayoutReleaseEligibilitySnapshot(admin, id, { initiatedByAdmin: false });
    const stuck = evaluateStuckPayoutFromPrefilteredRow({
      row,
      snapEligible: snap.eligible,
      nowMs,
      thresholdMs,
    });
    if (stuck) out.push(stuck);
  }

  return out;
}

/** Log + optional `error_events` row when stuck payouts exist (cron monitoring). */
export async function warnStuckPayoutsForCron(
  admin: SupabaseClient,
  opts: FindStuckPayoutBookingsOptions & { route?: string } = {}
): Promise<{ stuck: StuckPayoutBooking[] }> {
  const stuck = await findStuckPayoutBookings(admin, opts);
  if (stuck.length === 0) return { stuck };

  const ids = stuck.map((s) => s.bookingId);
  console.warn('[stuck-payout-detector] possible silent payout failure', {
    count: stuck.length,
    booking_ids: ids,
  });

  void recordServerErrorEvent({
    severity: 'warn',
    message: `Stuck payout detector: ${stuck.length} booking(s) eligible for auto-release but still unreleased past threshold`,
    route: opts.route ?? '/api/cron/bookings/payout-release',
    meta: {
      kind: 'stuck_payout_detector',
      count: stuck.length,
      booking_ids: ids.slice(0, 40),
    },
  });

  return { stuck };
}

/**
 * Same stuck evaluation as the cron detector, for a single booking on admin surfaces.
 */
export async function evaluateAdminStuckPayoutForBooking(
  admin: SupabaseClient,
  bookingId: string,
  opts?: { now?: Date; thresholdMs?: number }
): Promise<StuckPayoutBooking | null> {
  const { data: row, error } = await admin
    .from('bookings')
    .select(STUCK_CANDIDATE_SELECT)
    .eq('id', bookingId)
    .maybeSingle();
  if (error || !row) return null;

  const r = row as unknown as Record<string, unknown>;
  const now = opts?.now ?? new Date();
  const nowMs = now.getTime();
  const thresholdMs = opts?.thresholdMs ?? stuckPayoutThresholdMsFromEnv();
  const snap = await getPayoutReleaseEligibilitySnapshot(admin, bookingId, { initiatedByAdmin: false });
  return evaluateStuckPayoutFromPrefilteredRow({
    row: r,
    snapEligible: snap.eligible,
    nowMs,
    thresholdMs,
  });
}
