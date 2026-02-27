import Layout from '@/components/Layout';
import Link from 'next/link';
import { requireAdminUser } from '@/app/(app)/admin/_admin';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

/**
 * Marketplace density: Pros per category per zip, Requests per category per zip.
 * Goal: Supply ≥ Demand in target zones.
 */
export default async function AdminDensityPage() {
  await requireAdminUser('/admin/density');
  const admin = createAdminSupabaseClient();

  const { data: pros } = await admin
    .from('service_pros')
    .select('id, category_id, service_area_zip')
    .eq('available', true);

  const { data: categories } = await admin.from('service_categories').select('id, name, slug');

  const { data: requests } = await admin
    .from('bookings')
    .select('id, pro_id, status')
    .eq('status', 'requested');

  const catById = new Map((categories ?? []).map((c: any) => [c.id, c]));
  const proById = new Map((pros ?? []).map((p: any) => [p.id, p]));

  type Key = string;
  const prosByKey = new Map<Key, number>();
  const requestsByKey = new Map<Key, number>();

  for (const p of pros ?? []) {
    const zip = (p as any).service_area_zip ?? '—';
    const catId = (p as any).category_id;
    const cat = catById.get(catId);
    const catName = cat?.name ?? catId ?? '—';
    const key = `${catName}|${zip}`;
    prosByKey.set(key, (prosByKey.get(key) ?? 0) + 1);
  }

  for (const r of requests ?? []) {
    const pro = proById.get((r as any).pro_id);
    if (!pro) continue;
    const zip = (pro as any).service_area_zip ?? '—';
    const cat = catById.get((pro as any).category_id);
    const catName = cat?.name ?? '—';
    const key = `${catName}|${zip}`;
    requestsByKey.set(key, (requestsByKey.get(key) ?? 0) + 1);
  }

  const keys = Array.from(new Set([...prosByKey.keys(), ...requestsByKey.keys()])).sort();
  const rows = keys.map((key) => {
    const [catName, zip] = key.split('|');
    const proCount = prosByKey.get(key) ?? 0;
    const requestCount = requestsByKey.get(key) ?? 0;
    return { catName, zip, proCount, requestCount };
  });

  return (
    <Layout title="Flyers Up – Marketplace density">
      <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text">Pros & requests by category and zip</h1>
            <p className="mt-1 text-sm text-muted">Supply vs demand. Goal: supply ≥ demand in target zones.</p>
          </div>
          <Link href="/admin" className="text-sm font-medium text-accent hover:underline">
            ← Admin
          </Link>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface2">
                <th className="px-4 py-3 font-semibold text-text">Category</th>
                <th className="px-4 py-3 font-semibold text-text">Zip</th>
                <th className="px-4 py-3 font-semibold text-text">Pros</th>
                <th className="px-4 py-3 font-semibold text-text">Open requests</th>
                <th className="px-4 py-3 font-semibold text-text">Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-muted text-center">
                    No pros or requests yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={`${row.catName}-${row.zip}`} className="border-b border-border">
                    <td className="px-4 py-3 text-text">{row.catName}</td>
                    <td className="px-4 py-3 text-text">{row.zip}</td>
                    <td className="px-4 py-3">{row.proCount}</td>
                    <td className="px-4 py-3">{row.requestCount}</td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {row.requestCount > 0 && row.proCount === 0
                        ? 'Shortage'
                        : row.requestCount > row.proCount
                          ? 'High demand'
                          : ''}
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
