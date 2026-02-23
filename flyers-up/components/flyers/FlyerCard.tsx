'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useEffect, useState } from 'react';
import { seededTilt, seededOffset, formatDistance } from './flyerStyles';

export type FlyerPro = {
  id: string;
  displayName: string;
  photoUrl?: string | null;
  primaryCategory: string;
  rating: number | null;
  reviewsCount: number | null;
  tagline: string | null;
  availability: string | null;
  serviceRadiusMiles?: number | null;
  serviceRadius?: number | null;
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

  const tilt = useMemo(() => (prefersReducedMotion ? 0 : seededTilt(pro.id)), [pro.id, prefersReducedMotion]);
  const offset = useMemo(() => (prefersReducedMotion ? 0 : seededOffset(pro.id)), [pro.id, prefersReducedMotion]);

  const distanceStr = formatDistance({
    serviceRadius: pro.serviceRadius ?? pro.serviceRadiusMiles,
    serviceRadiusMiles: pro.serviceRadiusMiles ?? pro.serviceRadius,
  });

  return (
    <div
      className="block group"
      style={{
        transform: prefersReducedMotion ? undefined : `rotate(${tilt}deg) translateY(${offset}px)`,
      }}
    >
      <article
        className="relative bg-[#F6F1E8] rounded-lg border border-[rgba(0,0,0,0.06)] shadow-[0_1px_0_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.04)] transition-shadow duration-200 group-hover:shadow-[0_1px_0_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.05)] group-focus-within:shadow-[0_1px_0_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.05)] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent dark:bg-[#2a2824] dark:border-[rgba(255,255,255,0.06)]"
        style={{
          transition: prefersReducedMotion ? 'none' : 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {/* Pin at top */}
        <div
          className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#9ca3af] dark:bg-[#6b7280] border border-[rgba(0,0,0,0.1)] shadow-sm z-10"
          aria-hidden
        />

        <div className="pt-4 px-4 pb-0">
          {/* Card body - clickable to profile */}
          <Link href={profileHref} className="block -m-4 p-4 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
            {/* Photo */}
            <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-surface2 mb-3">
              {pro.photoUrl ? (
                <Image
                  src={pro.photoUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-muted bg-surface2">
                  {getInitials(pro.displayName)}
                </div>
              )}
            </div>

            {/* Name */}
            <h3 className="font-semibold text-text text-base mb-1">{pro.displayName}</h3>

            {/* Category pill */}
            <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-surface2 text-muted mb-2">
              {pro.primaryCategory}
            </span>

            {/* Rating */}
            <div className="flex items-center gap-1.5 mb-2">
              {pro.rating != null && pro.reviewsCount != null && pro.reviewsCount > 0 ? (
                <>
                  <span className="text-warning text-sm">★</span>
                  <span className="text-sm font-medium text-text">{pro.rating.toFixed(1)}</span>
                  <span className="text-xs text-muted">({pro.reviewsCount})</span>
                </>
              ) : (
                <span className="text-xs font-medium text-muted px-2 py-0.5 rounded bg-surface2">New</span>
              )}
            </div>

            {/* Tagline */}
            <p className="text-sm text-muted line-clamp-2 mb-2 min-h-[2.5rem]">
              {pro.tagline || `${pro.primaryCategory} professional. Message to learn more.`}
            </p>

            {/* Availability */}
            <div className="text-xs text-muted bg-surface2/60 dark:bg-surface2/40 rounded px-2 py-1.5 mb-3">
              {pro.availability || 'Hours vary — message to confirm'}
            </div>

            {/* Distance */}
            <p className="text-xs text-muted mb-4">{distanceStr}</p>
          </Link>
        </div>

        {/* CTAs - tear-tab style */}
        <div className="flex border-t border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
          <Link
            href={bookHref}
            className="flex-1 py-3 text-center text-sm font-semibold text-accent hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent border-r border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] transition-colors"
          >
            Book
          </Link>
          <Link
            href={messageHref}
            className="flex-1 py-3 text-center text-sm font-semibold text-accent hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent transition-colors"
          >
            Message
          </Link>
        </div>
      </article>
    </div>
  );
}
