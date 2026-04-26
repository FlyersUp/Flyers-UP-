'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { formatAvailability } from './flyerStyles';

export type BulletinFlyerPro = {
  id: string;
  displayName: string;
  photoUrl?: string | null;
  primaryCategory: string;
  rating: number | null;
  reviewsCount: number | null;
  startingPrice?: number;
  location?: string | null;
  availability: string | object | unknown[] | null;
  sameDayAvailable?: boolean;
  newReviewsCount?: number;
  justBecameAvailable?: boolean;
  idVerified?: boolean;
  jobsCompleted?: number;
  avgResponseMinutes?: number | null;
  avgRating?: number | null;
};

interface BulletinFlyerCardProps {
  pro: BulletinFlyerPro;
  profileHref: string;
  rotation?: number;
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

function formatPriceRange(price?: number | null): string {
  if (price == null || price <= 0) return 'Contact for price';
  const low = Math.floor(price * 0.8);
  const high = Math.ceil(price * 1.2);
  return `$${low}–$${high}`;
}

export function BulletinFlyerCard({ pro, profileHref, rotation = 0 }: BulletinFlyerCardProps) {
  const showNewLabel = Boolean(pro.newReviewsCount || pro.justBecameAvailable);
  const availabilityStr = formatAvailability(pro.availability);
  const priceStr = formatPriceRange(pro.startingPrice);
  const availabilityStatus = pro.sameDayAvailable ? 'Available Today' : availabilityStr;
  const jobsCompleted = Number(pro.jobsCompleted ?? 0);
  const hasResponseTime = typeof pro.avgResponseMinutes === 'number' && Number.isFinite(pro.avgResponseMinutes);
  const hasReviews = pro.avgRating != null && pro.reviewsCount != null && pro.reviewsCount > 0;

  return (
    <article
      className={`group relative w-full max-w-[280px] justify-self-center transition-all duration-300 ${
        'hover:-translate-y-1 hover:shadow-xl'
      }`}
      style={{
        transform: `rotate(${rotation}deg)`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Push pin */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
        <div className="w-4 h-4 rounded-full bg-[#8B7355] shadow-md border-2 border-[#6B5344]" />
      </div>

      <Link
        href={profileHref}
        className="relative block rounded-2xl overflow-hidden bg-white border border-black/5 shadow-sm p-4 pt-5 transition-all duration-300 hover:shadow-md"
        style={{
          boxShadow: '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
        }}
      >
        {/* Paper texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04] rounded-lg mix-blend-multiply"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`,
          }}
        />

        {/* New label badges */}
        {showNewLabel && (pro.newReviewsCount || pro.justBecameAvailable) && (
          <div className="absolute top-6 right-3 z-10 flex flex-col gap-1">
            {pro.newReviewsCount && pro.newReviewsCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#B2FBA5] text-xs font-semibold text-black/80 animate-pulse">
                +{pro.newReviewsCount} Review
              </span>
            )}
            {pro.justBecameAvailable && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#B2FBA5] text-xs font-semibold text-black/80 animate-pulse">
                Available Now
              </span>
            )}
          </div>
        )}

        {/* Pro photo */}
        <div className="relative w-full aspect-[4/3] rounded-md overflow-hidden bg-[#F5F5F5] mb-3">
          {pro.photoUrl ? (
            <Image
              src={pro.photoUrl}
              alt=""
              fill
              className="object-cover"
              sizes="280px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-black/30">
              {getInitials(pro.displayName)}
            </div>
          )}
        </div>

        {/* Content */}
        <h3 className="font-semibold text-base text-[#111] leading-tight mb-1">
          {pro.displayName}
        </h3>
        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-[#EBEBEB] text-black/70 mb-2">
          {pro.primaryCategory}
        </span>

        <div className="flex items-center gap-1.5 mb-1">
          {hasReviews ? (
            <>
              <span className="text-amber-500 text-sm">⭐</span>
              <span className="text-sm font-medium text-[#111]">{(pro.avgRating ?? pro.rating ?? 0).toFixed(1)}</span>
              <span className="text-xs text-black/50">({pro.reviewsCount} reviews)</span>
            </>
          ) : (
            <span className="text-xs text-black/50">No reviews yet</span>
          )}
        </div>

        <div className="mb-2 grid grid-cols-1 gap-1 text-[11px] text-black/60">
          {pro.idVerified === true ? <span>ID Verified</span> : null}
          <span>{jobsCompleted > 0 ? `${jobsCompleted} jobs completed` : 'New on Flyers Up'}</span>
          {hasResponseTime ? <span>Responds in ~{Math.max(1, Math.round(pro.avgResponseMinutes ?? 0))} min</span> : null}
        </div>

        {pro.location && (
          <div className="flex items-center gap-1 text-xs text-black/60 mb-1">
            <MapPin size={12} className="shrink-0" />
            <span>{pro.location}</span>
          </div>
        )}

        <p className="text-sm font-medium text-[#111] mb-1">{priceStr}</p>
        <p className="text-xs text-black/60">{availabilityStatus}</p>
      </Link>
    </article>
  );
}
