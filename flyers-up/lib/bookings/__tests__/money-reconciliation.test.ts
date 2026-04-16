/**
 * Run: npx tsx --test lib/bookings/__tests__/money-reconciliation.test.ts
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMoneyReconciliationSnapshot,
  detectPaymentStateMismatch,
  detectRefundStateMismatch,
  isMoneyReconciliationResolved,
} from '@/lib/bookings/money-reconciliation';
import { computeMoneyReconciliationWindowSummary } from '@/lib/bookings/money-reconciliation-report';

function baseRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    created_at: '2026-01-15T12:00:00.000Z',
    service_date: '2026-01-20',
    status: 'accepted',
    payment_status: 'PAID',
    final_payment_status: 'PAID',
    payment_lifecycle_status: 'payout_ready',
    paid_deposit_at: '2026-01-10',
    paid_remaining_at: '2026-01-12',
    fully_paid_at: '2026-01-12',
    payout_released: false,
    payout_status: 'pending',
    payout_blocked: false,
    payout_hold_reason: null,
    requires_admin_review: false,
    refund_status: 'none',
    refund_after_payout: false,
    pro_clawback_remediation_status: 'none',
    stripe_outbound_recovery_status: 'not_applicable',
    ...overrides,
  };
}

test('healthy booking → healthy category', () => {
  const s = buildMoneyReconciliationSnapshot({
    booking: baseRow(),
    latestMoneyEvent: null,
    stuckPayout: null,
  });
  assert.equal(s.category, 'healthy');
  assert.equal(s.requiresAdminReview, false);
});

test('partial refund failure → partial_refund_attention', () => {
  const s = buildMoneyReconciliationSnapshot({
    booking: baseRow({
      refund_status: 'partially_failed',
      payment_lifecycle_status: 'partially_refunded',
    }),
    latestMoneyEvent: {
      event_type: 'refund_batch_partial_failure',
      created_at: '2026-01-14T00:00:00.000Z',
      phase: 'refund',
      status: 'stripe_refund_partial_failure',
    },
    stuckPayout: null,
  });
  assert.equal(s.category, 'partial_refund_attention');
});

test('open clawback → remediation_open', () => {
  const s = buildMoneyReconciliationSnapshot({
    booking: baseRow({
      pro_clawback_remediation_status: 'open',
      refund_after_payout: true,
      requires_admin_review: true,
    }),
    latestMoneyEvent: null,
    stuckPayout: null,
  });
  assert.equal(s.category, 'remediation_open');
});

test('requires admin review without higher-priority signals → needs_manual_review', () => {
  const s = buildMoneyReconciliationSnapshot({
    booking: baseRow({
      requires_admin_review: true,
      payout_blocked: true,
      payout_hold_reason: 'admin_review_required',
    }),
    latestMoneyEvent: null,
    stuckPayout: null,
  });
  assert.equal(s.category, 'needs_manual_review');
});

test('payout blocked without manual review path → payout_blocked_attention', () => {
  const s = buildMoneyReconciliationSnapshot({
    booking: baseRow({
      payout_blocked: true,
      payout_hold_reason: 'dispute_hold',
      requires_admin_review: false,
    }),
    latestMoneyEvent: null,
    stuckPayout: null,
  });
  assert.equal(s.category, 'payout_blocked_attention');
});

test('stuck payout signal → payout_state_mismatch', () => {
  const s = buildMoneyReconciliationSnapshot({
    booking: baseRow({
      payment_lifecycle_status: 'payout_ready',
      payout_released: false,
      requires_admin_review: false,
    }),
    latestMoneyEvent: null,
    stuckPayout: {
      bookingId: '00000000-0000-4000-8000-000000000001',
      status: 'accepted',
      paymentLifecycleStatus: 'payout_ready',
      completedAt: null,
      customerReviewDeadlineAt: null,
      reason: 'Eligible for automatic Connect payout…',
    },
  });
  assert.equal(s.category, 'payout_state_mismatch');
});

test('aggregate summary counts for mixed fixture set', () => {
  const rows = [
    baseRow({ id: '1', refund_status: 'partially_failed', payment_lifecycle_status: 'payout_ready' }),
    baseRow({ id: '2', requires_admin_review: true, payout_hold_reason: 'admin_review_required', payout_blocked: true }),
    baseRow({ id: '3', payout_released: true, payout_status: 'paid' }),
    baseRow({
      id: '4',
      payment_status: 'UNPAID',
      final_payment_status: 'UNPAID',
      paid_deposit_at: null,
      paid_remaining_at: null,
      payment_lifecycle_status: 'unpaid',
    }),
  ];
  const snapshots = rows.map((booking) =>
    buildMoneyReconciliationSnapshot({
      booking,
      latestMoneyEvent: null,
      stuckPayout: null,
    })
  );
  const summary = computeMoneyReconciliationWindowSummary({
    rows,
    snapshots,
    stuckPayoutDetectorCount: 2,
    windowDays: 30,
    sinceIso: '2026-01-01',
  });
  assert.equal(summary.scannedBookingCount, 4);
  assert.equal(summary.deposit_paid_count, 3);
  assert.equal(summary.final_paid_count, 3);
  assert.equal(summary.manual_review_count, 1);
  assert.equal(summary.payout_sent_count, 1);
  assert.equal(summary.stuck_payout_count, 2);
  assert.ok(summary.byCategory.partial_refund_attention >= 1);
});

test('detectRefundStateMismatch flags refunded lifecycle with failed refund_status', () => {
  assert.equal(
    detectRefundStateMismatch(
      baseRow({ payment_lifecycle_status: 'refunded', refund_status: 'failed' })
    ),
    true
  );
});

test('detectPaymentStateMismatch flags final_paid without final PAID', () => {
  assert.equal(
    detectPaymentStateMismatch(
      baseRow({
        payment_lifecycle_status: 'final_paid',
        final_payment_status: 'UNPAID',
        paid_remaining_at: null,
      })
    ),
    true
  );
});

test('isMoneyReconciliationResolved clears payout_blocked when hold released', () => {
  const row = baseRow({ payout_blocked: false, payout_released: false });
  assert.equal(
    isMoneyReconciliationResolved({ category: 'payout_blocked_attention' }, row),
    true
  );
});

test('isMoneyReconciliationResolved stays false while refund still partially_failed', () => {
  const row = baseRow({ refund_status: 'partially_failed', payment_lifecycle_status: 'partially_refunded' });
  assert.equal(
    isMoneyReconciliationResolved({ category: 'partial_refund_attention' }, row),
    false
  );
});
