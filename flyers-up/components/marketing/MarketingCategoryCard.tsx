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
        className="h-full border-market-line bg-market-cloud transition-shadow duration-200 group-hover:border-market-slate/15"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="rounded-xl bg-market-linen p-3 text-market-slate ring-1 ring-market-line/70">
            <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </div>
          <MarketingVerifiedBadge />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-market-slate">{name}</h3>
        <p className="mt-1 text-sm leading-relaxed text-market-charcoal/80">
          {subtext ?? 'Verified pros. Clear pricing.'}
        </p>
      </MarketingCard>
    </Link>
  );
}
