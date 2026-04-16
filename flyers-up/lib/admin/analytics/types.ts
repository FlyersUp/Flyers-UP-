export type AnalyticsRangeKey = '7d' | '30d' | '90d' | 'ytd';

export type AnalyticsKpiDelta = {
  current: number;
  prior: number;
  changePct: number | null;
};

export type AnalyticsKpis = {
  gmvCents: AnalyticsKpiDelta;
  platformRevenueCents: AnalyticsKpiDelta;
  bookings: AnalyticsKpiDelta;
  newCustomers: AnalyticsKpiDelta;
  newPros: AnalyticsKpiDelta;
  repeatRate: AnalyticsKpiDelta;
};

export type AnalyticsFunnelStep = {
  key: string;
  label: string;
  count: number;
  dropFromPriorPct: number | null;
};

export type AnalyticsTimePoint = {
  date: string;
  completed: number;
};

export type AnalyticsRevenuePoint = {
  date: string;
  gmvCents: number;
  platformCents: number;
};

export type AnalyticsMarketplaceHealth = {
  acceptanceRate: number | null;
  avgResponseMinutes: number | null;
  cancellationRate: number | null;
  refundRate: number | null;
};

export type LocalPerformanceRow = {
  id: string;
  label: string;
  demand: number;
  supply: number;
  demandBarPct: number;
  supplyBarPct: number;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'default';
};

export type RetentionBlock = {
  repeatCustomerPct: number | null;
  topCategories: { name: string; repeatPct: number | null }[];
};

export type MoneyRiskBlock = {
  payoutsBlocked: number;
  refundsInitiatedCount: number;
  refundsInitiatedCents: number;
  reconciliationPending: number;
};

export type TrafficChannel = {
  label: string;
  pct: number;
  /** Visual accent */
  accent: 'orange' | 'blue' | 'green';
};

export type AttentionFeedItem = {
  id: string;
  bookingId: string;
  title: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  href: string;
};

export type AnalyticsDashboardData = {
  rangeKey: AnalyticsRangeKey;
  rangeLabel: string;
  fromIso: string;
  toIso: string;
  kpis: AnalyticsKpis;
  funnel: AnalyticsFunnelStep[];
  bookingsOverTime: AnalyticsTimePoint[];
  revenueOverTime: AnalyticsRevenuePoint[];
  marketplaceHealth: AnalyticsMarketplaceHealth;
  localPerformance: LocalPerformanceRow[];
  retention: RetentionBlock;
  moneyRisk: MoneyRiskBlock;
  traffic: TrafficChannel[];
  attentionFeed: AttentionFeedItem[];
};
