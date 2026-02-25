'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatTagline, formatAvailability, formatDistance } from '@/components/flyers/flyerStyles';

export type ProProfilePro = {
  id: string;
  displayName: string;
  photoUrl?: string | null;
  primaryCategory: string;
  rating: number | null;
  reviewsCount: number | null;
  tagline: string | null;
  availability: string | object | unknown[] | null;
  serviceRadiusMiles?: number | null;
  serviceRadius?: number | null;
  maxDistanceMinutes?: number | null;
  startingPrice?: number;
};

interface ProProfileCardProps {
  pro: ProProfilePro;
  profileHref: string;
  bookHref: string;
  messageHref: string;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

export default function ProProfileCard({ pro, profileHref, bookHref, messageHref }: ProProfileCardProps) {
  const taglineStr = formatTagline(pro);
  const availabilityStr = formatAvailability(pro.availability);
  const distanceStr = formatDistance({
    serviceRadius: pro.serviceRadius ?? pro.serviceRadiusMiles,
    serviceRadiusMiles: pro.serviceRadiusMiles ?? pro.serviceRadius,
    maxDistanceMinutes: pro.maxDistanceMinutes,
  });

  const isNew = pro.rating == null || pro.reviewsCount == null || pro.reviewsCount === 0;

  return (
    <article
      className="flex h-full flex-col w-full max-w-[480px] justify-self-center overflow-hidden rounded-2xl border border-black/10 bg-[#F2F2F0] shadow-sm"
    >
      <Link href={profileHref} className="block flex-1 p-5 transition-colors hover:bg-black/[0.02]">
        {/* Top row: avatar + identity */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full overflow-hidden bg-black/5">
            {pro.photoUrl ? (
              <Image
                src={pro.photoUrl}
                alt=""
                fill
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-base font-semibold text-black/70">
                {getInitials(pro.displayName)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-lg font-semibold leading-tight text-black">{pro.displayName}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-black/5 px-3 py-1 text-sm text-black/70">
                {pro.primaryCategory}
              </span>
              {isNew && (
                <span className="rounded-full bg-[#B2FBA5]/50 px-3 py-1 text-xs font-medium text-black">
                  New
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rating row (only when not "New") */}
        {!isNew && pro.rating != null && pro.reviewsCount != null && (
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-amber-500 text-sm">★</span>
            <span className="text-sm font-medium text-black">{pro.rating.toFixed(1)}</span>
            <span className="text-xs text-black/50">({pro.reviewsCount})</span>
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-black/70 line-clamp-1 mb-2">{taglineStr}</p>

        {/* Secondary: hours */}
        <p className="text-xs text-black/50 mb-1">{availabilityStr}</p>

        {/* Secondary: distance */}
        <p className="text-xs text-black/50">{distanceStr}</p>
      </Link>

      {/* Bottom action bar */}
      <div className="flex gap-3 border-t border-black/10 bg-white/40 px-5 py-4">
        <Link
          href={bookHref}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 h-11 flex items-center justify-center rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#FFC067] focus:ring-offset-2 transition-all"
        >
          Book
        </Link>
        <Link
          href={messageHref}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 h-11 flex items-center justify-center rounded-full text-sm font-semibold border border-black/15 text-black/80 bg-transparent hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2 transition-colors"
        >
          Message
        </Link>
      </div>
    </article>
  );
}
