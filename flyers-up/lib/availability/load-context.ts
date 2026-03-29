import type { SupabaseClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';
import { resolveSameDayEnabledFromServicePro } from '@/lib/operations/availabilityValidation';
import type { BookingOccupancyInput, ComputeContext } from '@/lib/availability/engine';
import { resolveCalendarZone } from '@/lib/availability/engine';
import type {
  ProAvailabilityRuleRow,
  ProAvailabilitySettingsRow,
  ProBlockedTimeRow,
} from '@/lib/availability/types';
import { bookingStatusBlocksCustomerSlots } from '@/lib/availability/booking-occupancy';
import { loadRecurringHoldsForAvailability } from '@/lib/recurring/recurring-holds';

type ServiceProAvailRow = {
  id: string;
  user_id: string;
  business_hours: string | null;
  lead_time_minutes: number | null;
  buffer_between_jobs_minutes: number | null;
  buffer_minutes: number | null;
  same_day_enabled: boolean | null;
  same_day_available: boolean | null;
};

function defaultSettings(proUserId: string): ProAvailabilitySettingsRow {
  return {
    pro_user_id: proUserId,
    timezone: 'America/New_York',
    slot_interval_minutes: 30,
    buffer_before_minutes: 0,
    buffer_after_minutes: 0,
    min_notice_minutes: 60,
    max_advance_days: 60,
  };
}

export async function loadComputeContextForProRange(
  admin: SupabaseClient,
  proId: string,
  rangeStartISO: string,
  rangeEndISO: string
): Promise<ComputeContext | null> {
  const { data: pro, error: proErr } = await admin
    .from('service_pros')
    .select(
      'id, user_id, business_hours, lead_time_minutes, buffer_between_jobs_minutes, buffer_minutes, same_day_enabled, same_day_available'
    )
    .eq('id', proId)
    .maybeSingle();

  if (proErr || !pro) return null;

  const p = pro as ServiceProAvailRow;
  const proUserId = p.user_id;
  if (!proUserId) return null;

  const { data: settingsRow } = await admin
    .from('pro_availability_settings')
    .select(
      'pro_user_id, timezone, slot_interval_minutes, buffer_before_minutes, buffer_after_minutes, min_notice_minutes, max_advance_days'
    )
    .eq('pro_user_id', proUserId)
    .maybeSingle();

  const hasPersistedSettings = Boolean(
    settingsRow && typeof (settingsRow as ProAvailabilitySettingsRow).pro_user_id === 'string'
  );
  const effSettings: ProAvailabilitySettingsRow = hasPersistedSettings
    ? (settingsRow as ProAvailabilitySettingsRow)
    : defaultSettings(proUserId);

  const zone = resolveCalendarZone(effSettings, null);

  const rangeUtcStart = DateTime.fromISO(rangeStartISO, { zone }).startOf('day').toUTC();
  const rangeUtcEnd = DateTime.fromISO(rangeEndISO, { zone }).endOf('day').toUTC();
  const blockedStartIso = rangeUtcStart.isValid ? rangeUtcStart.toISO() : null;
  const blockedEndIso = rangeUtcEnd.isValid ? rangeUtcEnd.toISO() : null;

  const padded = padIsoDateRange(rangeStartISO, rangeEndISO, zone);

  const [{ data: rules }, { data: legacyAvail }, { data: blockedDatesRows }, { data: blockedTimes }, { data: bookingRows }] =
    await Promise.all([
      admin
        .from('pro_availability_rules')
        .select('id, day_of_week, start_time, end_time, is_available')
        .eq('pro_user_id', proUserId)
        .order('day_of_week')
        .order('start_time'),
      admin
        .from('pro_availability')
        .select('day_of_week, start_time, end_time')
        .eq('pro_id', proId)
        .order('day_of_week')
        .order('start_time'),
      admin.from('pro_blocked_dates').select('blocked_date').eq('pro_id', proId),
      blockedStartIso && blockedEndIso
        ? admin
            .from('pro_blocked_times')
            .select('id, start_at, end_at, reason')
            .eq('pro_user_id', proUserId)
            .lt('start_at', blockedEndIso)
            .gt('end_at', blockedStartIso)
        : Promise.resolve({ data: [] as ProBlockedTimeRow[] }),
      admin
        .from('bookings')
        .select(
          'id, service_date, service_time, booking_timezone, status, duration_hours, scheduled_start_at, scheduled_end_at, estimated_duration_minutes'
        )
        .eq('pro_id', proId)
        .gte('service_date', padded.start)
        .lte('service_date', padded.end),
    ]);

  const bookings: BookingOccupancyInput[] = (bookingRows ?? [])
    .filter((b: { status?: string }) => bookingStatusBlocksCustomerSlots(b.status))
    .map((b: any) => ({
      id: b.id,
      service_date: b.service_date,
      service_time: b.service_time,
      booking_timezone: b.booking_timezone,
      status: b.status,
      duration_hours: b.duration_hours,
      scheduled_start_at: b.scheduled_start_at,
      scheduled_end_at: b.scheduled_end_at,
      estimated_duration_minutes: b.estimated_duration_minutes,
    }));

  let recurringHoldsUtc: { startIso: string; endIso: string }[] = [];
  if (blockedStartIso && blockedEndIso) {
    const holds = await loadRecurringHoldsForAvailability(admin, proUserId, blockedStartIso, blockedEndIso);
    recurringHoldsUtc = holds.map((h) => ({
      startIso: h.scheduled_start_at,
      endIso: h.scheduled_end_at,
    }));
  }

  let ruleRows = (rules ?? []) as ProAvailabilityRuleRow[];
  if (ruleRows.length === 0 && legacyAvail && legacyAvail.length > 0) {
    ruleRows = (legacyAvail as { day_of_week: number; start_time: string; end_time: string }[]).map(
      (r, idx) => ({
        id: `legacy-${proId}-${idx}`,
        day_of_week: r.day_of_week,
        start_time: String(r.start_time).slice(0, 8),
        end_time: String(r.end_time).slice(0, 8),
        is_available: true,
      })
    );
  }

  const leadTimeMinutes = hasPersistedSettings
    ? Number(effSettings.min_notice_minutes)
    : Number(p.lead_time_minutes ?? 60);
  const maxAdvanceDays = Math.max(1, Number(effSettings.max_advance_days ?? 60));

  return {
    zone,
    businessHoursJson: p.business_hours,
    rules: ruleRows,
    blockedTimes: (blockedTimes ?? []) as ProBlockedTimeRow[],
    blockedDates: (blockedDatesRows ?? []).map((r: { blocked_date: string }) => r.blocked_date),
    bookings,
    recurringHoldsUtc,
    settings: effSettings,
    bufferBetweenJobsMinutes: Number(p.buffer_between_jobs_minutes ?? 30),
    travelBufferMinutes: Number(p.buffer_minutes ?? 0),
    leadTimeMinutes,
    maxAdvanceDays,
    sameDayEnabled: resolveSameDayEnabledFromServicePro(p),
  };
}

export function padIsoDateRange(start: string, end: string, zone: string): { start: string; end: string } {
  const s = DateTime.fromISO(start, { zone }).minus({ days: 1 });
  const e = DateTime.fromISO(end, { zone }).plus({ days: 1 });
  return {
    start: s.toISODate() ?? start,
    end: e.toISODate() ?? end,
  };
}
