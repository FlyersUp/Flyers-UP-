'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Star } from 'lucide-react';
import type { FlyWallEntry } from '@/lib/flyWall';
import { formatCompletedAgo } from '@/lib/formatRelativeTime';

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

export function FlyWallJobCard({
  entry,
  profileHref,
  rotation = 0,
}: {
  entry: FlyWallEntry;
  profileHref: string;
  rotation?: number;
}) {
  const before = entry.beforePhotoUrls.slice(0, 1)[0] ?? null;
  const after = entry.afterPhotoUrls.slice(0, 1)[0] ?? null;
  const hasProof = Boolean(before || after);
  const completedLabel = formatCompletedAgo(entry.completedAt);

  return (
    <article
      className="group relative w-full max-w-[340px] justify-self-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
      style={{
        transform: `rotate(${rotation}deg)`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
      }}
    >
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
        <div className="w-4 h-4 rounded-full bg-[#8B7355] shadow-md border-2 border-[#6B5344]" />
      </div>

      <div
        className="relative rounded-2xl overflow-hidden bg-white border border-black/5 shadow-sm pt-5 transition-all duration-300"
        style={{
          boxShadow: '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04] rounded-2xl mix-blend-multiply"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`,
          }}
        />

        {hasProof ? (
          <div className="grid grid-cols-2 gap-0.5 px-3">
            <div className="relative aspect-square bg-[#F5F5F5] overflow-hidden">
              {before ? (
                <Image src={before} alt="" fill className="object-cover" sizes="170px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-black/35 px-2 text-center">
                  Before (scope photo)
                </div>
              )}
              <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 rounded">Before</span>
            </div>
            <div className="relative aspect-square bg-[#F5F5F5] overflow-hidden">
              {after ? (
                <Image src={after} alt="" fill className="object-cover" sizes="170px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-black/35 px-2 text-center">
                  After
                </div>
              )}
              <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 rounded">After</span>
            </div>
          </div>
        ) : (
          <div className="px-3">
            <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden bg-[#F5F5F5]">
              {entry.proAvatarUrl ? (
                <Image src={entry.proAvatarUrl} alt="" fill className="object-cover" sizes="340px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-black/25">
                  {getInitials(entry.proDisplayName)}
                </div>
              )}
            </div>
          </div>
        )}

        <Link href={profileHref} className="block p-4 pt-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-base text-[#111] leading-tight">{entry.proDisplayName}</h3>
            {entry.showPerfectRatingBadge && (
              <span
                className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full"
                title="Perfect rating on this job"
              >
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" aria-hidden />
                5.0
              </span>
            )}
          </div>

          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-[#EBEBEB] text-black/70 mb-2">
            {entry.categoryName}
          </span>

          <div className="flex items-center gap-1 text-xs text-black/60 mb-2">
            <MapPin size={12} className="shrink-0" aria-hidden />
            <span>{entry.neighborhoodLabel}</span>
          </div>

          <p className="text-xs text-black/50 mb-2">{completedLabel}</p>

          {entry.customerRating != null && (
            <div className="flex items-center gap-1 text-sm text-[#111]">
              <span className="text-amber-500" aria-hidden>
                ★
              </span>
              <span className="font-medium">{Number(entry.customerRating).toFixed(1)}</span>
              <span className="text-xs text-black/50">customer rating</span>
            </div>
          )}
        </Link>
      </div>
    </article>
  );
}
