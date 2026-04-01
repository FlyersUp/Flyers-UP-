/**
 * Full pro "On the Way" (pro_en_route) readiness: deposit + schedule window.
 * Used by PATCH /api/jobs/.../status, POST .../on-the-way, and JobNextAction.
 */

import { DateTime } from 'luxon';
import {
  addHoursToUtcIso,
  bookingWallTimeToUtcIso,
  normalizeBookingTimeZone,
} from '@/lib/datetime/booking-instant';
import {
  canProMarkBookingEnRoute,
  proEnRouteDepositBlockedResponse,
  type ProEnRouteDepositGateInput,
  DEPOSIT_REQUIRED_BEFORE_EN_ROUTE_CODE,
} from '@/lib/bookings/pro-en-route-deposit-guard';

export {
  canProMarkBookingEnRoute,
  proEnRouteDepositBlockedResponse,
  DEPOSIT_REQUIRED_BEFORE_EN_ROUTE_CODE,
};

/** Hours before scheduled start when "On the Way" becomes available. */
export const EN_ROUTE_PRE_START_HOURS = 2;

export const EN_ROUTE_TOO_EARLY_CODE = 'EN_ROUTE_TOO_EARLY' as const;

export type ProEnRouteScheduleGateInput = {
  service_date: string;
  service_time?: string | null;
  booking_timezone?: string | null;
  /** For tests only */
  nowMs?: number;
};

export type ProEnRouteScheduleGateResult =
  | { ok: true }
  | { ok: false; reason: 'future_service_day' }
  | {
      ok: false;
      reason: 'before_unlock';
      unlockUtcIso: string;
      /** e.g. "1:00 PM" in booking zone */
      unlockLabel: string;
    }
  | { ok: false; reason: 'invalid_schedule' };

export function evaluateEnRouteScheduleGate(input: ProEnRouteScheduleGateInput): ProEnRouteScheduleGateResult {
  const zone = normalizeBookingTimeZone(input.booking_timezone);
  const rawTime = input.service_time != null ? String(input.service_time).trim() : '';
  const time = rawTime || '09:00';
  const ymd = input.service_date.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!ymd) {
    return { ok: false, reason: 'invalid_schedule' };
  }
  const y = parseInt(ymd[1], 10);
  const mo = parseInt(ymd[2], 10);
  const d = parseInt(ymd[3], 10);
  const serviceDayStart = DateTime.fromObject({ year: y, month: mo, day: d }, { zone }).startOf('day');
  if (!serviceDayStart.isValid) {
    return { ok: false, reason: 'invalid_schedule' };
  }

  const startIso = bookingWallTimeToUtcIso(input.service_date, time, zone);
  if (!startIso) {
    return { ok: false, reason: 'invalid_schedule' };
  }
  const unlockIso = addHoursToUtcIso(startIso, -EN_ROUTE_PRE_START_HOURS);
  if (!unlockIso) {
    return { ok: false, reason: 'invalid_schedule' };
  }

  const nowMs = input.nowMs ?? Date.now();
  const unlockMs = new Date(unlockIso).getTime();
  if (nowMs >= unlockMs) {
    return { ok: true };
  }

  const todayStart = DateTime.fromMillis(nowMs, { zone }).startOf('day');
  if (todayStart < serviceDayStart) {
    return { ok: false, reason: 'future_service_day' };
  }

  const unlockLocal = DateTime.fromISO(unlockIso, { zone: 'utc' }).setZone(zone);
  const unlockLabel = unlockLocal.isValid ? unlockLocal.toFormat('h:mm a') : unlockIso;

  return {
    ok: false,
    reason: 'before_unlock',
    unlockUtcIso: unlockIso,
    unlockLabel,
  };
}

export type ProEnRouteFullInput = ProEnRouteDepositGateInput & ProEnRouteScheduleGateInput;

export function canProTransitionToEnRoute(input: ProEnRouteFullInput): boolean {
  if (!canProMarkBookingEnRoute(input)) return false;
  return evaluateEnRouteScheduleGate(input).ok;
}

export function proEnRouteScheduleBlockedResponse(
  gate: Exclude<ProEnRouteScheduleGateResult, { ok: true }>
): {
  error: string;
  code: typeof EN_ROUTE_TOO_EARLY_CODE;
  hint: string;
  time_gate: string;
  unlock_at?: string;
  unlock_label?: string;
} {
  if (gate.reason === 'future_service_day') {
    return {
      error: 'On the Way is only available on the scheduled service day.',
      code: EN_ROUTE_TOO_EARLY_CODE,
      hint: 'Return on the day of the appointment to start travel.',
      time_gate: 'future_service_day',
    };
  }
  if (gate.reason === 'before_unlock') {
    return {
      error: `On the Way unlocks at ${gate.unlockLabel} on the service day.`,
      code: EN_ROUTE_TOO_EARLY_CODE,
      hint: `You can head out starting ${gate.unlockLabel} (up to ${EN_ROUTE_PRE_START_HOURS} hours before the scheduled start).`,
      time_gate: 'before_unlock',
      unlock_at: gate.unlockUtcIso,
      unlock_label: gate.unlockLabel,
    };
  }
  return {
    error: 'Could not verify the appointment time for travel.',
    code: EN_ROUTE_TOO_EARLY_CODE,
    hint: 'Please refresh or contact support if this persists.',
    time_gate: 'invalid_schedule',
  };
}
