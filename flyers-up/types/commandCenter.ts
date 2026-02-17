/**
 * Types for Admin Command Center dashboard.
 * All metrics use null-safe numbers; UI shows fallbacks when null.
 */

export type PeriodKey = 'today' | '7d' | '30d';

export interface PeriodCounts {
  today: number;
  sevenDays: number;
  thirtyDays: number;
}

// Revenue / Finance
export interface RevenueMetrics {
  gmv: number;
  platformGross: number;
  stripeFeeEstimate: number;
  refundsTotal: number;
  refundsCount: number;
  chargebacksTotal: number;
  chargebacksCount: number;
  netRevenueMrr: number;
  byPeriod: {
    today: { gmv: number; platformGross: number };
    sevenDays: { gmv: number; platformGross: number };
    thirtyDays: { gmv: number; platformGross: number };
  };
}

export interface BurnRunway {
  fixedCosts: number;
  payroll: number;
  marketingSpend: number;
  burn: number;
  cashBalance: number;
  runwayMonths: number;
}

// Jobs & Liquidity
export interface JobsMetrics {
  posted: PeriodCounts;
  accepted: PeriodCounts;
  completed: PeriodCounts;
  fillRate24h: number | null;
  medianTimeToMatchHours: number | null;
  cancellationRateCustomer: number | null;
  cancellationRatePro: number | null;
  noShowRate: number | null;
  disputeRate: number | null;
  disputeResolutionMedianHours: number | null;
}

// Pros
export interface ProsMetrics {
  activeLast30d: number;
  availableNow: number;
  jobsPerProAvg: number;
  jobsPerProP50: number;
  jobsPerProP90: number;
  churn30d: number;
  churn60d: number;
  churn90d: number;
  funnel: {
    leads: number;
    startedOnboarding: number;
    verified: number;
    firstJob: number;
    active: number;
  };
  verifiedCoveragePercent: number | null;
  verificationBacklog: { proId: string; displayName: string | null; priorityScore: number }[];
}

// Customers & CAC
export interface CustomersMetrics {
  newCustomers: PeriodCounts;
  repeatRate30d: number | null;
  repeatRate60d: number | null;
  repeatRate90d: number | null;
  cohortRetention: { signupMonth: string; retained30d: number; total: number }[];
  customerCac: number | null;
  proCac: number | null;
  ltvEstimate: number | null;
}

// Shield & Risk (placeholders if no shield table)
export interface ShieldRiskMetrics {
  shieldAdoptionRate: number | null;
  claimsSubmitted: number;
  claimsApproved: number;
  claimsPaidOut: number;
  holdbackReserveBalance: number;
  fraudSignals: {
    type: string;
    label: string;
    count: number;
    entityIds?: string[];
  }[];
}

// Targets & Alerts
export interface AdminTargetsRow {
  mrr_target: number | null;
  jobs_target: number | null;
  active_pros_target: number | null;
  fill_rate_target: number | null;
  time_to_match_target_hours: number | null;
}

export interface TargetStatus {
  key: string;
  label: string;
  current: number | null;
  target: number | null;
  unit: string;
  status: 'red' | 'yellow' | 'green' | 'neutral';
}

export interface AlertItem {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  createdAt: string;
}

export interface CommandCenterData {
  revenue: RevenueMetrics;
  burnRunway: BurnRunway;
  jobs: JobsMetrics;
  pros: ProsMetrics;
  customers: CustomersMetrics;
  shieldRisk: ShieldRiskMetrics;
  targets: AdminTargetsRow | null;
  targetStatuses: TargetStatus[];
  alerts: AlertItem[];
}
