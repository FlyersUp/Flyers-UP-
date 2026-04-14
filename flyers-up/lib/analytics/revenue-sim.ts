/**
 * Lightweight GMV / take-rate simulation for launch planning (integer cents).
 */

export type RevenueSimInput = {
  jobsPerMonth: number;
  avgSubtotalCents: number;
  avgFeeRate: number;
};

export type RevenueSimOutput = {
  monthlyGMV: number;
  monthlyRevenue: number;
  annualRevenue: number;
};

export function simulateRevenue(input: RevenueSimInput): RevenueSimOutput {
  const jobs = Math.max(0, input.jobsPerMonth);
  const avgSub = Math.max(0, Math.round(input.avgSubtotalCents));
  const rate = Number.isFinite(input.avgFeeRate) ? Math.max(0, input.avgFeeRate) : 0;

  const monthlyGMV = jobs * avgSub;
  const monthlyRevenue = monthlyGMV * rate;

  return {
    monthlyGMV,
    monthlyRevenue,
    annualRevenue: monthlyRevenue * 12,
  };
}

export const NYC_SCENARIOS = [
  {
    name: 'Low',
    jobsPerMonth: 300,
    avgSubtotalCents: 6500,
    avgFeeRate: 0.18,
  },
  {
    name: 'Base',
    jobsPerMonth: 1000,
    avgSubtotalCents: 9500,
    avgFeeRate: 0.2,
  },
  {
    name: 'Strong',
    jobsPerMonth: 3000,
    avgSubtotalCents: 14000,
    avgFeeRate: 0.2,
  },
] as const;

export type NycScenarioRow = RevenueSimInput & { name: string };

export function simulateAllNycScenarios(): Array<NycScenarioRow & RevenueSimOutput> {
  return NYC_SCENARIOS.map((s) => ({
    ...s,
    ...simulateRevenue(s),
  }));
}
