import Layout from '@/components/Layout';
import Link from 'next/link';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireAdminUser } from '@/app/admin/_admin';
import { adminSetProAvailableAction } from '@/app/admin/_actions';

type SearchParams = Record<string, string | string[] | undefined>;

function pickFirst(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function normalizeUuidOrNull(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  const ok = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  return ok ? s : null;
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminUser('/admin/users');

  const sp = await searchParams;
  const q = (pickFirst(sp.q) ?? '').trim();
  const ok = pickFirst(sp.ok);
  const error = pickFirst(sp.error);

  const admin = createAdminSupabaseClient();

  let profiles: any[] = [];
  if (!q) {
    const { data } = await admin
      .from('profiles')
      .select('id, email, role, full_name, first_name, phone, zip_code, onboarding_step, created_at')
      .order('created_at', { ascending: false })
      .limit(25);
    profiles = data ?? [];
  } else {
    const asId = normalizeUuidOrNull(q);
    let query = admin
      .from('profiles')
      .select('id, email, role, full_name, first_name, phone, zip_code, onboarding_step, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (asId) {
      query = query.eq('id', asId);
    } else {
      // Best-effort match: email or name
      query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
    }

    const { data } = await query;
    profiles = data ?? [];
  }

  const userIds = Array.from(new Set((profiles ?? []).map((p) => String(p.id)).filter(Boolean)));
  const proByUserId = new Map<string, any>();
  if (userIds.length > 0) {
    const { data: pros } = await admin
      .from('service_pros')
      .select('id, user_id, display_name, available, category_id, created_at')
      .in('user_id', userIds);
    (pros ?? []).forEach((p: any) => {
      proByUserId.set(String(p.user_id), p);
    });
  }

  return (
    <Layout title="Flyers Up – Admin">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text">Users</h1>
            <p className="mt-1 text-sm text-muted">
              Search profiles by user id (UUID), email, or name. Recent signups shown by default.
            </p>
          </div>
          <Link className="text-sm text-muted hover:text-text" href="/admin">
            ← Admin home
          </Link>
        </div>

        {ok ? (
          <div className="mt-4 p-4 bg-surface2 border border-[var(--surface-border)] border-l-[3px] border-l-accent rounded-lg text-text">
            {ok}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 p-4 bg-danger/10 border border-danger/30 rounded-lg text-text">{error}</div>
        ) : null}

        <form className="mt-5 flex gap-2" action="/admin/users" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by user id, email, name…"
            className="flex-1 w-full px-3 py-2 rounded-lg bg-surface border border-border text-text placeholder:text-muted/70"
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-accent text-accentContrast font-medium hover:opacity-95">
            Search
          </button>
          <Link href="/admin/users" className="px-4 py-2 rounded-lg bg-surface2 text-text font-medium hover:bg-surface">
            Reset
          </Link>
        </form>

        <div className="mt-6 overflow-hidden rounded-[18px] border border-hairline bg-surface shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface2 text-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Pro profile</th>
                  <th className="text-left px-4 py-3 font-medium">Availability override</th>
                </tr>
              </thead>
              <tbody>
                {(profiles ?? []).map((p: any) => {
                  const id = String(p.id);
                  const pro = proByUserId.get(id) ?? null;
                  const role = (p.role ?? '—') as string;
                  const email = (p.email ?? '—') as string;
                  const name = (p.full_name ?? p.first_name ?? '') as string;
                  const avail = pro ? Boolean(pro.available) : null;
                  const returnTo = q ? `/admin/users?q=${encodeURIComponent(q)}` : '/admin/users';

                  return (
                    <tr key={id} className="border-t border-hairline">
                      <td className="px-4 py-3">
                        <div className="font-medium text-text">{name || email}</div>
                        <div className="text-xs text-muted/80 truncate max-w-[52ch]" title={id}>
                          {id} {email && email !== '—' ? `• ${email}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{role}</td>
                      <td className="px-4 py-3">
                        {pro ? (
                          <div className="text-xs">
                            <div className="font-medium text-text">{String(pro.display_name ?? 'Service Pro')}</div>
                            <div className="text-muted/80">service_pros.id: {String(pro.id)}</div>
                          </div>
                        ) : (
                          <div className="text-muted/70">—</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {pro ? (
                          <form action={adminSetProAvailableAction} className="flex items-center gap-2">
                            <input type="hidden" name="userId" value={id} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <input type="hidden" name="available" value={avail ? 'false' : 'true'} />
                            <button
                              type="submit"
                              className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface2 text-text font-medium"
                            >
                              Set {avail ? 'Unavailable' : 'Available'}
                            </button>
                            <span className="text-xs text-muted/80">{avail ? 'Currently: available' : 'Currently: unavailable'}</span>
                          </form>
                        ) : (
                          <span className="text-muted/70">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {(profiles ?? []).length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted" colSpan={4}>
                      No users found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

