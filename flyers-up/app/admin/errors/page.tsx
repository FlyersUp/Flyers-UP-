import { redirect } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { isAdminUser } from '@/app/admin/_admin';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function pickFirst(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminErrorsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth?next=/admin/errors');
  }

  const isAdmin = await isAdminUser(supabase, user);

  if (!isAdmin) {
    return (
      <Layout title="Flyers Up – Admin">
        <div className="max-w-2xl mx-auto text-center py-12">
          <h1 className="text-2xl font-semibold text-text">Access denied</h1>
          <p className="mt-2 text-sm text-muted">
            This page requires an admin account. To enable access, set <code>ADMIN_EMAILS</code> in Vercel (comma-separated).
          </p>
        </div>
      </Layout>
    );
  }

  const sp = await searchParams;
  const q = (pickFirst(sp.q) ?? '').trim();
  const severity = (pickFirst(sp.severity) ?? '').trim();
  const source = (pickFirst(sp.source) ?? '').trim();

  const admin = createAdminSupabaseClient();
  let query = admin
    .from('error_events')
    .select('id, created_at, source, severity, message, route, url, user_id, release')
    .order('created_at', { ascending: false })
    .limit(100);

  if (severity) query = query.eq('severity', severity);
  if (source) query = query.eq('source', source);
  if (q) query = query.ilike('message', `%${q}%`);

  const { data: events, error } = await query;

  return (
    <Layout title="Flyers Up – Admin">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text">Error logs</h1>
            <p className="mt-1 text-sm text-muted">Last 100 events (newest first). Use filters to narrow quickly.</p>
          </div>
          <Link className="text-sm text-muted hover:text-text" href="/admin">
            ← Admin home
          </Link>
        </div>

        <form className="mt-5 grid grid-cols-1 sm:grid-cols-4 gap-3" action="/admin/errors" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search message…"
            className="sm:col-span-2 w-full px-3 py-2 rounded-lg bg-surface border border-border text-text placeholder:text-muted/70"
          />
          <select
            name="severity"
            defaultValue={severity}
            className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text"
          >
            <option value="">All severities</option>
            <option value="fatal">fatal</option>
            <option value="error">error</option>
            <option value="warn">warn</option>
            <option value="info">info</option>
            <option value="debug">debug</option>
          </select>
          <select name="source" defaultValue={source} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text">
            <option value="">All sources</option>
            <option value="client">client</option>
            <option value="server">server</option>
          </select>
          <div className="sm:col-span-4 flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-accent text-accentContrast font-medium hover:opacity-95"
            >
              Apply
            </button>
            <Link href="/admin/errors" className="px-4 py-2 rounded-lg bg-surface2 text-text font-medium hover:bg-surface">
              Reset
            </Link>
          </div>
        </form>

        {error ? (
          <div className="mt-6 rounded-[18px] border border-hairline bg-surface shadow-card p-5">
            <div className="text-sm font-semibold text-text">Failed to load errors</div>
            <div className="mt-1 text-sm text-muted">{error.message}</div>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[18px] border border-hairline bg-surface shadow-card">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-surface2 text-muted">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Time</th>
                    <th className="text-left px-4 py-3 font-medium">Source</th>
                    <th className="text-left px-4 py-3 font-medium">Severity</th>
                    <th className="text-left px-4 py-3 font-medium">Route</th>
                    <th className="text-left px-4 py-3 font-medium">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {(events ?? []).map((e) => (
                    <tr key={e.id} className="border-t border-hairline">
                      <td className="px-4 py-3 whitespace-nowrap text-muted">
                        {e.created_at ? new Date(e.created_at as string).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{e.source}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full border border-hairline bg-surface2 px-2 py-0.5 text-xs font-medium">
                          {e.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted">{e.route ?? '—'}</td>
                      <td className="px-4 py-3 max-w-[48ch] truncate" title={e.message ?? ''}>
                        {e.message}
                      </td>
                    </tr>
                  ))}
                  {(events ?? []).length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-muted" colSpan={5}>
                        No events found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

