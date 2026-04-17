/**
 * Run: npx tsx --test lib/bookings/__tests__/post-completion-review-cancel.test.ts
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateCancellationPolicy, mapDbStatusToBookingStage } from '@/lib/operations/cancellationPolicy';
import { buildPayoutReleaseEligibilitySnapshot, type PayoutReleaseSnapshotBuildContext } from '@/lib/bookings/payout-release-eligibility-snapshot';
import {
  isCustomerCancelDuringPostCompletionReviewWindow,
  type BookingRowForReviewCancel,
} from '@/lib/bookings/post-completion-review-cancel';
import { isBookingExcludedFromScheduledFinalCharge } from '@/lib/bookings/final-charge-candidates';

function ctxBase(): PayoutReleaseSnapshotBuildContext {
  return {
    initiatedByAdmin: false,
    milestoneGate: { fetchError: false, enforceMilestoneGate: false, scheduleOk: true },
    proPayoutsOnHold: false,
  };
}

describe('post-completion review cancel', () => {
  it('detects customer review window (final_pending + deadline + completed service)', () => {
    const deadline = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    const row: BookingRowForReviewCancel = {
      id: 'b1',
      status: 'awaiting_remaining_payment',
      service_status: 'completed',
      payment_lifecycle_status: 'final_pending',
      customer_review_deadline_at: deadline,
      final_payment_status: 'UNPAID',
    };
    assert.equal(isCustomerCancelDuringPostCompletionReviewWindow(row), true);
  });

  it('rejects when review deadline has passed', () => {
    const deadline = new Date(Date.now() - 60 * 1000).toISOString();
    const row: BookingRowForReviewCancel = {
      id: 'b1',
      status: 'awaiting_remaining_payment',
      service_status: 'completed',
      payment_lifecycle_status: 'final_pending',
      customer_review_deadline_at: deadline,
      final_payment_status: 'UNPAID',
    };
    assert.equal(isCustomerCancelDuringPostCompletionReviewWindow(row), false);
  });

  it('policy: >12h left in review window → full deposit refund', () => {
    const canceledAt = new Date('2026-04-10T12:00:00.000Z');
    const deadline = new Date('2026-04-11T12:00:00.000Z');
    const d = evaluateCancellationPolicy({
      canceledBy: 'customer',
      bookingStage: 'post_completion_review',
      scheduledStartAt: new Date('2026-04-01T10:00:00.000Z'),
      canceledAt,
      reasonCode: 'customer_change_plans',
      hasEvidence: false,
      depositPaidCents: 2000,
      remainingPaidCents: 0,
      depositAmountCents: 2000,
      customerReviewDeadlineAt: deadline,
    });
    assert.equal(d.refundType, 'full');
    assert.equal(d.refundAmountCents, 2000);
    assert.equal(d.ruleFired, 'customer_post_completion_review_gt12h_left');
  });

  it('policy: ≤12h but >0h left → 50% deposit refund', () => {
    const canceledAt = new Date('2026-04-10T18:00:00.000Z');
    const deadline = new Date('2026-04-11T06:00:00.000Z');
    const d = evaluateCancellationPolicy({
      canceledBy: 'customer',
      bookingStage: 'post_completion_review',
      scheduledStartAt: new Date('2026-04-01T10:00:00.000Z'),
      canceledAt,
      reasonCode: 'customer_change_plans',
      hasEvidence: false,
      depositPaidCents: 2000,
      remainingPaidCents: 0,
      depositAmountCents: 2000,
      customerReviewDeadlineAt: deadline,
    });
    assert.equal(d.refundType, 'partial');
    assert.equal(d.refundAmountCents, 1000);
    assert.equal(d.ruleFired, 'customer_post_completion_review_partial_deposit');
  });

  it('mapDbStatusToBookingStage maps awaiting_remaining_payment to post_completion_review', () => {
    assert.equal(mapDbStatusToBookingStage('awaiting_remaining_payment'), 'post_completion_review');
  });

  it('scheduled final charge excludes cancelled_during_review and final CANCELLED', () => {
    assert.equal(
      isBookingExcludedFromScheduledFinalCharge({
        payment_lifecycle_status: 'cancelled_during_review',
        final_payment_status: 'UNPAID',
      }),
      true
    );
    assert.equal(
      isBookingExcludedFromScheduledFinalCharge({
        payment_lifecycle_status: 'final_pending',
        final_payment_status: 'CANCELLED',
      }),
      true
    );
    assert.equal(
      isBookingExcludedFromScheduledFinalCharge({
        payment_lifecycle_status: 'final_pending',
        final_payment_status: 'UNPAID',
      }),
      false
    );
  });

  it('payout snapshot blocks cancelled_during_review', () => {
    const snap = buildPayoutReleaseEligibilitySnapshot(
      {
        id: 'b1',
        payment_lifecycle_status: 'cancelled_during_review',
        paid_deposit_at: new Date().toISOString(),
        paid_remaining_at: new Date().toISOString(),
        payout_released: false,
        admin_hold: false,
        dispute_status: 'none',
        refund_status: 'none',
      },
      ctxBase()
    );
    assert.equal(snap.eligible, false);
    assert.equal(snap.holdReason, 'customer_refunded');
  });
});
