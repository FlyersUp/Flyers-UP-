/**
 * Windowed money reconciliation report for admin weekly review.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  evaluateAdminStuckPayoutForBooking,
  findStuckPayoutBookings,
  isFinalPaymentSettledForStuckRow,
} from '@/lib/bookings/stuck-payout-detector';
import {
  buildMoneyReconciliationSnapshot,
  earliestIso,
  formatAgeBucketLabel,
  type MoneyReconciliationCategory,
  type MoneyReconciliationSnapshot,
} from '@/lib/bookings/money-reconciliation';
import { mergeQueueIntoSnapshots } from '@/lib/bookings/money-reconciliation-queue';

const RECON_WINDOW_BOOKING_SELECT = [
  'id',
  'created_at',
  'service_date',
  'status',
  'payment_status',
  'final_payment_status',
  'payment_lifecycle_status',
  'paid_deposit_at',
  'paid_remaining_at',
  'fully_paid_at',
  'payout_released',
  'payout_status',
  'payout_blocked',
  'payout_hold_reason',
  'requires_admin_review',
  'refund_status',
  'refund_after_payout',
  'pro_clawback_remediation_status',
  'stripe_outbound_recovery_status',
].join(', ');

/** Payment events that indicate an operational money issue (earliest wins for aging). */
const RECON_SIGNAL_PAYMENT_EVENT_TYPES = [
  'refund_batch_partial_failure',
  'refund_leg_failed',
  'admin_review_required',
  'remediation_required',
  'post_payout_refund_remediation_opened',
  'payout_blocked',
] as const;

/** Remediation ledger rows that anchor issue age. */
const RECON_SIGNAL_REMEDIATION_EVENT_TYPES = [
  'clawback_required',
  'refund_batch_partial_failure',
  'admin_review_required',
  'remediation_required',
  'post_payout_refund_remediation_opened',
] as const;

/** Hard cap for CSV / bulk export loads. */
export const RECONCILIATION_EXPORT_MAX_BOOKINGS = 2000;

/** `preset` query value: unresolved + issue age ≥ 7 days (weekly “red flag” export). */
export const RECONCILIATION_EXPORT_PRESET_WEEKLY_RED_FLAGS = 'weekly_red_flags';

export type MoneyReconciliationWindowOptions = {
  /** Default 30 when no explicit `fromIso` / `toIso` window. */
  days?: number;
  /** Inclusive lower bound on `bookings.created_at` (ISO). Overrides day-based `since` when set. */
  fromIso?: string | null;
  /** Inclusive upper bound on `bookings.created_at` (ISO). */
  toIso?: string | null;
  /** Max bookings loaded from DB for classification (default 500; export uses {@link RECONCILIATION_EXPORT_MAX_BOOKINGS}) */
  maxBookings?: number;
  /** When true, issue list excludes rows classified resolved in app truth. */
  unresolvedOnly?: boolean;
};

export type MoneyReconciliationWindowSummary = {
  windowDays: number;
  sinceIso: string;
  scannedBookingCount: number;
  deposit_paid_count: number;
  final_paid_count: number;
  refund_completed_count: number;
  refund_partial_failure_count: number;
  remediation_open_count: number;
  payout_sent_count: number;
  payout_blocked_count: number;
  manual_review_count: number;
  stuck_payout_count: number;
  healthy_count: number;
  needs_attention_count: number;
  byCategory: Record<MoneyReconciliationCategory, number>;
};

export type WeeklyFinancialHealth = {
  totalBookings: number;
  healthyPercent: number;
  issuesCount: number;
  unresolvedIssuesCount: number;
  oldestUnresolvedIssueAgeHours: number | null;
  mostCommonUnresolvedCategory: MoneyReconciliationCategory | null;
};

export type MoneyReconciliationWindowResult = {
  summary: MoneyReconciliationWindowSummary;
  weeklyHealth: WeeklyFinancialHealth;
  /** All scanned snapshots (includes healthy), priority-sorted for exports. */
  snapshots: MoneyReconciliationSnapshot[];
  /** Non-healthy, sorted by priority DESC then age DESC. */
  issueSnapshots: MoneyReconciliationSnapshot[];
};

function emptyCategoryCounts(): Record<MoneyReconciliationCategory, number> {
  return {
    healthy: 0,
    payment_state_mismatch: 0,
    refund_state_mismatch: 0,
    payout_state_mismatch: 0,
    partial_refund_attention: 0,
    remediation_open: 0,
    payout_blocked_attention: 0,
    needs_manual_review: 0,
    reconciliation_unknown: 0,
  };
}

function depositPaidRow(row: Record<string, unknown>): boolean {
  const ps = String(row.payment_status ?? '').toUpperCase();
  return ps === 'PAID' || Boolean(row.paid_deposit_at);
}

function finalPaidRow(row: Record<string, unknown>): boolean {
  const fps = String(row.final_payment_status ?? '').toUpperCase();
  const lc = String(row.payment_lifecycle_status ?? '').toLowerCase();
  return (
    fps === 'PAID' ||
    Boolean(row.paid_remaining_at) ||
    ['final_paid', 'payout_ready', 'payout_sent', 'payout_on_hold', 'refunded', 'partially_refunded'].includes(lc)
  );
}

function refundCompletedRow(row: Record<string, unknown>): boolean {
  const rs = String(row.refund_status ?? '').toLowerCase();
  const lc = String(row.payment_lifecycle_status ?? '').toLowerCase();
  return rs === 'succeeded' || lc === 'refunded';
}

function payoutSentRow(row: Record<string, unknown>): boolean {
  if (row.payout_released !== true) return false;
  const ps = String(row.payout_status ?? '').toLowerCase();
  return ps === 'paid' || ps === 'succeeded';
}

/**
 * Aggregate summary metrics from raw rows + per-booking reconciliation categories.
 * Exported for unit tests.
 */
export function computeMoneyReconciliationWindowSummary(input: {
  rows: Record<string, unknown>[];
  snapshots: MoneyReconciliationSnapshot[];
  stuckPayoutDetectorCount: number;
  windowDays: number;
  sinceIso: string;
}): MoneyReconciliationWindowSummary {
  const byCategory = emptyCategoryCounts();
  for (const s of input.snapshots) {
    byCategory[s.category] += 1;
  }

  let deposit_paid_count = 0;
  let final_paid_count = 0;
  let refund_completed_count = 0;
  let payout_sent_count = 0;
  let payout_blocked_count = 0;
  let manual_review_count = 0;

  for (const row of input.rows) {
    if (depositPaidRow(row)) deposit_paid_count += 1;
    if (finalPaidRow(row)) final_paid_count += 1;
    if (refundCompletedRow(row)) refund_completed_count += 1;
    if (payoutSentRow(row)) payout_sent_count += 1;
    if (row.payout_blocked === true) payout_blocked_count += 1;
    if (row.requires_admin_review === true) manual_review_count += 1;
  }

  const refund_partial_failure_count = byCategory.partial_refund_attention;
  const remediation_open_count = byCategory.remediation_open;

  const healthy_count = byCategory.healthy;
  const needs_attention_count = input.snapshots.filter((s) => s.category !== 'healthy').length;

  return {
    windowDays: input.windowDays,
    sinceIso: input.sinceIso,
    scannedBookingCount: input.rows.length,
    deposit_paid_count,
    final_paid_count,
    refund_completed_count,
    refund_partial_failure_count,
    remediation_open_count,
    payout_sent_count,
    payout_blocked_count,
    manual_review_count,
    stuck_payout_count: input.stuckPayoutDetectorCount,
    healthy_count,
    needs_attention_count,
    byCategory,
  };
}

/** “This week’s financial health” panel. Exported for tests. */
export function computeWeeklyFinancialHealth(snapshots: MoneyReconciliationSnapshot[]): WeeklyFinancialHealth {
  const totalBookings = snapshots.length;
  const healthy = snapshots.filter((s) => s.category === 'healthy').length;
  const issues = snapshots.filter((s) => s.category !== 'healthy');
  const unresolved = issues.filter((s) => !s.resolved);
  const oldestUnresolvedIssueAgeHours =
    unresolved.length === 0
      ? null
      : Math.max(...unresolved.map((s) => s.ageInHours ?? 0));
  const catCounts = new Map<MoneyReconciliationCategory, number>();
  for (const s of unresolved) {
    catCounts.set(s.category, (catCounts.get(s.category) ?? 0) + 1);
  }
  let mostCommonUnresolvedCategory: MoneyReconciliationCategory | null = null;
  let best = 0;
  for (const [c, n] of catCounts) {
    if (n > best) {
      best = n;
      mostCommonUnresolvedCategory = c;
    }
  }
  return {
    totalBookings,
    healthyPercent: totalBookings > 0 ? Math.round((healthy / totalBookings) * 1000) / 10 : 0,
    issuesCount: issues.length,
    unresolvedIssuesCount: unresolved.length,
    oldestUnresolvedIssueAgeHours,
    mostCommonUnresolvedCategory,
  };
}

type LatestEv = {
  event_type: string;
  created_at: string;
  phase: string;
  status: string;
};

function latestEventMapFromRows(rows: { booking_id: string; event_type: string; created_at: string; phase: string; status: string }[]): Map<string, LatestEv> {
  const m = new Map<string, LatestEv>();
  for (const r of rows) {
    const bid = String(r.booking_id ?? '');
    if (!bid || m.has(bid)) continue;
    m.set(bid, {
      event_type: r.event_type,
      created_at: r.created_at,
      phase: r.phase,
      status: r.status,
    });
  }
  return m;
}

/**
 * Earliest signal timestamp per booking from payment + remediation append-only tables.
 */
export async function fetchEarliestMoneyIssueSignals(
  admin: SupabaseClient,
  bookingIds: string[]
): Promise<Map<string, string>> {
  const merged = new Map<string, string>();
  if (bookingIds.length === 0) return merged;

  const { data: payRows } = await admin
    .from('booking_payment_events')
    .select('booking_id, created_at, event_type')
    .in('booking_id', bookingIds)
    .in('event_type', [...RECON_SIGNAL_PAYMENT_EVENT_TYPES])
    .order('created_at', { ascending: true });

  for (const r of payRows ?? []) {
    const bid = String((r as { booking_id: string }).booking_id ?? '');
    const iso = String((r as { created_at: string }).created_at ?? '');
    if (!bid || !iso) continue;
    if (!merged.has(bid)) merged.set(bid, iso);
  }

  const { data: remRows } = await admin
    .from('booking_refund_remediation_events')
    .select('booking_id, created_at, event_type')
    .in('booking_id', bookingIds)
    .in('event_type', [...RECON_SIGNAL_REMEDIATION_EVENT_TYPES])
    .order('created_at', { ascending: true });

  for (const r of remRows ?? []) {
    const bid = String((r as { booking_id: string }).booking_id ?? '');
    const iso = String((r as { created_at: string }).created_at ?? '');
    if (!bid || !iso) continue;
    const prev = merged.get(bid);
    const chosen = earliestIso([prev ?? null, iso]);
    if (chosen) merged.set(bid, chosen);
  }

  return merged;
}

/** Priority DESC, then age DESC — weekly ops sort. Exported for tests. */
export function compareReconciliationSnapshotsForOps(
  a: MoneyReconciliationSnapshot,
  b: MoneyReconciliationSnapshot
): number {
  if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
  return (b.ageInHours ?? 0) - (a.ageInHours ?? 0);
}

export type ReconciliationExportFilters = {
  category?: MoneyReconciliationCategory | null;
  unresolvedOnly?: boolean;
  /** Minimum snapshot age in whole days (`ageInHours` must be >= `minAgeDays * 24`). */
  minAgeDays?: number;
};

/**
 * Apply export / UI filters without mutating input. Sorts by ops comparator.
 */
export function filterSnapshotsForReconciliationExport(
  snapshots: MoneyReconciliationSnapshot[],
  filters: ReconciliationExportFilters
): MoneyReconciliationSnapshot[] {
  let out = [...snapshots].sort(compareReconciliationSnapshotsForOps);
  if (filters.category) {
    out = out.filter((s) => s.category === filters.category);
  }
  if (filters.unresolvedOnly) {
    out = out.filter((s) => s.category !== 'healthy' && !s.resolved);
  }
  if (filters.minAgeDays != null && filters.minAgeDays > 0) {
    const minH = filters.minAgeDays * 24;
    out = out.filter((s) => (s.ageInHours ?? 0) >= minH);
  }
  return out;
}

function csvEscape(s: string): string {
  const t = String(s ?? '');
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

/**
 * CSV for export (header + one row per snapshot). Columns match weekly ops checklist. Exported for tests.
 */
export function formatMoneyReconciliationCsv(snapshots: MoneyReconciliationSnapshot[]): string {
  const header = [
    'booking_id',
    'booking_reference',
    'category',
    'reason',
    'recommended_next_action',
    'age_bucket',
    'created_at',
    'latest_money_event',
    'payout_status',
    'refund_status',
    'assigned_to',
    'assigned_to_label',
    'last_reviewed_at',
    'ops_note',
  ];
  const lines = [header.join(',')];
  for (const s of snapshots) {
    const latest = s.latestMoneyEvent
      ? `${s.latestMoneyEvent.type}@${s.latestMoneyEvent.createdAt}`
      : '';
    lines.push(
      [
        csvEscape(s.bookingId),
        csvEscape(s.bookingReference ?? ''),
        csvEscape(s.category),
        csvEscape(s.reason),
        csvEscape(s.recommendedNextAction),
        csvEscape(formatAgeBucketLabel(s.ageBucket)),
        csvEscape(s.createdAt ?? ''),
        csvEscape(latest),
        csvEscape(s.payoutStatus),
        csvEscape(s.refundStatus),
        csvEscape(s.assignedToUserId ?? ''),
        csvEscape(s.assignedToLabel ?? ''),
        csvEscape(s.lastReviewedAt ?? ''),
        csvEscape(s.opsNote ?? ''),
      ].join(',')
    );
  }
  return lines.join('\r\n');
}

/**
 * Shared loader for page + CSV export.
 */
export async function loadMoneyReconciliationWindow(
  admin: SupabaseClient,
  opts: MoneyReconciliationWindowOptions = {}
): Promise<MoneyReconciliationWindowResult> {
  const days = opts.days ?? 30;
  const maxBookings = opts.maxBookings ?? 500;
  const fromTrim = opts.fromIso?.trim() || '';
  const toTrim = opts.toIso?.trim() || '';
  let sinceIso: string;
  if (fromTrim) {
    sinceIso = fromTrim;
  } else if (toTrim) {
    const toMs = Date.parse(toTrim);
    const base = Number.isFinite(toMs) ? toMs : Date.now();
    sinceIso = new Date(base - days * 86400000).toISOString();
  } else {
    sinceIso = new Date(Date.now() - days * 86400000).toISOString();
  }

  let bookingQuery = admin
    .from('bookings')
    .select(RECON_WINDOW_BOOKING_SELECT)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(maxBookings);
  if (toTrim && Number.isFinite(Date.parse(toTrim))) {
    bookingQuery = bookingQuery.lte('created_at', toTrim);
  }

  const { data: bookingRows, error: bErr } = await bookingQuery;

  if (bErr) {
    console.warn('[money-reconciliation-report] bookings query failed', bErr);
    const emptySummary = computeMoneyReconciliationWindowSummary({
      rows: [],
      snapshots: [],
      stuckPayoutDetectorCount: 0,
      windowDays: days,
      sinceIso,
    });
    const emptyHealth = computeWeeklyFinancialHealth([]);
    return {
      summary: emptySummary,
      weeklyHealth: emptyHealth,
      snapshots: [],
      issueSnapshots: [],
    };
  }

  const rows = (bookingRows ?? []) as unknown as Record<string, unknown>[];
  const ids = rows.map((r) => String(r.id ?? '')).filter(Boolean);

  const signalMap = await fetchEarliestMoneyIssueSignals(admin, ids);

  let evQuery: { booking_id: string; event_type: string; created_at: string; phase: string; status: string }[] = [];
  if (ids.length > 0) {
    const { data: evs } = await admin
      .from('booking_payment_events')
      .select('booking_id, event_type, created_at, phase, status')
      .in('booking_id', ids)
      .order('created_at', { ascending: false });
    evQuery = (evs ?? []) as typeof evQuery;
  }
  const latestByBooking = latestEventMapFromRows(evQuery);

  const snapshots: MoneyReconciliationSnapshot[] = [];
  for (const row of rows) {
    const id = String(row.id ?? '');
    if (!id) continue;

    let stuck = null;
    if (row.payout_released !== true && isFinalPaymentSettledForStuckRow(row as { payment_lifecycle_status?: string | null; final_payment_status?: string | null })) {
      stuck = await evaluateAdminStuckPayoutForBooking(admin, id);
    }

    const latest = latestByBooking.get(id) ?? null;
    const earliestSignal = signalMap.get(id) ?? null;
    snapshots.push(
      buildMoneyReconciliationSnapshot({
        booking: row,
        latestMoneyEvent: latest,
        stuckPayout: stuck,
        earliestSignalIso: earliestSignal,
      })
    );
  }

  snapshots.sort(compareReconciliationSnapshotsForOps);

  const snapshotsWithQueue = await mergeQueueIntoSnapshots(admin, snapshots);

  let stuckDetectorCount = 0;
  try {
    const stuckList = await findStuckPayoutBookings(admin, { limit: 80, maxScan: 200 });
    stuckDetectorCount = stuckList.length;
  } catch {
    stuckDetectorCount = 0;
  }

  const summary = computeMoneyReconciliationWindowSummary({
    rows,
    snapshots: snapshotsWithQueue,
    stuckPayoutDetectorCount: stuckDetectorCount,
    windowDays: days,
    sinceIso,
  });

  const weeklyHealth = computeWeeklyFinancialHealth(snapshotsWithQueue);

  let issueSnapshots = snapshotsWithQueue
    .filter((s) => s.category !== 'healthy')
    .sort(compareReconciliationSnapshotsForOps);
  if (opts.unresolvedOnly) {
    issueSnapshots = issueSnapshots.filter((s) => !s.resolved);
  }

  return { summary, weeklyHealth, snapshots: snapshotsWithQueue, issueSnapshots };
}
