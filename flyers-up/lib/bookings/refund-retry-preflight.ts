/**
 * App-known refund retry preflight — does not call live Stripe; fail-closed on ambiguous state.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  coalesceBookingDepositPaymentIntentId,
  coalesceBookingFinalPaymentIntentId,
  type BookingFinalPaymentIntentIdRow,
} from '@/lib/bookings/money-state';

export type RefundRetryKind =
  | 'retry_allowed'
  | 'retry_not_needed'
  | 'retry_blocked_manual_review'
  | 'retry_partial_remaining_only'
  | 'retry_conflicts_with_existing_refund_state';

export type RefundRetryEligibilitySnapshot = {
  kind: RefundRetryKind;
  /** Human-readable for admin UI / API. */
  message: string;
  /** Phases still eligible for a Stripe refund attempt (subset of expected legs). */
  legsToRetry: Array<'final' | 'deposit'>;
  /** Expected legs for a full admin refund (deposit+final when split). */
  expectedLegs: Array<'final' | 'deposit'>;
};

function uniqRefundPiKeys(rows: { payment_intent_id?: string | null }[]): Set<string> {
  const s = new Set<string>();
  for (const r of rows) {
    const pi = typeof r.payment_intent_id === 'string' && r.payment_intent_id.trim() ? r.payment_intent_id.trim() : '';
    if (pi) s.add(pi);
  }
  return s;
}

/**
 * Inspect booking + refund ledger to decide whether a retry is safe and which PIs to hit.
 */
export async function getRefundRetryEligibilitySnapshot(
  admin: SupabaseClient,
  bookingId: string
): Promise<RefundRetryEligibilitySnapshot> {
  const { data: b, error } = await admin
    .from('bookings')
    .select(
      [
        'id',
        'payment_lifecycle_status',
        'refund_status',
        'payout_released',
        'final_payment_intent_id',
        'stripe_payment_intent_remaining_id',
        'stripe_payment_intent_deposit_id',
        'deposit_payment_intent_id',
        'payment_intent_id',
        'pro_clawback_remediation_status',
      ].join(', ')
    )
    .eq('id', bookingId)
    .maybeSingle();
  if (error || !b) {
    return {
      kind: 'retry_blocked_manual_review',
      message: 'Booking not found — cannot evaluate retry.',
      legsToRetry: [],
      expectedLegs: [],
    };
  }

  const row = b as unknown as Record<string, unknown>;
  const piFinal = coalesceBookingFinalPaymentIntentId(row as BookingFinalPaymentIntentIdRow);
  const piDep = coalesceBookingDepositPaymentIntentId(row as BookingFinalPaymentIntentIdRow);
  const expectedLegs: Array<'final' | 'deposit'> = [];
  if (piFinal) expectedLegs.push('final');
  if (piDep && piDep !== piFinal) expectedLegs.push('deposit');

  const lc = String(row.payment_lifecycle_status ?? '').toLowerCase();
  const rs = String(row.refund_status ?? '').toLowerCase();
  const payoutReleased = row.payout_released === true;

  if ((lc === 'refunded' || rs === 'succeeded') && rs !== 'partially_failed') {
    return {
      kind: 'retry_not_needed',
      message: 'Already fully refunded in app state — no retry.',
      legsToRetry: [],
      expectedLegs,
    };
  }

  const { data: ledgerRows } = await admin
    .from('booking_refund_events')
    .select('payment_intent_id, stripe_refund_id, amount_cents')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(40);

  const rows = (ledgerRows ?? []) as { payment_intent_id?: string | null; stripe_refund_id?: string | null }[];
  const pisWithRefundId = new Set<string>();
  const pisAnyRow = new Set<string>();
  for (const r of rows) {
    const pi =
      typeof r.payment_intent_id === 'string' && r.payment_intent_id.trim() ? r.payment_intent_id.trim() : '';
    if (!pi) continue;
    pisAnyRow.add(pi);
    if (typeof r.stripe_refund_id === 'string' && r.stripe_refund_id.trim()) {
      pisWithRefundId.add(pi);
    }
  }

  const expectedPis = new Set<string>();
  if (piFinal) expectedPis.add(piFinal);
  if (piDep && piDep !== piFinal) expectedPis.add(piDep);

  /** Leg complete when ledger shows a Stripe refund id for that PI. */
  const legDone = (phase: 'final' | 'deposit') => {
    const pi = phase === 'final' ? piFinal : piDep;
    if (!pi) return true;
    return pisWithRefundId.has(pi);
  };

  const legsToRetry = expectedLegs.filter((ph) => !legDone(ph));

  if (expectedLegs.length === 0) {
    return {
      kind: 'retry_blocked_manual_review',
      message: 'No PaymentIntents on file — manual reconciliation required.',
      legsToRetry: [],
      expectedLegs: [],
    };
  }

  if (rs !== 'partially_failed' && rs !== 'failed' && legsToRetry.length === 0 && pisAnyRow.size > 0) {
    return {
      kind: 'retry_conflicts_with_existing_refund_state',
      message:
        'Ledger shows refund activity but booking is not in a failed/partial-failed retry state — confirm Stripe before changing app state.',
      legsToRetry: [],
      expectedLegs,
    };
  }

  if (legsToRetry.length === 0) {
    return {
      kind: 'retry_not_needed',
      message: 'All expected payment legs already have Stripe refund ids in the ledger.',
      legsToRetry: [],
      expectedLegs,
    };
  }

  if (pisAnyRow.size > 0 && pisWithRefundId.size === 0) {
    return {
      kind: 'retry_blocked_manual_review',
      message: 'Ambiguous ledger (rows without stripe_refund_id) — resolve in Stripe Dashboard before retry.',
      legsToRetry: [],
      expectedLegs,
    };
  }

  const claw = String(row.pro_clawback_remediation_status ?? 'none').toLowerCase();
  if (payoutReleased && claw === 'open') {
    return {
      kind: 'retry_blocked_manual_review',
      message: 'Open clawback remediation — finish or waive remediation before retrying customer refunds.',
      legsToRetry: [],
      expectedLegs,
    };
  }

  if (legsToRetry.length < expectedLegs.length && legsToRetry.length > 0) {
    return {
      kind: 'retry_partial_remaining_only',
      message: 'Retry will only hit remaining payment leg(s); completed legs are skipped from app ledger truth.',
      legsToRetry,
      expectedLegs,
    };
  }

  return {
    kind: 'retry_allowed',
    message: 'Retry allowed for remaining leg(s) per app ledger.',
    legsToRetry,
    expectedLegs,
  };
}
