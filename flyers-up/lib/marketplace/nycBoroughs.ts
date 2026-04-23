/**
 * Canonical NYC borough slugs used by category_borough_status and match_requests.
 */

export const NYC_BOROUGH_SLUGS = [
  'manhattan',
  'brooklyn',
  'queens',
  'bronx',
  'staten-island',
] as const;

export type NycBoroughSlug = (typeof NYC_BOROUGH_SLUGS)[number];

const SLUG_SET = new Set<string>(NYC_BOROUGH_SLUGS);

const LABELS: Record<NycBoroughSlug, string> = {
  manhattan: 'Manhattan',
  brooklyn: 'Brooklyn',
  queens: 'Queens',
  bronx: 'The Bronx',
  'staten-island': 'Staten Island',
};

/** Normalize user/admin input (e.g. "Staten Island", "STATEN_ISLAND") to canonical slug. */
export function normalizeBoroughSlug(raw: string | null | undefined): NycBoroughSlug | null {
  if (!raw) return null;
  const t = raw
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-');
  if (t === 'staten-island' || t === 'statenisland') return 'staten-island';
  if (SLUG_SET.has(t)) return t as NycBoroughSlug;
  const compact = t.replace(/-/g, '');
  if (compact === 'statenisland') return 'staten-island';
  return null;
}

export function isNycBoroughSlug(s: string | null | undefined): s is NycBoroughSlug {
  return normalizeBoroughSlug(s) != null;
}

export function boroughLabel(slug: NycBoroughSlug): string {
  return LABELS[slug];
}

export function boroughLabelFromSlug(slug: string): string {
  const n = normalizeBoroughSlug(slug);
  return n ? boroughLabel(n) : slug;
}

export const NYC_BOROUGH_OPTIONS: Array<{ slug: NycBoroughSlug; label: string }> = NYC_BOROUGH_SLUGS.map((slug) => ({
  slug,
  label: boroughLabel(slug),
}));
