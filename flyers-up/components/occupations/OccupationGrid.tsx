'use client';

import { OccupationCard } from './OccupationCard';
import { getOccupationPresentation, getTopPickBadge } from '@/lib/occupations/presentation';

export type Occupation = {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  featured?: boolean;
  countServices?: number;
};

interface OccupationGridProps {
  occupations: Occupation[];
  variant: 'featured' | 'all' | 'topPicks';
  /** When variant=topPicks, show badges */
  showBadges?: boolean;
}

export function OccupationGrid({
  occupations,
  variant,
  showBadges = variant === 'topPicks',
}: OccupationGridProps) {
  const items = variant === 'featured' ? occupations.slice(0, 5) : occupations;

  return (
    <div
      className={
        variant === 'topPicks'
          ? 'flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide'
          : 'grid grid-cols-1 gap-4 sm:grid-cols-2'
      }
    >
      {items.map((occ, i) => {
        const pres = getOccupationPresentation(occ.slug, i);
        const badge = showBadges ? getTopPickBadge(i) : undefined;
        return (
          <div
            key={occ.id}
            className={
              variant === 'topPicks'
                ? 'w-[min(280px,85vw)] shrink-0 snap-start'
                : undefined
            }
          >
            <OccupationCard
              name={occ.name}
              slug={occ.slug}
              icon={occ.icon}
              featured={occ.featured}
              countServices={occ.countServices}
              subtitle={variant === 'featured' ? 'Browse pros near you' : undefined}
              rating={pres.rating}
              jobsCount={pres.jobs}
              availabilityMins={pres.availability}
              fromPriceNum={pres.fromPrice}
              prosCount={pres.pros}
              badge={badge}
            />
          </div>
        );
      })}
    </div>
  );
}
