'use client';

/**
 * Profile Hero Card — Airbnb-style
 * Floating card: photo + verification badge, name, Superhost-style status, vertical stats
 */

import type { PublicProProfileModel } from '@/lib/profileData';
import { ProfilePhotoTile } from '@/components/shared/ProfilePhotoTile';
import { FavoriteButton } from '@/components/profile/FavoriteButton';
import { ReportUserBlockUser } from '@/components/moderation/ReportUserBlockUser';
import { ShieldCheck, Award } from 'lucide-react';

interface ProfileHeroCardProps {
  profile: PublicProProfileModel;
  showFavorite?: boolean;
}

function formatYears(years: number | null): string | null {
  if (years == null || years < 1) return null;
  return years === 1 ? '1 year' : `${years} years`;
}

export function ProfileHeroCard({ profile, showFavorite = true }: ProfileHeroCardProps) {
  const photoUrl = profile.logoUrl || profile.avatarUrl;
  const rating = profile.stats.avgRating;
  const reviewCount = profile.stats.reviewCount ?? 0;
  const years = formatYears(profile.yearsActive);
  const hasTrust = profile.trust?.identityVerified ?? profile.trust?.backgroundChecked ?? profile.trust?.licensed;

  const stats = [
    { label: 'Reviews', value: reviewCount },
    { label: 'Rating', value: rating != null ? `${rating.toFixed(1)} ★` : null },
    { label: 'Hosting', value: years },
  ].filter((s) => s.value !== null && (typeof s.value === 'number' ? s.value > 0 : true));

  return (
    <div className="relative rounded-2xl border border-black/6 dark:border-white/10 bg-white dark:bg-[#1D2128] shadow-sm shadow-black/5 dark:shadow-black/20">
      <div
        className="absolute top-3 right-3 z-10 flex items-center gap-2 rounded-full border border-black/[0.06] dark:border-white/10 bg-white/80 dark:bg-[#1D2128]/85 backdrop-blur-sm px-2 py-1 shadow-sm"
        role="toolbar"
        aria-label="Profile actions"
      >
        {showFavorite ? <FavoriteButton proId={profile.id} /> : null}
        <ReportUserBlockUser
          targetUserId={profile.userId}
          targetDisplayName={profile.businessName}
          variant="menu"
        />
      </div>
      <div className="p-5 pr-24 sm:p-6 sm:pr-28">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <ProfilePhotoTile
              src={photoUrl}
              alt={profile.businessName}
              size={80}
              className="rounded-full ring-2 ring-black/5 dark:ring-white/10"
            />
            {hasTrust && (
              <span
                className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"
                aria-label="Verified"
              >
                <ShieldCheck size={14} strokeWidth={2.5} />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-[#111111] dark:text-[#F5F7FA] truncate pr-1">
                {profile.businessName}
              </h1>
              {(reviewCount >= 20 || (rating != null && rating >= 4.8)) && (
                <div className="mt-1 flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <Award size={14} strokeWidth={2} />
                  <span className="text-xs font-medium">Top Rated</span>
                </div>
              )}
            </div>

            {(profile.primaryOccupationName || profile.categoryName) && (
              <div className="mt-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6A6A6A] dark:text-[#A1A8B3]">
                  Primary occupation
                </p>
                <p className="text-sm font-semibold text-[#111111] dark:text-[#F5F7FA] truncate">
                  {profile.primaryOccupationName || profile.categoryName}
                </p>
              </div>
            )}

            {stats.length > 0 && (
              <div className="mt-4 flex flex-col gap-0 border-t border-black/5 dark:border-white/10 pt-3">
                {stats.map((s, i) => (
                  <div
                    key={s.label}
                    className={[
                      'flex items-center justify-between text-sm',
                      i > 0 ? 'border-t border-black/5 dark:border-white/10 pt-2' : '',
                    ].join(' ')}
                  >
                    <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">{s.label}</span>
                    <span className="font-semibold text-[#111111] dark:text-[#F5F7FA]">
                      {typeof s.value === 'number' ? s.value : s.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
