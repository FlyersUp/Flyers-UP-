import Layout from '@/components/Layout';
import Link from 'next/link';
import { requireAdminUser, isAdminUser } from '@/app/admin/_admin';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function pickFirst(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const denied = pickFirst(sp.denied) === '1';
  const ok = pickFirst(sp.ok);
  const error = pickFirst(sp.error);

  // Read env only in server component (never in "use client" or client bundle)
  const adminEmails = process.env.ADMIN_EMAILS ?? '';

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const sessionStatus = session ? 'authenticated (cookie seen and valid)' : 'none';

  if (!user) {
    await requireAdminUser('/admin');
  }

  const isAdmin = await isAdminUser(supabase, user);
  if (!isAdmin) {
    return (
      <Layout title="Flyers Up – Admin">
        <div className="max-w-2xl mx-auto py-12 px-4">
          <h1 className="text-2xl font-semibold text-text text-center">Access denied</h1>
          <p className="mt-2 text-sm text-muted text-center">
            This page requires an admin account.
          </p>
          {user?.email ? (
            <div className="mt-6 p-4 rounded-xl border border-border bg-surface2 text-left space-y-2">
              <p className="text-sm font-medium text-text">You’re signed in as:</p>
              <p className="text-sm text-muted font-mono break-all">{user.email}</p>
              <p className="text-xs text-muted mt-2">
                Admin access: add this email to <code className="bg-surface px-1 rounded">ADMIN_EMAILS</code> in Vercel (then redeploy),
                or set your account’s <code className="bg-surface px-1 rounded">role</code> to <code className="bg-surface px-1 rounded">admin</code> in Supabase (Table Editor → profiles).
              </p>
              <p className="text-xs text-muted">
                Current <code className="bg-surface px-1 rounded">ADMIN_EMAILS</code> on server: {adminEmails ? `set (${adminEmails.split(',').length} value(s))` : '(not set)'}
              </p>
            </div>
          ) : null}
          <pre className="mt-4 rounded-lg border border-border bg-surface2 p-3 text-xs text-muted overflow-x-auto">
            USER_EMAIL: {user?.email ?? '(no user)'}
            {'\n'}Session: {sessionStatus}
          </pre>
          <div className="mt-6 text-center">
            <Link
              href="/auth?next=/admin"
              className="text-sm font-medium text-accent hover:underline"
            >
              Sign in with email code or Google →
            </Link>
          </div>
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

        <pre className="rounded-lg border border-border bg-surface2 p-3 text-xs text-muted overflow-x-auto">
          USER_EMAIL: {user?.email ?? '(no user)'}
          {'\n'}Session: {sessionStatus}
          {'\n'}ADMIN_EMAILS: {adminEmails || '(not set)'}
        </pre>

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




