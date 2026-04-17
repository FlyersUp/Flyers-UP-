/**
 * Derived admin “money control” snapshot: one place to read deposit/final/payout/refund/remediation
 * and a recommended next action for ops.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { evaluateAdminStuckPayoutForBooking, type StuckPayoutBooking } from '@/lib/bookings/stuck-payout-detector';

const BOOKING_MONEY_CONTROL_SELECT = [
  'id',
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

export type AdminMoneyDepositStatus = 'unpaid' | 'pending' | 'paid' | 'refunded' | 'unknown';

export type AdminMoneyFinalStatus =
  | 'not_due'
  | 'due'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'unknown';

export type AdminMoneyPayoutStatus =
  | 'not_applicable'
  | 'scheduled'
  | 'on_hold'
  | 'released_processing'
  | 'paid'
  | 'failed'
  | 'unknown';

export type AdminMoneyRefundPipelineStatus =
  | 'none'
  | 'initiated'
  | 'succeeded'
  | 'partially_failed'
  | 'failed'
  | 'partial_credit';

export type AdminMoneyRemediationStatus =
  | 'none'
  | 'open'
  | 'resolved'
  | 'waived'
  | 'under_review';

export type AdminMoneyClawbackStatus = 'none' | 'open' | 'resolved' | 'waived' | 'unknown';

/**
 * Operator-facing “needs attention” layer: distinct from stuck payout detector
 * (which excludes `requires_admin_review` rows from the “silent auto-miss” list on purpose).
 */
export type AdminMoneyAttentionCategory =
  | 'no_attention_needed'
  | 'stuck_silent_miss'
  | 'manual_review_required'
  | 'remediation_required'
  | 'refund_partial_failure'
  | 'payout_blocked_attention';

export type AdminMoneyAttentionState = {
  primary: AdminMoneyAttentionCategory;
  headline: string;
  detail: string;
  recommendedNextAction: string;
};

/** True when ops should surface clawback / remediation tooling for this booking. */
export function bookingNeedsRemediationAttention(row: Record<string, unknown>): boolean {
  return (
    String(row.pro_clawback_remediation_status ?? '') === 'open' ||
    (row.refund_after_payout === true &&
      row.requires_admin_review === true &&
      String(row.pro_clawback_remediation_status ?? 'none') !== 'waived' &&
      String(row.pro_clawback_remediation_status ?? 'none') !== 'resolved')
  );
}

function remediationAttentionForAttention(row: Record<string, unknown>): boolean {
  const claw = String(row.pro_clawback_remediation_status ?? 'none').toLowerCase();
  if (claw === 'open') return true;
  return bookingNeedsRemediationAttention(row);
}

export type AdminMoneyControlState = {
  deposit: AdminMoneyDepositStatus;
  final: AdminMoneyFinalStatus;
  payout: AdminMoneyPayoutStatus;
  refundPipeline: AdminMoneyRefundPipelineStatus;
  remediation: AdminMoneyRemediationStatus;
  clawback: AdminMoneyClawbackStatus;
  stripeOutboundRecovery: string;
  stuckPayout: StuckPayoutBooking | null;
  latestMoneyEvent: { type: string; createdAt: string; phase: string; status: string } | null;
  recommendedNextAction: string;
  /** Distinct from stuck payout: manual review, remediation, refund failures, blocked payout without “stuck” cron signal. */
  attention: AdminMoneyAttentionState;
  flags: {
    refundAfterPayout: boolean;
    requiresAdminReview: boolean;
    payoutReleased: boolean;
  };
};

export function deriveAdminMoneyAttentionState(
  state: Omit<AdminMoneyControlState, 'attention'>,
  row: Record<string, unknown>
): AdminMoneyAttentionState {
  const stuck = state.stuckPayout != null;
  const requiresReview = state.flags.requiresAdminReview === true;
  const partialRefundFail =
    state.refundPipeline === 'partially_failed' || state.refundPipeline === 'failed';
  const remediation = remediationAttentionForAttention(row);
  const payoutBlocked =
    row.payout_blocked === true &&
    String(row.payout_hold_reason ?? '').trim() !== '' &&
    !requiresReview;

  if (partialRefundFail) {
    return {
      primary: 'refund_partial_failure',
      headline: 'Needs attention',
      detail: 'Customer refund did not complete cleanly for all payment legs.',
      recommendedNextAction:
        'Use “Retry customer refund” when eligible, or reconcile Stripe and ledger rows before updating app state.',
    };
  }

  if (remediation) {
    return {
      primary: 'remediation_required',
      headline: 'Needs attention',
      detail: 'Post-payout refund or clawback remediation is open or awaiting follow-up.',
      recommendedNextAction:
        'Work the remediation queue: recover outbound transfer, waive with documentation, or resolve in Stripe then align booking flags.',
    };
  }

  if (requiresReview) {
    return {
      primary: 'manual_review_required',
      headline: 'Needs attention',
      detail: 'This booking is flagged for manual money or payout review (it may not appear as “stuck payout”).',
      recommendedNextAction:
        'Open payout review tools, confirm Stripe truth, then refund, release, or hold with a clear note.',
    };
  }

  if (payoutBlocked) {
    return {
      primary: 'payout_blocked_attention',
      headline: 'Needs attention',
      detail: `Payout is blocked (${String(row.payout_hold_reason ?? 'unknown hold')}).`,
      recommendedNextAction:
        'Clear the hold reason path (dispute, risk, admin hold) before expecting automatic release.',
    };
  }

  if (stuck) {
    return {
      primary: 'stuck_silent_miss',
      headline: 'Stuck payout',
      detail: state.stuckPayout?.reason ?? 'Eligible payout has not released within the stuck threshold.',
      recommendedNextAction: state.recommendedNextAction,
    };
  }

  return {
    primary: 'no_attention_needed',
    headline: 'No money alerts',
    detail: 'No stuck payout signal and no manual-review / remediation / refund-failure attention state.',
    recommendedNextAction: state.recommendedNextAction,
  };
}

function lc(row: Record<string, unknown>): string {
  return String(row.payment_lifecycle_status ?? '').toLowerCase();
}

function depositStatusFromRow(row: Record<string, unknown>): AdminMoneyDepositStatus {
  const ps = String(row.payment_status ?? '').toUpperCase();
  if (ps === 'REFUNDED') return 'refunded';
  if (ps === 'PAID' || row.paid_deposit_at) return 'paid';
  if (ps === 'UNPAID' || ps === 'REQUIRES_ACTION') return ps === 'REQUIRES_ACTION' ? 'pending' : 'unpaid';
  return 'unknown';
}

function finalStatusFromRow(row: Record<string, unknown>): AdminMoneyFinalStatus {
  const lifecycle = lc(row);
  const fps = String(row.final_payment_status ?? '').toUpperCase();
  if (lifecycle === 'refunded') return 'refunded';
  if (lifecycle === 'partially_refunded') return 'partially_refunded';
  if (fps === 'PAID' || row.paid_remaining_at || lifecycle === 'final_paid') return 'paid';
  if (lifecycle === 'final_processing') return 'processing';
  if (lifecycle === 'payment_failed' || fps === 'FAILED') return 'failed';
  if (
    ['payout_ready', 'payout_sent', 'payout_on_hold'].includes(lifecycle) &&
    (fps === 'PAID' || row.paid_remaining_at)
  ) {
    return 'paid';
  }
  if (row.paid_remaining_at || row.fully_paid_at) return 'paid';
  if (lifecycle === 'deposit_paid' || lifecycle === 'final_pending') return 'due';
  return 'not_due';
}

function payoutStatusFromRow(row: Record<string, unknown>): AdminMoneyPayoutStatus {
  if (row.payout_released !== true) {
    const l = lc(row);
    if (l === 'payout_on_hold' || row.requires_admin_review === true) return 'on_hold';
    const fp = finalStatusFromRow(row);
    if (fp !== 'paid' && fp !== 'partially_refunded') return 'not_applicable';
    return 'scheduled';
  }
  const ps = String(row.payout_status ?? '').toLowerCase();
  if (ps === 'paid' || ps === 'succeeded') return 'paid';
  if (ps === 'failed') return 'failed';
  if (['pending', 'in_transit'].includes(ps)) return 'released_processing';
  return 'released_processing';
}

function refundPipelineFromRow(row: Record<string, unknown>): AdminMoneyRefundPipelineStatus {
  const rs = String(row.refund_status ?? '').toLowerCase();
  const lifecycle = lc(row);
  if (rs === 'partially_failed') return 'partially_failed';
  if (rs === 'failed') return 'failed';
  if (rs === 'pending' || lifecycle === 'refund_pending') return 'initiated';
  if (rs === 'succeeded' || lifecycle === 'refunded') return 'succeeded';
  if (lifecycle === 'partially_refunded') return 'partial_credit';
  return 'none';
}

function remediationFromRow(row: Record<string, unknown>): AdminMoneyRemediationStatus {
  const claw = String(row.pro_clawback_remediation_status ?? 'none').toLowerCase();
  if (claw === 'open') return 'open';
  if (claw === 'resolved') return 'resolved';
  if (claw === 'waived') return 'waived';
  if (row.refund_after_payout === true && row.requires_admin_review === true) return 'under_review';
  return 'none';
}

function clawbackFromRow(row: Record<string, unknown>): AdminMoneyClawbackStatus {
  const v = String(row.pro_clawback_remediation_status ?? 'none').toLowerCase();
  if (['none', 'open', 'resolved', 'waived'].includes(v)) return v as AdminMoneyClawbackStatus;
  return 'unknown';
}

function recommendAction(s: Omit<AdminMoneyControlState, 'recommendedNextAction' | 'attention'>): string {
  if (s.stuckPayout) {
    return 'Payout looks stuck: verify payout-release cron, Stripe transfer errors, and eligibility snapshot; release or hold intentionally.';
  }
  if (s.refundPipeline === 'partially_failed') {
    return 'Retry customer refund from payout review tools, or finish the missing Stripe leg manually and reconcile ledger rows.';
  }
  if (s.clawback === 'open' || (s.remediation === 'open' && s.flags.refundAfterPayout)) {
    return 'Resolve or waive clawback remediation after offline recovery (or document waiver).';
  }
  if (s.remediation === 'under_review' && s.flags.requiresAdminReview && !s.flags.payoutReleased) {
    return 'Complete payout review queue: approve payout, refund customer, or keep on hold with a note.';
  }
  if (s.payout === 'on_hold' && s.final === 'paid') {
    return 'Payout on hold — check payout_hold_reason, disputes, and flagged review queue before releasing.';
  }
  if (s.payout === 'failed') {
    return 'Investigate failed Connect transfer; retry release or coordinate with Stripe dashboard.';
  }
  if (s.refundPipeline === 'initiated') {
    return 'Refund initiated — confirm Stripe/webhook completion before telling the customer it has landed.';
  }
  if (s.refundPipeline === 'succeeded' && s.flags.refundAfterPayout && s.clawback === 'none') {
    return 'Verify post-payout refund bookkeeping and clawback flags are consistent.';
  }
  return 'No urgent money action — monitor standard lifecycle.';
}

export async function loadAdminMoneyControlState(
  admin: SupabaseClient,
  bookingId: string
): Promise<AdminMoneyControlState | null> {
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select(BOOKING_MONEY_CONTROL_SELECT)
    .eq('id', bookingId)
    .maybeSingle();
  if (bErr || !booking) return null;

  const { data: ev } = await admin
    .from('booking_payment_events')
    .select('event_type, created_at, phase, status')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const stuck = await evaluateAdminStuckPayoutForBooking(admin, bookingId);

  return buildAdminMoneyControlState({
    booking: booking as unknown as Record<string, unknown>,
    latestPaymentEvent: ev
      ? {
          event_type: String((ev as { event_type: string }).event_type),
          created_at: String((ev as { created_at: string }).created_at),
          phase: String((ev as { phase: string }).phase),
          status: String((ev as { status: string }).status),
        }
      : null,
    stuckPayout: stuck,
  });
}

export function buildAdminMoneyControlState(input: {
  booking: Record<string, unknown>;
  latestPaymentEvent: {
    event_type: string;
    created_at: string;
    phase: string;
    status: string;
  } | null;
  stuckPayout: StuckPayoutBooking | null;
}): AdminMoneyControlState {
  const { booking: row, latestPaymentEvent, stuckPayout } = input;

  const base: Omit<AdminMoneyControlState, 'recommendedNextAction' | 'attention'> = {
    deposit: depositStatusFromRow(row),
    final: finalStatusFromRow(row),
    payout: payoutStatusFromRow(row),
    refundPipeline: refundPipelineFromRow(row),
    remediation: remediationFromRow(row),
    clawback: clawbackFromRow(row),
    stripeOutboundRecovery: String(row.stripe_outbound_recovery_status ?? 'not_applicable'),
    stuckPayout,
    latestMoneyEvent: latestPaymentEvent
      ? {
          type: latestPaymentEvent.event_type,
          createdAt: latestPaymentEvent.created_at,
          phase: latestPaymentEvent.phase,
          status: latestPaymentEvent.status,
        }
      : null,
    flags: {
      refundAfterPayout: row.refund_after_payout === true,
      requiresAdminReview: row.requires_admin_review === true,
      payoutReleased: row.payout_released === true,
    },
  };

  const recommendedNextAction = recommendAction(base);
  const withRec: Omit<AdminMoneyControlState, 'attention'> = { ...base, recommendedNextAction };
  return {
    ...withRec,
    attention: deriveAdminMoneyAttentionState(withRec, row),
  };
}
