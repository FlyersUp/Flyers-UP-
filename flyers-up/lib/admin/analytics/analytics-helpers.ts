import type { AnalyticsFunnelStep } from './types';

export function toFiniteNumber(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Percent change vs prior; null when prior is 0 or non-finite. */
export function computePctChange(current: number, prior: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(prior) || prior === 0) return null;
  return Math.round(((current - prior) / prior) * 1000) / 10;
}

/** Drop from previous funnel step as percent of previous count. */
export function funnelDropFromPrior(prevCount: number, count: number): number | null {
  if (prevCount <= 0) return null;
  return Math.round(((count - prevCount) / prevCount) * 1000) / 10;
}

export function buildFunnelSteps(input: {
  visits: number;
  signupStart: number;
  signupDone: number;
  bookingStart: number;
  depositPaid: number;
  jobDone: number;
}): AnalyticsFunnelStep[] {
  const steps: { key: string; label: string; count: number }[] = [
    { key: 'visits', label: 'Landing visits', count: input.visits },
    { key: 'signup_start', label: 'Signup start', count: input.signupStart },
    { key: 'signup_done', label: 'Signup done', count: input.signupDone },
    { key: 'booking_start', label: 'Booking start', count: input.bookingStart },
    { key: 'deposit_paid', label: 'Deposit paid', count: input.depositPaid },
    { key: 'job_done', label: 'Job done', count: input.jobDone },
  ];
  return steps.map((s, i) => ({
    ...s,
    dropFromPriorPct: i === 0 ? null : funnelDropFromPrior(steps[i - 1].count, s.count),
  }));
}

export function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  if (s.length % 2 === 1) return s[mid];
  return (s[mid - 1] + s[mid]) / 2;
}
