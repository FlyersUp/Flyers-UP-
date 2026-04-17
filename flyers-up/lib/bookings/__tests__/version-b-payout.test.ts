import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  deriveVersionBPaymentState,
  deriveVersionBPayoutState,
  evaluateVersionBPayoutEligibility,
} from '../version-b-payout';

const okMilestone = { fetchError: false, enforceMilestoneGate: false, scheduleOk: true };
const ctx = (overrides: Partial<{ initiatedByAdmin: boolean; proPayoutsOnHold: boolean }> = {}) => ({
  initiatedByAdmin: false,
  milestoneGate: okMilestone,
  proPayoutsOnHold: false,
  ...overrides,
});

const paidRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  payment_lifecycle_status: 'final_paid',
  final_payment_status: 'PAID',
  refund_status: 'none',
  suspicious_completion: false,
  arrived_at: '2026-01-01T10:00:00Z',
  started_at: '2026-01-01T11:00:00Z',
  completed_at: '2026-01-01T12:00:00Z',
  cancellation_reason: null,
  stripe_destination_account_id: 'acct_1',
  service_pros: { stripe_charges_enabled: true },
  ...overrides,
});

describe('evaluateVersionBPayoutEligibility', () => {
  it('deposit-only lifecycle => blocked final_payment_pending', () => {
    const r = evaluateVersionBPayoutEligibility(
      paidRow({ payment_lifecycle_status: 'deposit_paid', final_payment_status: 'UNPAID' }),
      ctx()
    );
    assert.equal(r.eligible, false);
    if (!r.eligible) {
      assert.equal(r.versionBBlock, 'final_payment_pending');
      assert.equal(r.holdReason, 'missing_final_payment');
    }
  });

  it('completed + final paid + connect ready => eligible (ready)', () => {
    const r = evaluateVersionBPayoutEligibility(paidRow(), ctx());
    assert.equal(r.eligible, true);
    if (r.eligible) assert.equal(r.versionBPayout, 'ready');
  });

  it('dispute => blocked open_dispute', () => {
    const r = evaluateVersionBPayoutEligibility(paidRow({ dispute_open: true, dispute_status: 'under_review' }), ctx());
    assert.equal(r.eligible, false);
    if (!r.eligible) assert.equal(r.versionBBlock, 'open_dispute');
  });

  it('refund pending => blocked refund_pending', () => {
    const r = evaluateVersionBPayoutEligibility(paidRow({ refund_status: 'pending' }), ctx());
    assert.equal(r.eligible, false);
    if (!r.eligible) assert.equal(r.versionBBlock, 'refund_pending');
  });

  it('admin_hold => blocked admin_hold', () => {
    const r = evaluateVersionBPayoutEligibility(paidRow({ admin_hold: true }), ctx());
    assert.equal(r.eligible, false);
    if (!r.eligible) assert.equal(r.versionBBlock, 'admin_hold');
  });

  it('suspicious completion => fraud_hold', () => {
    const r = evaluateVersionBPayoutEligibility(paidRow({ suspicious_completion: true }), ctx());
    assert.equal(r.eligible, false);
    if (!r.eligible) assert.equal(r.versionBBlock, 'fraud_hold');
  });

  it('missing connect => pro_not_ready_for_payout', () => {
    const r = evaluateVersionBPayoutEligibility(
      paidRow({ stripe_destination_account_id: null, service_pros: { stripe_account_id: '' } }),
      ctx()
    );
    assert.equal(r.eligible, false);
    if (!r.eligible) assert.equal(r.versionBBlock, 'pro_not_ready_for_payout');
  });

  it('charges disabled => pro_not_ready_for_payout', () => {
    const r = evaluateVersionBPayoutEligibility(
      paidRow({ service_pros: { stripe_charges_enabled: false } }),
      ctx()
    );
    assert.equal(r.eligible, false);
    if (!r.eligible) assert.equal(r.versionBBlock, 'pro_not_ready_for_payout');
  });

  it('pro payout compliance hold => fraud_hold', () => {
    const r = evaluateVersionBPayoutEligibility(paidRow(), ctx({ proPayoutsOnHold: true }));
    assert.equal(r.eligible, false);
    if (!r.eligible) assert.equal(r.versionBBlock, 'fraud_hold');
  });
});

describe('deriveVersionBPayoutState', () => {
  it('transfer failed => failed', () => {
    assert.equal(
      deriveVersionBPayoutState(
        { payout_released: false, payment_lifecycle_status: 'payout_ready', payout_status: 'failed' },
        {}
      ),
      'failed'
    );
  });

  it('booking_payouts processing + transfer id => processing', () => {
    assert.equal(
      deriveVersionBPayoutState(
        {
          payout_released: false,
          payment_lifecycle_status: 'payout_ready',
          payout_status: 'pending',
          stripe_transfer_id: 'tr_test_123',
        },
        { bookingPayoutStatus: 'processing' }
      ),
      'processing'
    );
  });

  it('released + payout_sent => paid', () => {
    assert.equal(
      deriveVersionBPayoutState(
        { payout_released: true, payment_lifecycle_status: 'payout_sent', payout_status: 'paid' },
        {}
      ),
      'paid'
    );
  });

  it('final_paid unreleased => ready', () => {
    assert.equal(
      deriveVersionBPayoutState(
        { payout_released: false, payment_lifecycle_status: 'final_paid', payout_status: 'pending' },
        {}
      ),
      'ready'
    );
  });
});

describe('deriveVersionBPaymentState', () => {
  it('maps final_paid to paid_in_full', () => {
    assert.equal(deriveVersionBPaymentState({ payment_lifecycle_status: 'final_paid' }), 'paid_in_full');
  });
  it('maps deposit_paid to deposit_paid', () => {
    assert.equal(deriveVersionBPaymentState({ payment_lifecycle_status: 'deposit_paid' }), 'deposit_paid');
  });
});
