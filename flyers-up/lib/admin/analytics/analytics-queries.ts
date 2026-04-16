import type { SupabaseClient } from '@supabase/supabase-js';
import type { AnalyticsRevenuePoint, AnalyticsTimePoint } from './types';
import { toFiniteNumber } from './analytics-helpers';

const PAGE = 1000;

export const BOOKING_ANALYTICS_ROW_SELECT = [
  'id',
  'customer_id',
  'pro_id',
  'status',
  'created_at',
  'completed_at',
  'accepted_at',
  'cancelled_at',
  'paid_deposit_at',
  'address',
  'price',
  'customer_total_cents',
  'platform_revenue_cents',
  'fee_total_cents',
  'refund_status',
  'refunded_total_cents',
  'amount_refunded_cents',
  'payout_blocked',
  'payment_lifecycle_status',
].join(', ');

function* eachUtcDateInclusive(fromIsoDate: string, toIsoDate: string): Generator<string> {
  const start = new Date(`${fromIsoDate.slice(0, 10)}T00:00:00.000Z`).getTime();
  const end = new Date(`${toIsoDate.slice(0, 10)}T00:00:00.000Z`).getTime();
  for (let t = start; t <= end; t += 86400000) {
    yield new Date(t).toISOString().slice(0, 10);
  }
}

function fillCompletedSeries(
  bucket: Map<string, number>,
  fromIso: string,
  toIso: string
): AnalyticsTimePoint[] {
  const from = fromIso.slice(0, 10);
  const to = toIso.slice(0, 10);
  return [...eachUtcDateInclusive(from, to)].map((date) => ({
    date,
    completed: bucket.get(date) ?? 0,
  }));
}

function fillRevenueSeries(
  gmv: Map<string, number>,
  plat: Map<string, number>,
  fromIso: string,
  toIso: string
): AnalyticsRevenuePoint[] {
  const from = fromIso.slice(0, 10);
  const to = toIso.slice(0, 10);
  return [...eachUtcDateInclusive(from, to)].map((date) => ({
    date,
    gmvCents: gmv.get(date) ?? 0,
    platformCents: plat.get(date) ?? 0,
  }));
}

export function gmvCentsFromRow(r: Record<string, unknown>): number {
  const c = toFiniteNumber(r.customer_total_cents);
  if (c > 0) return Math.round(c);
  const p = toFiniteNumber(r.price);
  if (p > 0) return Math.round(p * 100);
  return 0;
}

export function platformCentsFromRow(r: Record<string, unknown>): number {
  const pr = toFiniteNumber(r.platform_revenue_cents);
  if (pr > 0) return Math.round(pr);
  return Math.round(toFiniteNumber(r.fee_total_cents));
}

/**
 * Completed bookings per UTC calendar day (`completed_at`).
 */
export async function getBookingsOverTime(
  admin: SupabaseClient,
  fromIso: string,
  toIso: string
): Promise<AnalyticsTimePoint[]> {
  const bucket = new Map<string, number>();
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin
      .from('bookings')
      .select('completed_at')
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .gte('completed_at', fromIso)
      .lte('completed_at', toIso)
      .order('completed_at', { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.warn('[analytics-queries] getBookingsOverTime', error.message);
      return fillCompletedSeries(bucket, fromIso, toIso);
    }
    if (!data?.length) break;
    for (const row of data) {
      const ca = row.completed_at as string | null;
      if (!ca) continue;
      const d = ca.slice(0, 10);
      bucket.set(d, (bucket.get(d) ?? 0) + 1);
    }
    if (data.length < PAGE) break;
  }
  return fillCompletedSeries(bucket, fromIso, toIso);
}

/**
 * GMV + platform revenue by UTC day for completed jobs (`completed_at`).
 */
export async function getRevenueOverTime(
  admin: SupabaseClient,
  fromIso: string,
  toIso: string
): Promise<AnalyticsRevenuePoint[]> {
  const gmv = new Map<string, number>();
  const plat = new Map<string, number>();
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin
      .from('bookings')
      .select('completed_at, customer_total_cents, platform_revenue_cents, fee_total_cents, price')
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .gte('completed_at', fromIso)
      .lte('completed_at', toIso)
      .order('completed_at', { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.warn('[analytics-queries] getRevenueOverTime', error.message);
      return fillRevenueSeries(gmv, plat, fromIso, toIso);
    }
    if (!data?.length) break;
    for (const row of data) {
      const ca = row.completed_at as string | null;
      if (!ca) continue;
      const d = ca.slice(0, 10);
      const r = row as unknown as Record<string, unknown>;
      gmv.set(d, (gmv.get(d) ?? 0) + gmvCentsFromRow(r));
      plat.set(d, (plat.get(d) ?? 0) + platformCentsFromRow(r));
    }
    if (data.length < PAGE) break;
  }
  return fillRevenueSeries(gmv, plat, fromIso, toIso);
}

export async function fetchBookingsCreatedBetween(
  admin: SupabaseClient,
  fromIso: string,
  toIso: string
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin
      .from('bookings')
      .select(BOOKING_ANALYTICS_ROW_SELECT)
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.warn('[analytics-queries] fetchBookingsCreatedBetween', error.message);
      break;
    }
    if (!data?.length) break;
    out.push(...(data as Record<string, unknown>[]));
    if (data.length < PAGE) break;
  }
  return out;
}

/** Completed jobs whose `completed_at` falls in `[fromIso, toIso]`. */
export async function fetchBookingsCompletedBetween(
  admin: SupabaseClient,
  fromIso: string,
  toIso: string
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin
      .from('bookings')
      .select(BOOKING_ANALYTICS_ROW_SELECT)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .gte('completed_at', fromIso)
      .lte('completed_at', toIso)
      .order('completed_at', { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.warn('[analytics-queries] fetchBookingsCompletedBetween', error.message);
      break;
    }
    if (!data?.length) break;
    out.push(...(data as Record<string, unknown>[]));
    if (data.length < PAGE) break;
  }
  return out;
}
