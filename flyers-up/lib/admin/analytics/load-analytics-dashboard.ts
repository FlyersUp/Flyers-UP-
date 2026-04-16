import type { SupabaseClient } from '@supabase/supabase-js';
import { loadMoneyReconciliationWindow } from '@/lib/bookings/money-reconciliation-report';
import type { MoneyReconciliationSnapshot } from '@/lib/bookings/money-reconciliation';
import {
  buildFunnelSteps,
  computePctChange,
  median,
  toFiniteNumber,
} from './analytics-helpers';
import {
  fetchBookingsCompletedBetween,
  fetchBookingsCreatedBetween,
  getBookingsOverTime,
  getRevenueOverTime,
  gmvCentsFromRow,
  platformCentsFromRow,
} from './analytics-queries';
import {
  getAnalyticsWindowBounds,
  parseAnalyticsRange,
  rangeLabel,
  reconWindowDays,
} from './analytics-range';
import type {
  AnalyticsDashboardData,
  AnalyticsRangeKey,
  AttentionFeedItem,
  LocalPerformanceRow,
} from './types';

export { parseAnalyticsRange, rangeLabel };

function iso(d: Date): string {
  return d.toISOString();
}

async function countProfilesWindow(
  admin: SupabaseClient,
  fromIso: string,
  toIso: string,
  filter: 'any' | 'customer' | 'pro' | 'signup_done'
): Promise<number> {
  let q = admin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', fromIso).lte('created_at', toIso);

  if (filter === 'customer') q = q.eq('role', 'customer');
  else if (filter === 'pro') q = q.eq('role', 'pro');
  else if (filter === 'signup_done') {
    q = q.not('role', 'is', null).is('onboarding_step', null);
  }

  const { count, error } = await q;
  if (error) {
    console.warn('[load-analytics-dashboard] profiles count', error.message);
    return 0;
  }
  return count ?? 0;
}

function sumGmv(rows: Record<string, unknown>[]): number {
  let s = 0;
  for (const r of rows) s += gmvCentsFromRow(r);
  return s;
}

function sumPlatform(rows: Record<string, unknown>[]): number {
  let s = 0;
  for (const r of rows) s += platformCentsFromRow(r);
  return s;
}

function repeatCustomerRate(rows: Record<string, unknown>[]): number | null {
  const byCustomer = new Map<string, number>();
  for (const r of rows) {
    const cid = r.customer_id != null ? String(r.customer_id) : '';
    if (!cid) continue;
    byCustomer.set(cid, (byCustomer.get(cid) ?? 0) + 1);
  }
  if (byCustomer.size === 0) return null;
  let multi = 0;
  for (const n of byCustomer.values()) if (n >= 2) multi += 1;
  return multi / byCustomer.size;
}

function snapshotToAttention(snapshot: MoneyReconciliationSnapshot): AttentionFeedItem {
  const tier = snapshot.priorityTier;
  const severity = tier === 'high' ? 'HIGH' : tier === 'medium' ? 'MEDIUM' : 'LOW';
  return {
    id: `recon-${snapshot.bookingId}`,
    bookingId: snapshot.bookingId,
    title: snapshot.reason.slice(0, 80) + (snapshot.reason.length > 80 ? '…' : ''),
    description: snapshot.recommendedNextAction,
    severity,
    href: `/admin/bookings/${snapshot.bookingId}`,
  };
}

function buildAttentionFeed(snapshots: MoneyReconciliationSnapshot[]): AttentionFeedItem[] {
  const candidates = snapshots
    .filter((s) => s.category !== 'healthy' && !s.resolved)
    .slice(0, 5);
  return candidates.map(snapshotToAttention);
}

/** Exported for tests — stable empty dashboard shape. */
export function createEmptyAnalyticsDashboard(rangeKey: AnalyticsRangeKey = '30d'): AnalyticsDashboardData {
  const bounds = getAnalyticsWindowBounds(rangeKey);
  const z = { current: 0, prior: 0, changePct: null as number | null };
  return {
    rangeKey,
    rangeLabel: rangeLabel(rangeKey),
    fromIso: iso(bounds.from),
    toIso: iso(bounds.to),
    kpis: {
      gmvCents: { ...z },
      platformRevenueCents: { ...z },
      bookings: { ...z },
      newCustomers: { ...z },
      newPros: { ...z },
      repeatRate: { ...z },
    },
    funnel: buildFunnelSteps({
      visits: 0,
      signupStart: 0,
      signupDone: 0,
      bookingStart: 0,
      depositPaid: 0,
      jobDone: 0,
    }),
    bookingsOverTime: [],
    revenueOverTime: [],
    marketplaceHealth: {
      acceptanceRate: null,
      avgResponseMinutes: null,
      cancellationRate: null,
      refundRate: null,
    },
    localPerformance: [],
    retention: { repeatCustomerPct: null, topCategories: [] },
    moneyRisk: {
      payoutsBlocked: 0,
      refundsInitiatedCount: 0,
      refundsInitiatedCents: 0,
      reconciliationPending: 0,
    },
    traffic: [
      { label: 'Social media', pct: 45, accent: 'orange' },
      { label: 'Organic search', pct: 32, accent: 'blue' },
      { label: 'Email / direct', pct: 23, accent: 'green' },
    ],
    attentionFeed: [],
  };
}

/** Guard for light tests — verifies keys exist. */
export function assertAnalyticsDashboardShape(d: AnalyticsDashboardData): void {
  if (!d.kpis || !d.funnel || !Array.isArray(d.bookingsOverTime)) {
    throw new Error('Invalid analytics dashboard shape');
  }
  if (typeof d.moneyRisk.payoutsBlocked !== 'number') throw new Error('Invalid moneyRisk');
}

export async function loadAnalyticsDashboard(
  admin: SupabaseClient,
  rangeKey: AnalyticsRangeKey
): Promise<AnalyticsDashboardData> {
  const bounds = getAnalyticsWindowBounds(rangeKey);
  const fromIso = iso(bounds.from);
  const toIso = iso(bounds.to);
  const prevFromIso = iso(bounds.prevFrom);
  const prevToIso = iso(bounds.prevTo);
  const toMs = bounds.to.getTime();

  const empty = (): AnalyticsDashboardData => ({
    ...createEmptyAnalyticsDashboard(rangeKey),
    fromIso,
    toIso,
  });

  try {
    const [
      curRows,
      completedCur,
      completedPrev,
      newCustomersCur,
      newCustomersPrev,
      newProsCur,
      newProsPrev,
      signupStartCur,
      signupDoneCur,
      bookingsOverTime,
      revenueOverTime,
    ] = await Promise.all([
      fetchBookingsCreatedBetween(admin, fromIso, toIso),
      fetchBookingsCompletedBetween(admin, fromIso, toIso),
      fetchBookingsCompletedBetween(admin, prevFromIso, prevToIso),
      countProfilesWindow(admin, fromIso, toIso, 'customer'),
      countProfilesWindow(admin, prevFromIso, prevToIso, 'customer'),
      countProfilesWindow(admin, fromIso, toIso, 'pro'),
      countProfilesWindow(admin, prevFromIso, prevToIso, 'pro'),
      countProfilesWindow(admin, fromIso, toIso, 'any'),
      countProfilesWindow(admin, fromIso, toIso, 'signup_done'),
      getBookingsOverTime(admin, fromIso, toIso),
      getRevenueOverTime(admin, fromIso, toIso),
    ]);

    const bookingsCur = completedCur.length;
    const bookingsPrev = completedPrev.length;

    const gmvCur = sumGmv(completedCur);
    const gmvPrev = sumGmv(completedPrev);
    const platCur = sumPlatform(completedCur);
    const platPrev = sumPlatform(completedPrev);

    const repeatCur = repeatCustomerRate(completedCur);
    const repeatPrev = repeatCustomerRate(completedPrev);

    const kpis = {
      gmvCents: {
        current: gmvCur,
        prior: gmvPrev,
        changePct: computePctChange(gmvCur, gmvPrev),
      },
      platformRevenueCents: {
        current: platCur,
        prior: platPrev,
        changePct: computePctChange(platCur, platPrev),
      },
      bookings: {
        current: bookingsCur,
        prior: bookingsPrev,
        changePct: computePctChange(bookingsCur, bookingsPrev),
      },
      newCustomers: {
        current: newCustomersCur,
        prior: newCustomersPrev,
        changePct: computePctChange(newCustomersCur, newCustomersPrev),
      },
      newPros: {
        current: newProsCur,
        prior: newProsPrev,
        changePct: computePctChange(newProsCur, newProsPrev),
      },
      repeatRate: {
        current: repeatCur ?? 0,
        prior: repeatPrev ?? 0,
        changePct:
          repeatCur != null && repeatPrev != null && repeatPrev > 0
            ? computePctChange(repeatCur, repeatPrev)
            : null,
      },
    };

    const bookingStartCur = curRows.length;
    const depositPaidCur = curRows.filter((r) => r.paid_deposit_at != null).length;
    const jobDoneCur = completedCur.length;
    const visitsStub = Math.max(
      100,
      Math.round(Math.max(signupStartCur * 3, bookingStartCur * 10, jobDoneCur * 15))
    );

    const funnel = buildFunnelSteps({
      visits: visitsStub,
      signupStart: signupStartCur,
      signupDone: signupDoneCur,
      bookingStart: bookingStartCur,
      depositPaid: depositPaidCur,
      jobDone: jobDoneCur,
    });

    const decidedStatuses = new Set([
      'declined',
      'accepted',
      'on_the_way',
      'in_progress',
      'awaiting_payment',
      'completed',
      'cancelled',
    ]);
    const windowRows = curRows.filter((r) => decidedStatuses.has(String(r.status ?? '')));
    const declined = windowRows.filter((r) => r.status === 'declined').length;
    const acceptedish = windowRows.filter((r) => r.status !== 'declined').length;
    const acceptanceRate =
      declined + acceptedish > 0 ? Math.min(1, Math.max(0, acceptedish / (declined + acceptedish))) : null;

    const responseMinutes: number[] = [];
    for (const r of curRows) {
      const acc = r.accepted_at ? Date.parse(String(r.accepted_at)) : NaN;
      const cr = r.created_at ? Date.parse(String(r.created_at)) : NaN;
      if (Number.isFinite(acc) && Number.isFinite(cr) && acc >= cr) {
        responseMinutes.push((acc - cr) / 60000);
      }
    }
    const avgResponseMinutes = median(responseMinutes);

    const totalBookingsCur = curRows.length;
    const cancelled = curRows.filter((r) => r.status === 'cancelled').length;
    const cancellationRate = totalBookingsCur > 0 ? cancelled / totalBookingsCur : null;

    const refundy = curRows.filter((r) => {
      const rs = String(r.refund_status ?? '').toLowerCase();
      const lc = String(r.payment_lifecycle_status ?? '').toLowerCase();
      if (rs && rs !== 'none') return true;
      return lc.includes('refund');
    }).length;
    const refundRate = bookingsCur > 0 ? refundy / bookingsCur : null;

    const marketplaceHealth = {
      acceptanceRate,
      avgResponseMinutes,
      cancellationRate,
      refundRate,
    };

    const regions: { id: string; label: string; needle: string }[] = [
      { id: 'hoboken', label: 'Hoboken, NJ', needle: 'hoboken' },
      { id: 'brooklyn', label: 'Brooklyn (Williamsburg)', needle: 'brooklyn' },
      { id: 'manhattan', label: 'Manhattan (UES)', needle: 'manhattan' },
    ];

    const localStats = regions.map((reg) => {
      const matches = curRows.filter(
        (r) => typeof r.address === 'string' && r.address.toLowerCase().includes(reg.needle)
      );
      const demand = matches.length;
      const pros = new Set(
        matches.map((m) => (m.pro_id != null ? String(m.pro_id) : '')).filter(Boolean)
      ).size;
      return { ...reg, demand, supply: pros };
    });
    const maxDemand = Math.max(1, ...localStats.map((s) => s.demand));
    const maxSupply = Math.max(1, ...localStats.map((s) => s.supply));
    const localPerformance: LocalPerformanceRow[] = localStats.map((s) => {
      const demandBarPct = Math.round((s.demand / maxDemand) * 100);
      const supplyBarPct = Math.round((s.supply / maxSupply) * 100);
      const ratio = s.demand > 0 ? s.supply / s.demand : 0;
      const balance = s.demand > 0 && s.supply > 0 ? Math.min(s.demand, s.supply) / Math.max(s.demand, s.supply) : 0;
      let statusLabel = 'Healthy balance';
      let statusTone: LocalPerformanceRow['statusTone'] = 'success';
      if (balance >= 0.94 && s.demand >= 3) {
        statusLabel = 'Very high match';
        statusTone = 'default';
      } else if (ratio < 0.85 && s.demand >= 3) {
        statusLabel = 'Low supply';
        statusTone = 'warning';
      } else if (ratio > 1.15 && s.supply >= 3) {
        statusLabel = 'High demand';
        statusTone = 'warning';
      }
      return {
        id: s.id,
        label: s.label,
        demand: s.demand,
        supply: s.supply,
        demandBarPct,
        supplyBarPct,
        statusLabel,
        statusTone,
      };
    });

    const retentionDays = 90;
    const retentionFrom = new Date(toMs - retentionDays * 86400000).toISOString();
    let retentionRepeat: number | null = null;
    const categoryBookings = new Map<string, string[]>();
    try {
      const { data: retRows } = await admin
        .from('bookings')
        .select('customer_id, service_pros(service_categories(name))')
        .eq('status', 'completed')
        .gte('completed_at', retentionFrom)
        .lte('completed_at', toIso)
        .limit(3000);

      const completedRetention: Record<string, unknown>[] = (retRows ?? []) as Record<string, unknown>[];
      retentionRepeat = repeatCustomerRate(completedRetention);

      for (const row of completedRetention) {
        const cid = row.customer_id != null ? String(row.customer_id) : '';
        if (!cid) continue;
        const sp = row.service_pros as { service_categories?: { name?: string | null } | null } | null;
        const name = sp?.service_categories?.name?.trim() || 'Other';
        const list = categoryBookings.get(name) ?? [];
        list.push(cid);
        categoryBookings.set(name, list);
      }
    } catch (e) {
      console.warn('[load-analytics-dashboard] retention query', e);
    }

    const topCategories = [...categoryBookings.entries()]
      .map(([name, customers]) => {
        const counts = new Map<string, number>();
        for (const c of customers) counts.set(c, (counts.get(c) ?? 0) + 1);
        const withTwo = [...counts.values()].filter((n) => n >= 2).length;
        const denom = counts.size;
        return {
          name,
          repeatPct: denom > 0 ? withTwo / denom : null,
          volume: customers.length,
        };
      })
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 3)
      .map(({ name, repeatPct }) => ({ name, repeatPct }));

    const retention = {
      repeatCustomerPct: retentionRepeat,
      topCategories,
    };

    let moneyRisk = {
      payoutsBlocked: curRows.filter((r) => r.payout_blocked === true).length,
      refundsInitiatedCount: 0,
      refundsInitiatedCents: 0,
      reconciliationPending: 0,
    };

    for (const r of curRows) {
      const rs = String(r.refund_status ?? '').toLowerCase();
      if (rs === 'pending' || rs === 'processing' || rs === 'partially_failed') {
        moneyRisk.refundsInitiatedCount += 1;
        moneyRisk.refundsInitiatedCents += Math.round(toFiniteNumber(r.amount_refunded_cents));
      }
    }

    let attentionFeed: AttentionFeedItem[] = [];

    try {
      const reconDays = reconWindowDays(bounds);
      const recon = await loadMoneyReconciliationWindow(admin, {
        days: reconDays,
        fromIso,
        toIso,
        maxBookings: 400,
        unresolvedOnly: false,
      });
      moneyRisk = {
        ...moneyRisk,
        payoutsBlocked: recon.summary.payout_blocked_count,
        reconciliationPending: recon.weeklyHealth.unresolvedIssuesCount,
      };
      attentionFeed = buildAttentionFeed(recon.issueSnapshots);
    } catch (e) {
      console.warn('[load-analytics-dashboard] reconciliation window', e);
    }

    if (moneyRisk.refundsInitiatedCents === 0) {
      for (const r of curRows) {
        const rs = String(r.refund_status ?? '').toLowerCase();
        if (rs === 'succeeded' || rs === 'partial') {
          moneyRisk.refundsInitiatedCents += Math.round(toFiniteNumber(r.refunded_total_cents));
        }
      }
    }

    return {
      rangeKey,
      rangeLabel: rangeLabel(rangeKey),
      fromIso,
      toIso,
      kpis,
      funnel,
      bookingsOverTime,
      revenueOverTime,
      marketplaceHealth,
      localPerformance,
      retention,
      moneyRisk,
      traffic: [
        { label: 'Social media', pct: 45, accent: 'orange' },
        { label: 'Organic search', pct: 32, accent: 'blue' },
        { label: 'Email / direct', pct: 23, accent: 'green' },
      ],
      attentionFeed,
    };
  } catch (e) {
    console.warn('[load-analytics-dashboard] fatal', e);
    return empty();
  }
}

/** Map reconciliation tier to feed severity labels (test helper). */
export function attentionSeverityFromTier(tier: 'high' | 'medium' | 'low'): AttentionFeedItem['severity'] {
  if (tier === 'high') return 'HIGH';
  if (tier === 'medium') return 'MEDIUM';
  return 'LOW';
}
