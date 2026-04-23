'use client';

import Image from 'next/image';
import { SlidersHorizontal, Star } from 'lucide-react';
import type { HybridFeaturedPro } from '@/lib/hybrid-ui/types';
import { cn } from '@/lib/cn';

export interface HybridProCardProps {
  pro: HybridFeaturedPro;
  className?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Featured pro card for STRONG occupation state (mockup-aligned). */
export function HybridProCard({ pro, className }: HybridProCardProps) {
  const letter = pro.initials ?? initials(pro.name);

  return (
    <article
      className={cn(
        'overflow-hidden rounded-3xl border border-border bg-surface p-4 shadow-[var(--shadow-md)]',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-[hsl(var(--trust))]/20 bg-surface2">
          {pro.avatarUrl ? (
            <Image src={pro.avatarUrl} alt="" width={64} height={64} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[hsl(var(--trust))]">
              {letter}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-[hsl(var(--trust))]">{pro.name}</h3>
          {pro.specialistLabel ? (
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800/90">{pro.specialistLabel}</p>
          ) : (
            <p className="mt-0.5 text-xs capitalize text-text-3">{pro.descriptor}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 font-semibold text-text">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-hidden />
              {pro.rating.toFixed(1)}
            </span>
            <span className="text-xs text-text-3">({pro.jobsLabel})</span>
          </div>
        </div>
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(33_100%_94%)] text-amber-900 ring-1 ring-amber-200/80"
          aria-label="Filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
