'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getOccupationIcon } from '@/lib/occupationIcons';

export interface OccupationCardProps {
  name: string;
  slug: string;
  icon?: string | null;
  featured?: boolean;
  countServices?: number;
  subtitle?: string;
  /** e.g. "32 pros nearby" */
  prosNearby?: string;
  /** e.g. "From $40" */
  fromPrice?: string;
  /** e.g. "Fastest arrival: 45 min" */
  fastestArrival?: string;
}

export function OccupationCard({
  name,
  slug,
  countServices,
  subtitle,
  prosNearby,
  fromPrice,
  fastestArrival,
}: OccupationCardProps) {
  const IconComponent = getOccupationIcon(slug);
  const subtext = subtitle ?? (countServices != null ? `${countServices} pros` : 'Browse pros');
  const hasStats = prosNearby ?? fromPrice ?? fastestArrival;

  return (
    <Link
      href={`/occupations/${slug}`}
      className="group card-hover btn-press flex items-center gap-3 rounded-2xl border border-border bg-[hsl(var(--card-neutral))] p-4 shadow-[var(--shadow-card)] transition-all duration-[200ms] hover:-translate-y-1 hover:border-[hsl(var(--accent-customer)/0.4)] hover:bg-[hsl(var(--accent-customer)/0.08)] active:border-[hsl(var(--accent-customer)/0.4)] active:bg-[hsl(var(--accent-customer)/0.1)]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface2">
        <IconComponent className="w-5 h-5 text-text3" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <div className="font-medium text-text text-[15px] leading-snug line-clamp-2">
          {name}
        </div>
        <div className="text-xs text-text3 mt-0.5">
          {subtext}
        </div>
        {hasStats && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-text3">
            {prosNearby && <span>{prosNearby}</span>}
            {fromPrice && <span>{fromPrice}</span>}
            {fastestArrival && <span>{fastestArrival}</span>}
          </div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-text3 transition-colors group-hover:text-text2" />
    </Link>
  );
}
