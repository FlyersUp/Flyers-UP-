/**
 * Human-readable pricing insights (no platform fee / margin surfacing).
 */

import { getSuggestedPriceCents } from '@/lib/pricing/suggestions';
import type { PricingInsight, ProDashboardMetrics } from '@/lib/pro-dashboard/types';

/** Reference “typical” one-hour job value for the occupation (cents), for comparisons only. */
function referenceOneHourJobValueCents(occupationSlug: string | null): number | null {
  if (!occupationSlug?.trim()) return null;
  return getSuggestedPriceCents({
    occupationSlug: occupationSlug.trim(),
    estimatedDurationMinutes: 60,
  });
}

function isEarningsPerHourLow(
  metrics: ProDashboardMetrics,
  referenceCents: number | null
): boolean {
  if (metrics.earningsPerHourCents == null || metrics.earningsPerHourCents <= 0) return false;
  if (referenceCents == null || referenceCents <= 0) return false;
  return metrics.earningsPerHourCents < referenceCents * 0.72;
}

export function getPricingInsights(
  metrics: ProDashboardMetrics,
  context: { occupationSlug: string | null }
): PricingInsight[] {
  const insights: PricingInsight[] = [];
  const ref = referenceOneHourJobValueCents(context.occupationSlug);

  if (isEarningsPerHourLow(metrics, ref)) {
    insights.push({
      type: 'opportunity',
      message: 'You could earn more by increasing your prices slightly.',
    });
  }

  if (metrics.belowSuggestionRate != null && metrics.belowSuggestionRate > 0.5) {
    insights.push({
      type: 'warning',
      message: 'Many of your jobs are priced below suggested levels.',
    });
  }

  if (
    metrics.avgJobValueCents != null &&
    ref != null &&
    metrics.avgJobValueCents < ref * 0.85
  ) {
    insights.push({
      type: 'opportunity',
      message: 'Your job values are lower than typical for your category.',
    });
  }

  if (metrics.winRate != null && metrics.winRate < 0.4) {
    insights.push({
      type: 'warning',
      message: 'Your pricing or response speed may be affecting acceptance.',
    });
  }

  if (
    metrics.winRate != null &&
    metrics.winRate >= 0.65 &&
    metrics.belowSuggestionRate != null &&
    metrics.belowSuggestionRate > 0.45
  ) {
    insights.push({
      type: 'opportunity',
      message: 'You may be underpricing. Try increasing by about 10–15%.',
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'info',
      message: 'Keep completing jobs — we’ll surface more tips as your history grows.',
    });
  }

  return insights;
}
