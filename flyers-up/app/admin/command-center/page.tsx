import { redirect } from 'next/navigation';
import Layout from '@/components/Layout';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { isAdminEmail, requireAdminUser } from '@/app/admin/_admin';
import { getCommandCenterData } from '@/lib/adminCommandCenter';
import { CommandCenterView } from './CommandCenterView';

type SearchParams = Record<string, string | string[] | undefined>;

function pickFirst(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminCommandCenterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin?next=/admin/command-center');
  }

  const isAdmin = isAdminEmail(user.email);
  if (!isAdmin) {
    return (
      <Layout title="Flyers Up – Admin">
        <div className="max-w-2xl mx-auto text-center py-12">
          <h1 className="text-2xl font-semibold text-text">Not authorized</h1>
          <p className="mt-2 text-sm text-muted">
            This page is only available to admin users. If you believe you should have access, ensure your email is listed in <code>ADMIN_EMAILS</code>.
          </p>
          <a href="/admin" className="mt-4 inline-block text-sm text-accent hover:underline">
            ← Back to Admin
          </a>
        </div>
      </Layout>
    );
  }

  const sp = await searchParams;
  const ok = pickFirst(sp.ok);
  const error = pickFirst(sp.error);
  const data = await getCommandCenterData();

  return (
    <Layout title="Flyers Up – Command Center">
      <CommandCenterView data={data} ok={ok} error={error} />
    </Layout>
  );
}
