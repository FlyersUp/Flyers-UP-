'use client';

import { useMemo, useState } from 'react';
import type { PublicProProfileModel } from '@/lib/profileData';
import { ProHeaderCard } from '@/components/pro-profile/ProHeaderCard';
import { TrustBadgesRow } from '@/components/pro-profile/TrustBadgesRow';
import { PricingCard } from '@/components/pro-profile/PricingCard';
import { ServiceAreaCard } from '@/components/pro-profile/ServiceAreaCard';
import { AvailabilityCard } from '@/components/pro-profile/AvailabilityCard';
import { StickyBookingBar } from '@/components/pro-profile/StickyBookingBar';
import { Tabs, type TabKey } from '@/components/profile/Tabs';
import { PhotoGrid } from '@/components/profile/PhotoGrid';
import { ServicesList } from '@/components/profile/ServicesList';
import { ReviewsList } from '@/components/profile/ReviewsList';
import { AboutPanel } from '@/components/profile/AboutPanel';
import { parseBusinessHoursModel, summarizeBusinessHours } from '@/lib/utils/businessHours';
import { ReportUserBlockUser } from '@/components/moderation/ReportUserBlockUser';
import { ProReputationCardWithFetch } from '@/components/marketplace/ProReputationCardWithFetch';

export function ProProfileView({
  profile,
  bookHref,
  messageHref,
  messageTitle,
  callHref,
  shareUrl,
  aboveBottomNav = true,
}: {
  profile: PublicProProfileModel;
  bookHref: string;
  messageHref: string | null;
  messageTitle?: string | null;
  callHref: string | null;
  shareUrl?: string | null;
  /** When true, StickyBookingBar sits above BottomNav */
  aboveBottomNav?: boolean;
}) {
  const [tab, setTab] = useState<TabKey>('work');

  const businessHoursSummary = useMemo(() => {
    try {
      return summarizeBusinessHours(parseBusinessHoursModel(profile.businessHours || ''));
    } catch {
      return null;
    }
  }, [profile.businessHours]);

  const tabs = useMemo(
    () => [
      { key: 'work' as const, label: 'Work', icon: '▦' },
      { key: 'services' as const, label: 'Services', icon: '≡' },
      { key: 'reviews' as const, label: 'Reviews', icon: '★' },
      { key: 'about' as const, label: 'About', icon: 'ℹ︎' },
    ],
    []
  );

  const messageDisabled = !messageHref;

  return (
    <div className="space-y-5 pb-28">
      {/* B) Header Trust Card */}
      <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm relative">
        <div className="absolute top-4 right-4">
          <ReportUserBlockUser
            targetUserId={profile.userId}
            targetDisplayName={profile.businessName}
            variant="menu"
          />
        </div>
        <ProHeaderCard profile={profile} />
        <div className="mt-4">
          <TrustBadgesRow trust={profile.trust} />
        </div>
        {profile.bio && (
          <div className="mt-4 text-sm text-text/90 line-clamp-4 whitespace-pre-line">
            {profile.bio}
          </div>
        )}
      </section>

      {/* C) Reputation depth */}
      <ProReputationCardWithFetch
        proId={profile.id}
        fallbackRating={profile.stats?.avgRating ?? 0}
        fallbackJobsCompleted={profile.stats?.reviewCount ?? 0}
      />

      {/* D) Pricing Card */}
      <PricingCard pricing={profile.pricing} />

      {/* E) Service Area + Availability */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ServiceAreaCard serviceRadiusMiles={profile.serviceRadiusMiles} />
        <AvailabilityCard businessHours={profile.businessHours} />
      </div>

      {/* G) Tabs */}
      <section className="rounded-2xl border border-black/5 bg-white overflow-hidden shadow-sm">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
        <div className="p-4">
          {tab === 'work' ? (
            <PhotoGrid photos={profile.photos} />
          ) : tab === 'services' ? (
            <ServicesList proId={profile.id} services={profile.services} />
          ) : tab === 'reviews' ? (
            <ReviewsList
              avgRating={profile.stats.avgRating}
              reviewCount={profile.stats.reviewCount}
              reviews={profile.reviews}
            />
          ) : (
            <AboutPanel
              aboutLong={profile.aboutLong}
              bio={profile.bio}
              credentials={profile.credentials}
              serviceRadiusMiles={profile.serviceRadiusMiles}
              businessHoursSummary={businessHoursSummary}
            />
          )}
        </div>
      </section>

      {/* F) Sticky Booking Bar */}
      <StickyBookingBar
        bookHref={bookHref}
        messageHref={messageHref}
        messageDisabled={messageDisabled}
        proName={profile.businessName}
        shareUrl={shareUrl}
        aboveBottomNav={aboveBottomNav}
      />
    </div>
  );
}
