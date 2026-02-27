import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import ProDashboardClient from '@/components/pro/ProDashboardClient';

/**
 * Pro Dashboard (server-gated)
 *
 * Fixes "reload" / flicker caused by client-side auth guards:
 * - Reads session + profile on the server (no first-paint then redirect)
 * - Keeps Pro pages neutral; role accent is a micro-accent only
 */
export default async function ProDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth?next=%2Fpro');
  }

  const selectCols = 'id, email, role, first_name, last_name, phone, zip_code, onboarding_step';

  // Server-side get-or-create (RLS allows users to insert their own profile).
  const { data: profileExisting } = await supabase
    .from('profiles')
    .select(selectCols)
    .eq('id', user.id)
    .maybeSingle();

  const profile =
    profileExisting ??
    (
      await supabase
        .from('profiles')
        .insert({ id: user.id, email: user.email ?? null, role: null, onboarding_step: 'role' })
        .select(selectCols)
        .single()
    ).data ??
    null;

  if (!profile || profile.role !== 'pro') {
    redirect('/onboarding/role?next=%2Fpro');
  }

  const firstNameMissing = !profile.first_name || profile.first_name.trim().length === 0;
  const lastNameMissing = !profile.last_name || profile.last_name.trim().length === 0;
  const zipMissing = !profile.zip_code || profile.zip_code.trim().length === 0;
  if (profile.onboarding_step === 'pro_profile' || firstNameMissing || lastNameMissing || zipMissing) {
    redirect('/onboarding/pro?next=%2Fpro');
  }

  // Require customer-visible pro info before showing the dashboard.
  const { data: proRow } = await supabase
    .from('service_pros')
    .select('user_id, display_name, category_id, service_area_zip')
    .eq('user_id', user.id)
    .maybeSingle();

  const missingProInfo =
    !proRow || !proRow.display_name || !proRow.category_id || !proRow.service_area_zip;
  if (missingProInfo) {
    redirect('/onboarding/pro?next=%2Fpro');
  }

  const fallbackName = (user.email ? user.email.split('@')[0] : 'Account') || 'Account';
  const userName = [profile.first_name?.trim(), profile.last_name?.trim()].filter(Boolean).join(' ') || fallbackName;

  return <ProDashboardClient userName={userName} />;
}

