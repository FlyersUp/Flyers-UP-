'use client';

import { OccupationCard } from './OccupationCard';

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
  variant: 'featured' | 'all';
}

export function OccupationGrid({ occupations, variant }: OccupationGridProps) {
  const items = variant === 'featured' ? occupations.slice(0, 5) : occupations;

  return (
    <div
      className={
        variant === 'featured'
          ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
          : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'
      }
    >
      {items.map((occ) => (
        <OccupationCard
          key={occ.id}
          name={occ.name}
          slug={occ.slug}
          icon={occ.icon}
          featured={occ.featured}
          countServices={occ.countServices}
          subtitle={variant === 'featured' ? 'Browse pros near you' : undefined}
        />
      ))}
    </div>
  );
}
