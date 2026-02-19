import React from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { requireAdminUser } from '@/app/admin/_admin';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { AdminCategoryToggleForm } from './AdminCategoryToggleForm';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser('/admin/categories');
  const sp = await searchParams;
  const ok = Array.isArray(sp.ok) ? sp.ok[0] : sp.ok;
  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error;

  const admin = createAdminSupabaseClient();
  const { data: categories, error: fetchErr } = await admin
    .from('service_categories')
    .select('id, slug, name, icon, parent_id, is_active_phase1, is_public')
    .order('parent_id', { ascending: true, nullsFirst: false })
    .order('name');

  if (fetchErr) {
    return (
      <Layout title="Flyers Up – Admin Categories">
        <div className="max-w-4xl mx-auto py-6 px-4">
          <p className="text-danger">Error loading categories: {fetchErr.message}</p>
        </div>
      </Layout>
    );
  }

  const rows = (categories ?? []) as Array<{
    id: string;
    slug: string;
    name: string;
    icon: string | null;
    parent_id: string | null;
    is_active_phase1: boolean | null;
    is_public: boolean | null;
  }>;

  const topLevel = rows.filter((r) => !r.parent_id);
  const subCats = rows.filter((r) => r.parent_id);
  const parentById = new Map(topLevel.map((p) => [p.id, p]));

  return (
    <Layout title="Flyers Up – Admin Categories">
      <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text">Service categories</h1>
            <p className="mt-1 text-sm text-muted">
              Toggle Phase 1 visibility. Only active categories appear to customers and in pro onboarding.
            </p>
          </div>
          <Link href="/admin" className="text-sm font-medium text-accent hover:underline">
            ← Admin
          </Link>
        </div>

        {ok && (
          <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-2 text-sm text-text">
            {decodeURIComponent(ok)}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
            {decodeURIComponent(error)}
          </div>
        )}

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface2">
                <th className="px-4 py-3 font-semibold text-text">Category</th>
                <th className="px-4 py-3 font-semibold text-text">Slug</th>
                <th className="px-4 py-3 font-semibold text-text">Type</th>
                <th className="px-4 py-3 font-semibold text-text">Phase 1</th>
                <th className="px-4 py-3 font-semibold text-text">Actions</th>
              </tr>
            </thead>
            <tbody>
              {topLevel.map((row) => (
                <React.Fragment key={row.id}>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3">
                      <span className="mr-2">{row.icon ?? '—'}</span>
                      <span className="font-medium text-text">{row.name}</span>
                    </td>
                    <td className="px-4 py-3 text-muted">{row.slug}</td>
                    <td className="px-4 py-3 text-muted">Top-level</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.is_active_phase1
                            ? 'text-accent font-medium'
                            : 'text-muted'
                        }
                      >
                        {row.is_active_phase1 ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <AdminCategoryToggleForm
                        categoryId={row.id}
                        isActive={!!row.is_active_phase1}
                      />
                    </td>
                  </tr>
                  {subCats
                    .filter((s) => s.parent_id === row.id)
                    .map((sub) => (
                      <tr key={sub.id} className="border-b border-border bg-surface/50">
                        <td className="px-4 py-2 pl-12">
                          <span className="mr-2">{sub.icon ?? '—'}</span>
                          <span className="text-muted">{sub.name}</span>
                        </td>
                        <td className="px-4 py-2 text-muted">{sub.slug}</td>
                        <td className="px-4 py-2 text-muted">Sub</td>
                        <td className="px-4 py-2">
                          <span
                            className={
                              sub.is_active_phase1
                                ? 'text-accent font-medium'
                                : 'text-muted'
                            }
                          >
                            {sub.is_active_phase1 ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <AdminCategoryToggleForm
                            categoryId={sub.id}
                            isActive={!!sub.is_active_phase1}
                          />
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
