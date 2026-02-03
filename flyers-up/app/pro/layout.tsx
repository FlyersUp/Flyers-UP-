import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin?next=/pro');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, zip_code, onboarding_step')
    .eq('id', user.id)
    .maybeSingle();

  // If profile is missing or role isn't set yet, force role selection.
  if (!profile || !profile.role || profile.onboarding_step === 'role') {
    redirect('/onboarding/role?next=%2Fpro');
  }

  // If user is not a pro, bounce to customer home.
  if (profile.role !== 'pro') {
    redirect('/customer');
  }

  // Require pro onboarding essentials before any /pro screens.
  const firstNameMissing = !profile.first_name || profile.first_name.trim().length === 0;
  const zipMissing = !profile.zip_code || profile.zip_code.trim().length === 0;
  if (profile.onboarding_step === 'pro_profile' || firstNameMissing || zipMissing) {
    redirect('/onboarding/pro?next=%2Fpro');
  }

  // Require minimal customer-visible pro row before any /pro screens.
  const { data: proRow } = await supabase
    .from('service_pros')
    .select('display_name, category_id, service_area_zip')
    .eq('user_id', user.id)
    .maybeSingle();

  const missingProInfo =
    !proRow || !proRow.display_name || !proRow.category_id || !proRow.service_area_zip;

  if (missingProInfo) {
    redirect('/onboarding/pro?next=%2Fpro');
  }

  return <>{children}</>;
}

