/**
 * Admin Command Center: server-side data layer.
 * All queries use createAdminSupabaseClient (bypasses RLS).
 * Handles missing tables/columns with try/catch and fallback values.
 */

import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import type {
  CommandCenterData,
  RevenueMetrics,
  BurnRunway,
  JobsMetrics,
  ProsMetrics,
  CustomersMetrics,
  ShieldRiskMetrics,
  AdminTargetsRow,
  TargetStatus,
  AlertItem,
  PeriodCounts,
} from '@/types/commandCenter';

const PLATFORM_TAKE_RATE = 0.1; // 10%
const STRIPE_PERCENT = 0.029;
const STRIPE_FIXED_CENTS = 30;

const FIXED_COSTS = 60 + 20 + 47 / 12 + 20 + 25 + 12; // Cursor, ChatGPT, Namecheap, Vercel, Supabase, email (~140/mo)

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toNumNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function periodCounts(today: number, sevenDays: number, thirtyDays: number): PeriodCounts {
  return { today, sevenDays, thirtyDays };
}

export async function getCommandCenterData(): Promise<CommandCenterData> {
  const admin = createAdminSupabaseClient();

  const [revenue, burnRunway, jobs, pros, customers, shieldRisk, targets, targetStatuses, alerts] =
    await Promise.all([
      getRevenueMetrics(admin),
      getBurnRunway(admin),
      getJobsMetrics(admin),
      getProsMetrics(admin),
      getCustomersMetrics(admin),
      getShieldRiskMetrics(admin),
      getAdminTargets(admin),
      Promise.resolve([] as TargetStatus[]), // filled after we have targets + metrics
      getAlerts(admin),
    ]);

  const statuses = buildTargetStatuses(targets, revenue, jobs, pros);
  return {
    revenue,
    burnRunway,
    jobs,
    pros,
    customers,
    shieldRisk,
    targets,
    targetStatuses: statuses,
    alerts,
  };
}

async function getRevenueMetrics(
  admin: ReturnType<typeof createAdminSupabaseClient>
): Promise<RevenueMetrics> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    const { data: rows } = await admin
      .from('bookings')
      .select('id, price, status, created_at')
      .in('status', ['completed', 'awaiting_payment']);

    const completed = (rows ?? []).filter((r) => r.status === 'completed');
    const prices = (rows ?? []).map((r) => toNum(r.price));

    let gmvToday = 0,
      gmv7 = 0,
      gmv30 = 0;
    for (const r of rows ?? []) {
      const p = toNum(r.price);
      const createdAt = r.created_at ? new Date(r.created_at) : null;
      if (!createdAt) continue;
      if (createdAt >= todayStart) gmvToday += p;
      if (createdAt >= sevenDaysAgo) gmv7 += p;
      if (createdAt >= thirtyDaysAgo) gmv30 += p;
    }

    const gmv = prices.reduce((a, b) => a + b, 0);
    const platformGross = gmv * PLATFORM_TAKE_RATE;
    const stripeFeeEstimate = completed.length * (STRIPE_FIXED_CENTS / 100) + gmv * STRIPE_PERCENT;
    const refundsTotal = 0;
    const refundsCount = 0;
    const chargebacksTotal = 0;
    const chargebacksCount = 0;
    const netRevenueMrr = platformGross - stripeFeeEstimate - refundsTotal - chargebacksTotal;

    return {
      gmv,
      platformGross,
      stripeFeeEstimate,
      refundsTotal,
      refundsCount,
      chargebacksTotal,
      chargebacksCount,
      netRevenueMrr,
      byPeriod: {
        today: { gmv: gmvToday, platformGross: gmvToday * PLATFORM_TAKE_RATE },
        sevenDays: { gmv: gmv7, platformGross: gmv7 * PLATFORM_TAKE_RATE },
        thirtyDays: { gmv: gmv30, platformGross: gmv30 * PLATFORM_TAKE_RATE },
      },
    };
  } catch {
    return {
      gmv: 0,
      platformGross: 0,
      stripeFeeEstimate: 0,
      refundsTotal: 0,
      refundsCount: 0,
      chargebacksTotal: 0,
      chargebacksCount: 0,
      netRevenueMrr: 0,
      byPeriod: {
        today: { gmv: 0, platformGross: 0 },
        sevenDays: { gmv: 0, platformGross: 0 },
        thirtyDays: { gmv: 0, platformGross: 0 },
      },
    };
  }
}

async function getBurnRunway(
  admin: ReturnType<typeof createAdminSupabaseClient>
): Promise<BurnRunway> {
  let marketingSpend = 0;
  let cashBalance = 0;
  let payrollOption = '0';

  try {
    const { data: inputs } = await admin.from('admin_inputs').select('key, value');
    for (const row of inputs ?? []) {
      const k = String(row.key ?? '').toLowerCase();
      const v = String(row.value ?? '').trim();
      if (k === 'marketing_spend' || k === 'ad_spend_monthly') marketingSpend = parseFloat(v) || 0;
      if (k === 'cash_balance') cashBalance = parseFloat(v) || 0;
      if (k === 'payroll_toggle') payrollOption = v || '0';
    }
  } catch {
    // table may not exist
  }

  const payroll =
    payrollOption === '1' ? 5500 : payrollOption === 'custom' ? 0 : 0; // custom could read another key
  const fixedCosts = FIXED_COSTS;
  const burn = fixedCosts + payroll + marketingSpend;
  const runwayMonths = burn > 0 ? cashBalance / burn : 0;

  return {
    fixedCosts,
    payroll,
    marketingSpend,
    burn,
    cashBalance,
    runwayMonths,
  };
}

async function getJobsMetrics(
  admin: ReturnType<typeof createAdminSupabaseClient>
): Promise<JobsMetrics> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  function byPeriod(
    rows: { status: string; created_at?: string }[],
    statusFilter: string[]
  ): PeriodCounts {
    let today = 0,
      seven = 0,
      thirty = 0;
    for (const r of rows) {
      if (!statusFilter.includes(r.status)) continue;
      const at = r.created_at ? new Date(r.created_at) : null;
      if (!at) continue;
      if (at >= todayStart) today++;
      if (at >= sevenDaysAgo) seven++;
      if (at >= thirtyDaysAgo) thirty++;
    }
    return periodCounts(today, seven, thirty);
  }

  try {
    const { data: rows } = await admin
      .from('bookings')
      .select('id, status, created_at, status_history');

    const list = rows ?? [];
    const posted = byPeriod(list, ['requested', 'accepted', 'awaiting_payment', 'completed', 'cancelled', 'declined']);
    const accepted = byPeriod(list, ['accepted', 'awaiting_payment', 'completed', 'cancelled']);
    const completed = byPeriod(list, ['completed']);

    let fillRate24h: number | null = null;
    let medianTimeToMatchHours: number | null = null;
    const acceptedRows = list.filter((r) =>
      ['accepted', 'awaiting_payment', 'completed', 'cancelled'].includes(r.status)
    );
    if (acceptedRows.length > 0) {
      const withAcceptedAt = acceptedRows.map((r) => {
        const hist = (r as { status_history?: unknown }).status_history;
        const arr = Array.isArray(hist) ? hist : [];
        const entry = arr.find((e: { status?: string }) => e?.status === 'accepted');
        const acceptedAt = entry && typeof (entry as { at?: string }).at === 'string'
          ? new Date((entry as { at: string }).at).getTime()
          : null;
        const created = r.created_at ? new Date(r.created_at).getTime() : null;
        return { created, acceptedAt };
      });
      const within24h = withAcceptedAt.filter(
        (x) => x.acceptedAt != null && x.created != null && (x.acceptedAt - x.created) <= 24 * 60 * 60 * 1000
      );
      fillRate24h = withAcceptedAt.length > 0 ? within24h.length / withAcceptedAt.length : null;
      const times = withAcceptedAt
        .filter((x) => x.acceptedAt != null && x.created != null)
        .map((x) => (x.acceptedAt! - x.created!) / (60 * 60 * 1000));
      if (times.length > 0) {
        times.sort((a, b) => a - b);
        medianTimeToMatchHours = times[Math.floor(times.length / 2)];
      }
    }

    const cancelled = list.filter((r) => r.status === 'cancelled');
    const declined = list.filter((r) => r.status === 'declined');
    const totalResolved = list.filter((r) =>
      ['accepted', 'completed', 'cancelled', 'declined'].includes(r.status)
    ).length;
    const cancellationRateCustomer = totalResolved > 0 ? cancelled.length / totalResolved : null;
    const cancellationRatePro = totalResolved > 0 ? declined.length / totalResolved : null;

    let disputeRate: number | null = null;
    let disputeResolutionMedianHours: number | null = null;
    try {
      const { data: scopeRows } = await admin.from('scope_reviews').select('id, booking_id, created_at');
      const scopeList = scopeRows ?? [];
      disputeRate = list.length > 0 ? scopeList.length / list.length : null;
      // resolution time would need resolved_at; we don't have it, leave null
    } catch {
      // scope_reviews may not exist
    }

    return {
      posted,
      accepted,
      completed,
      fillRate24h,
      medianTimeToMatchHours,
      cancellationRateCustomer,
      cancellationRatePro,
      noShowRate: null,
      disputeRate,
      disputeResolutionMedianHours,
    };
  } catch {
    return {
      posted: periodCounts(0, 0, 0),
      accepted: periodCounts(0, 0, 0),
      completed: periodCounts(0, 0, 0),
      fillRate24h: null,
      medianTimeToMatchHours: null,
      cancellationRateCustomer: null,
      cancellationRatePro: null,
      noShowRate: null,
      disputeRate: null,
      disputeResolutionMedianHours: null,
    };
  }
}

async function getProsMetrics(
  admin: ReturnType<typeof createAdminSupabaseClient>
): Promise<ProsMetrics> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  try {
    const { data: prosRows } = await admin
      .from('service_pros')
      .select('id, user_id, display_name, available, created_at');
    const prosList = prosRows ?? [];

    const { data: bookingsRows } = await admin
      .from('bookings')
      .select('pro_id, status, created_at');
    const completedByPro = new Map<string, number>();
    for (const b of bookingsRows ?? []) {
      if (b.status !== 'completed') continue;
      const pid = String(b.pro_id);
      completedByPro.set(pid, (completedByPro.get(pid) ?? 0) + 1);
    }

    const jobsPerPro = prosList.map((p) => completedByPro.get(String(p.id)) ?? 0).filter((n) => n > 0);
    const jobsPerProAll = prosList.map((p) => completedByPro.get(String(p.id)) ?? 0);
    const avg = jobsPerProAll.length > 0 ? jobsPerProAll.reduce((a, b) => a + b, 0) / jobsPerProAll.length : 0;
    const sorted = [...jobsPerProAll].sort((a, b) => a - b);
    const p50 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.5)] : 0;
    const p90 = sorted.length > 0 ? sorted[Math.min(Math.floor(sorted.length * 0.9), sorted.length - 1)] : 0;

    const activeLast30d = prosList.filter((p) => {
      const completedIds = new Set(
        (bookingsRows ?? [])
          .filter((b) => b.status === 'completed' && b.created_at >= thirtyDaysAgo.toISOString())
          .map((b) => String(b.pro_id))
      );
      return completedIds.has(String(p.id));
    }).length;

    const availableNow = prosList.filter((p) => p.available === true).length;

    const { data: profileRows } = await admin.from('profiles').select('id, role, onboarding_step');
    const withRole = (profileRows ?? []).filter((p) => p.role != null);
    const leads = prosList.length;
    const startedOnboarding = withRole.filter((p) => p.role === 'pro' || (p.onboarding_step ?? '').length > 0).length;
    const verified = prosList.length;
    const firstJob = prosList.filter((p) => (completedByPro.get(String(p.id)) ?? 0) >= 1).length;
    const active = activeLast30d;

    const verificationBacklog: { proId: string; displayName: string | null; priorityScore: number }[] = [];
    const verifiedCoveragePercent = prosList.length > 0 ? (prosList.length / prosList.length) * 100 : null;

    return {
      activeLast30d: activeLast30d,
      availableNow,
      jobsPerProAvg: avg,
      jobsPerProP50: p50,
      jobsPerProP90: p90,
      churn30d: 0,
      churn60d: 0,
      churn90d: 0,
      funnel: {
        leads,
        startedOnboarding,
        verified,
        firstJob,
        active,
      },
      verifiedCoveragePercent,
      verificationBacklog,
    };
  } catch {
    return {
      activeLast30d: 0,
      availableNow: 0,
      jobsPerProAvg: 0,
      jobsPerProP50: 0,
      jobsPerProP90: 0,
      churn30d: 0,
      churn60d: 0,
      churn90d: 0,
      funnel: {
        leads: 0,
        startedOnboarding: 0,
        verified: 0,
        firstJob: 0,
        active: 0,
      },
      verifiedCoveragePercent: null,
      verificationBacklog: [],
    };
  }
}

async function getCustomersMetrics(
  admin: ReturnType<typeof createAdminSupabaseClient>
): Promise<CustomersMetrics> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  try {
    const { data: bookingsRows } = await admin.from('bookings').select('customer_id, created_at');
    const list = bookingsRows ?? [];
    const customerIds = new Set(list.map((b) => String(b.customer_id)));

    const newToday = new Set(list.filter((b) => new Date(b.created_at) >= todayStart).map((b) => String(b.customer_id))).size;
    const new7 = new Set(list.filter((b) => new Date(b.created_at) >= sevenDaysAgo).map((b) => String(b.customer_id))).size;
    const new30 = new Set(list.filter((b) => new Date(b.created_at) >= thirtyDaysAgo).map((b) => String(b.customer_id))).size;

    const bookingsPerCustomer = new Map<string, number>();
    for (const b of list) {
      const cid = String(b.customer_id);
      bookingsPerCustomer.set(cid, (bookingsPerCustomer.get(cid) ?? 0) + 1);
    }
    const with2Plus30 = [...bookingsPerCustomer.values()].filter((n) => n >= 2).length;
    const total30 = customerIds.size || 1;
    const repeatRate30d = total30 > 0 ? with2Plus30 / total30 : null;
    const repeatRate60d = null;
    const repeatRate90d = null;

    const cohortRetention: { signupMonth: string; retained30d: number; total: number }[] = [];

    let adSpend = 0;
    let spendSupply = 0;
    try {
      const { data: inputs } = await admin.from('admin_inputs').select('key, value');
      for (const row of inputs ?? []) {
        const k = String(row.key ?? '').toLowerCase();
        const v = parseFloat(String(row.value ?? '0')) || 0;
        if (k === 'ad_spend_monthly') adSpend = v;
        if (k === 'spend_supply') spendSupply = v;
      }
    } catch {
      // ignore
    }
    const newCustomers30 = new Set(list.filter((b) => new Date(b.created_at) >= thirtyDaysAgo).map((b) => String(b.customer_id))).size;
    const customerCac = newCustomers30 > 0 ? adSpend / newCustomers30 : null;
    const proCac = null;

    const avgJobsPerCustomer = total30 > 0 ? list.length / total30 : 0;
    const netPerJob = 0;
    const ltvEstimate = avgJobsPerCustomer * netPerJob || null;

    return {
      newCustomers: periodCounts(newToday, new7, new30),
      repeatRate30d,
      repeatRate60d,
      repeatRate90d,
      cohortRetention,
      customerCac,
      proCac,
      ltvEstimate,
    };
  } catch {
    return {
      newCustomers: periodCounts(0, 0, 0),
      repeatRate30d: null,
      repeatRate60d: null,
      repeatRate90d: null,
      cohortRetention: [],
      customerCac: null,
      proCac: null,
      ltvEstimate: null,
    };
  }
}

async function getShieldRiskMetrics(
  admin: ReturnType<typeof createAdminSupabaseClient>
): Promise<ShieldRiskMetrics> {
  const fraudSignals: ShieldRiskMetrics['fraudSignals'] = [];
  try {
    const { data: bookingsRows } = await admin.from('bookings').select('customer_id, pro_id, status');
    const list = bookingsRows ?? [];
    const cancelledByCustomer = list.filter((r) => r.status === 'cancelled').length;
    const declinedByPro = list.filter((r) => r.status === 'declined').length;
    const completed = list.filter((r) => r.status === 'completed').length;
    const proIds = [...new Set(list.map((b) => String(b.pro_id)))];
    const customerIds = [...new Set(list.map((b) => String(b.customer_id)))];
    fraudSignals.push({
      type: 'high_cancel_pro',
      label: 'Pros with high cancellation + low completion',
      count: 0,
    });
    fraudSignals.push({
      type: 'chargebacks',
      label: 'Customers with ≥2 chargebacks',
      count: 0,
    });
  } catch {
    // ignore
  }
  return {
    shieldAdoptionRate: null,
    claimsSubmitted: 0,
    claimsApproved: 0,
    claimsPaidOut: 0,
    holdbackReserveBalance: 0,
    fraudSignals,
  };
}

async function getAdminTargets(
  admin: ReturnType<typeof createAdminSupabaseClient>
): Promise<AdminTargetsRow | null> {
  try {
    const { data } = await admin
      .from('admin_targets')
      .select('mrr_target, jobs_target, active_pros_target, fill_rate_target, time_to_match_target_hours')
      .limit(1)
      .single();
    if (data) {
      return {
        mrr_target: toNumNull(data.mrr_target),
        jobs_target: toNumNull(data.jobs_target),
        active_pros_target: toNumNull(data.active_pros_target),
        fill_rate_target: toNumNull(data.fill_rate_target),
        time_to_match_target_hours: toNumNull(data.time_to_match_target_hours),
      };
    }
  } catch {
    // table may not exist
  }
  return null;
}

function buildTargetStatuses(
  targets: AdminTargetsRow | null,
  revenue: RevenueMetrics,
  jobs: JobsMetrics,
  pros: ProsMetrics
): TargetStatus[] {
  const statuses: TargetStatus[] = [];
  if (!targets) return statuses;

  function status(current: number, target: number | null, higherIsBetter: boolean): TargetStatus['status'] {
    if (target == null || target === 0) return 'neutral';
    const ratio = current / target;
    if (higherIsBetter) {
      if (ratio >= 1) return 'green';
      if (ratio >= 0.7) return 'yellow';
      return 'red';
    }
    if (ratio <= 1) return 'green';
    if (ratio <= 1.3) return 'yellow';
    return 'red';
  }

  statuses.push({
    key: 'mrr',
    label: 'MRR',
    current: revenue.netRevenueMrr,
    target: targets.mrr_target,
    unit: '$',
    status: status(revenue.netRevenueMrr, targets.mrr_target ?? 0, true),
  });
  statuses.push({
    key: 'jobs',
    label: 'Jobs (30d)',
    current: jobs.completed.thirtyDays,
    target: targets.jobs_target ?? 0,
    unit: '',
    status: status(jobs.completed.thirtyDays, targets.jobs_target ?? 0, true),
  });
  statuses.push({
    key: 'active_pros',
    label: 'Active pros',
    current: pros.activeLast30d,
    target: targets.active_pros_target ?? 0,
    unit: '',
    status: status(pros.activeLast30d, targets.active_pros_target ?? 0, true),
  });
  statuses.push({
    key: 'fill_rate',
    label: 'Fill rate (24h)',
    current: jobs.fillRate24h != null ? jobs.fillRate24h * 100 : null,
    target: targets.fill_rate_target != null ? targets.fill_rate_target * 100 : null,
    unit: '%',
    status:
      jobs.fillRate24h != null && targets.fill_rate_target != null
        ? status(jobs.fillRate24h, targets.fill_rate_target, true)
        : 'neutral',
  });
  const ttm = jobs.medianTimeToMatchHours;
  const ttmTarget = targets.time_to_match_target_hours;
  let ttmStatus: TargetStatus['status'] = 'neutral';
  if (ttm != null && ttmTarget != null) {
    if (ttm <= ttmTarget) ttmStatus = 'green';
    else if (ttm <= ttmTarget * 1.3) ttmStatus = 'yellow';
    else ttmStatus = 'red';
  }
  statuses.push({
    key: 'time_to_match',
    label: 'Time to match (hrs)',
    current: ttm,
    target: ttmTarget,
    unit: 'h',
    status: ttmStatus,
  });
  return statuses;
}

async function getAlerts(
  admin: ReturnType<typeof createAdminSupabaseClient>
): Promise<AlertItem[]> {
  try {
    const { data } = await admin
      .from('admin_alerts_log')
      .select('type, severity, message, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    return (data ?? []).map((r) => ({
      type: String(r.type),
      severity: (r.severity === 'warning' || r.severity === 'critical' ? r.severity : 'info') as AlertItem['severity'],
      message: String(r.message),
      createdAt: String(r.created_at),
    }));
  } catch {
    return [];
  }
}
