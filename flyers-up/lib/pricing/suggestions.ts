/**
 * Suggested list prices for pros (cents). Server- or client-safe pure functions.
 */
import { getMinimumBookingCents, normalizeOccupationSlugForPricing } from '@/lib/pricing/minimums';

export type PricingDemandLevel = 'low' | 'medium' | 'high';
export type PricingTimeBand = 'peak' | 'off_peak' | 'standard';
export type BookingUrgencyTier = 'scheduled' | 'same_day' | 'asap';

/** Canonical keys aligned with {@link OCCUPATION_MINIMUMS} / DB aliases. */
const BASE_HOURLY_RATES_CENTS: Record<string, number> = {
  cleaning: 3000,
  handyman: 4000,
  plumbing: 7000,
  tutoring: 3500,
  dog_walking: 2000,
  moving: 6000,
};

const SLUG_TO_CANONICAL_HOURLY: Record<string, string> = {
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

function canonicalKeyForHourly(raw: string): string {
  const s = raw.trim().toLowerCase();
  return SLUG_TO_CANONICAL_HOURLY[s] ?? normalizeOccupationSlugForPricing(raw) ?? s;
}

function baseHourlyCentsForOccupation(occupationSlug: string): number {
  const key = canonicalKeyForHourly(occupationSlug);
  const v = BASE_HOURLY_RATES_CENTS[key];
  if (typeof v === 'number' && v > 0) return v;
  return 3000;
}

/**
 * Suggested flat/job price from occupation + duration, with optional market-style multipliers.
 */
export function getSuggestedPriceCents(input: {
  occupationSlug: string;
  estimatedDurationMinutes?: number;
  demandLevel?: PricingDemandLevel;
  timeBand?: PricingTimeBand;
  urgency?: BookingUrgencyTier;
}): number {
  const hourly = baseHourlyCentsForOccupation(input.occupationSlug);
  const hours = Math.max(1 / 60, (input.estimatedDurationMinutes ?? 60) / 60);
  let suggested = hourly * hours;

  const demand = input.demandLevel ?? 'medium';
  if (demand === 'high') suggested *= 1.18;
  else if (demand === 'low') suggested *= 0.93;

  const band = input.timeBand ?? 'standard';
  if (band === 'peak') suggested *= 1.08;
  else if (band === 'off_peak') suggested *= 0.95;

  if (input.urgency === 'asap') suggested *= 1.15;
  else if (input.urgency === 'same_day') suggested *= 1.06;

  const minimum = getMinimumBookingCents(input.occupationSlug);
  suggested = Math.max(suggested, minimum);
  return Math.round(suggested);
}

/** True when pro-listed price is materially under platform suggestion (nudge only). */
export function isFarBelowSuggestedPriceCents(params: {
  listedPriceCents: number;
  suggestedPriceCents: number;
  /** Fraction of suggested below which we nudge (default 0.85). */
  threshold?: number;
}): boolean {
  const t = params.threshold ?? 0.85;
  const s = params.suggestedPriceCents;
  if (!Number.isFinite(s) || s <= 0) return false;
  return params.listedPriceCents < s * t;
}
