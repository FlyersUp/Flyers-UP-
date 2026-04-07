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
  layout = 'grid',
}: {
  name: string;
  slug: string;
  subtext?: string;
  className?: string;
  /** `strip`: horizontal browse row (landing) — compact card, soft icon well. */
  layout?: 'grid' | 'strip';
}) {
  const Icon = getOccupationIcon(slug);
  const isStrip = layout === 'strip';

  return (
    <Link href={`/occupations/${slug}`} className={cn('group block h-full', className)}>
      <MarketingCard
        hover
        className={cn(
          'h-full border-market-line/90 bg-white shadow-[0_4px_20px_rgba(45,52,54,0.07)] transition-shadow duration-200 group-hover:border-market-slate/25 group-hover:shadow-[0_12px_32px_rgba(74,105,189,0.1)]',
          isStrip && '!p-5 text-center'
        )}
      >
        <div className={cn('flex items-start gap-3', isStrip ? 'flex-col items-center' : 'justify-between')}>
          <div
            className={cn(
              'text-market-slate',
              isStrip
                ? 'flex items-center justify-center rounded-full bg-blue-50 p-4'
                : 'rounded-xl bg-market-cloud p-3 ring-1 ring-market-line'
            )}
          >
            <Icon className={cn('shrink-0', isStrip ? 'h-7 w-7' : 'h-6 w-6')} strokeWidth={1.75} aria-hidden />
          </div>
          {isStrip ? null : <MarketingVerifiedBadge />}
        </div>
        <h3 className="mt-4 text-lg font-semibold text-market-slate">{name}</h3>
        <p className="mt-1 text-sm leading-relaxed text-market-charcoal">
          {subtext ?? 'Verified pros. Clear pricing.'}
        </p>
      </MarketingCard>
    </Link>
  );
}
