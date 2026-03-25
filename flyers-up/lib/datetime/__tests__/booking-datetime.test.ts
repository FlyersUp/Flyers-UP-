/**
 * Canonical booking datetime utilities (Luxon + America/New_York defaults).
 * Run: npm test
 */
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import { Settings } from 'luxon';
import { bookingWallTimeToUtcIso, addHoursToUtcIso } from '../booking-instant';
import { formatGoogleCalendarDatesParam, formatIcsUtcDateTime } from '../calendar-export';
import { serviceDatePrefetchRange, todayIsoInBookingTimezone } from '../today';

afterEach(() => {
  Settings.now = () => Date.now();
});

describe('bookingWallTimeToUtcIso', () => {
  it('maps 3:00 PM America/New_York to UTC (EDT)', () => {
    assert.strictEqual(
      bookingWallTimeToUtcIso('2026-03-25', '3:00 PM', 'America/New_York'),
      '2026-03-25T19:00:00.000Z'
    );
  });

  it('maps 3:00 PM America/New_York to UTC (EST)', () => {
    assert.strictEqual(
      bookingWallTimeToUtcIso('2026-01-15', '3:00 PM', 'America/New_York'),
      '2026-01-15T20:00:00.000Z'
    );
  });

  it('spring forward gap: Luxon shifts non-existent local time to the next valid instant', () => {
    const iso = bookingWallTimeToUtcIso('2026-03-08', '2:30 AM', 'America/New_York');
    assert.strictEqual(iso, '2026-03-08T07:30:00.000Z');
  });

  it('spring forward: 3:00 AM exists on transition day', () => {
    const iso = bookingWallTimeToUtcIso('2026-03-08', '3:00 AM', 'America/New_York');
    assert.ok(iso);
    assert.match(iso, /^2026-03-08T/);
  });

  it('fall back: 1:30 AM on duplicate hour resolves to a valid instant', () => {
    const iso = bookingWallTimeToUtcIso('2025-11-01', '1:30 AM', 'America/New_York');
    assert.ok(iso);
  });
});

describe('addHoursToUtcIso', () => {
  it('adds hours on the UTC timeline', () => {
    assert.strictEqual(
      addHoursToUtcIso('2026-03-25T19:00:00.000Z', 1),
      '2026-03-25T20:00:00.000Z'
    );
  });
});

describe('formatGoogleCalendarDatesParam', () => {
  it('emits YYYYMMDDTHHmmssZ for both ends', () => {
    assert.strictEqual(
      formatGoogleCalendarDatesParam('2026-03-25T19:00:00.000Z', '2026-03-25T20:00:00.000Z'),
      '20260325T190000Z/20260325T200000Z'
    );
  });
});

describe('formatIcsUtcDateTime', () => {
  it('emits UTC DT* fragment', () => {
    assert.strictEqual(formatIcsUtcDateTime('2026-03-25T19:00:00.000Z'), '20260325T190000Z');
  });
});

describe('serviceDatePrefetchRange', () => {
  it('returns min <= max spanning a few days', () => {
    Settings.now = () => new Date('2026-06-15T12:00:00.000Z').getTime();
    const { min, max } = serviceDatePrefetchRange('America/New_York');
    assert.ok(min <= max);
    assert.match(min, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(max, /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('todayIsoInBookingTimezone', () => {
  it('uses IANA zone for the calendar day, not raw UTC date', () => {
    // 2026-03-25 02:00 UTC → still Mar 24 evening in New York (EDT)
    Settings.now = () => new Date('2026-03-25T02:00:00.000Z').getTime();
    assert.strictEqual(todayIsoInBookingTimezone('America/New_York'), '2026-03-24');
    assert.notStrictEqual(
      new Date(Settings.now()).toISOString().slice(0, 10),
      todayIsoInBookingTimezone('America/New_York')
    );
  });
});
