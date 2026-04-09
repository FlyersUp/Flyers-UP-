import Layout from '@/components/Layout';
import Link from 'next/link';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireAdminUser } from '@/app/(app)/admin/_admin';
import { SUPPORT_TICKET_CATEGORIES } from '@/lib/support/ticket-categories';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function pickFirst(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function previewText(s: string, max = 100) {
  const one = s.replace(/\s+/g, ' ').trim();
  if (one.length <= max) return one;
  return `${one.slice(0, max)}…`;
}

const STATUSES = ['open', 'in_progress', 'resolved'] as const;

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminUser('/admin/support');

  const sp = await searchParams;
  const statusFilter = pickFirst(sp.status)?.trim() || '';
  const categoryFilter = pickFirst(sp.category)?.trim() || '';

  const admin = createAdminSupabaseClient();

  let query = admin
    .from('support_tickets')
    .select('id, user_id, category, subject, message, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (statusFilter && STATUSES.includes(statusFilter as (typeof STATUSES)[number])) {
    query = query.eq('status', statusFilter);
  }
  if (categoryFilter) {
    query = query.eq('category', categoryFilter);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error('[admin/support] list', error);
  }

  const tickets = rows ?? [];
  const userIds = Array.from(new Set(tickets.map((t) => String(t.user_id)).filter(Boolean)));
  const profileById = new Map<string, { role: string | null; email: string | null; full_name: string | null }>();
  if (userIds.length > 0) {
    const { data: profs } = await admin
      .from('profiles')
      .select('id, role, email, full_name')
      .in('id', userIds);
    (profs ?? []).forEach((p: { id: string; role: string | null; email: string | null; full_name: string | null }) => {
      profileById.set(String(p.id), p);
    });
  }

  return (
    <Layout title="Flyers Up – Admin · Support">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text">Support tickets</h1>
            <p className="mt-1 text-sm text-muted">Open, in progress, and resolved requests from users.</p>
          </div>
          <Link className="text-sm text-muted hover:text-text" href="/admin">
            ← Admin home
          </Link>
        </div>

        <form className="mt-5 flex flex-wrap gap-3 items-end" method="get" action="/admin/support">
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
                  {s === 'in_progress' ? 'In progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Category</label>
            <select
              name="category"
              defaultValue={categoryFilter}
              className="px-3 py-2 rounded-lg bg-surface border border-border text-text text-sm min-w-[160px]"
            >
              <option value="">All</option>
              {SUPPORT_TICKET_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
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
          <Link
            href="/admin/support"
            className="text-sm text-muted hover:text-text py-2"
          >
            Clear
          </Link>
        </form>

        <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface2 text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Preview</th>
                <th className="px-4 py-3 font-medium w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No tickets match these filters.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => {
                  const prof = profileById.get(String(t.user_id));
                  const role = prof?.role ?? '—';
                  const who = prof?.full_name || prof?.email || String(t.user_id).slice(0, 8);
                  return (
                    <tr key={t.id} className="hover:bg-surface2/60">
                      <td className="px-4 py-3 text-muted whitespace-nowrap">
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-text max-w-[140px] truncate" title={who}>
                        {who}
                      </td>
                      <td className="px-4 py-3 text-muted capitalize">{role}</td>
                      <td className="px-4 py-3 text-muted">{t.category}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-surface2 text-xs capitalize">
                          {String(t.status).replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted max-w-[280px]">
                        <span className="line-clamp-2" title={t.message}>
                          {t.subject ? `${t.subject} · ` : ''}
                          {previewText(t.message, 120)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/support/${t.id}`}
                          className="text-accent hover:underline font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
