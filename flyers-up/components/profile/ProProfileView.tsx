'use client';

/**
 * Pro Profile View — Full layout
 * Airbnb warmth, Stripe clarity, Apple polish, Linear spacing
 * Mobile-first, single scroll, conversion-focused
 *
 * Section order (highest-conviction first):
 * 1. Hero / identity
 * 2. Trust badges (visible early)
 * 3. Services + pricing (highest conviction)
 * 4. Reviews summary + cards (highest conviction)
 * 5. Gallery
 * 6. Availability preview
 * 7. About / service area
 * 8. Sticky CTA (Book primary, Message supportive)
 */

import type { PublicProProfileModel } from '@/lib/profileData';
import { ProfileHeroCard } from '@/components/pro-profile/ProfileHeroCard';
import { TrustBadgesRow } from '@/components/pro-profile/TrustBadgesRow';
import { ServicesAndPricingSection } from '@/components/pro-profile/ServicesAndPricingSection';
import { AvailabilityPreviewCard } from '@/components/pro-profile/AvailabilityPreviewCard';
import { StickyBookingBar } from '@/components/pro-profile/StickyBookingBar';
import { bottomChrome } from '@/lib/layout/bottomChrome';
import { GallerySection } from '@/components/profile/GallerySection';
import { ProReviewSection } from '@/components/profile/ProReviewSection';
import { AboutServiceAreaSection } from '@/components/profile/AboutServiceAreaSection';
import { ProPackagesProfileSection } from '@/components/profile/ProPackagesProfileSection';
import { PerformanceSnapshotSection } from '@/components/profile/PerformanceSnapshotSection';
import { ProFollowButton } from '@/components/profile/ProFollowButton';

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
  aboveBottomNav?: boolean;
}) {
  const messageDisabled = !messageHref;

  return (
    <div className={`space-y-6 ${bottomChrome.pbStickyBarOnly}`}>
      {/* 1. Hero / identity block */}
      <section>
        <ProfileHeroCard profile={profile} />
      </section>

      {/* 2. Trust badges / verification — visible early */}
      <section>
        <TrustBadgesRow trust={profile.trust} />
      </section>

      {/* 2b. Follow (foundation for later; no feed yet) */}
      <section>
        <ProFollowButton proId={profile.id} />
      </section>

      {/* 2c. Performance snapshot — trust metrics only */}
      {profile.performanceSnapshot && (
        <section>
          <PerformanceSnapshotSection snapshot={profile.performanceSnapshot} />
        </section>
      )}

      {/* 3. Services + pricing — highest conviction */}
      <section>
        <ServicesAndPricingSection profile={profile} />
      </section>

      <section>
        <ProPackagesProfileSection proId={profile.id} bookHref={bookHref} />
      </section>

      {/* 4. Reviews summary + review cards — highest conviction */}
      <section>
        <ProReviewSection
          proId={profile.id}
          fallbackAvgRating={profile.stats.avgRating}
          fallbackReviewCount={profile.stats.reviewCount}
        />
      </section>

      {/* 5. Gallery / work samples */}
      <section>
        <GallerySection photos={profile.photos} />
      </section>

      {/* 6. Availability preview */}
      <section>
        <AvailabilityPreviewCard proId={profile.id} businessHours={profile.businessHours} bookHref={bookHref} />
      </section>

      {/* 7. About / service area */}
      {(profile.bio ||
        profile.aboutLong ||
        profile.locationLabel ||
        (profile.serviceRadiusMiles != null && profile.serviceRadiusMiles > 0)) && (
        <section>
          <AboutServiceAreaSection
            bio={profile.bio}
            aboutLong={profile.aboutLong}
            locationLabel={profile.locationLabel}
            categoryName={profile.categoryName}
            serviceRadiusMiles={profile.serviceRadiusMiles}
          />
        </section>
      )}

      {/* 8. Sticky Book CTA + Message Pro (supportive) */}
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
