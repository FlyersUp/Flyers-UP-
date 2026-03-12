import Layout from '@/components/Layout';
import Link from 'next/link';
import { requireAdminUser, isAdminUser } from '@/app/(app)/admin/_admin';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getCommandCenterData, getJobsWaitingForAttention } from '@/lib/adminCommandCenter';
import { KpiCard } from '@/components/admin/KpiCard';
import { AlertList, type AlertItem as PlatformAlertItem } from '@/components/admin/AlertList';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { DemandSupplyTable, type DemandSupplyRow } from '@/components/admin/DemandSupplyTable';
import { AttentionJobsCard } from '@/components/admin/AttentionJobsCard';
import { StatsPanel } from '@/components/admin/StatsPanel';
import { AdminToolGrid } from '@/components/admin/AdminToolGrid';
import { AiOpsSuggestions } from '@/components/admin/AiOpsSuggestions';
import { AdminSessionBanner } from '@/components/admin/AdminSessionBanner';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Calendar,
  AlertTriangle,
  FileText,
  Store,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function pickFirst(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const denied = pickFirst(sp.denied) === '1';
  const ok = pickFirst(sp.ok);
  const error = pickFirst(sp.error);

  const adminEmails = process.env.ADMIN_EMAILS ?? '';
  const envLabel = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? '—';

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!user) {
    await requireAdminUser('/admin');
  }

  const isAdmin = await isAdminUser(supabase, user);
  if (!isAdmin) {
    return (
      <Layout title="Flyers Up – Admin">
        <div className="max-w-2xl mx-auto py-12 px-4">
          <h1 className="text-2xl font-semibold text-text text-center">Access denied</h1>
          <p className="mt-2 text-sm text-muted text-center">
            This page requires an admin account.
          </p>
          {user?.email ? (
            <div className="mt-6 p-4 rounded-xl border border-border bg-surface2 text-left space-y-2">
              <p className="text-sm font-medium text-text">You're signed in as:</p>
              <p className="text-sm text-muted font-mono break-all">{user.email}</p>
              <p className="text-xs text-muted mt-2">
                Admin access: add this email to <code className="bg-surface px-1 rounded">ADMIN_EMAILS</code> in Vercel (then redeploy),
                or set your account's <code className="bg-surface px-1 rounded">role</code> to <code className="bg-surface px-1 rounded">admin</code> in Supabase (Table Editor → profiles).
              </p>
              <p className="text-xs text-muted">
                Current <code className="bg-surface px-1 rounded">ADMIN_EMAILS</code> on server: {adminEmails ? `set (${adminEmails.split(',').length} value(s))` : '(not set)'}
              </p>
            </div>
          ) : null}
          <pre className="mt-4 rounded-lg border border-border bg-surface2 p-3 text-xs text-muted overflow-x-auto">
            USER_EMAIL: {user?.email ?? '(no user)'}
            {'\n'}Session: {session ? 'authenticated' : 'none'}
          </pre>
          <div className="mt-6 text-center">
            <Link
              href="/auth?next=/admin"
              className="text-sm font-medium text-accent hover:underline"
            >
              Sign in with email code or Google →
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const [ccData, jobsWaiting] = await Promise.all([
    getCommandCenterData(),
    getJobsWaitingForAttention(),
  ]);

  const { revenue, jobs, pros, customers, alerts } = ccData;

  // Build platform alerts from available data
  const platformAlerts: PlatformAlertItem[] = [];
  if (jobsWaiting.length > 0) {
    platformAlerts.push({
      id: 'jobs-waiting',
      label: 'Jobs waiting > 15 min',
      count: jobsWaiting.length,
      severity: jobsWaiting.length >= 3 ? 'warning' : 'info',
      href: '/admin/bookings',
    });
  }
  if (revenue.refundsCount > 0) {
    platformAlerts.push({
      id: 'refunds',
      label: 'Refunds',
      count: revenue.refundsCount,
      severity: revenue.refundsCount >= 3 ? 'warning' : 'info',
    });
  }
  if (revenue.chargebacksCount > 0) {
    platformAlerts.push({
      id: 'chargebacks',
      label: 'Chargebacks',
      count: revenue.chargebacksCount,
      severity: 'critical',
    });
  }
  // TODO: Add flagged pros/users when content_moderation data available
  if (alerts.some((a) => a.severity === 'critical')) {
    platformAlerts.push({
      id: 'system-alerts',
      label: 'Critical system alerts',
      count: alerts.filter((a) => a.severity === 'critical').length,
      severity: 'critical',
    });
  }

  // Demand vs supply: placeholder - TODO wire to category-level aggregation
  const demandSupplyRows: DemandSupplyRow[] = [];

  const toolGroups = [
    {
      title: 'Marketplace Controls',
      tools: [
        {
          href: '/admin/command-center',
          title: 'Command Center',
          description: 'Revenue, jobs, pros, targets & alerts.',
          icon: <LayoutDashboard className="h-4 w-4" />,
        },
        {
          href: '/admin/density',
          title: 'Marketplace density',
          description: 'Pros per category per zip · Requests per category per zip.',
          icon: <BarChart3 className="h-4 w-4" />,
        },
        {
          href: '/admin/marketplace',
          title: 'Marketplace',
          description: 'Surge pricing, heatmap, job claims & controls.',
          icon: <Store className="h-4 w-4" />,
        },
      ],
    },
    {
      title: 'Users & Pros',
      tools: [
        {
          href: '/admin/categories',
          title: 'Categories (Phase 1)',
          description: 'Toggle is_active_phase1 · Show/hide from customers & pros.',
          icon: <FileText className="h-4 w-4" />,
        },
        {
          href: '/admin/users',
          title: 'Users',
          description: 'Search profiles + pro availability.',
          icon: <Users className="h-4 w-4" />,
        },
      ],
    },
    {
      title: 'Bookings & Payments',
      tools: [
        {
          href: '/admin/bookings',
          title: 'Bookings',
          description: 'Search bookings + manual status override.',
          icon: <Calendar className="h-4 w-4" />,
        },
        {
          href: '/admin/scope-lock',
          title: 'Scope Lock Analytics',
          description: 'Mismatch rate, price adjustments, misrepresentation scores.',
          icon: <AlertTriangle className="h-4 w-4" />,
        },
        {
          href: '/admin/marketplace-trust',
          title: 'Marketplace Trust',
          description: 'Arrival verification, rebook rate, completion proofs, flyer shares.',
          icon: <BarChart3 className="h-4 w-4" />,
        },
      ],
    },
    {
      title: 'System & Logs',
      tools: [
        {
          href: '/admin/errors',
          title: 'Error logs',
          description: 'Last 100 error events.',
          icon: <AlertTriangle className="h-4 w-4" />,
        },
      ],
    },
  ];

  return (
    <Layout title="Flyers Up – Admin">
      <div className="mx-auto max-w-5xl space-y-6 pb-24">
        {/* Section 1 — Page header */}
        <div>
          <h1 className="text-2xl font-semibold text-text">Admin</h1>
          <p className="mt-1 text-sm text-muted">
            Marketplace health, operations, and support tools.
          </p>
        </div>

        {denied ? (
          <div className="rounded-2xl border border-black/5 bg-red-50 p-4 text-text">
            Access denied.
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-black/5 bg-red-50 p-4 text-text">{error}</div>
        ) : null}
        {ok ? (
          <div className="rounded-2xl border border-black/5 border-l-4 border-l-accent bg-white p-4 text-text shadow-sm">
            {ok}
          </div>
        ) : null}

        {/* Optional: Admin session banner */}
        <AdminSessionBanner email={user?.email ?? null} environment={envLabel} />

        {/* Section 2 — Marketplace Health (KPI row) */}
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
            Marketplace Health
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard
              label="Active Pros"
              value={pros.activeLast30d}
              helperText={pros.activeLast30d > 0 ? undefined : 'Waiting for live data'}
              periodLabel="30d"
            />
            <KpiCard
              label="Jobs Requested Today"
              value={jobs.posted.today}
              helperText={jobs.posted.today > 0 ? undefined : 'Waiting for live data'}
              periodLabel="Today"
            />
            <KpiCard
              label="Jobs Completed Today"
              value={jobs.completed.today}
              helperText={jobs.completed.today > 0 ? undefined : 'Waiting for live data'}
              periodLabel="Today"
            />
            <KpiCard
              label="Fill Rate"
              value={jobs.fillRate24h != null ? formatPercent(jobs.fillRate24h) : '—'}
              helperText={jobs.fillRate24h == null ? 'Waiting for live data' : undefined}
            />
            <KpiCard
              label="Avg Response Time"
              value={
                jobs.medianTimeToMatchHours != null
                  ? `${jobs.medianTimeToMatchHours.toFixed(1)} h`
                  : '—'
              }
              helperText={jobs.medianTimeToMatchHours == null ? 'Waiting for live data' : undefined}
            />
            <KpiCard
              label="Revenue Today"
              value={formatCurrency(revenue.byPeriod.today.platformGross)}
              helperText={revenue.byPeriod.today.platformGross > 0 ? undefined : 'Waiting for live data'}
              periodLabel="Today"
            />
          </div>
        </section>

        {/* Section 3 — Alerts + Live Activity */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AlertList alerts={platformAlerts} />
          <ActivityFeed items={[]} />
        </section>

        {/* Section 4 — Demand vs Supply */}
        <section>
          <DemandSupplyTable rows={demandSupplyRows} />
        </section>

        {/* Section 5 — Jobs Needing Attention */}
        <section>
          <AttentionJobsCard jobs={jobsWaiting} />
        </section>

        {/* Section 6 — Pro / Customer / Revenue Panels */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatsPanel
            title="Pro Performance"
            stats={[
              { label: 'Top pros (30d)', value: pros.activeLast30d },
              { label: 'Available now', value: pros.availableNow },
              { label: 'Jobs/pro avg', value: pros.jobsPerProAvg.toFixed(1) },
            ]}
          />
          <StatsPanel
            title="Customer Experience"
            stats={[
              { label: 'Repeat rate (30d)', value: customers.repeatRate30d != null ? formatPercent(customers.repeatRate30d) : '—' },
              { label: 'Refund rate', value: revenue.refundsCount > 0 ? `${revenue.refundsCount} (${formatCurrency(revenue.refundsTotal)})` : '—' },
              { label: 'Disputes', value: ccData.jobs.disputeRate != null ? formatPercent(ccData.jobs.disputeRate) : '—' },
            ]}
          />
          <StatsPanel
            title="Revenue Snapshot"
            stats={[
              { label: 'Today', value: formatCurrency(revenue.byPeriod.today.platformGross) },
              { label: 'This week', value: formatCurrency(revenue.byPeriod.sevenDays.platformGross) },
              { label: 'This month', value: formatCurrency(revenue.byPeriod.thirtyDays.platformGross) },
              { label: 'Net MRR', value: formatCurrency(revenue.netRevenueMrr) },
            ]}
          />
        </section>

        {/* Section 7 — Operations Tools */}
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
            Operations
          </h2>
          <AdminToolGrid groups={toolGroups} />
        </section>

        {/* Section 8 — AI Ops Suggestions */}
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
            AI Ops Suggestions
          </h2>
          <AiOpsSuggestions suggestions={[]} />
        </section>
      </div>
    </Layout>
  );
}
