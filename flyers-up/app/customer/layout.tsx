import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin?next=/customer');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, onboarding_step')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !profile.role || profile.onboarding_step === 'role') {
    redirect('/onboarding/role?next=%2Fcustomer');
  }

  if (profile.role !== 'customer') {
    redirect('/pro');
  }

  const firstNameMissing = !profile.first_name || profile.first_name.trim().length === 0;
  if (profile.onboarding_step === 'customer_profile' || firstNameMissing) {
    redirect('/onboarding/customer?next=%2Fcustomer');
  }

  return <>{children}</>;
}

