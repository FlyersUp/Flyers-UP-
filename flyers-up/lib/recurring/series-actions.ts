import type { SupabaseClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';
import { DEFAULT_RECURRING_GENERATION_HORIZON_DAYS } from './constants';
import { findScheduleConflict } from './conflicts';
import { evaluateRecurringEligibility } from './eligibility';
import { generateOccurrenceWindows } from './occurrence-generator';
import {
  countApprovedRecurringCustomers,
  customerHasApprovedSeries,
  getOrCreateRecurringPreferences,
  isOccupationEnabledForRecurring,
  loadRecurringWindows,
  loadRelationshipSignals,
} from './context';
import { slotFitsRecurringWindows } from './windows';
import type { CounterProposal, RecurringFrequency } from './types';

function parseDaysOfWeek(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is number => Number.isInteger(x) && x >= 0 && x <= 6);
}

export async function loadSeries(admin: SupabaseClient, seriesId: string) {
  const { data, error } = await admin.from('recurring_series').select('*').eq('id', seriesId).maybeSingle();
  if (error || !data) return null;
  return data as Record<string, unknown>;
}

export async function assertOccurrencesConflictFree(params: {
  admin: SupabaseClient;
  proServiceId: string;
  proUserId: string;
  windows: { scheduled_start_at: string; scheduled_end_at: string }[];
}): Promise<{ ok: true } | { ok: false; message: string; code: string }> {
  for (const w of params.windows) {
    const c = await findScheduleConflict(params.admin, {
      proServiceId: params.proServiceId,
      proUserId: params.proUserId,
      startUtcIso: w.scheduled_start_at,
      endUtcIso: w.scheduled_end_at,
    });
    if (c) return { ok: false, message: c.message, code: c.code };
  }
  return { ok: true };
}

export async function buildEligibilityForNewRequest(params: {
  admin: SupabaseClient;
  customerUserId: string;
  proUserId: string;
  proServiceId: string;
  occupationSlug: string;
  timezone: string;
  startDate: string;
  preferredStartTime: string;
  durationMinutes: number;
  daysOfWeek: number[];
  frequency: RecurringFrequency;
  intervalCount: number;
}): Promise<ReturnType<typeof evaluateRecurringEligibility>> {
  const prefs = await getOrCreateRecurringPreferences(params.admin, params.proUserId);
  const signals = await loadRelationshipSignals(params.admin, params.customerUserId, params.proUserId);
  const occupationEnabled = await isOccupationEnabledForRecurring(
    params.admin,
    params.proUserId,
    params.occupationSlug
  );
  const windows = await loadRecurringWindows(params.admin, params.proUserId);
  const approvedCount = await countApprovedRecurringCustomers(params.admin, params.proUserId);
  const already = await customerHasApprovedSeries(params.admin, params.proUserId, params.customerUserId);
  const max = prefs?.max_recurring_customers ?? 5;
  const atCapacity = approvedCount >= max;

  const zone = params.timezone || prefs?.timezone || 'America/New_York';
  const localStart = DateTime.fromISO(`${params.startDate}T${params.preferredStartTime}`, { zone });
  const slotOk =
    !prefs?.recurring_only_windows_enabled ||
    slotFitsRecurringWindows({
      windowsEnabled: prefs.recurring_only_windows_enabled === true,
      seriesRecurringSlotLocked: true,
      seriesFlexible: false,
      windows,
      occupationSlug: params.occupationSlug,
      localStart: localStart.isValid ? localStart : DateTime.now().setZone(zone),
      durationMinutes: params.durationMinutes,
    });

  const sampleWindows = generateOccurrenceWindows({
    timezone: zone,
    startDate: params.startDate,
    endDate: null,
    preferredStartTime: params.preferredStartTime,
    durationMinutes: params.durationMinutes,
    daysOfWeek: params.daysOfWeek,
    frequency: params.frequency,
    intervalCount: params.intervalCount,
    horizonDays: 21,
  });

  let hasConflicts = false;
  for (const w of sampleWindows.slice(0, 8)) {
    const c = await findScheduleConflict(params.admin, {
      proServiceId: params.proServiceId,
      proUserId: params.proUserId,
      startUtcIso: w.scheduled_start_at,
      endUtcIso: w.scheduled_end_at,
    });
    if (c) {
      hasConflicts = true;
      break;
    }
  }

  return evaluateRecurringEligibility({
    signals,
    proRecurringEnabled: prefs?.recurring_enabled !== false,
    occupationEnabledForRecurring: occupationEnabled,
    onlyPreferredClientsCanRequest: prefs?.only_preferred_clients_can_request === true,
    allowAutoApprovalForMutualPreference: prefs?.allow_auto_approval_for_mutual_preference === true,
    requireMutualPreferenceForAutoApproval: prefs?.require_mutual_preference_for_auto_approval !== false,
    slotFitsRecurringWindows: slotOk,
    hasScheduleConflicts: hasConflicts,
    atRecurringCustomerCapacity: atCapacity,
    customerAlreadyApprovedWithPro: already,
  });
}

export async function insertOccurrencesForSeries(params: {
  admin: SupabaseClient;
  series: Record<string, unknown>;
  proServiceId: string;
}): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  const s = params.series;
  const customerUserId = String(s.customer_user_id);
  const proUserId = String(s.pro_user_id);
  const seriesId = String(s.id);
  const timezone = String(s.timezone ?? 'America/New_York');
  const startDate = String(s.start_date);
  const endDate = (s.end_date as string | null) ?? null;
  const preferredStartTime = String(s.preferred_start_time).slice(0, 8);
  const durationMinutes = Number(s.duration_minutes);
  const daysOfWeek = parseDaysOfWeek(s.days_of_week);
  const frequency = s.frequency as RecurringFrequency;
  const intervalCount = Number(s.interval_count ?? 1);

  const windows = generateOccurrenceWindows({
    timezone,
    startDate,
    endDate,
    preferredStartTime,
    durationMinutes,
    daysOfWeek,
    frequency,
    intervalCount,
    horizonDays: DEFAULT_RECURRING_GENERATION_HORIZON_DAYS,
  });

  const conflictCheck = await assertOccurrencesConflictFree({
    admin: params.admin,
    proServiceId: params.proServiceId,
    proUserId,
    windows,
  });
  if (!conflictCheck.ok) return { ok: false, message: conflictCheck.message };

  const rows = windows.map((w) => ({
    recurring_series_id: seriesId,
    customer_user_id: customerUserId,
    pro_user_id: proUserId,
    scheduled_start_at: w.scheduled_start_at,
    scheduled_end_at: w.scheduled_end_at,
    status: 'scheduled',
  }));

  if (rows.length === 0) return { ok: true, count: 0 };

  const { error } = await params.admin.from('recurring_occurrences').insert(rows);
  if (error) {
    if (error.code === '23505') {
      return { ok: true, count: 0 };
    }
    return { ok: false, message: error.message };
  }
  return { ok: true, count: rows.length };
}

export async function approveRecurringSeries(params: {
  admin: SupabaseClient;
  seriesId: string;
  proUserId: string;
  proServiceId: string;
  autoApproved: boolean;
}): Promise<{ ok: true } | { ok: false; message: string; code?: string }> {
  const series = await loadSeries(params.admin, params.seriesId);
  if (!series) return { ok: false, message: 'Series not found', code: 'not_found' };
  if (String(series.pro_user_id) !== params.proUserId) {
    return { ok: false, message: 'Forbidden', code: 'forbidden' };
  }
  const prevStatus = String(series.status);
  if (prevStatus !== 'pending') {
    return { ok: false, message: 'Invalid status for approval', code: 'bad_status' };
  }

  const prefs = await getOrCreateRecurringPreferences(params.admin, params.proUserId);
  const signals = await loadRelationshipSignals(
    params.admin,
    String(series.customer_user_id),
    params.proUserId
  );
  const occupationEnabled = await isOccupationEnabledForRecurring(
    params.admin,
    params.proUserId,
    String(series.occupation_slug)
  );
  const windowsRows = await loadRecurringWindows(params.admin, params.proUserId);
  const approvedCount = await countApprovedRecurringCustomers(params.admin, params.proUserId);
  const already = await customerHasApprovedSeries(
    params.admin,
    params.proUserId,
    String(series.customer_user_id)
  );
  const max = prefs?.max_recurring_customers ?? 5;
  const atCapacity = approvedCount >= max && !already;

  const zone = String(series.timezone ?? prefs?.timezone ?? 'America/New_York');
  const preferredStartTime = String(series.preferred_start_time).slice(0, 8);
  const localStart = DateTime.fromISO(`${String(series.start_date)}T${preferredStartTime}`, { zone });
  const slotOk = slotFitsRecurringWindows({
    windowsEnabled: prefs?.recurring_only_windows_enabled === true,
    seriesRecurringSlotLocked: series.recurring_slot_locked !== false,
    seriesFlexible: series.is_flexible === true,
    windows: windowsRows,
    occupationSlug: String(series.occupation_slug),
    localStart: localStart.isValid ? localStart : DateTime.now().setZone(zone),
    durationMinutes: Number(series.duration_minutes),
  });

  const sample = generateOccurrenceWindows({
    timezone: zone,
    startDate: String(series.start_date),
    endDate: (series.end_date as string | null) ?? null,
    preferredStartTime,
    durationMinutes: Number(series.duration_minutes),
    daysOfWeek: parseDaysOfWeek(series.days_of_week),
    frequency: series.frequency as RecurringFrequency,
    intervalCount: Number(series.interval_count ?? 1),
    horizonDays: 21,
  });
  let hasConflicts = false;
  for (const w of sample.slice(0, 8)) {
    const c = await findScheduleConflict(params.admin, {
      proServiceId: params.proServiceId,
      proUserId: params.proUserId,
      startUtcIso: w.scheduled_start_at,
      endUtcIso: w.scheduled_end_at,
    });
    if (c) {
      hasConflicts = true;
      break;
    }
  }

  const eligibility = evaluateRecurringEligibility({
    signals,
    proRecurringEnabled: prefs?.recurring_enabled !== false,
    occupationEnabledForRecurring: occupationEnabled,
    onlyPreferredClientsCanRequest: prefs?.only_preferred_clients_can_request === true,
    allowAutoApprovalForMutualPreference: params.autoApproved
      ? prefs?.allow_auto_approval_for_mutual_preference === true
      : false,
    requireMutualPreferenceForAutoApproval: prefs?.require_mutual_preference_for_auto_approval !== false,
    slotFitsRecurringWindows: slotOk,
    hasScheduleConflicts: hasConflicts,
    atRecurringCustomerCapacity: atCapacity,
    customerAlreadyApprovedWithPro: already,
  });

  if (atCapacity) {
    return { ok: false, message: 'Recurring customer capacity is full', code: 'capacity' };
  }
  if (!occupationEnabled) {
    return { ok: false, message: 'Occupation not enabled for recurring', code: 'occupation' };
  }
  if (prefs?.only_preferred_clients_can_request && !signals.proMarkedPreferred) {
    return { ok: false, message: 'Only preferred clients can have recurring', code: 'preferred_only' };
  }
  if (!slotOk) {
    return { ok: false, message: 'Outside recurring-only windows', code: 'windows' };
  }
  if (hasConflicts) {
    return { ok: false, message: 'Schedule conflicts detected', code: 'conflict' };
  }
  if (params.autoApproved && !eligibility.autoApprovalAllowed) {
    return { ok: false, message: 'Auto-approval not allowed', code: 'no_auto' };
  }

  const now = new Date().toISOString();
  const { error: upErr } = await params.admin
    .from('recurring_series')
    .update({
      status: 'approved',
      approved_at: now,
      auto_approved: params.autoApproved,
      updated_at: now,
    })
    .eq('id', params.seriesId)
    .eq('pro_user_id', params.proUserId);

  if (upErr) return { ok: false, message: upErr.message };

  const ins = await insertOccurrencesForSeries({
    admin: params.admin,
    series: { ...series, status: 'approved' },
    proServiceId: params.proServiceId,
  });
  if (!ins.ok) {
    await params.admin
      .from('recurring_series')
      .update({ status: prevStatus, approved_at: null, auto_approved: false, updated_at: new Date().toISOString() })
      .eq('id', params.seriesId);
    return { ok: false, message: ins.message };
  }

  return { ok: true };
}

export function mergeCounterProposal(series: Record<string, unknown>, proposal: CounterProposal): Record<string, unknown> {
  const next = { ...series };
  if (proposal.frequency != null) next.frequency = proposal.frequency;
  if (proposal.interval_count != null) next.interval_count = proposal.interval_count;
  if (proposal.days_of_week != null) next.days_of_week = proposal.days_of_week;
  if (proposal.preferred_start_time != null) next.preferred_start_time = proposal.preferred_start_time;
  if (proposal.duration_minutes != null) next.duration_minutes = proposal.duration_minutes;
  if (proposal.start_date != null) next.start_date = proposal.start_date;
  if (proposal.end_date !== undefined) next.end_date = proposal.end_date;
  if (proposal.timezone != null) next.timezone = proposal.timezone;
  return next;
}

export function seriesUpdatePatchFromMerge(merged: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const keys = [
    'frequency',
    'interval_count',
    'days_of_week',
    'preferred_start_time',
    'duration_minutes',
    'start_date',
    'end_date',
    'timezone',
  ] as const;
  for (const k of keys) {
    if (merged[k] !== undefined) patch[k] = merged[k];
  }
  return patch;
}

export async function customerAcceptCounterAndApprove(params: {
  admin: SupabaseClient;
  seriesId: string;
  customerUserId: string;
  proServiceId: string;
}): Promise<{ ok: true } | { ok: false; message: string; code?: string }> {
  const series = await loadSeries(params.admin, params.seriesId);
  if (!series) return { ok: false, message: 'Series not found', code: 'not_found' };
  if (String(series.customer_user_id) !== params.customerUserId) {
    return { ok: false, message: 'Forbidden', code: 'forbidden' };
  }
  if (String(series.status) !== 'countered') {
    return { ok: false, message: 'Not countered', code: 'bad_status' };
  }
  const raw = series.counter_proposal;
  if (raw == null || typeof raw !== 'object') {
    return { ok: false, message: 'Missing counter proposal', code: 'no_counter' };
  }
  const merged = mergeCounterProposal(series, raw as CounterProposal);
  const patch = seriesUpdatePatchFromMerge(merged);
  const now = new Date().toISOString();
  const { error: uErr } = await params.admin
    .from('recurring_series')
    .update({
      ...patch,
      status: 'pending',
      counter_proposal: null,
      pro_note: (merged as { pro_note?: string }).pro_note ?? series.pro_note,
      updated_at: now,
    })
    .eq('id', params.seriesId)
    .eq('customer_user_id', params.customerUserId);

  if (uErr) return { ok: false, message: uErr.message };

  return approveRecurringSeries({
    admin: params.admin,
    seriesId: params.seriesId,
    proUserId: String(series.pro_user_id),
    proServiceId: params.proServiceId,
    autoApproved: false,
  });
}
