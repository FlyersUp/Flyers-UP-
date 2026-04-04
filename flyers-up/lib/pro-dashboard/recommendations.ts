/**
 * Single headline price adjustment suggestion derived from dashboard metrics.
 */

import { getSuggestedPriceCents } from '@/lib/pricing/suggestions';
import type { PriceAdjustmentSuggestion, ProDashboardMetrics } from '@/lib/pro-dashboard/types';

function referenceOneHourJobValueCents(occupationSlug: string | null): number | null {
  if (!occupationSlug?.trim()) return null;
  return getSuggestedPriceCents({
    occupationSlug: occupationSlug.trim(),
    estimatedDurationMinutes: 60,
  });
}

function earningsPerHourLow(metrics: ProDashboardMetrics, ref: number | null): boolean {
  if (metrics.earningsPerHourCents == null || metrics.earningsPerHourCents <= 0) return false;
  if (ref == null || ref <= 0) return false;
  return metrics.earningsPerHourCents < ref * 0.72;
}

export function getPriceAdjustmentSuggestion(
  metrics: ProDashboardMetrics,
  context: { occupationSlug: string | null }
): PriceAdjustmentSuggestion {
  const ref = referenceOneHourJobValueCents(context.occupationSlug);

  if (metrics.belowSuggestionRate != null && metrics.belowSuggestionRate > 0.5) {
    return {
      adjustmentPercent: 0,
      reason:
        'Your listed prices are often under our guidance. Try aligning your starting price closer to the suggestion on your pricing page.',
    };
  }

  if (
    metrics.winRate != null &&
    metrics.winRate > 0.7 &&
    earningsPerHourLow(metrics, ref)
  ) {
    return {
      adjustmentPercent: 15,
      reason:
        'Demand for your time looks strong, but hourly earnings are on the low side. A moderate increase is less likely to hurt bookings.',
    };
  }

  if (metrics.winRate != null && metrics.winRate < 0.4) {
    return {
      adjustmentPercent: -7,
      reason:
        'Win rate is soft. A slightly lower starting price can help you win more jobs while you build reviews.',
    };
  }

  if (earningsPerHourLow(metrics, ref)) {
    return {
      adjustmentPercent: 10,
      reason: 'A small price increase may improve earnings without big changes to how you work.',
    };
  }

  return {
    adjustmentPercent: 0,
    reason: 'No major change needed right now. Check back after more completed jobs.',
  };
}
