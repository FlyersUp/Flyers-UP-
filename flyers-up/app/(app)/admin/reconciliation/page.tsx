import Layout from '@/components/Layout';
import Link from 'next/link';
import { requireAdminUser } from '@/app/(app)/admin/_admin';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import {
  loadMoneyReconciliationWindow,
  RECONCILIATION_EXPORT_PRESET_WEEKLY_RED_FLAGS,
} from '@/lib/bookings/money-reconciliation-report';
import { listAssignableReconciliationAdmins } from '@/lib/bookings/money-reconciliation-queue';
import {
  formatAgeBucketLabel,
  getReconciliationRowAction,
  type MoneyReconciliationCategory,
} from '@/lib/bookings/money-reconciliation';
import { MoneyReconciliationQueueControls } from '@/components/admin/MoneyReconciliationQueueControls';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function pickFirst(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function parseDays(v: string | undefined): 7 | 30 | 90 {
  const n = Number(v);
  if (n === 7 || n === 30 || n === 90) return n;
  return 30;
}

function isCategory(v: string | undefined): v is MoneyReconciliationCategory {
  if (!v) return false;
  return (
    [
      'healthy',
      'payment_state_mismatch',
      'refund_state_mismatch',
      'payout_state_mismatch',
      'partial_refund_attention',
      'remediation_open',
      'payout_blocked_attention',
      'needs_manual_review',
      'reconciliation_unknown',
    ] as string[]
  ).includes(v);
}

function truthyUnresolved(v: string | undefined): boolean {
  if (!v) return false;
  const x = v.toLowerCase();
  return x === '1' || x === 'true' || x === 'yes';
}

function parseMinAgeDays(v: string | undefined): 3 | 7 | 14 | null {
  if (v === '3' || v === '7' || v === '14') return Number(v) as 3 | 7 | 14;
  return null;
}

function formatOldestAgeHours(h: number | null): string {
  if (h == null || !Number.isFinite(h)) return '—';
  if (h < 72) return `${Math.round(h)}h`;
  return `${Math.round((h / 24) * 10) / 10}d`;
}

function priorityBadgeClass(tier: 'high' | 'medium' | 'low'): string {
  switch (tier) {
    case 'high':
      return 'bg-rose-100 text-rose-900';
    case 'medium':
      return 'bg-amber-100 text-amber-950';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-4 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted leading-relaxed">{hint}</p> : null}
    </div>
  );
}

export default async function AdminMoneyReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminUser('/admin/reconciliation');
  const sp = await searchParams;
  const days = parseDays(pickFirst(sp.days));
  const categoryFilter = pickFirst(sp.category);
  const filterCat = isCategory(categoryFilter) ? categoryFilter : null;
  const unresolvedOnly = truthyUnresolved(pickFirst(sp.unresolved_only));
  const minAgeDays = parseMinAgeDays(pickFirst(sp.min_age_days));

  const admin = createAdminSupabaseClient();
  const assignableAdmins = await listAssignableReconciliationAdmins(admin);
  const { summary, weeklyHealth, issueSnapshots } = await loadMoneyReconciliationWindow(admin, {
    days,
    maxBookings: 500,
    unresolvedOnly,
  });

  let filtered =
    filterCat && filterCat !== 'healthy'
      ? issueSnapshots.filter((s) => s.category === filterCat)
      : issueSnapshots;
  if (minAgeDays != null) {
    const minH = minAgeDays * 24;
    filtered = filtered.filter((s) => (s.ageInHours ?? 0) >= minH);
  }

  type HrefOpts = {
    days?: string;
    category?: string;
    clearCategory?: boolean;
    unresolvedOnly?: boolean;
    minAgeDays?: 3 | 7 | 14 | null;
    clearMinAge?: boolean;
  };

  const href = (opts: HrefOpts = {}) => {
    const p = new URLSearchParams();
    p.set('days', opts.days ?? String(days));
    const nextUnresolved = opts.unresolvedOnly !== undefined ? opts.unresolvedOnly : unresolvedOnly;
    if (nextUnresolved) p.set('unresolved_only', '1');
    if (opts.clearCategory) {
      /* omit category */
    } else if (opts.category) {
      p.set('category', opts.category);
    } else if (filterCat) {
      p.set('category', filterCat);
    }
    const nextMin =
      opts.minAgeDays !== undefined ? opts.minAgeDays : opts.clearMinAge ? null : minAgeDays;
    if (nextMin != null) p.set('min_age_days', String(nextMin));
    return `/admin/reconciliation?${p.toString()}`;
  };

  const exportParams = new URLSearchParams();
  exportParams.set('days', String(days));
  if (filterCat) exportParams.set('category', filterCat);
  if (unresolvedOnly) exportParams.set('unresolved_only', '1');
  if (minAgeDays != null) exportParams.set('min_age_days', String(minAgeDays));
  const exportHref = `/api/admin/reconciliation/export?${exportParams.toString()}`;
  const redFlagExportHref = `/api/admin/reconciliation/export?days=${days}&preset=${RECONCILIATION_EXPORT_PRESET_WEEKLY_RED_FLAGS}`;

  return (
    <Layout title="Flyers Up – Admin · Money reconciliation">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 text-text">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/admin" className="text-sm text-muted hover:text-text">
              ← Admin
            </Link>
            <h1 className="mt-2 text-2xl font-semibold">Money reconciliation</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted leading-relaxed">
              App-truth snapshot across bookings created in the last {summary.windowDays} days (loaded up to 500 most
              recent). Use weekly to spot drift, refund issues, and payout attention before customers notice.
            </p>
            <p className="mt-2 text-xs text-muted">
              Window starts <span className="font-mono">{summary.sinceIso.slice(0, 10)}</span> UTC · Stuck payout count
              uses the global detector (not strictly limited to the window).
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <a
              href={exportHref}
              className="inline-flex items-center justify-center rounded-lg border border-hairline bg-surface2 px-4 py-2 text-sm font-medium text-text hover:bg-surface"
            >
              Export CSV
            </a>
            <a
              href={redFlagExportHref}
              className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-950 hover:bg-rose-100"
            >
              Export red flags (7d+ unresolved)
            </a>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-muted self-center">Window:</span>
          <Link
            href={href({ days: '7' })}
            className={`rounded-lg border px-3 py-1.5 ${days === 7 ? 'border-accent bg-surface2' : 'border-hairline hover:bg-surface2'}`}
          >
            7d
          </Link>
          <Link
            href={href({ days: '30' })}
            className={`rounded-lg border px-3 py-1.5 ${days === 30 ? 'border-accent bg-surface2' : 'border-hairline hover:bg-surface2'}`}
          >
            30d
          </Link>
          <Link
            href={href({ days: '90' })}
            className={`rounded-lg border px-3 py-1.5 ${days === 90 ? 'border-accent bg-surface2' : 'border-hairline hover:bg-surface2'}`}
          >
            90d
          </Link>
          <span className="mx-2 text-muted">·</span>
          <span className="text-muted self-center">Issues:</span>
          <Link
            href={href({ unresolvedOnly: false })}
            className={`rounded-lg border px-3 py-1.5 ${!unresolvedOnly ? 'border-accent bg-surface2' : 'border-hairline hover:bg-surface2'}`}
          >
            All
          </Link>
          <Link
            href={href({ unresolvedOnly: true })}
            className={`rounded-lg border px-3 py-1.5 ${unresolvedOnly ? 'border-accent bg-surface2' : 'border-hairline hover:bg-surface2'}`}
          >
            Unresolved only
          </Link>
          <span className="mx-2 text-muted">·</span>
          <span className="text-muted self-center">Category:</span>
          <Link
            href={href({ clearCategory: true })}
            className={`rounded-lg border px-3 py-1.5 ${!filterCat ? 'border-accent bg-surface2' : 'border-hairline hover:bg-surface2'}`}
          >
            All issues
          </Link>
          <Link
            href={href({ category: 'partial_refund_attention' })}
            className={`rounded-lg border px-3 py-1.5 ${filterCat === 'partial_refund_attention' ? 'border-accent bg-surface2' : 'border-hairline hover:bg-surface2'}`}
          >
            Partial refund
          </Link>
          <Link
            href={href({ category: 'remediation_open' })}
            className={`rounded-lg border px-3 py-1.5 ${filterCat === 'remediation_open' ? 'border-accent bg-surface2' : 'border-hairline hover:bg-surface2'}`}
          >
            Remediation
          </Link>
          <Link
            href={href({ category: 'payout_state_mismatch' })}
            className={`rounded-lg border px-3 py-1.5 ${filterCat === 'payout_state_mismatch' ? 'border-accent bg-surface2' : 'border-hairline hover:bg-surface2'}`}
          >
            Stuck payout
          </Link>
          <Link
            href={href({ category: 'payout_blocked_attention' })}
            className={`rounded-lg border px-3 py-1.5 ${filterCat === 'payout_blocked_attention' ? 'border-accent bg-surface2' : 'border-hairline hover:bg-surface2'}`}
          >
            Payout blocked
          </Link>
          <Link
            href={href({ category: 'needs_manual_review' })}
            className={`rounded-lg border px-3 py-1.5 ${filterCat === 'needs_manual_review' ? 'border-accent bg-surface2' : 'border-hairline hover:bg-surface2'}`}
          >
            Manual review
          </Link>
          <span className="mx-2 text-muted">·</span>
          <span className="text-muted self-center">Age:</span>
          <Link
            href={href({ clearMinAge: true })}
            className={`rounded-lg border px-3 py-1.5 ${minAgeDays == null ? 'border-accent bg-surface2' : 'border-hairline hover:bg-surface2'}`}
          >
            Any
          </Link>
          <Link
            href={href({ minAgeDays: 3 })}
            className={`rounded-lg border px-3 py-1.5 ${minAgeDays === 3 ? 'border-accent bg-surface2' : 'border-hairline hover:bg-surface2'}`}
          >
            3d+
          </Link>
          <Link
            href={href({ minAgeDays: 7 })}
            className={`rounded-lg border px-3 py-1.5 ${minAgeDays === 7 ? 'border-accent bg-surface2' : 'border-hairline hover:bg-surface2'}`}
          >
            7d+
          </Link>
          <Link
            href={href({ minAgeDays: 14 })}
            className={`rounded-lg border px-3 py-1.5 ${minAgeDays === 14 ? 'border-accent bg-surface2' : 'border-hairline hover:bg-surface2'}`}
          >
            14d+
          </Link>
        </div>

        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">This week&apos;s financial health</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryCard label="Bookings in window" value={weeklyHealth.totalBookings} />
            <SummaryCard
              label="Healthy"
              value={`${weeklyHealth.healthyPercent}%`}
              hint="Share of loaded bookings classified healthy."
            />
            <SummaryCard label="Issues (any)" value={weeklyHealth.issuesCount} />
            <SummaryCard label="Unresolved issues" value={weeklyHealth.unresolvedIssuesCount} />
            <SummaryCard
              label="Oldest unresolved"
              value={formatOldestAgeHours(weeklyHealth.oldestUnresolvedIssueAgeHours)}
              hint="Age from first money signal (or booking created_at)."
            />
            <SummaryCard
              label="Top unresolved category"
              value={weeklyHealth.mostCommonUnresolvedCategory ?? '—'}
              hint="Most frequent category among unresolved issues."
            />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Summary</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryCard label="Healthy (in window)" value={summary.healthy_count} />
            <SummaryCard
              label="Needs attention"
              value={summary.needs_attention_count}
              hint="Non-healthy reconciliation in loaded bookings."
            />
            <SummaryCard label="Payout blocked" value={summary.payout_blocked_count} />
            <SummaryCard label="Remediation (category)" value={summary.byCategory.remediation_open} />
            <SummaryCard label="Partial refund issues" value={summary.refund_partial_failure_count} />
            <SummaryCard
              label="Possible stuck payouts"
              value={summary.stuck_payout_count}
              hint="From stuck detector (global scan)."
            />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Lifecycle volume (window)</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard label="Deposit paid" value={summary.deposit_paid_count} />
            <SummaryCard label="Final paid" value={summary.final_paid_count} />
            <SummaryCard label="Refund completed (row heuristic)" value={summary.refund_completed_count} />
            <SummaryCard label="Payout sent" value={summary.payout_sent_count} />
            <SummaryCard label="Manual review flag" value={summary.manual_review_count} />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
            Bookings with issues
            {filterCat ? ` · ${filterCat}` : ''}
            {unresolvedOnly ? ' · unresolved only' : ''}
            {minAgeDays != null ? ` · ≥${minAgeDays}d old` : ''}
          </h2>
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-hairline bg-surface p-6 text-sm text-muted">
              No matching rows. Try clearing filters, turning off unresolved-only, or widening the window.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-hairline">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-hairline bg-surface2/50 text-xs uppercase text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Reference</th>
                    <th className="px-3 py-2 font-medium">Priority</th>
                    <th className="px-3 py-2 font-medium">Age</th>
                    <th className="px-3 py-2 font-medium">Bucket</th>
                    <th className="px-3 py-2 font-medium">Lifecycle</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Reason</th>
                    <th className="px-3 py-2 font-medium">Next action</th>
                    <th className="px-3 py-2 font-medium">Queue</th>
                    <th className="px-3 py-2 font-medium">Ops</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const action = getReconciliationRowAction(s.bookingId, s.category);
                    const tierLabel = s.category === 'healthy' ? '—' : s.priorityTier === 'high' ? 'High' : s.priorityTier === 'medium' ? 'Medium' : 'Low';
                    return (
                      <tr key={s.bookingId} className="border-b border-hairline last:border-b-0">
                        <td className="px-3 py-2 align-top">
                          <span className="font-mono text-xs">{s.bookingReference ?? s.bookingId.slice(0, 8)}</span>
                          {s.resolved ? (
                            <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-900">
                              Cleared
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 align-top">
                          {s.category === 'healthy' ? (
                            <span className="text-xs text-muted">—</span>
                          ) : (
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${priorityBadgeClass(s.priorityTier)}`}
                            >
                              {tierLabel}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top text-xs tabular-nums">
                          {s.firstDetectedAt ? `${Math.round(s.ageInHours)}h` : '—'}
                        </td>
                        <td className="px-3 py-2 align-top text-xs">{formatAgeBucketLabel(s.ageBucket)}</td>
                        <td className="px-3 py-2 align-top text-xs">{s.paymentLifecycleStatus || '—'}</td>
                        <td className="px-3 py-2 align-top">
                          <span className="rounded-md bg-surface2 px-2 py-0.5 text-xs font-medium">{s.category}</span>
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-muted max-w-xs">{s.reason}</td>
                        <td className="px-3 py-2 align-top text-xs max-w-sm">{s.recommendedNextAction}</td>
                        <td className="px-3 py-2 align-top border-l border-hairline/60">
                          <MoneyReconciliationQueueControls
                            key={`${s.bookingId}-${s.assignedToUserId ?? ''}-${s.lastReviewedAt ?? ''}-${s.opsNote ?? ''}`}
                            bookingId={s.bookingId}
                            assignedToUserId={s.assignedToUserId}
                            lastReviewedAt={s.lastReviewedAt}
                            opsNote={s.opsNote}
                            assignableAdmins={assignableAdmins}
                          />
                        </td>
                        <td className="px-3 py-2 align-top whitespace-nowrap">
                          <Link
                            href={action.href}
                            className="text-accent hover:underline text-xs font-semibold"
                          >
                            {action.label}
                          </Link>
                          <span className="mx-1 text-muted">·</span>
                          <Link
                            href={`/admin/bookings/${s.bookingId}`}
                            className="text-muted hover:text-text text-xs"
                          >
                            Booking
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
