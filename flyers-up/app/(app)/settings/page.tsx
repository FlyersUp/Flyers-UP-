import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export default async function SettingsIndexRedirect() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth?next=%2Fsettings');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role === 'pro') {
    redirect('/pro/settings');
  }

  redirect('/customer/settings');
}






