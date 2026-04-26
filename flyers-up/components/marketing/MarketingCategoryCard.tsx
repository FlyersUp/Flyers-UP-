import Link from 'next/link';
import { cn } from '@/lib/cn';
import { getOccupationIcon } from '@/lib/occupationIcons';
import { MarketingCard } from '@/components/marketing/ui/Card';
import { MarketingVerifiedBadge } from '@/components/marketing/ui/Badge';

export function MarketingCategoryCard({
  name,
  slug,
  subtext,
  className,
}: {
  name: string;
  slug: string;
  subtext?: string;
  className?: string;
}) {
  const Icon = getOccupationIcon(slug);

  return (
    <Link href={`/occupations/${slug}`} className={cn('group block h-full', className)}>
      <MarketingCard
        hover
        className="h-full border-market-line/90 bg-white shadow-[0_4px_20px_rgba(45,52,54,0.07)] transition-shadow duration-200 group-hover:border-market-slate/25 group-hover:shadow-[0_12px_32px_rgba(74,105,189,0.1)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="rounded-xl bg-market-cloud p-3 text-market-slate ring-1 ring-market-line">
            <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </div>
          <MarketingVerifiedBadge />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-market-slate">{name}</h3>
        <p className="mt-1 text-sm leading-relaxed text-market-charcoal">
          {subtext ?? 'ID verified profiles, jobs completed on Flyers Up, and real customer reviews.'}
        </p>
      </MarketingCard>
    </Link>
  );
}
