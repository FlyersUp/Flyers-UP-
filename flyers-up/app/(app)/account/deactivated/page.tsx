import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { AccountDeactivatedClient } from './AccountDeactivatedClient';

export const dynamic = 'force-dynamic';

export default async function AccountDeactivatedPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth?next=%2Faccount%2Fdeactivated');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_status, scheduled_deletion_at')
    .eq('id', user.id)
    .maybeSingle();

  const st = profile?.account_status;
  if (st === 'deleted') {
    redirect('/account/deleted');
  }
  if (st === 'active') {
    redirect('/');
  }
  if (st !== 'deactivated') {
    redirect('/');
  }

  return (
    <div className="min-h-dvh bg-bg">
      <AccountDeactivatedClient scheduledDeletionAt={(profile as { scheduled_deletion_at?: string | null })?.scheduled_deletion_at ?? null} />
    </div>
  );
}
