import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildPayoutReleaseEligibilitySnapshot,
  type PayoutReleaseSnapshotBuildContext,
} from '../payout-release-eligibility-snapshot';
import { countValidJobCompletionAfterPhotoUrls } from '../job-completion-photo-count';

function ctxBase(overrides: Partial<PayoutReleaseSnapshotBuildContext> = {}): PayoutReleaseSnapshotBuildContext {
  return {
    initiatedByAdmin: false,
    milestoneGate: { fetchError: false, enforceMilestoneGate: false, scheduleOk: true },
    jobCompletion: {
      after_photo_urls: ['https://cdn.example/p1.jpg', 'https://cdn.example/p2.jpg'],
      booking_id: 'b1',
    },
    skipPhotoProof: false,
    proPayoutsOnHold: false,
    ...overrides,
  };
}

function baseRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = Date.now();
  const completed = new Date(now - 26 * 60 * 60 * 1000).toISOString();
  const autoConfirm = new Date(now - 2 * 60 * 60 * 1000).toISOString();
  return {
    id: 'b1',
    status: 'awaiting_customer_confirmation',
    arrived_at: completed,
    started_at: completed,
    completed_at: completed,
    customer_confirmed: false,
    auto_confirm_at: autoConfirm,
    dispute_open: false,
    cancellation_reason: null,
    paid_deposit_at: completed,
    paid_remaining_at: completed,
    refund_status: 'none',
    suspicious_completion: false,
    is_multi_day: false,
    payout_released: false,
    admin_hold: false,
    dispute_status: 'none',
    payment_lifecycle_status: 'final_paid',
    final_payment_status: 'PAID',
    payout_blocked: false,
    payout_hold_reason: 'none',
    requires_admin_review: false,
    stripe_destination_account_id: null,
    service_pros: { stripe_account_id: 'acct_test_123', user_id: 'pro-user-1', stripe_charges_enabled: true },
    ...overrides,
  };
}

describe('buildPayoutReleaseEligibilitySnapshot', () => {
  it('final_paid + all gates satisfied → eligible', () => {
    const snap = buildPayoutReleaseEligibilitySnapshot(baseRow(), ctxBase());
    assert.equal(snap.eligible, true);
    assert.equal(snap.holdReason, 'none');
    assert.deepEqual(snap.missingRequirements, []);
  });

  it('final_paid + requires_admin_review → not eligible', () => {
    const snap = buildPayoutReleaseEligibilitySnapshot(
      baseRow({ requires_admin_review: true }),
      ctxBase()
    );
    assert.equal(snap.eligible, false);
    assert.equal(snap.holdReason, 'admin_review_required');
    assert.ok(snap.missingRequirements.includes('admin_review_cleared'));
  });

  it('final_paid + post-completion review window not passed → not eligible', () => {
    const recent = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const snap = buildPayoutReleaseEligibilitySnapshot(
      baseRow({
        completed_at: recent,
        arrived_at: recent,
        started_at: recent,
        paid_deposit_at: recent,
        paid_remaining_at: recent,
        auto_confirm_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        customer_confirmed: false,
      }),
      ctxBase()
    );
    assert.equal(snap.eligible, false);
    assert.equal(snap.holdReason, 'waiting_post_completion_review');
    assert.ok(snap.missingRequirements.includes('post_completion_review_window'));
  });

  it('final_paid + no Connect destination → not eligible', () => {
    const snap = buildPayoutReleaseEligibilitySnapshot(
      baseRow({
        stripe_destination_account_id: null,
        service_pros: { stripe_account_id: '', user_id: 'u1', stripe_charges_enabled: true },
      }),
      ctxBase()
    );
    assert.equal(snap.eligible, false);
    assert.equal(snap.holdReason, 'missing_payment_method');
    assert.ok(snap.missingRequirements.includes('stripe_connect_destination_account'));
  });

  it('final_paid + customer refund succeeded → not eligible', () => {
    const snap = buildPayoutReleaseEligibilitySnapshot(
      baseRow({ refund_status: 'succeeded', payment_lifecycle_status: 'final_paid' }),
      ctxBase()
    );
    assert.equal(snap.eligible, false);
    assert.equal(snap.holdReason, 'customer_refunded');
    assert.ok(snap.missingRequirements.includes('not_customer_refunded'));
  });

  it('admin + payout_on_hold + insufficient_completion_evidence + final settled → eligible when operational gates pass', () => {
    const snap = buildPayoutReleaseEligibilitySnapshot(
      baseRow({
        payment_lifecycle_status: 'payout_on_hold',
        payout_hold_reason: 'insufficient_completion_evidence',
        final_payment_status: 'PAID',
      }),
      ctxBase({ initiatedByAdmin: true, skipPhotoProof: true })
    );
    assert.equal(snap.eligible, true);
    assert.deepEqual(snap.missingRequirements, []);
  });
});

describe('countValidJobCompletionAfterPhotoUrls', () => {
  it('rejects placeholder-like strings counted by naive UI', () => {
    assert.equal(countValidJobCompletionAfterPhotoUrls(['https://a/x.jpg', 'null', 'undefined']), 1);
    assert.equal(countValidJobCompletionAfterPhotoUrls(['https://a/1.jpg', 'https://a/2.jpg']), 2);
  });
});
