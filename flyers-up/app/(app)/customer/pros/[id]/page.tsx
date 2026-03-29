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
import { ProProfileRelationshipBar } from '@/components/recurring/ProProfileRelationshipBar';

export const dynamic = 'force-dynamic';

type RouteParams = { id?: string };

export default async function CustomerProProfilePage({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams?: Promise<{ nearby?: string }>;
}) {
  const resolved = await params;
  const proId = resolved?.id;
  const sp = await searchParams;
  const fromNearbyAlert = sp?.nearby === '1';
  if (!proId) return notFound();

  // Customer browsing requires sign-in.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/customer/pros/${proId}`)}`);

  const profile = await getPublicProProfileByIdServer(proId);
  if (!profile) return notFound();

  const admin = createAdminSupabaseClient();
  const { data: b } = await admin
    .from('bookings')
    .select('id')
    .eq('customer_id', user.id)
    .eq('pro_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const messageHref = b?.id
    ? `/customer/chat/${encodeURIComponent(String(b.id))}`
    : `/customer/contact/${encodeURIComponent(profile.id)}`;
  const messageTitle = null;

  const callHref = profile.phonePublic && profile.phone ? `tel:${profile.phone}` : null;

  return (
    <AppLayout mode="customer">
      <div className="max-w-[720px] mx-auto px-4 py-6">
        <div className="theme-pro">
          {fromNearbyAlert && (
            <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
              <p className="font-semibold text-text">Pro available nearby today</p>
              <p className="text-sm text-muted mt-0.5">
                {profile.businessName} · {profile.categoryName ?? 'Pro'}
              </p>
              <p className="text-xs text-muted mt-1">Book or message them now.</p>
            </div>
          )}
          <ProfileTopBar title={profile.businessName} />
          <div className="pt-4 mb-4">
            <ProProfileRelationshipBar proId={profile.id} />
          </div>
          <div className="pt-4">
            <ProProfileView
              profile={profile}
              bookHref={`/book/${encodeURIComponent(profile.id)}`}
              messageHref={messageHref}
              messageTitle={messageTitle}
              callHref={callHref}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}






