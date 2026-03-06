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
  icon,
  countServices,
  subtitle,
}: OccupationCardProps) {
  const IconComponent = getOccupationIcon(slug);

  return (
    <Link
      href={`/occupations/${slug}`}
      className="group flex items-center gap-4 rounded-2xl bg-white border border-black/5 p-5 shadow-[0_10px_25px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(0,0,0,0.08)]"
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-zinc-100 border border-black/5 flex items-center justify-center">
        <IconComponent className="w-6 h-6 text-zinc-700" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-zinc-900 truncate">{name}</div>
        <div className="text-sm text-zinc-500 truncate">
          {subtitle ?? (countServices != null ? `${countServices} services` : 'Browse pros near you')}
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-zinc-400 flex-shrink-0 group-hover:text-zinc-600 transition-colors" />
    </Link>
  );
}
