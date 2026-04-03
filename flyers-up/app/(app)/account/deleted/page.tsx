import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { AccountDeletedClient } from './AccountDeletedClient';

export const dynamic = 'force-dynamic';

export default async function AccountDeletedPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: profile } = await supabase.from('profiles').select('account_status').eq('id', user.id).maybeSingle();

  if (profile?.account_status !== 'deleted') {
    redirect('/');
  }

  return (
    <div className="min-h-dvh bg-bg">
      <AccountDeletedClient />
    </div>
  );
}
