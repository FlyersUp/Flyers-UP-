'use client';

/**
 * Services + Pricing — Stripe-style clarity
 * Combined section with clear hierarchy
 */

import type { ProPricingInfo } from '@/lib/profileData';
import type { PublicProProfileModel } from '@/lib/profileData';

interface ServicesAndPricingSectionProps {
  profile: PublicProProfileModel;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ServicesAndPricingSection({ profile }: ServicesAndPricingSectionProps) {
  const { pricing, services } = profile;
  const hasStarting = pricing.startingPrice != null && pricing.startingPrice > 0;
  const hasHourly = pricing.hourlyRate != null && pricing.hourlyRate > 0;
  const hasMinHours = pricing.minHours != null && pricing.minHours > 0;
  const hasTravel = pricing.travelFeeEnabled;
  const hasServices = Array.isArray(services) && services.length > 0;

  const lines: string[] = [];
  if (hasStarting) lines.push(`From ${formatCurrency(pricing.startingPrice!)}`);
  if (hasHourly) lines.push(`${formatCurrency(pricing.hourlyRate!)}/hr`);

  return (
    <div className="rounded-2xl border border-black/6 dark:border-white/10 bg-white dark:bg-[#1D2128] shadow-sm shadow-black/5 dark:shadow-black/20 overflow-hidden">
      <div className="border-b border-black/5 dark:border-white/10 px-5 py-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6A6A6A] dark:text-[#A1A8B3]">
          Services & pricing
        </h3>
        {lines.length > 0 ? (
          <div className="mt-3 space-y-1">
            <p className="text-lg font-semibold text-[#111111] dark:text-[#F5F7FA]">
              {lines.join(' • ')}
            </p>
            {hasMinHours && (
              <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
                Minimum {pricing.minHours} hours
              </p>
            )}
            {hasTravel && (
              <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
                Travel fee may apply
                {pricing.travelFreeWithinMiles != null && pricing.travelFreeWithinMiles > 0
                  ? ` (free within ${pricing.travelFreeWithinMiles} mi)`
                  : ''}
              </p>
            )}
            <p className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3] mt-1">
              Exact total shown at checkout.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
            Pricing available when you book.
          </p>
        )}
      </div>

      {hasServices && (
        <div className="divide-y divide-black/5 dark:divide-white/10">
          {services.slice(0, 5).map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-5 py-3">
              <span className="text-sm font-medium text-[#111111] dark:text-[#F5F7FA]">
                {s.name}
              </span>
              {s.startingFromPrice != null && s.startingFromPrice > 0 ? (
                <span className="text-sm font-semibold text-[#111111] dark:text-[#F5F7FA]">
                  {formatCurrency(s.startingFromPrice)}
                  {s.durationRange ? (
                    <span className="ml-1 font-normal text-[#6A6A6A] dark:text-[#A1A8B3]">
                      {s.durationRange}
                    </span>
                  ) : null}
                </span>
              ) : (
                <span className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">—</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
