import type { ReactNode } from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { requireAdminUser } from '@/app/(app)/admin/_admin';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import {
  loadAnalyticsDashboard,
  parseAnalyticsRange,
} from '@/lib/admin/analytics/load-analytics-dashboard';
import type { AnalyticsRangeKey } from '@/lib/admin/analytics/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { StatusPill } from '@/components/ui/StatusPill';
import { AnalyticsCharts } from '@/components/admin/analytics/AnalyticsCharts';
import { AnalyticsFilterBar } from '@/components/admin/analytics/AnalyticsFilterBar';
import { cn } from '@/lib/cn';
import {
  AlertTriangle,
  Check,
  Clock,
  CreditCard,
  Eye,
  PiggyBank,
  RefreshCw,
  Settings,
  ShoppingCart,
  UserRound,
  X,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function pickFirst(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function formatUsd0(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatCompactUsd0(cents: number): string {
  const n = cents / 100;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return formatUsd0(cents);
}

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct == null) {
    return <span className="text-[11px] font-medium tabular-nums text-text3">—</span>;
  }
  const pos = pct >= 0;
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums',
        pos ? 'bg-success/15 text-success' : 'bg-danger/12 text-danger'
      )}
    >
      {pos ? '+' : ''}
      {pct}%
    </span>
  );
}

function KpiTile({
  label,
  value,
  deltaPct,
  icon,
  iconClass,
}: {
  label: string;
  value: string;
  deltaPct: number | null;
  icon: ReactNode;
  iconClass: string;
}) {
  return (
    <Card
      variant="elevated"
      className={cn(
        'border-border/70 bg-[hsl(var(--card-neutral))]',
        'shadow-[0_12px_42px_-8px_rgba(45,52,54,0.16)] ring-1 ring-black/[0.045]'
      )}
    >
      <CardContent className="flex items-start gap-4 p-5 sm:p-6">
        <div
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_4px_14px_-2px_rgba(0,0,0,0.18)]',
            iconClass
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text3">{label}</p>
          <p className="mt-1.5 text-3xl font-bold tabular-nums tracking-tight text-text sm:text-[2rem] sm:leading-none">
            {value}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <DeltaBadge pct={deltaPct} />
            <span className="text-[11px] font-medium text-text3">vs prior period</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const RANGE_TABS: { key: AnalyticsRangeKey; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: 'ytd', label: 'YTD' },
];

const FUNNEL_ICONS = [Eye, UserRound, Check, ShoppingCart, CreditCard, Settings];

function severityPillVariant(s: string): 'failed' | 'needs-action' | 'pending' {
  if (s === 'HIGH') return 'failed';
  if (s === 'MEDIUM') return 'needs-action';
  return 'pending';
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireAdminUser('/admin/analytics');
  const sp = await searchParams;
  const rangeKey = parseAnalyticsRange(pickFirst(sp.range));

  const admin = createAdminSupabaseClient();
  const data = await loadAnalyticsDashboard(admin, rangeKey);

  const exportDays =
    rangeKey === '7d' ? 7 : rangeKey === '90d' ? 90 : rangeKey === 'ytd' ? 365 : 30;
  const exportHref = `/api/admin/reconciliation/export?days=${exportDays}&unresolved_only=1`;

  const repeatPct =
    data.retention.repeatCustomerPct != null
      ? `${(data.retention.repeatCustomerPct * 100).toFixed(1)}%`
      : '—';

  const initial = (user.email?.trim()?.[0] ?? '?').toUpperCase();

  return (
    <Layout title="Flyers Up – Analytics">
      <div className="min-w-0 space-y-5 rounded-3xl border border-border/60 bg-[#F1E8C7] p-4 shadow-[var(--shadow-card)] sm:p-5 lg:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-[1.65rem]">Flyers Up Analytics</h1>
            <p className="mt-0.5 text-sm text-text3">{data.rangeLabel} · Founder dashboard</p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:flex-wrap">
            <div className="flex rounded-xl border border-border bg-[hsl(var(--card-neutral))] p-0.5 shadow-[var(--shadow-1)]">
              {RANGE_TABS.map((t) => (
                <Link
                  key={t.key}
                  href={`/admin/analytics?range=${t.key}`}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                    rangeKey === t.key
                      ? 'bg-trust text-trustFg shadow-sm'
                      : 'text-text2 hover:bg-surface2'
                  )}
                >
                  {t.label}
                </Link>
              ))}
            </div>
            <AnalyticsFilterBar />
            <div className="flex items-center gap-2">
              <Link
                href={exportHref}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[hsl(var(--trust))] px-4 text-sm font-semibold text-trustFg shadow-sm hover:brightness-[1.03]"
              >
                Export data
              </Link>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-[hsl(var(--card-neutral))] text-sm font-semibold text-text shadow-[var(--shadow-1)]"
                title={user.email ?? 'Admin'}
              >
                {initial}
              </div>
            </div>
          </div>
        </div>

        <section aria-label="Key metrics and funnel" className="space-y-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-2.5 xl:grid-cols-3">
            <KpiTile
              label="GMV (gross booking value)"
              value={formatCompactUsd0(data.kpis.gmvCents.current)}
              deltaPct={data.kpis.gmvCents.changePct}
              icon={<span className="text-xl font-bold leading-none">$</span>}
              iconClass="bg-[hsl(var(--trust))]"
            />
            <KpiTile
              label="Platform revenue"
              value={formatCompactUsd0(data.kpis.platformRevenueCents.current)}
              deltaPct={data.kpis.platformRevenueCents.changePct}
              icon={<PiggyBank className="h-7 w-7" strokeWidth={2.2} />}
              iconClass="bg-[hsl(var(--action))]"
            />
            <KpiTile
              label="Bookings"
              value={data.kpis.bookings.current.toLocaleString()}
              deltaPct={data.kpis.bookings.changePct}
              icon={<ShoppingCart className="h-7 w-7" strokeWidth={2.2} />}
              iconClass="bg-violet-500"
            />
            <KpiTile
              label="New customers"
              value={data.kpis.newCustomers.current.toLocaleString()}
              deltaPct={data.kpis.newCustomers.changePct}
              icon={<UserRound className="h-7 w-7" strokeWidth={2.2} />}
              iconClass="bg-sky-500"
            />
            <KpiTile
              label="New pros"
              value={data.kpis.newPros.current.toLocaleString()}
              deltaPct={data.kpis.newPros.changePct}
              icon={<UserRound className="h-7 w-7" strokeWidth={2.2} />}
              iconClass="bg-[#1e3a5f]"
            />
            <KpiTile
              label="Repeat rate"
              value={
                data.kpis.repeatRate.current > 0
                  ? `${(data.kpis.repeatRate.current * 100).toFixed(1)}%`
                  : '—'
              }
              deltaPct={data.kpis.repeatRate.changePct}
              icon={<RefreshCw className="h-7 w-7" strokeWidth={2.2} />}
              iconClass="bg-teal-600"
            />
          </div>

          <Card
            variant="elevated"
            className={cn(
              'border-border/70 bg-[hsl(var(--card-neutral))]',
              'shadow-[0_14px_48px_-10px_rgba(45,52,54,0.18)] ring-1 ring-black/[0.045]'
            )}
          >
            <CardHeader className="space-y-1 px-5 pb-0 pt-5 sm:px-6 sm:pt-6">
              <CardTitle className="text-xl font-semibold tracking-tight text-text sm:text-[1.35rem]">
                User conversion funnel
              </CardTitle>
              <CardDescription className="text-sm leading-snug">
                {data.rangeLabel} · landing visits estimated
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto px-5 pb-6 pt-5 sm:px-6">
              <div className="flex min-w-[820px] items-start justify-between gap-1 px-1 sm:min-w-[880px] sm:gap-2 sm:px-2">
                {data.funnel.map((step, i) => {
                  const Icon = FUNNEL_ICONS[i] ?? Eye;
                  return (
                    <div
                      key={step.key}
                      className="flex min-w-0 w-[100px] flex-1 flex-col items-center text-center sm:w-[128px]"
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-sky-50 to-blue-100/90 text-trust shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ring-1 ring-trust/20 sm:h-[4.5rem] sm:w-[4.5rem]">
                        <Icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2} />
                      </div>
                      <p className="mt-3 max-w-[11rem] text-[10px] font-bold uppercase leading-tight tracking-[0.12em] text-text2">
                        {step.label}
                      </p>
                      <p className="mt-2.5 text-2xl font-bold tabular-nums tracking-tight text-text sm:text-[1.75rem] sm:leading-none">
                        {step.count.toLocaleString()}
                      </p>
                      <p className="mt-1.5 text-xs font-medium tabular-nums text-text3">
                        {step.dropFromPriorPct == null
                          ? '—'
                          : `${step.dropFromPriorPct >= 0 ? '+' : ''}${step.dropFromPriorPct}% vs prior`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        <AnalyticsCharts bookingsOverTime={data.bookingsOverTime} revenueOverTime={data.revenueOverTime} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card variant="elevated" className="border-border/80 bg-[hsl(var(--card-neutral))]">
            <CardHeader>
              <CardTitle>Marketplace health</CardTitle>
              <CardDescription>Operational quality for {data.rangeLabel.toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ListRow
                icon={<Check className="h-4 w-4 text-success" />}
                title="Acceptance rate"
                subtext="Share of flows that are not declined once matched"
                rightSlot={
                  <span className="text-sm font-semibold tabular-nums text-success">
                    {data.marketplaceHealth.acceptanceRate != null
                      ? `${(data.marketplaceHealth.acceptanceRate * 100).toFixed(1)}%`
                      : '—'}
                  </span>
                }
              />
              <ListRow
                icon={<Clock className="h-4 w-4 text-success" />}
                title="Avg response time"
                subtext="Median time from request → acceptance"
                rightSlot={
                  <span className="text-sm font-semibold tabular-nums text-text">
                    {data.marketplaceHealth.avgResponseMinutes != null
                      ? `${Math.round(data.marketplaceHealth.avgResponseMinutes)}m`
                      : '—'}
                  </span>
                }
              />
              <ListRow
                icon={<X className="h-4 w-4 text-danger" />}
                title="Cancellation rate"
                subtext="Cancelled / bookings created in window"
                rightSlot={
                  <span className="text-sm font-semibold tabular-nums text-danger">
                    {data.marketplaceHealth.cancellationRate != null
                      ? `${(data.marketplaceHealth.cancellationRate * 100).toFixed(1)}%`
                      : '—'}
                  </span>
                }
              />
              <ListRow
                icon={<RefreshCw className="h-4 w-4 text-trust" />}
                title="Refund rate"
                subtext="Refund signals / completed jobs"
                rightSlot={
                  <span className="text-sm font-semibold tabular-nums text-text">
                    {data.marketplaceHealth.refundRate != null
                      ? `${(data.marketplaceHealth.refundRate * 100).toFixed(1)}%`
                      : '—'}
                  </span>
                }
              />
            </CardContent>
          </Card>

          <Card variant="elevated" className="border-border/80 bg-[hsl(var(--card-neutral))]">
            <CardHeader>
              <CardTitle>Local performance</CardTitle>
              <CardDescription>Demand (bookings) vs supply (distinct pros) from address keywords</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.localPerformance.length === 0 ? (
                <p className="text-sm text-text3">No regional matches in booking addresses for this window.</p>
              ) : (
                data.localPerformance.map((row) => (
                  <div key={row.id} className="rounded-xl border border-border bg-surface px-3 py-3 shadow-[var(--shadow-1)]">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-text">{row.label}</p>
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          row.statusTone === 'success' && 'text-success',
                          row.statusTone === 'warning' && 'text-[hsl(var(--action))]',
                          row.statusTone === 'default' && 'text-text2'
                        )}
                      >
                        {row.statusLabel}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      <div>
                        <div className="mb-0.5 flex justify-between text-[11px] font-medium text-text3">
                          <span>Demand</span>
                          <span className="tabular-nums text-text">{row.demand}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface2">
                          <div
                            className="h-full rounded-full bg-[hsl(var(--trust))]"
                            style={{ width: `${row.demandBarPct}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="mb-0.5 flex justify-between text-[11px] font-medium text-text3">
                          <span>Supply</span>
                          <span className="tabular-nums text-text">{row.supply}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface2">
                          <div
                            className="h-full rounded-full bg-[hsl(var(--action))]"
                            style={{ width: `${row.supplyBarPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card variant="elevated" className="border-border/80 bg-[hsl(var(--card-neutral))]">
            <CardHeader>
              <CardTitle>Retention</CardTitle>
              <CardDescription>Last 90 days through end of range</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tabular-nums text-text">{repeatPct}</p>
              <p className="mt-1 text-sm text-text3">Customers with 2+ completed jobs</p>
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-text3">Top rebooking categories</p>
                <ul className="mt-2 space-y-2">
                  {data.retention.topCategories.length === 0 ? (
                    <li className="text-sm text-text3">Not enough category data yet.</li>
                  ) : (
                    data.retention.topCategories.map((c) => (
                      <li key={c.name} className="flex justify-between text-sm">
                        <span className="text-text">{c.name}</span>
                        <span className="font-medium tabular-nums text-text2">
                          {c.repeatPct != null ? `${(c.repeatPct * 100).toFixed(0)}%` : '—'}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card
            variant="elevated"
            className="border border-rose-200/80 bg-rose-50/90 shadow-[0_8px_28px_rgba(225,29,72,0.08)]"
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-700" />
                <CardTitle className="text-rose-950">Money risk</CardTitle>
              </div>
              <CardDescription className="text-rose-900/80">Live signals from payouts & reconciliation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-rose-900/90">Payouts blocked</span>
                <span className="font-semibold tabular-nums text-rose-950">
                  {data.moneyRisk.payoutsBlocked.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-rose-900/90">Refunds in flight</span>
                <span className="font-semibold tabular-nums text-rose-950">
                  {data.moneyRisk.refundsInitiatedCount.toLocaleString()} ·{' '}
                  {formatUsd0(data.moneyRisk.refundsInitiatedCents)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-rose-900/90">Reconciliation issues</span>
                <span className="font-semibold tabular-nums text-rose-950">
                  {data.moneyRisk.reconciliationPending.toLocaleString()} pending
                </span>
              </div>
              <Link
                href="/admin/reconciliation"
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl border-2 border-rose-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-800 shadow-sm hover:bg-rose-50"
              >
                Open money control
              </Link>
            </CardContent>
          </Card>

          <Card variant="elevated" className="border-border/80 bg-[hsl(var(--card-neutral))]">
            <CardHeader>
              <CardTitle>Traffic & acquisition</CardTitle>
              <CardDescription>Placeholder mix until GA / attribution is wired</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.traffic.map((ch) => (
                <div key={ch.label}>
                  <div className="mb-0.5 flex justify-between text-sm font-medium text-text">
                    <span>{ch.label}</span>
                    <span className="tabular-nums">{ch.pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface2">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        ch.accent === 'orange' && 'bg-[hsl(var(--action))]',
                        ch.accent === 'blue' && 'bg-[hsl(var(--trust))]',
                        ch.accent === 'green' && 'bg-success'
                      )}
                      style={{ width: `${ch.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card variant="elevated" className="border-border/80 bg-[hsl(var(--card-neutral))]">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>What needs attention</CardTitle>
              <CardDescription>Top unresolved money / booking issues ({data.attentionFeed.length} shown)</CardDescription>
            </div>
            <Link href="/admin/reconciliation" className="text-sm font-semibold text-trust hover:underline">
              View all tasks
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.attentionFeed.length === 0 ? (
              <p className="py-4 text-sm text-text3">No flagged reconciliation items in this window.</p>
            ) : (
              data.attentionFeed.map((item) => (
                <Link key={item.id} href={item.href} className="block">
                  <ListRow
                    icon={<AlertTriangle className="h-4 w-4 text-[hsl(var(--action))]" />}
                    title={item.title}
                    subtext={item.description}
                    rightSlot={<StatusPill variant={severityPillVariant(item.severity)}>{item.severity}</StatusPill>}
                  />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-text3">
          <Link href="/admin" className="font-medium text-trust hover:underline">
            ← Admin home
          </Link>
        </p>
      </div>
    </Layout>
  );
}
