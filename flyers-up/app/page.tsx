import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { routeAfterAuthFromProfile, type AuthRoutingProfile } from '@/lib/authRouting';
import PublicHomePage from '@/components/landing/PublicHomePage';

export const dynamic = 'force-dynamic';

/**
 * Session-aware root: signed-out users see the public landing; signed-in users
 * are sent to the right app surface (role + onboarding) without relying on
 * the client-only landing.
 */
export default async function RootPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="public-light min-h-dvh min-h-[100svh] w-full max-w-full overflow-x-clip">
        <PublicHomePage />
      </div>
    );
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('role, first_name, last_name, zip_code, onboarding_step, account_status')
    .eq('id', user.id)
    .maybeSingle();

  if (!profileRow) {
    redirect('/onboarding/role');
  }

  const profile = profileRow as AuthRoutingProfile;

  if (String(profileRow.role) === 'admin') {
    redirect('/admin');
  }

  redirect(routeAfterAuthFromProfile(profile));
}
