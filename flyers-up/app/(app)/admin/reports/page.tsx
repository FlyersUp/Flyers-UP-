import Layout from '@/components/Layout';
import Link from 'next/link';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireAdminUser } from '@/app/(app)/admin/_admin';
import { USER_REPORT_REASONS } from '@/lib/moderation/report-reasons';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function pickFirst(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

const STATUSES = ['pending', 'reviewed', 'escalated', 'dismissed'] as const;

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminUser('/admin/reports');

  const sp = await searchParams;
  const statusFilter = pickFirst(sp.status)?.trim() || '';
  const reasonFilter = pickFirst(sp.reason)?.trim() || '';

  const admin = createAdminSupabaseClient();

  let query = admin
    .from('user_reports')
    .select('id, reporter_id, reported_user_id, reason, context, booking_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (statusFilter && STATUSES.includes(statusFilter as (typeof STATUSES)[number])) {
    query = query.eq('status', statusFilter);
  }
  if (reasonFilter) {
    query = query.eq('reason', reasonFilter);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error('[admin/reports] list', error);
  }

  const reports = rows ?? [];
  const ids = new Set<string>();
  reports.forEach((r) => {
    ids.add(String(r.reporter_id));
    ids.add(String(r.reported_user_id));
  });
  const profileById = new Map<string, { email: string | null; full_name: string | null }>();
  if (ids.size > 0) {
    const { data: profs } = await admin
      .from('profiles')
      .select('id, email, full_name')
      .in('id', [...ids]);
    (profs ?? []).forEach((p: { id: string; email: string | null; full_name: string | null }) => {
      profileById.set(String(p.id), p);
    });
  }

  const labelFor = (userId: string) => {
    const p = profileById.get(String(userId));
    return p?.full_name || p?.email || userId.slice(0, 8);
  };

  return (
    <Layout title="Flyers Up – Admin · Reports">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text">User reports</h1>
            <p className="mt-1 text-sm text-muted">Abuse and safety reports from users (separate from booking issue tickets).</p>
          </div>
          <Link className="text-sm text-muted hover:text-text" href="/admin">
            ← Admin home
          </Link>
        </div>

        <form className="mt-5 flex flex-wrap gap-3 items-end" method="get" action="/admin/reports">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Status</label>
            <select
              name="status"
              defaultValue={statusFilter}
              className="px-3 py-2 rounded-lg bg-surface border border-border text-text text-sm min-w-[140px]"
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Reason</label>
            <select
              name="reason"
              defaultValue={reasonFilter}
              className="px-3 py-2 rounded-lg bg-surface border border-border text-text text-sm min-w-[180px]"
            >
              <option value="">All</option>
              {USER_REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium"
          >
            Apply
          </button>
          <Link href="/admin/reports" className="text-sm text-muted hover:text-text py-2">
            Clear
          </Link>
        </form>

        <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface2 text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Reporter</th>
                <th className="px-4 py-3 font-medium">Reported</th>
                <th className="px-4 py-3 font-medium">Linked</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No reports match these filters.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="hover:bg-surface2/60">
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-text capitalize">{r.reason.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-muted max-w-[120px] truncate" title={labelFor(r.reporter_id)}>
                      {labelFor(r.reporter_id)}
                    </td>
                    <td className="px-4 py-3 text-muted max-w-[120px] truncate" title={labelFor(r.reported_user_id)}>
                      {labelFor(r.reported_user_id)}
                    </td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">
                      {r.booking_id ? (
                        <Link href={`/admin/bookings?q=${r.booking_id}`} className="text-accent hover:underline">
                          Booking
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-surface2 text-xs capitalize">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/reports/${r.id}`}
                        className="text-accent hover:underline font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
