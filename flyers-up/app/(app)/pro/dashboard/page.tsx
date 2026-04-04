import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layouts/AppLayout';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getProDashboardMetrics } from '@/lib/pro-dashboard/metrics';
import { getPricingInsights } from '@/lib/pro-dashboard/insights';
import { getPriceAdjustmentSuggestion } from '@/lib/pro-dashboard/recommendations';
import type { ProDashboardMetricsRange } from '@/lib/pro-dashboard/types';

function formatUsdFromCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function pctDisplay(rate: number | null): string {
  if (rate == null) return '—';
  return `${Math.round(rate * 100)}%`;
}

function parseRangeParam(v: string | undefined): ProDashboardMetricsRange {
  if (v === '7d' || v === '30d' || v === 'all') return v;
  return 'all';
}

export default async function ProSmartPricingDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const range = parseRangeParam(sp.range);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth?next=${encodeURIComponent('/pro/dashboard')}`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, account_status')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'pro') {
    redirect(`/onboarding/role?next=${encodeURIComponent('/pro/dashboard')}`);
  }

  const acct = (profile as { account_status?: string | null }).account_status;
  if (acct === 'deleted') redirect('/account/deleted');
  if (acct === 'deactivated') redirect('/account/deactivated');

  const bundle = await getProDashboardMetrics(user.id, { range });
  const metrics = bundle?.metrics ?? null;
  const context = bundle?.context ?? { occupationSlug: null };
  const insights = metrics ? getPricingInsights(metrics, context) : [];
  const recommendation = metrics ? getPriceAdjustmentSuggestion(metrics, context) : null;

  const rangeLinks: { label: string; value: ProDashboardMetricsRange }[] = [
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'All time', value: 'all' },
  ];

  return (
    <AppLayout mode="pro">
      <div className="min-h-screen bg-bg">
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
          <div>
            <Link href="/pro" className="text-sm text-text2 hover:text-text">
              ← Back to home
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-text">Smart pricing</h1>
            <p className="mt-1 text-sm text-text2 leading-relaxed">
              See how your jobs and prices add up, and get simple ideas to earn more.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {rangeLinks.map(({ label, value }) => (
              <Link
                key={value}
                href={value === 'all' ? '/pro/dashboard' : `/pro/dashboard?range=${value}`}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  range === value
                    ? 'border-[hsl(var(--accent-pro)/0.55)] bg-[hsl(var(--accent-pro)/0.12)] text-text'
                    : 'border-border bg-surface text-text2 hover:bg-surface2'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {!metrics ? (
            <p className="text-sm text-text2">We couldn&apos;t load your pro profile yet.</p>
          ) : (
            <>
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text2">Overview</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                    <div className="text-xs text-text2">Total earnings</div>
                    <div className="mt-1 text-lg font-semibold text-text">
                      {formatUsdFromCents(metrics.totalEarningsCents)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                    <div className="text-xs text-text2">Jobs completed</div>
                    <div className="mt-1 text-lg font-semibold text-text">{metrics.totalJobsCompleted}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                    <div className="text-xs text-text2">Earnings / hour</div>
                    <div className="mt-1 text-lg font-semibold text-text">
                      {metrics.earningsPerHourCents != null
                        ? formatUsdFromCents(metrics.earningsPerHourCents)
                        : '—'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                    <div className="text-xs text-text2">Avg job value</div>
                    <div className="mt-1 text-lg font-semibold text-text">
                      {metrics.avgJobValueCents != null ? formatUsdFromCents(metrics.avgJobValueCents) : '—'}
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text2">Performance</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                    <div className="text-xs text-text2">Win rate</div>
                    <div className="mt-1 text-lg font-semibold text-text">{pctDisplay(metrics.winRate)}</div>
                    <p className="mt-2 text-xs text-text2 leading-relaxed">
                      Share of finished outcomes that were completed (vs cancelled or declined).
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                    <div className="text-xs text-text2">Below suggestion</div>
                    <div className="mt-1 text-lg font-semibold text-text">
                      {pctDisplay(metrics.belowSuggestionRate)}
                    </div>
                    <p className="mt-2 text-xs text-text2 leading-relaxed">
                      Jobs where your price was under the guidance we showed when the booking was created.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text2">Insights</h2>
                <ul className="space-y-2">
                  {insights.map((ins, i) => (
                    <li
                      key={i}
                      className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                        ins.type === 'warning'
                          ? 'border-amber-200/90 bg-amber-50 text-amber-950'
                          : ins.type === 'opportunity'
                            ? 'border-[hsl(var(--accent-pro)/0.35)] bg-[hsl(var(--accent-pro)/0.08)] text-text'
                            : 'border-border bg-surface2/60 text-text'
                      }`}
                    >
                      {ins.message}
                    </li>
                  ))}
                </ul>
              </section>

              {recommendation ? (
                <section>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text2">Suggestion</h2>
                  <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-3">
                    <p className="text-base font-semibold text-text">
                      {recommendation.adjustmentPercent === 0
                        ? 'Hold steady'
                        : recommendation.adjustmentPercent > 0
                          ? `Try raising your starting price by about ${recommendation.adjustmentPercent}%`
                          : `Try lowering your starting price by about ${Math.abs(recommendation.adjustmentPercent)}%`}
                    </p>
                    <p className="text-sm text-text2 leading-relaxed">{recommendation.reason}</p>
                    <Link
                      href="/pro/settings/pricing-availability"
                      className="inline-block text-sm font-medium text-[hsl(var(--accent-pro))] hover:underline"
                    >
                      Update pricing →
                    </Link>
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
