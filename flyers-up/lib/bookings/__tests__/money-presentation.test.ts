/**
 * Run: npx tsx --test lib/bookings/__tests__/money-presentation.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  customerPaymentTimelineModelFromPresentation,
  getMoneyPresentation,
  getMoneyTimelineStep,
  getProPayoutTimelineActiveIndex,
  shouldShowPaymentHeldFromMoneyState,
} from '../money-presentation';
import { paymentTimelineFromMoneyState } from '../payment-timeline';
import type { MoneyState } from '../money-state';

function state(partial: Partial<MoneyState>): MoneyState {
  return {
    final: 'final_due',
    payout: 'inactive',
    remainingCents: 0,
    reviewDeadlineIso: null,
    raw: { kind: 'post_review_auto_pending', remainingCents: 0 },
    ...partial,
  };
}

describe('getMoneyPresentation — customer', () => {
  it('final_due: pay-now card copy + timeline step completed', () => {
    const p = getMoneyPresentation(state({ final: 'final_due', payout: 'inactive' }), 'customer');
    assert.strictEqual(p.title, 'Remaining payment due');
    assert.strictEqual(p.ctaPrimary, 'Pay now');
    assert.strictEqual(p.timelineStep, 'completed');
  });

  it('final_processing: processing copy + auto_charge timeline', () => {
    const p = getMoneyPresentation(
      state({ final: 'final_processing', payout: 'inactive', raw: { kind: 'processing', remainingCents: 100 } }),
      'customer'
    );
    assert.strictEqual(p.title, 'Processing payment');
    assert.strictEqual(p.timelineStep, 'auto_charge');
  });

  it('final_paid without payout hold: paid timeline', () => {
    const p = getMoneyPresentation(state({ final: 'final_paid', payout: 'inactive' }), 'customer');
    assert.strictEqual(p.title, 'Payment complete');
    assert.strictEqual(p.timelineStep, 'paid');
  });
});

describe('getMoneyPresentation — customer held (payout_held)', () => {
  const heldMoney = state({
    final: 'final_paid',
    payout: 'payout_held',
    raw: { kind: 'success' },
  });

  it('shouldShowPaymentHeldFromMoneyState is true', () => {
    assert.strictEqual(shouldShowPaymentHeldFromMoneyState(heldMoney), true);
  });

  it('renders held presentation with under-review badge', () => {
    const p = getMoneyPresentation(heldMoney, 'customer', {
      holdSignals: {
        payoutReleased: false,
        paymentLifecycleStatus: 'payout_on_hold',
        suspiciousCompletion: true,
        suspiciousCompletionReason: 'too_fast',
      },
      heldTimelineTimestamps: { deposit: '2024-01-01', completed: '2024-01-02' },
    });
    assert.strictEqual(p.badge, 'Under review');
    assert.strictEqual(p.timelineStep, 'held');
    assert.strictEqual(p.timelineVariant, 'customer_held');
    assert.ok(p.body.length > 0);
  });
});

describe('getMoneyPresentation — pro', () => {
  it('payout_processing after final_paid', () => {
    const p = getMoneyPresentation(
      state({ final: 'final_paid', payout: 'payout_processing' }),
      'pro'
    );
    assert.strictEqual(p.title, 'Payment released');
    assert.strictEqual(p.timelineStep, 'released');
  });

  it('payout_paid: you got paid', () => {
    const p = getMoneyPresentation(state({ final: 'final_paid', payout: 'payout_paid' }), 'pro');
    assert.strictEqual(p.title, 'You got paid');
    assert.strictEqual(p.timelineStep, 'paid');
  });

  it('payout_held: pro held card + vertical timeline', () => {
    const m = state({ final: 'final_paid', payout: 'payout_held', raw: { kind: 'success' } });
    const p = getMoneyPresentation(m, 'pro', {
      holdSignals: {
        payoutReleased: false,
        paymentLifecycleStatus: 'payout_on_hold',
      },
      heldTimelineTimestamps: { deposit: '2024-01-01', completed: '2024-01-02' },
    });
    assert.strictEqual(p.title, 'Payment temporarily held');
    assert.strictEqual(p.timelineStep, 'held');
    assert.ok(p.heldProTimeline && p.heldProTimeline.length >= 3);
    const current = p.heldProTimeline!.filter((i) => i.state === 'current');
    assert.strictEqual(current.length, 1);
    assert.strictEqual(current[0]!.key, 'held');
  });
});

describe('getMoneyTimelineStep + payout index', () => {
  it('maps final_due to completed', () => {
    assert.strictEqual(getMoneyTimelineStep(state({ final: 'final_due' })), 'completed');
  });

  it('maps payout_paid to paid index 3', () => {
    const m = state({ final: 'final_paid', payout: 'payout_paid' });
    assert.strictEqual(getMoneyTimelineStep(m), 'paid');
    assert.strictEqual(getProPayoutTimelineActiveIndex(m), 3);
  });

  it('maps payout_held to held index 1', () => {
    const m = state({ final: 'final_paid', payout: 'payout_held' });
    assert.strictEqual(getMoneyTimelineStep(m), 'held');
    assert.strictEqual(getProPayoutTimelineActiveIndex(m), 1);
  });
});

describe('customer timeline from presentation only', () => {
  it('final_processing highlights auto-charge via presentation', () => {
    const m = state({
      final: 'final_processing',
      payout: 'inactive',
      raw: { kind: 'processing', remainingCents: 50 },
    });
    const pres = getMoneyPresentation(m, 'customer');
    const tl = customerPaymentTimelineModelFromPresentation(m, pres);
    assert.deepStrictEqual(tl, {
      deposit: 'complete',
      completed: 'complete',
      autoCharge: 'processing',
      paid: 'upcoming',
    });
  });

  it('paymentTimelineFromMoneyState matches presentation-driven model', () => {
    const m = state({
      final: 'final_due',
      payout: 'inactive',
      raw: { kind: 'post_review_auto_pending', remainingCents: 100 },
    });
    const pres = getMoneyPresentation(m, 'customer');
    const fromHelper = customerPaymentTimelineModelFromPresentation(m, pres);
    const fromShim = paymentTimelineFromMoneyState(m);
    assert.deepStrictEqual(fromShim, fromHelper);
  });
});
