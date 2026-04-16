/**
 * App-truth money reconciliation: composes booking row + payment events + stuck detector
 * with {@link buildAdminMoneyControlState} — no competing lifecycle rules.
 */

import type { StuckPayoutBooking } from '@/lib/bookings/stuck-payout-detector';
import {
  buildAdminMoneyControlState,
  bookingNeedsRemediationAttention,
  type AdminMoneyControlState,
} from '@/lib/bookings/admin-money-control-state';

export type MoneyReconciliationCategory =
  | 'healthy'
  | 'payment_state_mismatch'
  | 'refund_state_mismatch'
  | 'payout_state_mismatch'
  | 'partial_refund_attention'
  | 'remediation_open'
  | 'payout_blocked_attention'
  | 'needs_manual_review'
  | 'reconciliation_unknown';

/** Age buckets for ops triage (from first detected signal). */
export type MoneyReconciliationAgeBucket = 'lt_24h' | 'd1_3' | 'd3_7' | 'd7_14' | 'd14_plus';

export type MoneyReconciliationSnapshot = {
  bookingId: string;
  bookingReference: string | null;
  paymentLifecycleStatus: string;
  refundStatus: string;
  payoutStatus: string;
  payoutReleased: boolean;
  payoutBlocked: boolean;
  requiresAdminReview: boolean;
  latestMoneyEvent: { type: string; createdAt: string; phase: string; status: string } | null;
  category: MoneyReconciliationCategory;
  reason: string;
  recommendedNextAction: string;
  /** ISO — booking row */
  createdAt: string | null;
  /** Earliest relevant money signal (payment/remediation) or booking created_at fallback. */
  firstDetectedAt: string | null;
  ageInHours: number;
  ageBucket: MoneyReconciliationAgeBucket;
  /** Higher = more urgent for weekly review sorting. */
  priorityScore: number;
  priorityTier: 'high' | 'medium' | 'low';
  /** True when app state no longer matches the issue category (filter “Unresolved only”). */
  resolved: boolean;
  /** Admin queue (`booking_money_reconciliation_ops`) — nulls when no row. */
  assignedToUserId: string | null;
  assignedToLabel: string | null;
  lastReviewedAt: string | null;
  opsNote: string | null;
};

export type MoneyReconciliationBuildInput = {
  booking: Record<string, unknown>;
  latestMoneyEvent: {
    event_type: string;
    created_at: string;
    phase: string;
    status: string;
  } | null;
  stuckPayout: StuckPayoutBooking | null;
  /** Earliest matching `booking_payment_events` / remediation row (from batch loader). */
  earliestSignalIso?: string | null;
};

function lc(row: Record<string, unknown>): string {
  return String(row.payment_lifecycle_status ?? '').toLowerCase();
}

/** Human-facing line for lists (service date + short id tail). */
export function formatBookingMoneyReference(row: Record<string, unknown>): string | null {
  const id = String(row.id ?? '').trim();
  if (!id) return null;
  const sd = row.service_date != null && String(row.service_date).trim() ? String(row.service_date) : '';
  const tail = id.length > 8 ? id.slice(-8) : id;
  return sd ? `${sd} · …${tail}` : `…${tail}`;
}

/**
 * Conservative drift checks when attention layer says “all clear”.
 * Does not replace lifecycle writes — surfaces rows worth a second look.
 */
export function detectRefundStateMismatch(row: Record<string, unknown>): boolean {
  const lifecycle = lc(row);
  const rs = String(row.refund_status ?? '').toLowerCase();
  if (lifecycle === 'refunded') {
    if (rs === 'failed' || rs === 'partially_failed') return true;
    if (rs !== 'succeeded' && rs !== 'pending' && rs !== '') return true;
  }
  if (rs === 'succeeded' && !['refunded', 'partially_refunded'].includes(lifecycle)) {
    return true;
  }
  return false;
}

export function detectPaymentStateMismatch(row: Record<string, unknown>): boolean {
  const lifecycle = lc(row);
  const ps = String(row.payment_status ?? '').toUpperCase();
  const fps = String(row.final_payment_status ?? '').toUpperCase();
  if (lifecycle === 'final_paid' && fps !== 'PAID' && !row.paid_remaining_at) {
    return true;
  }
  if (['payout_ready', 'payout_sent', 'final_paid'].includes(lifecycle) && fps !== 'PAID' && !row.paid_remaining_at) {
    return true;
  }
  if (lifecycle === 'deposit_paid' && ps !== 'PAID' && !row.paid_deposit_at) {
    return true;
  }
  return false;
}

function parseIsoMs(iso: string | null | undefined): number | null {
  if (iso == null || String(iso).trim() === '') return null;
  const t = Date.parse(String(iso));
  return Number.isFinite(t) ? t : null;
}

/** Earliest non-null ISO timestamp. */
export function earliestIso(dates: (string | null | undefined)[]): string | null {
  let best: number | null = null;
  let bestIso: string | null = null;
  for (const d of dates) {
    const ms = parseIsoMs(d ?? null);
    if (ms == null) continue;
    if (best == null || ms < best) {
      best = ms;
      bestIso = d != null ? String(d) : null;
    }
  }
  return bestIso;
}

/**
 * Hours and bucket from `firstDetectedAt` (typically on the snapshot).
 */
export function computeReconciliationAge(
  snapshot: Pick<MoneyReconciliationSnapshot, 'firstDetectedAt'>,
  now: Date = new Date()
): { ageInHours: number; ageBucket: MoneyReconciliationAgeBucket } {
  const start = parseIsoMs(snapshot.firstDetectedAt);
  if (start == null) {
    return { ageInHours: 0, ageBucket: 'lt_24h' };
  }
  const ms = Math.max(0, now.getTime() - start);
  const ageInHours = ms / 3600000;
  if (ageInHours < 24) return { ageInHours, ageBucket: 'lt_24h' };
  if (ageInHours < 24 * 3) return { ageInHours, ageBucket: 'd1_3' };
  if (ageInHours < 24 * 7) return { ageInHours, ageBucket: 'd3_7' };
  if (ageInHours < 24 * 14) return { ageInHours, ageBucket: 'd7_14' };
  return { ageInHours, ageBucket: 'd14_plus' };
}

export function formatAgeBucketLabel(bucket: MoneyReconciliationAgeBucket): string {
  switch (bucket) {
    case 'lt_24h':
      return '<24h';
    case 'd1_3':
      return '1–3d';
    case 'd3_7':
      return '3–7d';
    case 'd7_14':
      return '7–14d';
    case 'd14_plus':
      return '14d+';
    default:
      return bucket;
  }
}

export function computeReconciliationPriority(snapshot: Pick<MoneyReconciliationSnapshot, 'category'>): number {
  switch (snapshot.category) {
    case 'remediation_open':
      return 100;
    case 'partial_refund_attention':
      return 90;
    case 'payout_blocked_attention':
      return 85;
    case 'needs_manual_review':
      return 75;
    case 'payout_state_mismatch':
      return 60;
    case 'refund_state_mismatch':
    case 'payment_state_mismatch':
      return 40;
    case 'reconciliation_unknown':
      return 30;
    case 'healthy':
      return 0;
    default:
      return 20;
  }
}

export function computeReconciliationPriorityTier(
  score: number,
  category: MoneyReconciliationCategory
): 'high' | 'medium' | 'low' {
  if (category === 'healthy') return 'low';
  if (score >= 85) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

/**
 * App-truth “cleared” heuristic for weekly unresolved filter.
 * Exported for tests.
 */
export function isMoneyReconciliationResolved(
  snapshot: Pick<MoneyReconciliationSnapshot, 'category'>,
  row: Record<string, unknown>
): boolean {
  if (snapshot.category === 'healthy') return true;
  switch (snapshot.category) {
    case 'remediation_open': {
      const claw = String(row.pro_clawback_remediation_status ?? '').toLowerCase();
      if (claw === 'open') return false;
      return !bookingNeedsRemediationAttention(row);
    }
    case 'partial_refund_attention': {
      const rs = String(row.refund_status ?? '').toLowerCase();
      return rs !== 'partially_failed' && rs !== 'failed';
    }
    case 'needs_manual_review':
      return row.requires_admin_review !== true;
    case 'payout_blocked_attention':
      return row.payout_blocked !== true || row.payout_released === true;
    case 'payout_state_mismatch':
      return row.payout_released === true;
    case 'refund_state_mismatch':
      return !detectRefundStateMismatch(row);
    case 'payment_state_mismatch':
      return !detectPaymentStateMismatch(row);
    case 'reconciliation_unknown':
      return false;
    default:
      return false;
  }
}

/**
 * Attach aging, priority, and resolved flags after base classification.
 */
export function enrichMoneyReconciliationSnapshot(
  base: MoneyReconciliationSnapshot,
  ctx: {
    earliestSignalIso: string | null;
    bookingCreatedAt: string | null;
    row: Record<string, unknown>;
    now?: Date;
  }
): MoneyReconciliationSnapshot {
  const now = ctx.now ?? new Date();
  const firstDetectedAt = earliestIso([ctx.earliestSignalIso, ctx.bookingCreatedAt]);
  const { ageInHours, ageBucket } = computeReconciliationAge({ firstDetectedAt }, now);
  const priorityScore = computeReconciliationPriority(base);
  const resolved = isMoneyReconciliationResolved(base, ctx.row);
  const priorityTier = computeReconciliationPriorityTier(priorityScore, base.category);
  return {
    ...base,
    firstDetectedAt,
    ageInHours,
    ageBucket,
    priorityScore,
    priorityTier,
    resolved,
  };
}

/** Primary CTA label + href for the row (simple navigation — no POST automation). */
export function getReconciliationRowAction(
  bookingId: string,
  category: MoneyReconciliationCategory
): { label: string; href: string } {
  const payments = `/admin/bookings/${bookingId}/payments`;
  const booking = `/admin/bookings/${bookingId}`;
  switch (category) {
    case 'partial_refund_attention':
      return { label: 'Retry refund', href: payments };
    case 'remediation_open':
      return { label: 'Resolve remediation', href: payments };
    case 'payout_blocked_attention':
      return { label: 'Review payout hold', href: payments };
    case 'needs_manual_review':
      return { label: 'Open review', href: '/admin/payments/payout-review' };
    case 'payout_state_mismatch':
      return { label: 'Investigate payout', href: payments };
    case 'refund_state_mismatch':
    case 'payment_state_mismatch':
      return { label: 'Check Stripe', href: payments };
    case 'reconciliation_unknown':
      return { label: 'Inspect booking', href: booking };
    case 'healthy':
    default:
      return { label: 'Open booking', href: booking };
  }
}

function categoryFromAttention(
  money: AdminMoneyControlState,
  row: Record<string, unknown>
): MoneyReconciliationCategory {
  switch (money.attention.primary) {
    case 'refund_partial_failure':
      return 'partial_refund_attention';
    case 'remediation_required':
      return 'remediation_open';
    case 'stuck_silent_miss':
      return 'payout_state_mismatch';
    case 'manual_review_required':
      return 'needs_manual_review';
    case 'payout_blocked_attention':
      return 'payout_blocked_attention';
    case 'no_attention_needed':
      if (detectRefundStateMismatch(row)) return 'refund_state_mismatch';
      if (detectPaymentStateMismatch(row)) return 'payment_state_mismatch';
      return 'healthy';
    default:
      return 'reconciliation_unknown';
  }
}

function copyForReason(money: AdminMoneyControlState): string {
  return money.attention.detail || money.recommendedNextAction;
}

function nextActionForCategory(
  category: MoneyReconciliationCategory,
  money: AdminMoneyControlState
): string {
  switch (category) {
    case 'healthy':
      return 'No reconciliation action — spot-check during audits only.';
    case 'partial_refund_attention':
      return money.attention.recommendedNextAction;
    case 'remediation_open':
      return money.attention.recommendedNextAction;
    case 'payout_state_mismatch':
      return money.attention.recommendedNextAction;
    case 'needs_manual_review':
      return money.attention.recommendedNextAction;
    case 'payout_blocked_attention':
      return money.attention.recommendedNextAction;
    case 'refund_state_mismatch':
      return 'Compare Stripe refunds/charges to booking_refund_events and payment_lifecycle_status; fix flags or ledger before customer comms.';
    case 'payment_state_mismatch':
      return 'Compare Stripe PaymentIntents and webhooks to deposit/final columns; run lifecycle repair or manual correction.';
    case 'reconciliation_unknown':
      return 'Inspect booking_payment_events and booking_refund_remediation_events; classify manually.';
    default:
      return money.recommendedNextAction;
  }
}

function reasonForCategory(
  category: MoneyReconciliationCategory,
  money: AdminMoneyControlState,
  row: Record<string, unknown>
): string {
  if (category === 'refund_state_mismatch') {
    return `Refund/lifecycle drift: lifecycle “${lc(row)}”, refund_status “${String(row.refund_status ?? '')}”.`;
  }
  if (category === 'payment_state_mismatch') {
    return `Payment/lifecycle drift: lifecycle “${lc(row)}”, deposit/final flags may not match Stripe-backed truth.`;
  }
  if (category === 'healthy') {
    return 'No stuck, review, remediation, refund-failure, or obvious drift signals in app truth.';
  }
  return copyForReason(money);
}

/**
 * Single-booking reconciliation snapshot (pure aside from composed money state).
 */
export function buildMoneyReconciliationSnapshot(input: MoneyReconciliationBuildInput): MoneyReconciliationSnapshot {
  const row = input.booking;
  const id = String(row.id ?? '').trim();
  if (!id) {
    const emptyBase: MoneyReconciliationSnapshot = {
      bookingId: '',
      bookingReference: null,
      paymentLifecycleStatus: '',
      refundStatus: '',
      payoutStatus: '',
      payoutReleased: false,
      payoutBlocked: false,
      requiresAdminReview: false,
      latestMoneyEvent: null,
      category: 'reconciliation_unknown',
      reason: 'Missing booking id.',
      recommendedNextAction: 'Fix data load — booking row must include id.',
      createdAt: null,
      firstDetectedAt: null,
      ageInHours: 0,
      ageBucket: 'lt_24h',
      priorityScore: 0,
      priorityTier: 'low',
      resolved: true,
      assignedToUserId: null,
      assignedToLabel: null,
      lastReviewedAt: null,
      opsNote: null,
    };
    return emptyBase;
  }

  const money = buildAdminMoneyControlState({
    booking: row,
    latestPaymentEvent: input.latestMoneyEvent,
    stuckPayout: input.stuckPayout,
  });

  const category = categoryFromAttention(money, row);
  const reason = reasonForCategory(category, money, row);
  const recommendedNextAction = nextActionForCategory(category, money);

  const base: MoneyReconciliationSnapshot = {
    bookingId: id,
    bookingReference: formatBookingMoneyReference(row),
    paymentLifecycleStatus: String(row.payment_lifecycle_status ?? ''),
    refundStatus: String(row.refund_status ?? ''),
    payoutStatus: String(row.payout_status ?? ''),
    payoutReleased: row.payout_released === true,
    payoutBlocked: row.payout_blocked === true,
    requiresAdminReview: row.requires_admin_review === true,
    latestMoneyEvent: money.latestMoneyEvent,
    category,
    reason,
    recommendedNextAction,
    createdAt: row.created_at != null ? String(row.created_at) : null,
    firstDetectedAt: null,
    ageInHours: 0,
    ageBucket: 'lt_24h',
    priorityScore: 0,
    priorityTier: 'low',
    resolved: false,
    assignedToUserId: null,
    assignedToLabel: null,
    lastReviewedAt: null,
    opsNote: null,
  };
  return enrichMoneyReconciliationSnapshot(base, {
    earliestSignalIso: input.earliestSignalIso ?? null,
    bookingCreatedAt: row.created_at != null ? String(row.created_at) : null,
    row,
  });
}
