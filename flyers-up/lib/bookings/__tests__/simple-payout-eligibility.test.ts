import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateSimplePayoutTransferGate } from '../simple-payout-eligibility';

const baseRow = (): Record<string, unknown> => ({
  refund_status: 'none',
  suspicious_completion: false,
  arrived_at: '2026-01-01T10:00:00.000Z',
  started_at: '2026-01-01T10:30:00.000Z',
  completed_at: '2026-01-01T12:00:00.000Z',
  cancellation_reason: null,
  stripe_destination_account_id: 'acct_123',
  service_pros: { stripe_charges_enabled: true },
});

const okMilestone = { fetchError: false, enforceMilestoneGate: false, scheduleOk: true };

describe('evaluateSimplePayoutTransferGate', () => {
  it('returns eligible when all gates pass', () => {
    const r = evaluateSimplePayoutTransferGate(baseRow(), {
      initiatedByAdmin: false,
      milestoneGate: okMilestone,
      proPayoutsOnHold: false,
    });
    assert.equal(r.eligible, true);
  });

  it('blocks refund pending', () => {
    const r = evaluateSimplePayoutTransferGate(
      { ...baseRow(), refund_status: 'pending' },
      { initiatedByAdmin: false, milestoneGate: okMilestone, proPayoutsOnHold: false }
    );
    assert.equal(r.eligible, false);
    if (!r.eligible) assert.equal(r.holdReason, 'refund_pending');
  });

  it('blocks suspicious completion for non-admin', () => {
    const r = evaluateSimplePayoutTransferGate(
      { ...baseRow(), suspicious_completion: true },
      { initiatedByAdmin: false, milestoneGate: okMilestone, proPayoutsOnHold: false }
    );
    assert.equal(r.eligible, false);
    if (!r.eligible) assert.equal(r.holdReason, 'fraud_review');
  });

  it('allows suspicious completion when initiatedByAdmin', () => {
    const r = evaluateSimplePayoutTransferGate(
      { ...baseRow(), suspicious_completion: true },
      { initiatedByAdmin: true, milestoneGate: okMilestone, proPayoutsOnHold: false }
    );
    assert.equal(r.eligible, true);
  });

  it('blocks when milestone schedule not ok', () => {
    const r = evaluateSimplePayoutTransferGate(baseRow(), {
      initiatedByAdmin: false,
      milestoneGate: { fetchError: false, enforceMilestoneGate: true, scheduleOk: false },
      proPayoutsOnHold: false,
    });
    assert.equal(r.eligible, false);
    if (!r.eligible) assert.equal(r.holdReason, 'booking_not_completed');
  });

  it('blocks missing arrived_at', () => {
    const r = evaluateSimplePayoutTransferGate(
      { ...baseRow(), arrived_at: null },
      { initiatedByAdmin: false, milestoneGate: okMilestone, proPayoutsOnHold: false }
    );
    assert.equal(r.eligible, false);
  });

  it('blocks pro_no_show cancellation', () => {
    const r = evaluateSimplePayoutTransferGate(
      { ...baseRow(), cancellation_reason: 'pro_no_show' },
      { initiatedByAdmin: false, milestoneGate: okMilestone, proPayoutsOnHold: false }
    );
    assert.equal(r.eligible, false);
    if (!r.eligible) assert.equal(r.holdReason, 'no_show_review');
  });

  it('blocks missing Connect destination', () => {
    const r = evaluateSimplePayoutTransferGate(
      { ...baseRow(), stripe_destination_account_id: null, service_pros: { stripe_account_id: '' } },
      { initiatedByAdmin: false, milestoneGate: okMilestone, proPayoutsOnHold: false }
    );
    assert.equal(r.eligible, false);
    if (!r.eligible) assert.equal(r.holdReason, 'missing_payment_method');
  });

  it('blocks charges disabled for non-admin', () => {
    const r = evaluateSimplePayoutTransferGate(
      { ...baseRow(), service_pros: { stripe_charges_enabled: false } },
      { initiatedByAdmin: false, milestoneGate: okMilestone, proPayoutsOnHold: false }
    );
    assert.equal(r.eligible, false);
    if (!r.eligible) assert.equal(r.holdReason, 'missing_payment_method');
  });

  it('allows charges disabled for admin', () => {
    const r = evaluateSimplePayoutTransferGate(
      { ...baseRow(), service_pros: { stripe_charges_enabled: false } },
      { initiatedByAdmin: true, milestoneGate: okMilestone, proPayoutsOnHold: false }
    );
    assert.equal(r.eligible, true);
  });

  it('blocks pro payout compliance hold', () => {
    const r = evaluateSimplePayoutTransferGate(baseRow(), {
      initiatedByAdmin: false,
      milestoneGate: okMilestone,
      proPayoutsOnHold: true,
    });
    assert.equal(r.eligible, false);
    if (!r.eligible) assert.equal(r.holdReason, 'fraud_review');
  });
});
