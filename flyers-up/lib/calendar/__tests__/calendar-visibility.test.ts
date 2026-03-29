/**
 * Tests for calendar visibility and committed states.
 * Run: npx tsx --test lib/calendar/__tests__/calendar-visibility.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isCalendarCommittedStatus, CALENDAR_COMMITTED_STATUSES } from '../committed-states';
import { parseBookingStart, parseServiceTime } from '../time-utils';
import { bookingToCalendarEvent } from '../event-from-booking';

describe('calendar committed states', () => {
  it('deposit_paid is committed', () => {
    assert.ok(isCalendarCommittedStatus('deposit_paid'));
  });

  it('accepted is committed', () => {
    assert.ok(isCalendarCommittedStatus('accepted'));
  });

  it('in_progress is committed', () => {
    assert.ok(isCalendarCommittedStatus('in_progress'));
  });

  it('completed_pending_payment is committed', () => {
    assert.ok(isCalendarCommittedStatus('completed_pending_payment'));
  });

  it('cancelled is not committed', () => {
    assert.ok(!isCalendarCommittedStatus('cancelled'));
  });

  it('awaiting_deposit_payment is not committed', () => {
    assert.ok(!isCalendarCommittedStatus('awaiting_deposit_payment'));
  });
});

describe('parseServiceTime', () => {
  it('parses "10:00 AM"', () => {
    const r = parseServiceTime('10:00 AM');
    assert.ok(r);
    assert.strictEqual(r.hours, 10);
    assert.strictEqual(r.minutes, 0);
  });

  it('parses "2:30 PM"', () => {
    const r = parseServiceTime('2:30 PM');
    assert.ok(r);
    assert.strictEqual(r.hours, 14);
    assert.strictEqual(r.minutes, 30);
  });

  it('parses "14:00" military', () => {
    const r = parseServiceTime('14:00');
    assert.ok(r);
    assert.strictEqual(r.hours, 14);
    assert.strictEqual(r.minutes, 0);
  });
});

describe('parseBookingStart', () => {
  it('maps wall clock in America/New_York to the correct UTC instant (EDT)', () => {
    const d = parseBookingStart('2025-03-20', '10:00 AM', 'America/New_York');
    assert.ok(d);
    assert.strictEqual(d.toISOString(), '2025-03-20T14:00:00.000Z');
  });

  it('maps wall clock in America/New_York to the correct UTC instant (EST)', () => {
    const d = parseBookingStart('2025-01-15', '10:00 AM', 'America/New_York');
    assert.ok(d);
    assert.strictEqual(d.toISOString(), '2025-01-15T15:00:00.000Z');
  });
});

describe('bookingToCalendarEvent', () => {
  it('returns null for non-committed status', () => {
    const b = {
      id: 'x',
      customer_id: 'c',
      pro_id: 'p',
      service_date: '2025-03-20',
      service_time: '10:00 AM',
      address: '123 Main',
      notes: null,
      status: 'cancelled',
    };
    assert.strictEqual(bookingToCalendarEvent(b as any, 'customer'), null);
  });

  it('returns null for requested on customer calendar', () => {
    const b = {
      id: 'x',
      customer_id: 'c',
      pro_id: 'p',
      service_date: '2025-03-20',
      service_time: '10:00 AM',
      address: '123 Main',
      notes: null,
      status: 'requested',
    };
    assert.strictEqual(bookingToCalendarEvent(b as any, 'customer'), null);
  });

  it('returns event for requested on pro calendar', () => {
    const b = {
      id: 'x',
      customer_id: 'c',
      pro_id: 'p',
      service_date: '2025-03-20',
      service_time: '10:00 AM',
      address: '123 Main',
      notes: null,
      status: 'requested',
      pro: { displayName: 'Pro', serviceName: 'Plumbing' },
    };
    const e = bookingToCalendarEvent(b as any, 'pro');
    assert.ok(e);
    assert.strictEqual(e.status, 'requested');
    assert.ok(e.detailHref.includes('/pro/jobs/'));
  });

  it('returns event for deposit_paid', () => {
    const b = {
      id: 'x',
      customer_id: 'c',
      pro_id: 'p',
      service_date: '2025-03-20',
      service_time: '10:00 AM',
      address: '123 Main',
      notes: null,
      status: 'deposit_paid',
      pro: { displayName: 'Pro', serviceName: 'Plumbing' },
    };
    const e = bookingToCalendarEvent(b as any, 'customer');
    assert.ok(e);
    assert.strictEqual(e.bookingId, 'x');
    assert.strictEqual(e.serviceTitle, 'Plumbing');
    assert.ok(e.startAt);
    assert.ok(e.detailHref.includes('/customer/bookings/'));
  });
});
