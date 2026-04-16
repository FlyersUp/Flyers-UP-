import type { AnalyticsRangeKey } from './types';

export type AnalyticsWindowBounds = {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
};

function endOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Inclusive analytics window in UTC + equally long prior period for deltas.
 */
export function getAnalyticsWindowBounds(key: AnalyticsRangeKey, now: Date = new Date()): AnalyticsWindowBounds {
  const to = endOfUtcDay(now);
  let from: Date;

  if (key === 'ytd') {
    from = startOfUtcDay(new Date(Date.UTC(now.getUTCFullYear(), 0, 1)));
  } else {
    const days = key === '7d' ? 7 : key === '90d' ? 90 : 30;
    const startMs = to.getTime() - (days - 1) * 86400000;
    from = startOfUtcDay(new Date(startMs));
  }

  const spanMs = Math.max(86400000, to.getTime() - from.getTime() + 1);
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - spanMs + 1);

  return { from, to, prevFrom, prevTo };
}

export function parseAnalyticsRange(raw: string | undefined): AnalyticsRangeKey {
  const x = (raw ?? '').toLowerCase();
  if (x === '7d' || x === '7') return '7d';
  if (x === '90d' || x === '90') return '90d';
  if (x === 'ytd') return 'ytd';
  return '30d';
}

export function rangeLabel(key: AnalyticsRangeKey): string {
  switch (key) {
    case '7d':
      return 'Last 7 days';
    case '30d':
      return 'Last 30 days';
    case '90d':
      return 'Last 90 days';
    case 'ytd':
      return 'Year to date';
    default:
      return 'Last 30 days';
  }
}

export function reconWindowDays(bounds: AnalyticsWindowBounds): number {
  return Math.max(1, Math.ceil((bounds.to.getTime() - bounds.from.getTime() + 1) / 86400000));
}
