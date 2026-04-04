/**
 * Occupation-based minimum pro subtotals (cents), before Flyers Up fees.
 * Keys are canonical; DB occupation slugs are normalized via aliases (e.g. cleaner → cleaning).
 */

export const DEFAULT_MIN_BOOKING_CENTS = 1500;

/** Canonical occupation keys → minimum job subtotal (cents). */
export const OCCUPATION_MINIMUMS: Record<string, number> = {
  cleaning: 2000,
  handyman: 2500,
  plumbing: 4000,
  tutoring: 2000,
  dog_walking: 1500,
  moving: 5000,
};

/** Map DB `occupations.slug` (and variants) → canonical OCCUPATION_MINIMUMS key. */
const SLUG_TO_CANONICAL: Record<string, string> = {
  cleaner: 'cleaning',
  cleaning: 'cleaning',
  handyman: 'handyman',
  plumber: 'plumbing',
  plumbing: 'plumbing',
  tutor: 'tutoring',
  tutoring: 'tutoring',
  'dog-walker': 'dog_walking',
  dog_walker: 'dog_walking',
  mover: 'moving',
  moving: 'moving',
};

/**
 * Normalize raw occupation slug for lookup in {@link OCCUPATION_MINIMUMS}.
 */
export function normalizeOccupationSlugForPricing(raw?: string | null): string | undefined {
  if (!raw?.trim()) return undefined;
  const s = raw.trim().toLowerCase();
  return SLUG_TO_CANONICAL[s] ?? s;
}

export function getMinimumBookingCents(occupationSlug?: string | null): number {
  const key = normalizeOccupationSlugForPricing(occupationSlug) ?? occupationSlug?.trim().toLowerCase();
  if (key && Object.prototype.hasOwnProperty.call(OCCUPATION_MINIMUMS, key)) {
    const v = OCCUPATION_MINIMUMS[key];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.round(v);
  }
  return DEFAULT_MIN_BOOKING_CENTS;
}
