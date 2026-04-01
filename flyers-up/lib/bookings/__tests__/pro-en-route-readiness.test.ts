import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DateTime } from 'luxon';
import { evaluateEnRouteScheduleGate, canProTransitionToEnRoute } from '../pro-en-route-readiness';

const ZONE = 'America/New_York';

describe('evaluateEnRouteScheduleGate', () => {
  it('blocks when calendar day is before service date in booking zone', () => {
    const nowMs = DateTime.fromObject(
      { year: 2026, month: 6, day: 15, hour: 12, minute: 0 },
      { zone: ZONE }
    ).toMillis();
    const r = evaluateEnRouteScheduleGate({
      service_date: '2026-06-16',
      service_time: '3:00 PM',
      booking_timezone: ZONE,
      nowMs,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, 'future_service_day');
  });

  it('blocks same service day before unlock (2h before start)', () => {
    const nowMs = DateTime.fromObject(
      { year: 2026, month: 6, day: 15, hour: 8, minute: 0 },
      { zone: ZONE }
    ).toMillis();
    const r = evaluateEnRouteScheduleGate({
      service_date: '2026-06-15',
      service_time: '3:00 PM',
      booking_timezone: ZONE,
      nowMs,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, 'before_unlock');
    if (!r.ok && r.reason === 'before_unlock') {
      assert.ok(r.unlockLabel.length > 0);
    }
  });

  it('allows within 2 hours of scheduled start', () => {
    const nowMs = DateTime.fromObject(
      { year: 2026, month: 6, day: 15, hour: 14, minute: 0 },
      { zone: ZONE }
    ).toMillis();
    const r = evaluateEnRouteScheduleGate({
      service_date: '2026-06-15',
      service_time: '3:00 PM',
      booking_timezone: ZONE,
      nowMs,
    });
    assert.equal(r.ok, true);
  });
});

describe('canProTransitionToEnRoute', () => {
  it('requires deposit when awaiting_deposit_payment even if time ok', () => {
    const nowMs = DateTime.fromObject(
      { year: 2026, month: 6, day: 15, hour: 14, minute: 0 },
      { zone: ZONE }
    ).toMillis();
    assert.equal(
      canProTransitionToEnRoute({
        status: 'awaiting_deposit_payment',
        paid_deposit_at: null,
        payment_status: 'UNPAID',
        service_date: '2026-06-15',
        service_time: '3:00 PM',
        booking_timezone: ZONE,
        nowMs,
      }),
      false
    );
  });

  it('allows deposit_paid when within time window', () => {
    const nowMs = DateTime.fromObject(
      { year: 2026, month: 6, day: 15, hour: 14, minute: 0 },
      { zone: ZONE }
    ).toMillis();
    assert.equal(
      canProTransitionToEnRoute({
        status: 'deposit_paid',
        paid_deposit_at: null,
        payment_status: 'PAID',
        service_date: '2026-06-15',
        service_time: '3:00 PM',
        booking_timezone: ZONE,
        nowMs,
      }),
      true
    );
  });
});
