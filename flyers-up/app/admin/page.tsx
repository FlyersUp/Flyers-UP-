import Layout from '@/components/Layout';
import Link from 'next/link';
import { requireAdminUser, isAdminEmail } from '@/app/admin/_admin';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

type SearchParams = Record<string, string | string[] | undefined>;

function pickFirst(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const denied = pickFirst(sp.denied) === '1';
  const ok = pickFirst(sp.ok);
  const error = pickFirst(sp.error);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Use shared helper redirect behavior.
    await requireAdminUser('/admin');
  }

  const isAdmin = isAdminEmail(user?.email);
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

  return (
    <Layout title="Flyers Up – Admin">
      <div className="max-w-3xl mx-auto py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-text">Admin</h1>
          <p className="mt-1 text-sm text-muted">User + booking oversight and support tools.</p>
        </div>

        {denied ? (
          <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-text">
            Access denied.
          </div>
        ) : null}
        {error ? (
          <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-text">{error}</div>
        ) : null}
        {ok ? (
          <div className="p-4 bg-surface2 border border-[var(--surface-border)] border-l-[3px] border-l-accent rounded-lg text-text">
            {ok}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/admin/command-center" className="rounded-xl border border-border bg-surface hover:bg-surface2 transition-colors p-4">
            <div className="text-sm font-semibold text-text">Command Center</div>
            <div className="mt-1 text-sm text-muted">Revenue, jobs, pros, targets &amp; alerts.</div>
          </Link>
          <Link href="/admin/users" className="rounded-xl border border-border bg-surface hover:bg-surface2 transition-colors p-4">
            <div className="text-sm font-semibold text-text">Users</div>
            <div className="mt-1 text-sm text-muted">Search profiles + pro availability.</div>
          </Link>
          <Link href="/admin/bookings" className="rounded-xl border border-border bg-surface hover:bg-surface2 transition-colors p-4">
            <div className="text-sm font-semibold text-text">Bookings</div>
            <div className="mt-1 text-sm text-muted">Search bookings + manual status override.</div>
          </Link>
          <Link href="/admin/errors" className="rounded-xl border border-border bg-surface hover:bg-surface2 transition-colors p-4">
            <div className="text-sm font-semibold text-text">Error logs</div>
            <div className="mt-1 text-sm text-muted">Last 100 error events.</div>
          </Link>
        </div>
      </div>
    </Layout>
  );
}




