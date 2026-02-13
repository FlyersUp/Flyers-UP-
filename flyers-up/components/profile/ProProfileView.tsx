'use client';

import { useMemo, useState } from 'react';
import type { PublicProProfileModel } from '@/lib/profileData';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ActionButtons } from '@/components/profile/ActionButtons';
import { Tabs, type TabKey } from '@/components/profile/Tabs';
import { PhotoGrid } from '@/components/profile/PhotoGrid';
import { ServicesList } from '@/components/profile/ServicesList';
import { ReviewsList } from '@/components/profile/ReviewsList';
import { AboutPanel } from '@/components/profile/AboutPanel';
import { parseBusinessHoursModel, summarizeBusinessHours } from '@/lib/utils/businessHours';

function computeBadges(p: PublicProProfileModel) {
  const labels: string[] = [];
  // We only have certifications JSON; treat presence as informational.
  // If you later add structured credential types (licensed/insured/background), map them here.
  if (p.credentials.length) labels.push('Credentials listed');
  return labels.map((label) => ({ label }));
}

export function ProProfileView({
  profile,
  bookHref,
  messageHref,
  callHref,
}: {
  profile: PublicProProfileModel;
  bookHref: string;
  messageHref: string | null;
  callHref: string | null;
}) {
  const [tab, setTab] = useState<TabKey>('work');

  const stats = useMemo(() => {
    const items = [
      { label: 'Jobs', value: profile.stats.jobsCompleted != null ? String(profile.stats.jobsCompleted) : '—' },
      {
        label: 'Rating',
        value: profile.stats.avgRating != null ? Number(profile.stats.avgRating).toFixed(1) : '—',
      },
      { label: 'Reviews', value: profile.stats.reviewCount != null ? String(profile.stats.reviewCount) : '—' },
    ];
    if (profile.stats.responseTimeMedian) items.push({ label: 'Response', value: profile.stats.responseTimeMedian });
    if (profile.yearsActive != null) items.push({ label: 'Years', value: String(profile.yearsActive) });
    const trimmed = items.slice(0, 5);

    // Micro-accent rule: highlight ONE key stat with orange number only.
    const pick = (label: string) => trimmed.findIndex((x) => x.label === label && x.value !== '—');
    const idx = pick('Rating') >= 0 ? pick('Rating') : pick('Years');
    if (idx >= 0) (trimmed[idx] as any).accent = true;

    return trimmed as any;
  }, [profile]);

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

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-hairline bg-white shadow-sm p-5">
        <ProfileHeader
          avatarUrl={profile.logoUrl || profile.avatarUrl}
          name={profile.businessName}
          badges={computeBadges(profile)}
          stats={stats}
        />

        <div className="mt-4">
          <ActionButtons
            primaryHref={bookHref}
            primaryLabel="Book"
            secondaryHref={messageHref}
            secondaryLabel="Message"
            secondaryDisabledText="Messaging becomes available after you start a booking."
            tertiaryHref={callHref}
            tertiaryLabel="Call"
            tertiaryDisabledText="Call is available only when the pro chooses to share it."
          />
        </div>

        <div className="mt-4 space-y-2">
          {profile.bio ? <div className="text-sm text-text/90 line-clamp-4 whitespace-pre-line">{profile.bio}</div> : null}
          <div className="text-sm text-muted">
            {profile.locationLabel ? (
              <span>
                Serves: {profile.locationLabel}
                {profile.serviceRadiusMiles != null ? ` • ${profile.serviceRadiusMiles} mi radius` : null}
              </span>
            ) : (
              <span>Service area available on request.</span>
            )}
          </div>
          {profile.categoryName ? (
            <div className="text-sm text-muted">Specialty: {profile.categoryName}</div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-hairline bg-white shadow-sm overflow-hidden">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
        <div className="p-4">
          {tab === 'work' ? <PhotoGrid photos={profile.photos} /> : null}
          {tab === 'services' ? <ServicesList proId={profile.id} services={profile.services} /> : null}
          {tab === 'reviews' ? (
            <ReviewsList avgRating={profile.stats.avgRating} reviewCount={profile.stats.reviewCount} reviews={profile.reviews} />
          ) : null}
          {tab === 'about' ? (
            <AboutPanel
              aboutLong={profile.aboutLong}
              bio={profile.bio}
              credentials={profile.credentials}
              serviceRadiusMiles={profile.serviceRadiusMiles}
              businessHoursSummary={businessHoursSummary}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

