/**
 * Tests for pro-visible status mapping.
 * Run: node --test lib/bookings/__tests__/pro-visible-statuses.test.ts
 * (or: npx tsx --test lib/bookings/__tests__/pro-visible-statuses.test.ts)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  isIncomingStatus,
  isOpenJobStatus,
  isTodayAtGlanceStatus,
  canProStart,
  INCOMING_STATUSES,
  TODAY_AT_GLANCE_STATUSES,
  PRO_BOOKINGS_ACTIVE_TAB_STATUSES,
} from '../pro-visible-statuses';

describe('pro-visible-statuses', () => {
  describe('deposit_paid visibility', () => {
    it('deposit_paid is in Incoming (pro acknowledgment needed)', () => {
      assert.ok(isIncomingStatus('deposit_paid'), 'deposit_paid must be incoming');
    });

    it('deposit_paid is in Open Jobs', () => {
      assert.ok(isOpenJobStatus('deposit_paid'), 'deposit_paid must be open job');
    });

    it('deposit_paid is in Today at a Glance', () => {
      assert.ok(isTodayAtGlanceStatus('deposit_paid'), 'deposit_paid must show in Today');
    });

    it('deposit_paid allows pro to Start', () => {
      assert.ok(canProStart('deposit_paid'), 'pro must be able to start deposit_paid job');
    });
  });

  describe('same-day vs future-day logic', () => {
    it('Today statuses include deposit_paid and active workflow', () => {
      const today = [...TODAY_AT_GLANCE_STATUSES];
      assert.ok(today.includes('deposit_paid'));
      assert.ok(today.includes('in_progress'));
      assert.ok(today.includes('completed_pending_payment'));
    });

    it('Incoming includes deposit_paid for pro acknowledgment', () => {
      assert.ok(INCOMING_STATUSES.includes('deposit_paid'));
    });
  });

  describe('old statuses do not break', () => {
    it('requested is incoming', () => {
      assert.ok(isIncomingStatus('requested'));
    });

    it('accepted is incoming and open', () => {
      assert.ok(isIncomingStatus('accepted'));
      assert.ok(isOpenJobStatus('accepted'));
    });

    it('in_progress is open and today', () => {
      assert.ok(isOpenJobStatus('in_progress'));
      assert.ok(isTodayAtGlanceStatus('in_progress'));
    });

    it('cancelled is not incoming or open', () => {
      assert.ok(!isIncomingStatus('cancelled'));
      assert.ok(!isOpenJobStatus('cancelled'));
      assert.ok(!isTodayAtGlanceStatus('cancelled'));
    });
  });

  describe('PRO_BOOKINGS_ACTIVE_TAB_STATUSES (pro /pro/bookings active tab)', () => {
    it('includes deposit workflow statuses omitted by older hard-coded lists', () => {
      assert.ok(PRO_BOOKINGS_ACTIVE_TAB_STATUSES.includes('awaiting_deposit_payment'));
      assert.ok(PRO_BOOKINGS_ACTIVE_TAB_STATUSES.includes('deposit_paid'));
      assert.ok(PRO_BOOKINGS_ACTIVE_TAB_STATUSES.includes('accepted_pending_payment'));
      assert.ok(PRO_BOOKINGS_ACTIVE_TAB_STATUSES.includes('arrived'));
    });
  });
});
