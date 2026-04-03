/**
 * Pro account closure evaluation (pure logic + terminal booking set).
 * Run: npx tsx --test lib/pro/__tests__/account-closure.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  evaluateProClosureFromBookingsAndReviews,
  isBookingStatusTerminalForClosure,
  type ProClosureBookingRow,
} from '../account-closure-service';

describe('account closure', () => {
  describe('isBookingStatusTerminalForClosure', () => {
    it('treats in_progress as non-terminal', () => {
      assert.strictEqual(isBookingStatusTerminalForClosure('in_progress'), false);
    });
    it('treats completed as terminal', () => {
      assert.strictEqual(isBookingStatusTerminalForClosure('completed'), true);
    });
    it('treats customer_confirmed and payout_released as terminal', () => {
      assert.strictEqual(isBookingStatusTerminalForClosure('customer_confirmed'), true);
      assert.strictEqual(isBookingStatusTerminalForClosure('payout_released'), true);
    });
    it('treats canceled_no_show variants as terminal', () => {
      assert.strictEqual(isBookingStatusTerminalForClosure('canceled_no_show_pro'), true);
      assert.strictEqual(isBookingStatusTerminalForClosure('canceled_no_show_customer'), true);
    });
  });

  describe('evaluateProClosureFromBookingsAndReviews', () => {
    const noBookings: ProClosureBookingRow[] = [];

    it('allows when no bookings and no payout/dispute blocks', () => {
      const r = evaluateProClosureFromBookingsAndReviews(noBookings, new Set(), new Set());
      assert.strictEqual(r.blocked, false);
      assert.strictEqual(r.blocked_by.length, 0);
    });

    it('blocks on non-terminal booking', () => {
      const bookings: ProClosureBookingRow[] = [{ id: 'b1', status: 'accepted' }];
      const r = evaluateProClosureFromBookingsAndReviews(bookings, new Set(), new Set());
      assert.strictEqual(r.blocked, true);
      assert.ok(r.blocked_by.some((x) => x.code === 'active_booking'));
    });

    it('does not block on terminal booking only', () => {
      const bookings: ProClosureBookingRow[] = [{ id: 'b1', status: 'completed' }];
      const r = evaluateProClosureFromBookingsAndReviews(bookings, new Set(), new Set());
      assert.strictEqual(r.blocked, false);
    });

    it('does not block when history only has post-completion statuses', () => {
      const bookings: ProClosureBookingRow[] = [
        { id: 'b1', status: 'customer_confirmed' },
        { id: 'b2', status: 'payout_eligible' },
      ];
      const r = evaluateProClosureFromBookingsAndReviews(bookings, new Set(), new Set());
      assert.strictEqual(r.blocked, false);
    });

    it('blocks on pending payout review', () => {
      const pending = new Set(['b1']);
      const r = evaluateProClosureFromBookingsAndReviews(noBookings, pending, new Set());
      assert.strictEqual(r.blocked, true);
      assert.ok(r.blocked_by.some((x) => x.code === 'payout_review_pending'));
    });

    it('blocks on open dispute', () => {
      const open = new Set(['b2']);
      const r = evaluateProClosureFromBookingsAndReviews(noBookings, new Set(), open);
      assert.strictEqual(r.blocked, true);
      assert.ok(r.blocked_by.some((x) => x.code === 'open_dispute'));
    });

    it('stacks payout and dispute when no active booking', () => {
      const r = evaluateProClosureFromBookingsAndReviews(
        noBookings,
        new Set(['a']),
        new Set(['b'])
      );
      assert.strictEqual(r.blocked, true);
      assert.ok(r.blocked_by.some((x) => x.code === 'payout_review_pending'));
      assert.ok(r.blocked_by.some((x) => x.code === 'open_dispute'));
    });
  });
});
