'use client';

import type { PublicProProfileModel } from '@/lib/profileData';
import { ProfilePhotoTile } from '@/components/shared/ProfilePhotoTile';
import { FavoriteButton } from '@/components/profile/FavoriteButton';

interface ProHeaderCardProps {
  profile: PublicProProfileModel;
  showFavorite?: boolean;
}

export function ProHeaderCard({ profile, showFavorite = true }: ProHeaderCardProps) {
  const photoUrl = profile.logoUrl || profile.avatarUrl;
  const rating = profile.stats.avgRating;
  const reviewCount = profile.stats.reviewCount ?? 0;
  const jobs = profile.stats.jobsCompleted ?? 0;

  const statChips = [
    { label: 'Jobs', value: jobs },
    { label: 'Rating', value: rating != null ? rating.toFixed(1) : null },
    { label: 'Reviews', value: reviewCount },
  ].filter((s) => s.value !== null && s.value !== 0);

  return (
    <div className="flex items-start gap-4">
      <ProfilePhotoTile src={photoUrl} alt={profile.businessName} size={88} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-semibold text-text truncate">{profile.businessName}</h1>
          {showFavorite && <FavoriteButton proId={profile.id} />}
        </div>
        {profile.categoryName && (
          <p className="mt-0.5 text-sm text-muted truncate">{profile.categoryName}</p>
        )}
        {profile.locationLabel && (
          <p className="mt-0.5 text-sm text-muted truncate">{profile.locationLabel}</p>
        )}

        {rating != null && reviewCount > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-sm font-semibold text-text">★ {rating.toFixed(1)}</span>
            <span className="text-sm text-muted">({reviewCount})</span>
          </div>
        )}

        {statChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {statChips.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-black/70"
              >
                {s.label}: {s.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
