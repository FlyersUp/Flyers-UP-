/**
 * Server-side aggregation for the pro Smart Pricing Dashboard.
 * Resolves auth user → service_pros.id; all money in cents.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { isCancelled } from '@/lib/bookings/booking-status';
import type { ProDashboardMetrics, ProDashboardMetricsRange, ProDashboardContext } from '@/lib/pro-dashboard/types';

export type BookingMetricRow = {
  subtotal_cents: number | null;
  completed_at: string | null;
  started_at: string | null;
  created_at: string;
  suggested_price_cents: number | null;
  was_below_suggestion: boolean | null;
  status: string;
  duration_hours: number | null;
};

function isLostOutcome(status: string): boolean {
  const s = (status || '').toLowerCase();
  if (isCancelled(s)) return true;
  return s === 'declined' || s === 'expired_unpaid';
}

/** Hours worked for one completed booking; fallback chain per product spec. */
export function hoursWorkedForCompletedBooking(row: Pick<BookingMetricRow, 'started_at' | 'completed_at' | 'duration_hours'>): number {
  const start = row.started_at ? Date.parse(row.started_at) : NaN;
  const end = row.completed_at ? Date.parse(row.completed_at) : NaN;
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    return (end - start) / (1000 * 60 * 60);
  }
  const dh = row.duration_hours;
  if (typeof dh === 'number' && Number.isFinite(dh) && dh > 0) return dh;
  return 1;
}

function rangeStartIso(range: ProDashboardMetricsRange): string | null {
  if (range === 'all') return null;
  const now = Date.now();
  const days = range === '7d' ? 7 : 30;
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Pure aggregation for tests and reuse.
 */
export function computeProDashboardMetrics(rows: BookingMetricRow[]): ProDashboardMetrics {
  const completed = rows.filter((r) => (r.status || '').toLowerCase() === 'completed');

  let totalEarningsCents = 0;
  let subtotalSumForAvg = 0;
  let subtotalCountForAvg = 0;
  let totalHoursWorked = 0;

  for (const r of completed) {
    const sub = r.subtotal_cents;
    if (sub != null && Number.isFinite(sub) && sub > 0) {
      totalEarningsCents += Math.round(sub);
      subtotalSumForAvg += sub;
      subtotalCountForAvg += 1;
    }
    totalHoursWorked += hoursWorkedForCompletedBooking(r);
  }

  const totalJobsCompleted = completed.length;
  const avgJobValueCents =
    subtotalCountForAvg > 0 ? Math.round(subtotalSumForAvg / subtotalCountForAvg) : null;
  const earningsPerHourCents =
    totalHoursWorked > 0 && totalEarningsCents > 0
      ? Math.round(totalEarningsCents / totalHoursWorked)
      : totalJobsCompleted > 0 && totalEarningsCents > 0
        ? Math.round(totalEarningsCents / totalJobsCompleted)
        : null;

  let winsLosses = 0;
  let wins = 0;
  for (const r of rows) {
    const st = (r.status || '').toLowerCase();
    if (st === 'completed') {
      winsLosses += 1;
      wins += 1;
    } else if (isLostOutcome(r.status)) {
      winsLosses += 1;
    }
  }
  const winRate = winsLosses > 0 ? wins / winsLosses : null;

  let suggestionComparable = 0;
  let belowSuggestion = 0;
  for (const r of rows) {
    if (typeof r.was_below_suggestion === 'boolean') {
      suggestionComparable += 1;
      if (r.was_below_suggestion) belowSuggestion += 1;
      continue;
    }
    if (r.suggested_price_cents != null && r.subtotal_cents != null) {
      suggestionComparable += 1;
      if (r.subtotal_cents < r.suggested_price_cents) belowSuggestion += 1;
    }
  }
  const belowSuggestionRate =
    suggestionComparable > 0 ? belowSuggestion / suggestionComparable : null;

  return {
    totalEarningsCents,
    totalJobsCompleted,
    avgJobValueCents,
    earningsPerHourCents,
    winRate,
    belowSuggestionRate,
  };
}

async function fetchBookingRowsForPro(
  admin: SupabaseClient,
  proServiceId: string,
  range: ProDashboardMetricsRange
): Promise<BookingMetricRow[]> {
  const startIso = rangeStartIso(range);
  const pageSize = 1000;
  const all: BookingMetricRow[] = [];
  let offset = 0;

  for (;;) {
    let q = admin
      .from('bookings')
      .select(
        'subtotal_cents, completed_at, started_at, created_at, suggested_price_cents, was_below_suggestion, status, duration_hours'
      )
      .eq('pro_id', proServiceId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (startIso) q = q.gte('created_at', startIso);

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    const batch = (data ?? []) as BookingMetricRow[];
    all.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return all;
}

export type ProDashboardMetricsBundle = {
  metrics: ProDashboardMetrics;
  context: ProDashboardContext;
  range: ProDashboardMetricsRange;
};

/**
 * @param userId — auth user id (`profiles.id` / `auth.users.id`)
 */
export async function getProDashboardMetrics(
  userId: string,
  options?: { range?: ProDashboardMetricsRange }
): Promise<ProDashboardMetricsBundle | null> {
  const admin = createAdminSupabaseClient();
  const range = options?.range ?? 'all';

  const { data: proRow, error: proErr } = await admin
    .from('service_pros')
    .select('id, occupation_id, occupations(slug)')
    .eq('user_id', userId)
    .maybeSingle();

  if (proErr || !proRow?.id) return null;

  const proServiceId = String(proRow.id);
  const occ = (proRow as { occupations?: { slug?: string } | null }).occupations;
  const occupationSlug = occ?.slug?.trim() || null;

  const rows = await fetchBookingRowsForPro(admin, proServiceId, range);
  const metrics = computeProDashboardMetrics(rows);

  return {
    metrics,
    context: { occupationSlug },
    range,
  };
}
