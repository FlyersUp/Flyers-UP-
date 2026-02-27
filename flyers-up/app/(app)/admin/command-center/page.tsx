import { redirect } from 'next/navigation';
import Layout from '@/components/Layout';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { requireAdminUser } from '@/app/(app)/admin/_admin';
import { getCommandCenterData } from '@/lib/adminCommandCenter';
import { CommandCenterView } from './CommandCenterView';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function pickFirst(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminCommandCenterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminUser('/admin/command-center');

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
