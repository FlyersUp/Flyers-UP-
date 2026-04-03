'use client';

import Link from 'next/link';
import { ChevronRight, Star, Zap, DollarSign, Users } from 'lucide-react';
import { getOccupationIcon } from '@/lib/occupationIcons';
import type { TopPickBadge } from '@/lib/occupations/presentation';

export interface OccupationCardProps {
  name: string;
  slug: string;
  icon?: string | null;
  featured?: boolean;
  countServices?: number;
  subtitle?: string;
  prosNearby?: string;
  fromPrice?: string;
  fastestArrival?: string;
  /** UI-only: new design fields */
  rating?: number;
  jobsCount?: number;
  availabilityMins?: number;
  fromPriceNum?: number;
  prosCount?: number;
  badge?: TopPickBadge;
}

function BadgePill({ label, variant }: { label: TopPickBadge; variant: 'popular' | 'fast' | 'value' }) {
  const styles = {
    popular: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
    fast: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200',
    value: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${styles[variant]}`}
    >
      {label}
    </span>
  );
}

export function OccupationCard({
  name,
  slug,
  countServices,
  subtitle,
  prosNearby,
  fromPrice,
  fastestArrival,
  rating,
  jobsCount,
  availabilityMins,
  fromPriceNum,
  prosCount,
  badge,
}: OccupationCardProps) {
  const IconComponent = getOccupationIcon(slug);
  const subtext = subtitle ?? (countServices != null ? `${countServices} pros` : 'Browse pros');
  const displayPrice = fromPriceNum != null ? fromPriceNum : fromPrice;
  const displayPros = prosNearby ?? (prosCount != null ? `${prosCount} pros nearby` : undefined);
  const hasStats = displayPrice ?? displayPros ?? fastestArrival ?? rating ?? jobsCount ?? availabilityMins;

  const badgeVariant = badge === 'Popular' ? 'popular' : badge === 'Fast' ? 'fast' : 'value';

  return (
    <Link
      href={`/occupations/${slug}`}
      className="group relative block overflow-hidden rounded-2xl border border-border bg-[hsl(var(--card-neutral))] p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:scale-[1.02] hover:border-[hsl(var(--accent-customer)/0.5)] hover:shadow-[0_4px_20px_rgba(156,167,100,0.15)] active:scale-[0.99]"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[rgba(156,167,100,0.08)] blur-xl"
        aria-hidden
      />
      <div className="relative flex min-w-0 items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(156,167,100,0.18)]">
          <IconComponent
            className="h-6 w-6 text-[#111111] dark:text-[#F5F7FA]"
            strokeWidth={1.75}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
            <span className="min-w-0 max-w-full font-semibold text-text text-[15px] leading-tight line-clamp-2 break-words">
              {name}
            </span>
            {badge ? (
              <span className="shrink-0 self-center">
                <BadgePill label={badge} variant={badgeVariant} />
              </span>
            ) : null}
          </div>
          {rating != null && jobsCount != null && (
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-amber-600 dark:text-amber-500">
              <Star className="h-3.5 w-3.5 shrink-0 fill-current" strokeWidth={0} />
              <span className="text-xs font-medium">{rating.toFixed(1)}</span>
              <span className="min-w-0 truncate text-[11px] text-muted">({jobsCount} jobs)</span>
            </div>
          )}
          <div className="mt-2 min-w-0 space-y-1">
            {availabilityMins != null && (
              <div className="flex min-w-0 items-start gap-1.5 text-xs text-text2">
                <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={2} />
                <span className="min-w-0 break-words">Available in {availabilityMins} min</span>
              </div>
            )}
            {(fromPriceNum != null || fromPrice) && (
              <div className="flex min-w-0 items-start gap-1.5 text-xs text-text2">
                <DollarSign className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text2" strokeWidth={2} />
                <span className="min-w-0 break-words">
                  {typeof displayPrice === 'number' ? `From $${displayPrice}` : displayPrice}
                </span>
              </div>
            )}
            {(displayPros || prosCount != null) && (
              <div className="flex min-w-0 items-start gap-1.5 text-xs text-text2">
                <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text2" strokeWidth={2} />
                <span className="min-w-0 break-words">{displayPros ?? `${prosCount} pros nearby`}</span>
              </div>
            )}
          </div>
          {hasStats && !rating && !availabilityMins && fromPriceNum == null && prosCount == null && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-text3">
              {prosNearby && <span>{prosNearby}</span>}
              {fromPrice && <span>{fromPrice}</span>}
              {fastestArrival && <span>{fastestArrival}</span>}
            </div>
          )}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-text3 transition-colors group-hover:text-[hsl(var(--accent-customer))]" />
      </div>
    </Link>
  );
}
