'use client';

import { ProtectedFlyersUpBadge } from '@/components/retention/ProtectedFlyersUpBadge';
import { cn } from '@/lib/cn';

export type StayOnPlatformTrustVariant = 'compact' | 'comfortable';

/**
 * Warm, informational copy — reinforces platform value without sounding punitive.
 */
export function StayOnPlatformTrustCallout({
  variant = 'comfortable',
  className = '',
  showBadge = true,
}: {
  variant?: StayOnPlatformTrustVariant;
  className?: string;
  showBadge?: boolean;
}) {
  const isCompact = variant === 'compact';
  return (
    <div
      className={cn(
        'rounded-2xl border border-sky-200/45 bg-sky-50/70 dark:border-sky-800/35 dark:bg-sky-950/25 text-left',
        isCompact ? 'px-3 py-3' : 'px-4 py-4',
        className
      )}
      role="region"
      aria-label="Why booking through Flyers Up helps you"
    >
      {showBadge ? (
        <div className="mb-2">
          <ProtectedFlyersUpBadge />
        </div>
      ) : null}
      <p
        className={cn(
          'font-medium text-[#111111] dark:text-[#F5F7FA]',
          isCompact ? 'text-xs' : 'text-sm'
        )}
      >
        When you keep bookings here, you keep the full experience
      </p>
      <ul
        className={cn(
          'mt-2 space-y-1.5 text-[#4b5563] dark:text-sky-100/85 list-disc pl-4',
          isCompact ? 'text-[11px] leading-snug' : 'text-xs leading-relaxed'
        )}
      >
        <li>Payments and refunds are tracked with clear receipts.</li>
        <li>Support can step in fairly if something doesn&apos;t go as planned.</li>
        <li>Your job history stays in one place — easier to book the same pro again.</li>
        <li>Pros are verified to work through Flyers Up.</li>
      </ul>
    </div>
  );
}
