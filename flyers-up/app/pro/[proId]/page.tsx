import { notFound } from 'next/navigation';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { getPublicProProfileByIdServer } from '@/lib/profileData';
import { ProfilePageShell } from '@/components/profile/ProfilePageShell';
import { ProfileTopBar } from '@/components/profile/ProfileTopBar';
import { ProProfileView } from '@/components/profile/ProProfileView';

export const dynamic = 'force-dynamic';

type RouteParams = { proId?: string };

export default async function PublicProProfilePage({ params }: { params: RouteParams | Promise<RouteParams> }) {
  const resolved = await Promise.resolve(params);
  const proId = resolved?.proId;
  if (!proId) return notFound();
  const profile = await getPublicProProfileByIdServer(proId);
  if (!profile) return notFound();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let messageHref: string | null = null;
  if (user?.id) {
    const admin = createAdminSupabaseClient();
    const { data: b } = await admin
      .from('bookings')
      .select('id')
      .eq('customer_id', user.id)
      .eq('pro_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (b?.id) messageHref = `/customer/chat/${encodeURIComponent(String(b.id))}`;
  }

  const callHref = profile.phonePublic && profile.phone ? `tel:${profile.phone}` : null;

  return (
    <ProfilePageShell>
      <ProfileTopBar title={profile.businessName} />
      <div className="pt-4">
        <ProProfileView
          profile={profile}
          bookHref={`/book/${encodeURIComponent(profile.id)}`}
          messageHref={messageHref}
          callHref={callHref}
        />
      </div>
    </ProfilePageShell>
  );
}

