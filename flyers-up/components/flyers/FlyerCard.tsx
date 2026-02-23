'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { formatTagline, formatAvailability, formatDistance } from './flyerStyles';

export type FlyerPro = {
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

interface FlyerCardProps {
  pro: FlyerPro;
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

export function FlyerCard({ pro, profileHref, bookHref, messageHref }: FlyerCardProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const taglineStr = formatTagline(pro);
  const availabilityStr = formatAvailability(pro.availability);
  const distanceStr = formatDistance({
    serviceRadius: pro.serviceRadius ?? pro.serviceRadiusMiles,
    serviceRadiusMiles: pro.serviceRadiusMiles ?? pro.serviceRadius,
    maxDistanceMinutes: pro.maxDistanceMinutes,
  });

  return (
    <article
      className={`w-full max-w-[480px] justify-self-center bg-[#F6F1E8] border border-black/10 rounded-2xl shadow-sm transition-all duration-200 group ${
        prefersReducedMotion ? '' : 'hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      <Link href={profileHref} className="block p-4 rounded-2xl hover:bg-black/[0.02] transition-colors">
        {/* Top row: avatar, name, category pill */}
        <div className="flex items-start gap-3 mb-3">
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full overflow-hidden bg-[rgba(0,0,0,0.06)]">
            {pro.photoUrl ? (
              <Image
                src={pro.photoUrl}
                alt=""
                fill
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-base font-semibold text-[rgba(0,0,0,0.6)]">
                {getInitials(pro.displayName)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[#111] text-base sm:text-lg leading-tight">{pro.displayName}</h3>
            <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.6)] mt-1">
              {pro.primaryCategory}
            </span>
          </div>
        </div>

        {/* Rating row */}
        <div className="flex items-center gap-1.5 mb-2">
          {pro.rating != null && pro.reviewsCount != null && pro.reviewsCount > 0 ? (
            <>
              <span className="text-amber-500 text-sm">★</span>
              <span className="text-sm font-medium text-[#111]">{pro.rating.toFixed(1)}</span>
              <span className="text-xs text-[rgba(0,0,0,0.6)]">({pro.reviewsCount})</span>
            </>
          ) : (
            <span className="text-xs font-medium text-[rgba(0,0,0,0.6)] px-2 py-0.5 rounded bg-[rgba(0,0,0,0.06)]">
              New
            </span>
          )}
        </div>

        {/* Tagline - 1 line clamp */}
        <p className="text-sm text-[rgba(0,0,0,0.6)] line-clamp-1 mb-2">{taglineStr}</p>

        {/* Availability - formatted, never JSON */}
        <p className="text-xs text-[rgba(0,0,0,0.6)] mb-2">{availabilityStr}</p>

        {/* Distance */}
        <p className="text-xs text-[rgba(0,0,0,0.6)]">{distanceStr}</p>
      </Link>

      {/* CTAs - compact, stopPropagation */}
      <div className="flex border-t border-black/10 px-4 py-3 gap-3">
        <Link
          href={bookHref}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 h-9 flex items-center justify-center rounded-lg text-sm font-semibold bg-accent text-accentContrast hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-colors"
        >
          Book
        </Link>
        <Link
          href={messageHref}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 h-9 flex items-center justify-center rounded-lg text-sm font-semibold border border-black/10 text-[#111] hover:bg-black/[0.04] focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2 transition-colors"
        >
          Message
        </Link>
      </div>
    </article>
  );
}
