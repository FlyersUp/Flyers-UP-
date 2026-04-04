/**
 * Smart Pricing Dashboard — shared types (amounts in cents unless noted).
 */

/** Time window for aggregates. Future: add custom date ranges, occupation breakdown, demand heatmaps. */
export type ProDashboardMetricsRange = 'all' | '7d' | '30d';

export type ProDashboardMetrics = {
  totalEarningsCents: number;
  totalJobsCompleted: number;
  avgJobValueCents: number | null;
  earningsPerHourCents: number | null;
  /** 0–1 when computable; null if not enough closed outcomes */
  winRate: number | null;
  /** 0–1 among jobs with suggestion data; null if none */
  belowSuggestionRate: number | null;
};

export type ProDashboardContext = {
  occupationSlug: string | null;
};

export type PricingInsight = {
  type: 'warning' | 'opportunity' | 'info';
  message: string;
};

export type PriceAdjustmentSuggestion = {
  /** Whole percent, e.g. 12 = +12% (can be 0) */
  adjustmentPercent: number;
  reason: string;
};
