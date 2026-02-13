/**
 * Customer view of a Pro profile (Instagram-style).
 *
 * We keep this under `/customer/*` so customer navigation stays consistent.
 * The profile itself is rendered with Pro accent tokens (orange) within this page.
 */

import { notFound, redirect } from 'next/navigation';
import { AppLayout } from '@/components/layouts/AppLayout';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { getPublicProProfileByIdServer } from '@/lib/profileData';
import { ProfileTopBar } from '@/components/profile/ProfileTopBar';
import { ProProfileView } from '@/components/profile/ProProfileView';

export const dynamic = 'force-dynamic';

type RouteParams = { id?: string };

export default async function CustomerProProfilePage({ params }: { params: RouteParams | Promise<RouteParams> }) {
  const resolved = await Promise.resolve(params);
  const proId = resolved?.id;
  if (!proId) return notFound();

  // Customer browsing requires sign-in.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/customer/pros/${proId}`)}`);

  const profile = await getPublicProProfileByIdServer(proId);
  if (!profile) return notFound();

  let messageHref: string | null = null;
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

  const callHref = profile.phonePublic && profile.phone ? `tel:${profile.phone}` : null;

  return (
    <AppLayout mode="customer">
      <div className="max-w-[720px] mx-auto px-4 py-6">
        <div className="theme-pro">
          <ProfileTopBar title={profile.businessName} />
          <div className="pt-4">
            <ProProfileView
              profile={profile}
              bookHref={`/book/${encodeURIComponent(profile.id)}`}
              messageHref={messageHref}
              callHref={callHref}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}






