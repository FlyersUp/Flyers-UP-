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
      className="group flex items-center gap-3 rounded-2xl bg-white border border-black/5 p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="flex-shrink-0 w-11 h-11 rounded-full bg-zinc-100/80 border border-black/5 flex items-center justify-center">
        <IconComponent className="w-5 h-5 text-zinc-600" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <div className="font-medium text-zinc-900 text-[15px] leading-snug line-clamp-2">
          {name}
        </div>
        <div className="text-xs text-zinc-500 mt-0.5">
          {subtitle ?? (countServices != null ? `${countServices} pros` : 'Browse pros')}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-300 flex-shrink-0 group-hover:text-zinc-500 transition-colors" />
    </Link>
  );
}
