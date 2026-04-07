/** Display label for average first-response time (minutes pro took to accept). */
export function formatAvgResponseMinutes(m: number | null | undefined): string {
  if (m == null || !Number.isFinite(Number(m))) return '—';
  const n = Number(m);
  if (n < 20) return 'Under 20 min';
  if (n < 45) return 'Under 45 min';
  if (n < 90) return 'Under 1.5 hrs';
  if (n < 24 * 60) return 'Same day';
  const days = n / (60 * 24);
  if (days < 2) return '~1 day';
  return `~${Math.round(days)} days`;
}
