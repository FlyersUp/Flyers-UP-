import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import {
  buildExistingBookingRangesForOverlap,
  validateProAvailability,
} from '@/lib/operations/availabilityValidation';

test('same-day slot far enough ahead is allowed (America/New_York wall clock)', () => {
  const t0 = DateTime.fromISO('2026-06-10T15:00:00.000Z', { zone: 'utc' }).toMillis();
  const r = validateProAvailability({
    proId: 'p',
    proUserId: 'u',
    serviceDate: '2026-06-10',
    serviceTime: '14:00',
    bookingTimeZone: 'America/New_York',
    proActive: true,
    leadTimeMinutes: 30,
    sameDayEnabled: true,
    existingBookingRanges: [],
    clockNowMs: t0,
  });
  assert.equal(r.allowed, 'request_only_allowed');
});

test('same-day slot inside 90m floor is rejected even if pro lead is 30m', () => {
  const t0 = DateTime.fromISO('2026-06-10T15:00:00.000Z', { zone: 'utc' }).toMillis();
  const r = validateProAvailability({
    proId: 'p',
    proUserId: 'u',
    serviceDate: '2026-06-10',
    serviceTime: '11:30',
    bookingTimeZone: 'America/New_York',
    proActive: true,
    leadTimeMinutes: 30,
    sameDayEnabled: true,
    existingBookingRanges: [],
    clockNowMs: t0,
  });
  assert.equal(r.allowed, 'unavailable');
});

test('future calendar day uses pro lead only (120m ok when same-day floor is 90)', () => {
  const t0 = DateTime.fromISO('2026-06-10T15:00:00.000Z', { zone: 'utc' }).toMillis();
  const r = validateProAvailability({
    proId: 'p',
    proUserId: 'u',
    serviceDate: '2026-06-11',
    serviceTime: '10:00',
    bookingTimeZone: 'America/New_York',
    proActive: true,
    leadTimeMinutes: 60,
    sameDayEnabled: true,
    existingBookingRanges: [],
    clockNowMs: t0,
  });
  assert.equal(r.allowed, 'request_only_allowed');
});

test('timezone-safe: pro local calendar day vs UTC (LA still on service_date while UTC is next day)', () => {
  const t0 = DateTime.fromISO('2026-06-11T04:00:00.000Z', { zone: 'utc' }).toMillis();
  const r = validateProAvailability({
    proId: 'p',
    proUserId: 'u',
    serviceDate: '2026-06-10',
    serviceTime: '23:00',
    bookingTimeZone: 'America/Los_Angeles',
    proActive: true,
    leadTimeMinutes: 30,
    sameDayEnabled: true,
    existingBookingRanges: [],
    clockNowMs: t0,
  });
  assert.equal(r.allowed, 'request_only_allowed');
});

test('requested booking does not produce overlap ranges', () => {
  const ranges = buildExistingBookingRangesForOverlap(
    [
      {
        id: '1',
        service_date: '2026-03-04',
        service_time: '10:00',
        booking_timezone: 'America/New_York',
        status: 'requested',
      },
    ],
    { defaultTimeZone: 'America/New_York' }
  );
  assert.equal(ranges.length, 0);
});

test('deposit_paid booking produces overlap range', () => {
  const ranges = buildExistingBookingRangesForOverlap(
    [
      {
        id: '1',
        service_date: '2026-03-04',
        service_time: '10:00',
        booking_timezone: 'America/New_York',
        status: 'deposit_paid',
        duration_hours: 1,
      },
    ],
    { defaultTimeZone: 'America/New_York' }
  );
  assert.equal(ranges.length, 1);
  assert.ok(ranges[0]!.endAt.getTime() > ranges[0]!.startAt.getTime());
});
