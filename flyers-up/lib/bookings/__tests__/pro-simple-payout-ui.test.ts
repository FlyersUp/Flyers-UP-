import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  deriveSimplePayoutState,
  mapProPayoutHoldDescription,
  payoutNotReadyReasonFromHoldRaw,
  trueHoldUiKeyFromRaw,
  type SimplePayoutStateInput,
} from '../pro-simple-payout-ui';

function inp(overrides: Partial<SimplePayoutStateInput> = {}): SimplePayoutStateInput {
  return {
    finalPaid: true,
    bookingCompleted: true,
    transferIdPresent: false,
    transferStatus: null,
    payoutReleased: false,
    payoutBlocked: false,
    holdReasonRaw: null,
    hasDispute: false,
    refundPending: false,
    failed: false,
    moneyPayoutHeld: false,
    ...overrides,
  };
}

describe('deriveSimplePayoutState', () => {
  it('failed wins first', () => {
    const r = deriveSimplePayoutState(inp({ failed: true, refundPending: true }));
    assert.equal(r.state, 'failed');
    assert.equal(r.notReadyReason, null);
  });

  it('held for refund pending', () => {
    const r = deriveSimplePayoutState(inp({ refundPending: true }));
    assert.equal(r.state, 'held');
    assert.equal(r.holdUiKey, 'refund_pending');
    assert.equal(r.notReadyReason, null);
  });

  it('held for dispute hold reason', () => {
    const r = deriveSimplePayoutState(inp({ holdReasonRaw: 'dispute_open' }));
    assert.equal(r.state, 'held');
    assert.equal(r.holdUiKey, 'open_dispute');
  });

  it('not_ready when final not paid', () => {
    const r = deriveSimplePayoutState(inp({ finalPaid: false, bookingCompleted: true }));
    assert.equal(r.state, 'not_ready');
    assert.equal(r.notReadyReason, 'final_payment_pending');
  });

  it('not_ready when job not complete', () => {
    const r = deriveSimplePayoutState(inp({ finalPaid: true, bookingCompleted: false }));
    assert.equal(r.state, 'not_ready');
    assert.equal(r.notReadyReason, 'booking_not_completed');
  });

  it('booking_not_completed hold is not_ready, not held', () => {
    const r = deriveSimplePayoutState(
      inp({ holdReasonRaw: 'booking_not_completed', payoutBlocked: true, moneyPayoutHeld: true })
    );
    assert.equal(r.state, 'not_ready');
    assert.equal(r.notReadyReason, 'booking_not_completed');
  });

  it('paid when payout released', () => {
    const r = deriveSimplePayoutState(inp({ payoutReleased: true }));
    assert.equal(r.state, 'paid');
  });

  it('paid when transfer status paid', () => {
    const r = deriveSimplePayoutState(
      inp({ transferIdPresent: true, transferStatus: 'paid', payoutReleased: false })
    );
    assert.equal(r.state, 'paid');
  });

  it('processing when transfer id present but not settled', () => {
    const r = deriveSimplePayoutState(
      inp({ transferIdPresent: true, transferStatus: 'pending', payoutReleased: false })
    );
    assert.equal(r.state, 'processing');
  });

  it('ready when paid and complete but no transfer yet', () => {
    const r = deriveSimplePayoutState(inp());
    assert.equal(r.state, 'ready');
  });

  it('insufficient_completion_evidence is a not-ready reason, not a true hold key', () => {
    assert.equal(payoutNotReadyReasonFromHoldRaw('insufficient_completion_evidence'), 'booking_not_completed');
    assert.equal(trueHoldUiKeyFromRaw('insufficient_completion_evidence'), null);
    assert.ok(!mapProPayoutHoldDescription('generic').toLowerCase().includes('insufficient'));
  });

  it('admin_review_required maps to not_ready (ops), not held', () => {
    assert.equal(payoutNotReadyReasonFromHoldRaw('admin_review_required'), 'generic');
    assert.equal(trueHoldUiKeyFromRaw('admin_review_required'), null);
    const r = deriveSimplePayoutState(
      inp({
        holdReasonRaw: 'admin_review_required',
        payoutBlocked: true,
        moneyPayoutHeld: false,
      })
    );
    assert.equal(r.state, 'not_ready');
    assert.equal(r.notReadyReason, 'generic');
    assert.equal(r.holdUiKey, null);
  });
});
