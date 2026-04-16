/**
 * Run: npx tsx --test lib/bookings/__tests__/money-reconciliation-report.test.ts
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMoneyReconciliationSnapshot,
  computeReconciliationAge,
  type MoneyReconciliationSnapshot,
} from '@/lib/bookings/money-reconciliation';
import {
  compareReconciliationSnapshotsForOps,
  computeWeeklyFinancialHealth,
  filterSnapshotsForReconciliationExport,
  formatMoneyReconciliationCsv,
} from '@/lib/bookings/money-reconciliation-report';

function snap(overrides: Partial<MoneyReconciliationSnapshot>): MoneyReconciliationSnapshot {
  return {
    bookingId: 'b1',
    bookingReference: 'ref',
    paymentLifecycleStatus: 'payout_ready',
    refundStatus: 'none',
    payoutStatus: 'pending',
    payoutReleased: false,
    payoutBlocked: false,
    requiresAdminReview: false,
    latestMoneyEvent: null,
    category: 'healthy',
    reason: '',
    recommendedNextAction: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    firstDetectedAt: '2026-01-01T00:00:00.000Z',
    ageInHours: 1,
    ageBucket: 'lt_24h',
    priorityScore: 0,
    priorityTier: 'low',
    resolved: true,
    assignedToUserId: null,
    assignedToLabel: null,
    lastReviewedAt: null,
    opsNote: null,
    ...overrides,
  };
}

test('computeReconciliationAge buckets', () => {
  const t0 = new Date('2026-01-15T12:00:00.000Z');
  assert.deepEqual(computeReconciliationAge({ firstDetectedAt: '2026-01-15T00:00:00.000Z' }, t0), {
    ageInHours: 12,
    ageBucket: 'lt_24h',
  });
  assert.equal(
    computeReconciliationAge({ firstDetectedAt: '2026-01-13T00:00:00.000Z' }, t0).ageBucket,
    'd1_3'
  );
  assert.equal(
    computeReconciliationAge({ firstDetectedAt: '2026-01-10T12:00:00.000Z' }, t0).ageBucket,
    'd3_7'
  );
  assert.equal(
    computeReconciliationAge({ firstDetectedAt: '2026-01-05T12:00:00.000Z' }, t0).ageBucket,
    'd7_14'
  );
  assert.equal(
    computeReconciliationAge({ firstDetectedAt: '2025-12-28T00:00:00.000Z' }, t0).ageBucket,
    'd14_plus'
  );
});

test('filterSnapshotsForReconciliationExport min age days', () => {
  const rows = [
    snap({ bookingId: '1', category: 'remediation_open', resolved: false, ageInHours: 10 }),
    snap({ bookingId: '2', category: 'remediation_open', resolved: false, ageInHours: 200 }),
  ];
  const f = filterSnapshotsForReconciliationExport(rows, { minAgeDays: 7 });
  assert.equal(f.length, 1);
  assert.equal(f[0]?.bookingId, '2');
});

test('filterSnapshotsForReconciliationExport unresolved only', () => {
  const rows = [
    snap({ bookingId: '1', category: 'healthy', resolved: true }),
    snap({ bookingId: '2', category: 'remediation_open', resolved: false, priorityScore: 100 }),
    snap({ bookingId: '3', category: 'remediation_open', resolved: true, priorityScore: 100 }),
  ];
  const f = filterSnapshotsForReconciliationExport(rows, { unresolvedOnly: true });
  assert.equal(f.length, 1);
  assert.equal(f[0]?.bookingId, '2');
});

test('formatMoneyReconciliationCsv header and escaping', () => {
  const csv = formatMoneyReconciliationCsv([
    snap({
      bookingId: 'id-1',
      bookingReference: 'hello, "world"',
      category: 'remediation_open',
      reason: 'line\nbreak',
      recommendedNextAction: 'do it',
      ageBucket: 'd1_3',
      createdAt: '2026-01-01T00:00:00.000Z',
      latestMoneyEvent: { type: 't', createdAt: '2026-01-02T00:00:00.000Z', phase: 'p', status: 's' },
      payoutStatus: 'pending',
      refundStatus: 'none',
    }),
  ]);
  const lines = csv.split('\r\n');
  assert.ok(lines[0]?.includes('booking_id'));
  assert.ok(lines[0]?.includes('age_bucket'));
  assert.ok(lines[0]?.includes('assigned_to'));
  assert.match(lines[1] ?? '', /"hello, ""world"""/);
});

test('compareReconciliationSnapshotsForOps sorts priority then age', () => {
  const a = snap({ bookingId: 'a', category: 'payment_state_mismatch', priorityScore: 40, ageInHours: 10 });
  const b = snap({ bookingId: 'b', category: 'remediation_open', priorityScore: 100, ageInHours: 1 });
  const c = snap({ bookingId: 'c', category: 'remediation_open', priorityScore: 100, ageInHours: 50 });
  const sorted = [a, b, c].sort(compareReconciliationSnapshotsForOps);
  assert.deepEqual(
    sorted.map((x) => x.bookingId),
    ['c', 'b', 'a']
  );
});

test('computeWeeklyFinancialHealth mixed dataset', () => {
  const snapshots = [
    buildMoneyReconciliationSnapshot({
      booking: {
        id: 'h1',
        created_at: '2026-01-01T00:00:00.000Z',
        service_date: '2026-01-10',
        payment_status: 'PAID',
        final_payment_status: 'PAID',
        payment_lifecycle_status: 'payout_ready',
        paid_deposit_at: 'x',
        paid_remaining_at: 'y',
        payout_released: false,
        payout_status: 'pending',
        payout_blocked: false,
        requires_admin_review: false,
        refund_status: 'none',
        refund_after_payout: false,
        pro_clawback_remediation_status: 'none',
        stripe_outbound_recovery_status: 'not_applicable',
      },
      latestMoneyEvent: null,
      stuckPayout: null,
    }),
    buildMoneyReconciliationSnapshot({
      booking: {
        id: 'u1',
        created_at: '2026-01-01T00:00:00.000Z',
        service_date: '2026-01-10',
        payment_status: 'PAID',
        final_payment_status: 'PAID',
        payment_lifecycle_status: 'payout_ready',
        paid_deposit_at: 'x',
        paid_remaining_at: 'y',
        payout_released: false,
        payout_status: 'pending',
        payout_blocked: true,
        payout_hold_reason: 'dispute_hold',
        requires_admin_review: false,
        refund_status: 'none',
        refund_after_payout: false,
        pro_clawback_remediation_status: 'none',
        stripe_outbound_recovery_status: 'not_applicable',
      },
      latestMoneyEvent: null,
      stuckPayout: null,
    }),
  ];
  const w = computeWeeklyFinancialHealth(snapshots);
  assert.equal(w.totalBookings, 2);
  assert.equal(w.issuesCount, 1);
  assert.equal(w.unresolvedIssuesCount, 1);
  assert.equal(w.mostCommonUnresolvedCategory, 'payout_blocked_attention');
  assert.ok(w.healthyPercent > 0);
});
