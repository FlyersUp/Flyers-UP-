import Link from 'next/link';
import Layout from '@/components/Layout';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { boroughLabelFromSlug } from '@/lib/marketplace/nycBoroughs';
import { updateCategoryBoroughOverride } from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminCategoryHealthPage() {
  const admin = createAdminSupabaseClient();
  const { data: rows, error } = await admin
    .from('category_borough_status')
    .select(
      'occupation_slug, borough_slug, active_pro_count, visible_state, is_customer_visible, force_hidden, force_visible, last_checked_at, ops_note'
    )
    .order('borough_slug', { ascending: true })
    .order('occupation_slug', { ascending: true });

  if (error) {
    console.error('[category-health]', error);
  }

  const list = rows ?? [];

  return (
    <Layout title="Flyers Up – Admin · Category / borough health">
      <div className="mx-auto max-w-6xl space-y-6 pb-24">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text">Category / borough health</h1>
            <p className="mt-1 text-sm text-muted">
              Active category gate: supply counts, visibility, and manual overrides. Recompute counts from the admin
              home refresh action or call POST <code className="text-xs">/api/admin/hybrid/refresh-gate</code>.
            </p>
            <p className="mt-2 text-sm">
              <Link href="/admin/hybrid/borough-health" className="font-semibold text-[hsl(var(--trust))] hover:underline">
                Open Borough Health (vitality matrix) →
              </Link>
            </p>
          </div>
          <div className="flex gap-3">
            <Link className="text-sm text-muted hover:text-text" href="/admin/hybrid/match-queue">
              Match queue
            </Link>
            <Link className="text-sm text-muted hover:text-text" href="/admin">
              ← Admin home
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-surface2 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Borough</th>
                <th className="px-3 py-2">Occupation</th>
                <th className="px-3 py-2">Pros</th>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2">Listed</th>
                <th className="px-3 py-2">Checked</th>
                <th className="px-3 py-2">Overrides</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const row = r as Record<string, unknown>;
                return (
                  <tr key={`${row.occupation_slug}-${row.borough_slug}`} className="border-b border-border/80 align-top">
                    <td className="px-3 py-2 font-medium text-text">{boroughLabelFromSlug(String(row.borough_slug))}</td>
                    <td className="px-3 py-2">{String(row.occupation_slug)}</td>
                    <td className="px-3 py-2 tabular-nums">{Number(row.active_pro_count)}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-surface2 px-2 py-0.5 text-xs font-medium">{String(row.visible_state)}</span>
                    </td>
                    <td className="px-3 py-2">{row.is_customer_visible ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2 text-xs text-muted whitespace-nowrap">
                      {row.last_checked_at ? new Date(String(row.last_checked_at)).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <form action={updateCategoryBoroughOverride} className="flex flex-col gap-2 min-w-[220px]">
                        <input type="hidden" name="occupation_slug" value={String(row.occupation_slug)} />
                        <input type="hidden" name="borough_slug" value={String(row.borough_slug)} />
                        <label className="flex items-center gap-2 text-xs">
                          <input type="checkbox" name="force_hidden" defaultChecked={Boolean(row.force_hidden)} />
                          Force hidden
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <input type="checkbox" name="force_visible" defaultChecked={Boolean(row.force_visible)} />
                          Force visible
                        </label>
                        <textarea
                          name="ops_note"
                          className="w-full rounded-md border border-border px-2 py-1 text-xs"
                          rows={2}
                          placeholder="Ops note"
                          defaultValue={row.ops_note != null ? String(row.ops_note) : ''}
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-text px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                        >
                          Save override
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 ? <p className="p-4 text-sm text-muted">No rows yet. Run the gate refresh migration or POST refresh-gate.</p> : null}
        </div>
      </div>
    </Layout>
  );
}
