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
}

export function OccupationCard({
  name,
  slug,
  countServices,
  subtitle,
}: OccupationCardProps) {
  const IconComponent = getOccupationIcon(slug);

  return (
    <Link
      href={`/occupations/${slug}`}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-borderStrong hover:shadow-[var(--shadow-card-hover)]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface2">
        <IconComponent className="w-5 h-5 text-text3" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <div className="font-medium text-text text-[15px] leading-snug line-clamp-2">
          {name}
        </div>
        <div className="text-xs text-text3 mt-0.5">
          {subtitle ?? (countServices != null ? `${countServices} pros` : 'Browse pros')}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-text3 transition-colors group-hover:text-text2" />
    </Link>
  );
}
