/**
 * Tests for booking state machine and payout eligibility.
 * Run: npx tsx --test lib/bookings/__tests__/state-machine.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  canTransition,
  isPayoutBlockedStatus,
  isPayoutEligible,
  BOOKING_STATUS,
} from '../state-machine';

describe('state-machine', () => {
  describe('canTransition', () => {
    it('requested -> accepted', () => assert.ok(canTransition('requested', 'accepted')));
    it('requested -> declined', () => assert.ok(canTransition('requested', 'declined')));
    it('accepted -> awaiting_deposit_payment', () =>
      assert.ok(canTransition('accepted', 'awaiting_deposit_payment')));
    it('deposit_paid -> pro_en_route', () => assert.ok(canTransition('deposit_paid', 'pro_en_route')));
    it('deposit_paid -> in_progress', () => assert.ok(canTransition('deposit_paid', 'in_progress')));
    it('pro_en_route -> arrived', () => assert.ok(canTransition('pro_en_route', 'arrived')));
    it('arrived -> in_progress', () => assert.ok(canTransition('arrived', 'in_progress')));
    it('in_progress -> awaiting_remaining_payment', () =>
      assert.ok(canTransition('in_progress', 'awaiting_remaining_payment')));
    it('awaiting_customer_confirmation -> customer_confirmed', () =>
      assert.ok(canTransition('awaiting_customer_confirmation', 'customer_confirmed')));
    it('awaiting_customer_confirmation -> auto_confirmed', () =>
      assert.ok(canTransition('awaiting_customer_confirmation', 'auto_confirmed')));
    it('customer_confirmed -> payout_eligible', () =>
      assert.ok(canTransition('customer_confirmed', 'payout_eligible')));
    it('payout_eligible -> payout_released', () =>
      assert.ok(canTransition('payout_eligible', 'payout_released')));

    it('deposit_paid -> payout_released invalid', () =>
      assert.ok(!canTransition('deposit_paid', 'payout_released')));
    it('accepted -> payout_released invalid', () =>
      assert.ok(!canTransition('accepted', 'payout_released')));
  });

  describe('isPayoutBlockedStatus', () => {
    it('blocks accepted', () => assert.ok(isPayoutBlockedStatus('accepted')));
    it('blocks deposit_paid', () => assert.ok(isPayoutBlockedStatus('deposit_paid')));
    it('blocks pro_en_route', () => assert.ok(isPayoutBlockedStatus('pro_en_route')));
    it('blocks arrived', () => assert.ok(isPayoutBlockedStatus('arrived')));
    it('allows completed', () => assert.ok(!isPayoutBlockedStatus('completed')));
    it('allows customer_confirmed', () => assert.ok(!isPayoutBlockedStatus('customer_confirmed')));
    it('allows auto_confirmed', () => assert.ok(!isPayoutBlockedStatus('auto_confirmed')));
  });

  describe('isPayoutEligible', () => {
    const base = {
      status: 'completed',
      arrived_at: '2025-01-15T10:00:00Z',
      started_at: '2025-01-15T10:05:00Z',
      completed_at: '2025-01-15T11:00:00Z',
      customer_confirmed: true,
      auto_confirm_at: null,
      dispute_open: false,
      cancellation_reason: null,
      paid_deposit_at: '2025-01-14T12:00:00Z',
      paid_remaining_at: '2025-01-15T11:30:00Z',
      refund_status: 'none',
    };

    it('eligible when all conditions met', () => {
      const r = isPayoutEligible(base);
      assert.ok(r.eligible, r.reason);
    });

    it('blocked when arrived_at null', () => {
      const r = isPayoutEligible({ ...base, arrived_at: null });
      assert.ok(!r.eligible);
      assert.ok(r.reason?.includes('arrived'));
    });

    it('blocked when started_at null', () => {
      const r = isPayoutEligible({ ...base, started_at: null });
      assert.ok(!r.eligible);
      assert.ok(r.reason?.includes('started'));
    });

    it('blocked when completed_at null', () => {
      const r = isPayoutEligible({ ...base, completed_at: null });
      assert.ok(!r.eligible);
      assert.ok(r.reason?.includes('completed'));
    });

    it('blocked when dispute_open', () => {
      const r = isPayoutEligible({ ...base, dispute_open: true });
      assert.ok(!r.eligible);
      assert.ok(r.reason?.includes('Dispute'));
    });

    it('blocked when cancellation_reason pro_no_show', () => {
      const r = isPayoutEligible({ ...base, cancellation_reason: 'pro_no_show' });
      assert.ok(!r.eligible);
      assert.ok(r.reason?.includes('no-show'));
    });

    it('blocked when status is deposit_paid', () => {
      const r = isPayoutEligible({ ...base, status: 'deposit_paid' });
      assert.ok(!r.eligible);
    });

    it('blocked when not confirmed and auto_confirm in future', () => {
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const r = isPayoutEligible({
        ...base,
        customer_confirmed: false,
        auto_confirm_at: future,
      });
      assert.ok(!r.eligible);
    });

    it('eligible when customer_confirmed false but auto_confirm passed', () => {
      const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const r = isPayoutEligible({
        ...base,
        customer_confirmed: false,
        auto_confirm_at: past,
      });
      assert.ok(r.eligible, r.reason);
    });

    it('single-day ignores multi-day gate when is_multi_day false', () => {
      const r = isPayoutEligible({
        ...base,
        is_multi_day: false,
        multi_day_schedule_ok: false,
      });
      assert.ok(r.eligible, r.reason);
    });

    it('blocks when multi-day milestones not satisfied', () => {
      const r = isPayoutEligible({
        ...base,
        is_multi_day: true,
        multi_day_schedule_ok: false,
      });
      assert.ok(!r.eligible);
      assert.ok(r.reason?.includes('Multi-day'));
    });

    it('allows multi-day when schedule ok', () => {
      const r = isPayoutEligible({
        ...base,
        is_multi_day: true,
        multi_day_schedule_ok: true,
      });
      assert.ok(r.eligible, r.reason);
    });

    it('single-day ignores bad multi_day_schedule_ok when gate off', () => {
      const r = isPayoutEligible({
        ...base,
        is_multi_day: false,
        multi_day_schedule_ok: false,
      });
      assert.ok(r.eligible, r.reason);
    });
  });
});

