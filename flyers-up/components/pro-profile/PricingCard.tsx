'use client';

import type { ProPricingInfo } from '@/lib/profileData';

interface PricingCardProps {
  pricing: ProPricingInfo;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PricingCard({ pricing }: PricingCardProps) {
  const hasStarting = pricing.startingPrice != null && pricing.startingPrice > 0;
  const hasHourly = pricing.hourlyRate != null && pricing.hourlyRate > 0;
  const hasMinHours = pricing.minHours != null && pricing.minHours > 0;
  const hasTravel = pricing.travelFeeEnabled;

  if (!hasStarting && !hasHourly) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Pricing</h3>
        <p className="mt-2 text-sm text-muted">Pricing not provided yet.</p>
      </div>
    );
  }

  const lines: string[] = [];
  if (hasStarting) lines.push(`Starting at ${formatCurrency(pricing.startingPrice!)}`);
  if (hasHourly) lines.push(`${formatCurrency(pricing.hourlyRate!)}/hr`);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Pricing</h3>
      <div className="mt-2 space-y-1">
        <p className="text-base font-semibold text-text">
          {lines.join(' • ')}
        </p>
        {hasMinHours && (
          <p className="text-sm text-muted">Minimum {pricing.minHours} hours</p>
        )}
        {hasTravel && (
          <p className="text-sm text-muted">
            Travel fee may apply
            {pricing.travelFreeWithinMiles != null && pricing.travelFreeWithinMiles > 0
              ? ` (free within ${pricing.travelFreeWithinMiles} mi)`
              : ''}
          </p>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">Exact total shown at checkout.</p>
    </div>
  );
}
