'use client';

import { useState } from 'react';
import Link from 'next/link';
import { adminUpdateCommandCenterInputsAction } from '@/app/(app)/admin/_actions';
import type { CommandCenterData, PeriodKey } from '@/types/commandCenter';

const TABS = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'jobs', label: 'Jobs & Liquidity' },
  { id: 'pros', label: 'Pros (Supply)' },
  { id: 'customers', label: 'Customers & CAC' },
  { id: 'shield', label: 'Shield & Risk' },
  { id: 'payouts', label: 'Payouts & Finance' },
  { id: 'targets', label: 'Targets & Alerts' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function KpiCard({
  title,
  value,
  sub,
  periodLabel,
}: {
  title: string;
  value: string | number;
  sub?: string;
  periodLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      {periodLabel ? (
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{periodLabel}</p>
      ) : null}
      <p className="mt-1 text-2xl font-semibold text-text">{value}</p>
      <p className="text-sm text-muted">{title}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

function StatusChip({ status }: { status: 'red' | 'yellow' | 'green' | 'neutral' }) {
  const classes = {
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    yellow: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    neutral: 'bg-surface2 text-muted',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${classes[status]}`}>
      {status}
    </span>
  );
}

export function CommandCenterView({
  data,
  ok,
  error,
}: {
  data: CommandCenterData;
  ok?: string | null;
  error?: string | null;
}) {
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [tab, setTab] = useState<TabId>('revenue');

  const periodLabel = period === 'today' ? 'Today' : period === '7d' ? 'Last 7 days' : 'Last 30 days';
  const rev = data.revenue;
  const burn = data.burnRunway;
  const jobs = data.jobs;
  const pros = data.pros;
  const customers = data.customers;
  const shield = data.shieldRisk;

  const gmv = period === 'today' ? rev.byPeriod.today.gmv : period === '7d' ? rev.byPeriod.sevenDays.gmv : rev.byPeriod.thirtyDays.gmv;
  const platformRev = period === 'today' ? rev.byPeriod.today.platformGross : period === '7d' ? rev.byPeriod.sevenDays.platformGross : rev.byPeriod.thirtyDays.platformGross;
  const posted = period === 'today' ? jobs.posted.today : period === '7d' ? jobs.posted.sevenDays : jobs.posted.thirtyDays;
  const accepted = period === 'today' ? jobs.accepted.today : period === '7d' ? jobs.accepted.sevenDays : jobs.accepted.thirtyDays;
  const completed = period === 'today' ? jobs.completed.today : period === '7d' ? jobs.completed.sevenDays : jobs.completed.thirtyDays;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-text">Command Center</h1>
        <Link className="text-sm text-muted hover:text-text" href="/admin">
          ← Admin home
        </Link>
      </div>

      {ok ? (
        <div className="p-4 bg-surface2 border border-[var(--surface-border)] border-l-[3px] border-l-accent rounded-lg text-text text-sm">
          {ok}
        </div>
      ) : null}
      {error ? (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-text text-sm">
          {error}
        </div>
      ) : null}

      {/* Period toggle */}
      <div className="flex gap-2">
        {(['today', '7d', '30d'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              period === p ? 'bg-accent text-accentContrast' : 'bg-surface2 text-muted hover:bg-surface hover:text-text'
            }`}
          >
            {p === 'today' ? 'Today' : p === '7d' ? '7d' : '30d'}
          </button>
        ))}
      </div>

      {/* Top KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="GMV" value={formatCurrency(gmv)} periodLabel={periodLabel} />
        <KpiCard title="Platform revenue" value={formatCurrency(platformRev)} periodLabel={periodLabel} />
        <KpiCard title="Jobs completed" value={completed} periodLabel={periodLabel} />
        <KpiCard title="Net MRR" value={formatCurrency(rev.netRevenueMrr)} sub="Platform − Stripe − refunds" />
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                tab === t.id ? 'bg-surface border border-border border-b-0 -mb-px text-text' : 'text-muted hover:text-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="rounded-xl border border-border bg-surface p-6">
        {tab === 'revenue' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-text">Revenue & Finance</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard title="GMV (all time)" value={formatCurrency(rev.gmv)} />
              <KpiCard title="Platform gross" value={formatCurrency(rev.platformGross)} />
              <KpiCard title="Stripe fee est." value={formatCurrency(rev.stripeFeeEstimate)} />
              <KpiCard title="Refunds" value={`${rev.refundsCount} (${formatCurrency(rev.refundsTotal)})`} />
              <KpiCard title="Chargebacks" value={`${rev.chargebacksCount} (${formatCurrency(rev.chargebacksTotal)})`} />
              <KpiCard title="Net revenue (MRR)" value={formatCurrency(rev.netRevenueMrr)} />
            </div>
          </div>
        )}

        {tab === 'jobs' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-text">Jobs & Liquidity</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard title="Posted" value={posted} periodLabel={periodLabel} />
              <KpiCard title="Accepted" value={period === 'today' ? jobs.accepted.today : period === '7d' ? jobs.accepted.sevenDays : jobs.accepted.thirtyDays} periodLabel={periodLabel} />
              <KpiCard title="Completed" value={completed} periodLabel={periodLabel} />
              <KpiCard title="Fill rate (24h)" value={jobs.fillRate24h != null ? formatPercent(jobs.fillRate24h) : '—'} />
              <KpiCard title="Median time to match" value={jobs.medianTimeToMatchHours != null ? `${jobs.medianTimeToMatchHours.toFixed(1)} h` : '—'} />
              <KpiCard title="Cancellation (customer)" value={jobs.cancellationRateCustomer != null ? formatPercent(jobs.cancellationRateCustomer) : '—'} />
              <KpiCard title="Declined (pro)" value={jobs.cancellationRatePro != null ? formatPercent(jobs.cancellationRatePro) : '—'} />
              <KpiCard title="Dispute rate" value={jobs.disputeRate != null ? formatPercent(jobs.disputeRate) : '—'} />
            </div>
          </div>
        )}

        {tab === 'pros' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-text">Pros (Supply)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard title="Active (30d)" value={pros.activeLast30d} />
              <KpiCard title="Available now" value={pros.availableNow} />
              <KpiCard title="Jobs/pro avg" value={pros.jobsPerProAvg.toFixed(1)} />
              <KpiCard title="Jobs/pro p50" value={pros.jobsPerProP50} />
              <KpiCard title="Jobs/pro p90" value={pros.jobsPerProP90} />
              <KpiCard title="Verified coverage" value={pros.verifiedCoveragePercent != null ? `${pros.verifiedCoveragePercent.toFixed(0)}%` : '—'} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-text mb-2">Funnel</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
                <div className="p-2 rounded-lg bg-surface2">Leads: {pros.funnel.leads}</div>
                <div className="p-2 rounded-lg bg-surface2">Onboarding: {pros.funnel.startedOnboarding}</div>
                <div className="p-2 rounded-lg bg-surface2">Verified: {pros.funnel.verified}</div>
                <div className="p-2 rounded-lg bg-surface2">First job: {pros.funnel.firstJob}</div>
                <div className="p-2 rounded-lg bg-surface2">Active: {pros.funnel.active}</div>
              </div>
            </div>
            {pros.verificationBacklog.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-text mb-2">Verification backlog</h3>
                <ul className="text-sm text-muted space-y-1">
                  {pros.verificationBacklog.slice(0, 10).map((p) => (
                    <li key={p.proId}>{p.displayName ?? p.proId} (score: {p.priorityScore})</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === 'customers' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-text">Customers & CAC</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard title="New customers" value={period === 'today' ? customers.newCustomers.today : period === '7d' ? customers.newCustomers.sevenDays : customers.newCustomers.thirtyDays} periodLabel={periodLabel} />
              <KpiCard title="Repeat rate (30d)" value={customers.repeatRate30d != null ? formatPercent(customers.repeatRate30d) : '—'} />
              <KpiCard title="Customer CAC" value={customers.customerCac != null ? formatCurrency(customers.customerCac) : '—'} />
              <KpiCard title="Pro CAC" value={customers.proCac != null ? formatCurrency(customers.proCac) : '—'} />
              <KpiCard title="LTV estimate" value={customers.ltvEstimate != null ? formatCurrency(customers.ltvEstimate) : '—'} />
            </div>
          </div>
        )}

        {tab === 'shield' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-text">Shield & Risk</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard title="Shield adoption" value={shield.shieldAdoptionRate != null ? formatPercent(shield.shieldAdoptionRate) : '—'} />
              <KpiCard title="Claims submitted" value={shield.claimsSubmitted} />
              <KpiCard title="Claims approved" value={shield.claimsApproved} />
              <KpiCard title="Claims paid out" value={shield.claimsPaidOut} />
              <KpiCard title="Holdback reserve" value={formatCurrency(shield.holdbackReserveBalance)} />
            </div>
            {shield.fraudSignals.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-text mb-2">Fraud signals</h3>
                <ul className="space-y-2">
                  {shield.fraudSignals.map((f) => (
                    <li key={f.type} className="text-sm text-muted">
                      {f.label}: {f.count}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === 'payouts' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-text">Payouts & Burn / Runway</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard title="Fixed costs/mo" value={formatCurrency(burn.fixedCosts)} />
              <KpiCard title="Payroll" value={formatCurrency(burn.payroll)} />
              <KpiCard title="Marketing spend" value={formatCurrency(burn.marketingSpend)} />
              <KpiCard title="Burn (total/mo)" value={formatCurrency(burn.burn)} />
              <KpiCard title="Cash balance" value={formatCurrency(burn.cashBalance)} />
              <KpiCard title="Runway" value={burn.runwayMonths.toFixed(1) + ' mo'} />
            </div>
            <form action={adminUpdateCommandCenterInputsAction} className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
              <label className="block">
                <span className="text-sm font-medium text-text">Marketing spend ($/mo)</span>
                <input
                  type="number"
                  name="marketing_spend"
                  defaultValue={burn.marketingSpend || ''}
                  min={0}
                  step={1}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-surface text-text"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-text">Cash balance ($)</span>
                <input
                  type="number"
                  name="cash_balance"
                  defaultValue={burn.cashBalance || ''}
                  min={0}
                  step={1}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-surface text-text"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-text">Payroll</span>
                <select
                  name="payroll_toggle"
                  defaultValue={burn.payroll === 5500 ? '1' : '0'}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-surface text-text"
                >
                  <option value="0">0 employees</option>
                  <option value="1">1 ops @ $5,500/mo</option>
                  <option value="custom">Custom (edit in DB)</option>
                </select>
              </label>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-accent text-accentContrast font-medium hover:opacity-95"
                >
                  Save inputs
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === 'targets' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-text">Targets & Alerts</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.targetStatuses.map((s) => (
                <div key={s.key} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-text">{s.label}</p>
                    <p className="text-xs text-muted">
                      Current: {s.current != null ? (s.unit === '$' ? formatCurrency(s.current) : s.unit === '%' ? `${s.current.toFixed(1)}%` : s.current) : '—'} / Target: {s.target != null ? (s.unit === '$' ? formatCurrency(s.target) : s.unit === '%' ? `${s.target.toFixed(1)}%` : s.target) : '—'}
                    </p>
                  </div>
                  <StatusChip status={s.status} />
                </div>
              ))}
            </div>
            {data.alerts.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-text mb-2">Recent alerts</h3>
                <ul className="space-y-2">
                  {data.alerts.slice(0, 10).map((a, i) => (
                    <li key={i} className={`text-sm p-2 rounded ${a.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/20' : a.severity === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-surface2'}`}>
                      [{a.severity}] {a.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.alerts.length === 0 && <p className="text-sm text-muted">No alerts logged.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
