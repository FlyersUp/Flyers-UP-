import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import {
  assertSlotBookable,
  computeMonthSummaries,
  computeSlotsForDay,
  proposedBookingUtcWindow,
  type ComputeContext,
} from '@/lib/availability/engine';
import { bookingStatusBlocksCustomerSlots } from '@/lib/availability/booking-occupancy';
import { subtractIntervals, mergeIntervals } from '@/lib/availability/intervals';
import { Interval } from 'luxon';
import { defaultBusinessHoursModel, stringifyBusinessHoursModel } from '@/lib/utils/businessHours';

function baseSettings() {
  return {
    pro_user_id: 'u1',
    timezone: 'America/New_York',
    slot_interval_minutes: 60,
    buffer_before_minutes: 0,
    buffer_after_minutes: 0,
    min_notice_minutes: 0,
    max_advance_days: 60,
  };
}

function ctx(partial: Partial<ComputeContext>): ComputeContext {
  return {
    zone: 'America/New_York',
    businessHoursJson: null,
    rules: [],
    blockedTimes: [],
    blockedDates: [],
    bookings: [],
    recurringHoldsUtc: [],
    settings: baseSettings(),
    bufferBetweenJobsMinutes: 0,
    travelBufferMinutes: 0,
    leadTimeMinutes: 0,
    maxAdvanceDays: 60,
    sameDayEnabled: true,
    nowUtc: DateTime.fromISO('2026-03-04T14:00:00Z', { zone: 'utc' }),
    ...partial,
  };
}

test('bookingStatusBlocksCustomerSlots: committed / paid hold the grid; soft states do not', () => {
  assert.equal(bookingStatusBlocksCustomerSlots('accepted'), true);
  assert.equal(bookingStatusBlocksCustomerSlots('deposit_paid'), true);
  assert.equal(bookingStatusBlocksCustomerSlots('payment_required'), true);
  assert.equal(bookingStatusBlocksCustomerSlots('pro_en_route'), true);
  assert.equal(bookingStatusBlocksCustomerSlots('on_the_way'), true);
  assert.equal(bookingStatusBlocksCustomerSlots('in_progress'), true);
  assert.equal(bookingStatusBlocksCustomerSlots('requested'), false);
  assert.equal(bookingStatusBlocksCustomerSlots('cancelled'), false);
  assert.equal(bookingStatusBlocksCustomerSlots('completed'), false);
});

test('subtractIntervals removes overlapping portion', () => {
  const z = 'America/New_York';
  const a = DateTime.fromISO('2026-03-04T09:00:00', { zone: z });
  const b = DateTime.fromISO('2026-03-04T17:00:00', { zone: z });
  const base = [Interval.fromDateTimes(a, b)];
  const cut = Interval.fromDateTimes(
    DateTime.fromISO('2026-03-04T12:00:00', { zone: z }),
    DateTime.fromISO('2026-03-04T13:00:00', { zone: z })
  );
  const out = subtractIntervals(base, [cut]);
  assert.equal(out.length, 2);
});

test('computeSlotsForDay respects JS weekday rules (Wed = 3)', () => {
  const c = ctx({
    rules: [
      {
        id: '1',
        day_of_week: 3,
        start_time: '09:00',
        end_time: '12:00',
        is_available: true,
      },
    ],
    leadTimeMinutes: 0,
    nowUtc: DateTime.fromISO('2026-03-01T15:00:00Z', { zone: 'utc' }),
  });
  const slots = computeSlotsForDay('2026-03-04', 60, c);
  assert.ok(slots.length >= 2);
  assert.ok(slots.some((s) => s.value === '09:00'));
});

test('weekdays without a pro_availability_rules row fall back to business_hours', () => {
  const bh = stringifyBusinessHoursModel(defaultBusinessHoursModel());
  const c = ctx({
    rules: [
      {
        id: '1',
        day_of_week: 5,
        start_time: '09:00',
        end_time: '17:00',
        is_available: true,
      },
    ],
    businessHoursJson: bh,
    leadTimeMinutes: 0,
    // Wednesday afternoon NY so Thursday 2026-03-05 is not "today" (avoids 90m same-day floor in assertions)
    nowUtc: DateTime.fromISO('2026-03-04T18:00:00.000Z', { zone: 'utc' }),
  });
  // 2026-03-04 is Wednesday (see tests above) → 2026-03-05 is Thursday (no rule row → use weekly hours)
  const thursdaySlots = computeSlotsForDay('2026-03-05', 60, c);
  assert.ok(thursdaySlots.length >= 1, 'Thursday should use business_hours when no Thursday rule exists');
  assert.ok(thursdaySlots.some((s) => s.value === '09:00'));
  const fridaySlots = computeSlotsForDay('2026-03-06', 60, c);
  assert.ok(fridaySlots.length >= 1, 'Friday still uses availability rule row');
});

test('requested booking does not block slots', () => {
  const c = ctx({
    rules: [
      {
        id: '1',
        day_of_week: 3,
        start_time: '09:00:00',
        end_time: '12:00:00',
        is_available: true,
      },
    ],
    bookings: [
      {
        id: 'b1',
        service_date: '2026-03-04',
        service_time: '10:00',
        booking_timezone: 'America/New_York',
        status: 'requested',
        duration_hours: 1,
      },
    ],
    leadTimeMinutes: 0,
    nowUtc: DateTime.fromISO('2026-03-01T15:00:00Z', { zone: 'utc' }),
  });
  const slots = computeSlotsForDay('2026-03-04', 60, c);
  assert.ok(slots.some((s) => s.value === '10:00'));
});

test('approved recurring hold blocks overlapping slot (UTC window)', () => {
  const c = ctx({
    rules: [
      {
        id: '1',
        day_of_week: 3,
        start_time: '09:00:00',
        end_time: '12:00:00',
        is_available: true,
      },
    ],
    recurringHoldsUtc: [
      {
        startIso: '2026-03-04T15:00:00.000Z',
        endIso: '2026-03-04T16:00:00.000Z',
      },
    ],
    leadTimeMinutes: 0,
  });
  const slots = computeSlotsForDay('2026-03-04', 60, c);
  assert.ok(!slots.some((s) => s.value === '10:00'));
});

test('same-day enforces 90m minimum even when pro lead_time is lower', () => {
  const c = ctx({
    rules: [
      {
        id: '1',
        day_of_week: 3,
        start_time: '08:00:00',
        end_time: '18:00:00',
        is_available: true,
      },
    ],
    leadTimeMinutes: 30,
    nowUtc: DateTime.fromISO('2026-03-04T14:30:00.000Z', { zone: 'utc' }),
  });
  const slots = computeSlotsForDay('2026-03-04', 60, c);
  assert.ok(!slots.some((s) => s.value === '10:00'));
  assert.ok(slots.some((s) => s.value === '11:00'));
});

test('future day uses pro lead time only (not 90m floor)', () => {
  const c = ctx({
    rules: [
      {
        id: '1',
        day_of_week: 4,
        start_time: '08:00:00',
        end_time: '12:00:00',
        is_available: true,
      },
    ],
    leadTimeMinutes: 30,
    nowUtc: DateTime.fromISO('2026-03-04T14:30:00.000Z', { zone: 'utc' }),
  });
  const slots = computeSlotsForDay('2026-03-05', 60, c);
  assert.ok(slots.some((s) => s.value === '08:00'));
});

test('deposit_paid booking blocks overlapping slot', () => {
  const c = ctx({
    rules: [
      {
        id: '1',
        day_of_week: 3,
        start_time: '09:00:00',
        end_time: '12:00:00',
        is_available: true,
      },
    ],
    bookings: [
      {
        id: 'b1',
        service_date: '2026-03-04',
        service_time: '10:00',
        booking_timezone: 'America/New_York',
        status: 'deposit_paid',
        duration_hours: 1,
      },
    ],
    leadTimeMinutes: 0,
  });
  const slots = computeSlotsForDay('2026-03-04', 60, c);
  assert.ok(!slots.some((s) => s.value === '10:00'));
});

test('accepted booking blocks overlapping slot', () => {
  const c = ctx({
    rules: [
      {
        id: '1',
        day_of_week: 3,
        start_time: '09:00:00',
        end_time: '12:00:00',
        is_available: true,
      },
    ],
    bufferBetweenJobsMinutes: 60,
    bookings: [
      {
        id: 'b1',
        service_date: '2026-03-04',
        service_time: '10:00',
        booking_timezone: 'America/New_York',
        status: 'accepted',
        duration_hours: 1,
      },
    ],
    leadTimeMinutes: 0,
  });
  const slots = computeSlotsForDay('2026-03-04', 60, c);
  assert.ok(!slots.some((s) => s.value === '10:00'));
});

test('pro_blocked_times subtracts from working hours', () => {
  const c = ctx({
    rules: [
      {
        id: '1',
        day_of_week: 3,
        start_time: '09:00',
        end_time: '12:00',
        is_available: true,
      },
    ],
    blockedTimes: [
      {
        id: 'blk',
        /** 10:00–11:00 America/New_York (EST, UTC−5) */
        start_at: '2026-03-04T15:00:00.000Z',
        end_at: '2026-03-04T16:00:00.000Z',
        reason: null,
      },
    ],
    leadTimeMinutes: 0,
  });
  const slots = computeSlotsForDay('2026-03-04', 60, c);
  assert.ok(!slots.some((s) => s.value === '10:00'));
});

test('buffer before/after expands occupied window', () => {
  const c = ctx({
    rules: [
      {
        id: '1',
        day_of_week: 3,
        start_time: '09:00:00',
        end_time: '12:00:00',
        is_available: true,
      },
    ],
    settings: {
      ...baseSettings(),
      buffer_before_minutes: 30,
      buffer_after_minutes: 30,
    },
    bookings: [
      {
        id: 'b1',
        service_date: '2026-03-04',
        service_time: '10:00',
        booking_timezone: 'America/New_York',
        status: 'accepted',
        duration_hours: 1,
      },
    ],
    bufferBetweenJobsMinutes: 0,
    travelBufferMinutes: 0,
    leadTimeMinutes: 0,
  });
  const slots = computeSlotsForDay('2026-03-04', 60, c);
  assert.ok(!slots.some((s) => s.value === '09:00'));
});

test('assertSlotBookable rejects times not on slot grid', () => {
  const c = ctx({
    rules: [
      {
        id: '1',
        day_of_week: 3,
        start_time: '09:00:00',
        end_time: '12:00:00',
        is_available: true,
      },
    ],
    leadTimeMinutes: 0,
  });
  const ok = assertSlotBookable('2026-03-04', '09:15', 60, c);
  assert.equal(ok.ok, false);
});

test('computeMonthSummaries marks beyond max_advance as unavailable', () => {
  const c = ctx({
    rules: [
      {
        id: '1',
        day_of_week: 3,
        start_time: '09:00',
        end_time: '17:00',
        is_available: true,
      },
    ],
    maxAdvanceDays: 5,
    nowUtc: DateTime.fromISO('2026-03-01T12:00:00Z', { zone: 'utc' }),
    leadTimeMinutes: 0,
  });
  const days = computeMonthSummaries(2026, 3, 60, c);
  const late = days.find((d) => d.date === '2026-03-28');
  assert.ok(late);
  assert.equal(late!.level, 'unavailable');
});

test('computeMonthSummaries: same-day with lead time removing all slots is unavailable not fully_booked', () => {
  // 2026-03-04 is Wednesday (weekday 3). 20:00 UTC = 3:00 PM America/New_York (EST).
  // Lead 4h => earliest bookable start 7 PM; working hours end 5 PM => zero slots but free intervals exist.
  const c = ctx({
    rules: [
      {
        id: '1',
        day_of_week: 3,
        start_time: '09:00',
        end_time: '17:00',
        is_available: true,
      },
    ],
    nowUtc: DateTime.fromISO('2026-03-04T20:00:00Z', { zone: 'utc' }),
    leadTimeMinutes: 240,
    sameDayEnabled: true,
  });
  const days = computeMonthSummaries(2026, 3, 60, c);
  const today = days.find((d) => d.date === '2026-03-04');
  assert.ok(today);
  assert.equal(today!.slotCount, 0);
  assert.equal(today!.level, 'unavailable');
});

test('proposedBookingUtcWindow America/New_York wall clock', () => {
  const w = proposedBookingUtcWindow('2026-07-15', '14:00', 'America/New_York', 60);
  assert.ok(w);
  const start = DateTime.fromISO(w.startUtcIso, { zone: 'utc' });
  assert.ok(start.isValid);
  assert.equal(start.setZone('America/New_York').hour, 14);
});

test('mergeIntervals merges overlap', () => {
  const z = 'utc';
  const a = Interval.fromDateTimes(
    DateTime.fromISO('2026-03-04T09:00:00', { zone: z }),
    DateTime.fromISO('2026-03-04T11:00:00', { zone: z })
  );
  const b = Interval.fromDateTimes(
    DateTime.fromISO('2026-03-04T10:00:00', { zone: z }),
    DateTime.fromISO('2026-03-04T12:00:00', { zone: z })
  );
  const m = mergeIntervals([a, b]);
  assert.equal(m.length, 1);
});
