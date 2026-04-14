/**
 * Category / occupation-aware marketplace pricing defaults (integer cents).
 * Used for fee profiles, minimum job floors, and pro-facing price hints.
 */

export type CategoryPricingModel = 'flat' | 'hourly' | 'flat_hourly';

export type CategoryFeeProfile = 'low' | 'medium' | 'high';

export type CategoryPricingConfig = {
  /** Display label (e.g. for admin tools). */
  occupation: string;
  /** Matches `occupations.slug` on bookings / pros. */
  occupationSlug: string;
  defaultModel: CategoryPricingModel;
  typicalRangeCents: [number, number];
  minPriceCents: number;
  feeProfile: CategoryFeeProfile;
  allowDemandFee: boolean;
};

export const CATEGORY_CONFIG: CategoryPricingConfig[] = [
  {
    occupation: 'Cleaner',
    occupationSlug: 'cleaner',
    defaultModel: 'flat_hourly',
    typicalRangeCents: [8000, 15000],
    minPriceCents: 8000,
    feeProfile: 'medium',
    allowDemandFee: true,
  },
  {
    occupation: 'Handyman',
    occupationSlug: 'handyman',
    defaultModel: 'hourly',
    typicalRangeCents: [10000, 25000],
    minPriceCents: 8000,
    feeProfile: 'medium',
    allowDemandFee: false,
  },
  {
    occupation: 'Tutor',
    occupationSlug: 'tutor',
    defaultModel: 'hourly',
    typicalRangeCents: [4000, 12000],
    minPriceCents: 4000,
    feeProfile: 'low',
    allowDemandFee: false,
  },
  {
    occupation: 'Dog Walker',
    occupationSlug: 'dog-walker',
    defaultModel: 'flat',
    typicalRangeCents: [1500, 3000],
    minPriceCents: 1500,
    feeProfile: 'low',
    allowDemandFee: false,
  },
  {
    occupation: 'Event Planner',
    occupationSlug: 'event-planner',
    defaultModel: 'flat',
    typicalRangeCents: [15000, 80000],
    minPriceCents: 15000,
    feeProfile: 'high',
    allowDemandFee: true,
  },
  {
    occupation: 'Mover',
    occupationSlug: 'mover',
    defaultModel: 'hourly',
    typicalRangeCents: [15000, 40000],
    minPriceCents: 15000,
    feeProfile: 'medium',
    allowDemandFee: true,
  },
  {
    occupation: 'Personal Trainer',
    occupationSlug: 'personal-trainer',
    defaultModel: 'hourly',
    typicalRangeCents: [5000, 20000],
    minPriceCents: 5000,
    feeProfile: 'medium',
    allowDemandFee: false,
  },
  {
    occupation: 'Photographer',
    occupationSlug: 'photographer',
    defaultModel: 'flat',
    typicalRangeCents: [15000, 100000],
    minPriceCents: 15000,
    feeProfile: 'high',
    allowDemandFee: false,
  },
  {
    occupation: 'Videographer',
    occupationSlug: 'videographer',
    defaultModel: 'flat',
    typicalRangeCents: [20000, 120000],
    minPriceCents: 20000,
    feeProfile: 'high',
    allowDemandFee: false,
  },
  {
    occupation: 'DJ',
    occupationSlug: 'dj',
    defaultModel: 'flat',
    typicalRangeCents: [10000, 80000],
    minPriceCents: 10000,
    feeProfile: 'high',
    allowDemandFee: true,
  },
  {
    occupation: 'Chef',
    occupationSlug: 'chef',
    defaultModel: 'flat_hourly',
    typicalRangeCents: [20000, 150000],
    minPriceCents: 20000,
    feeProfile: 'high',
    allowDemandFee: false,
  },
  {
    occupation: 'Makeup Artist',
    occupationSlug: 'makeup-artist',
    defaultModel: 'flat',
    typicalRangeCents: [8000, 50000],
    minPriceCents: 8000,
    feeProfile: 'high',
    allowDemandFee: false,
  },
  {
    occupation: 'Barber',
    occupationSlug: 'barber',
    defaultModel: 'flat',
    typicalRangeCents: [2500, 8000],
    minPriceCents: 2500,
    feeProfile: 'low',
    allowDemandFee: false,
  },
  {
    occupation: 'Mechanic',
    occupationSlug: 'mechanic',
    defaultModel: 'hourly',
    typicalRangeCents: [8000, 30000],
    minPriceCents: 8000,
    feeProfile: 'medium',
    allowDemandFee: false,
  },
  {
    occupation: 'IT Technician',
    occupationSlug: 'it-technician',
    defaultModel: 'hourly',
    typicalRangeCents: [6000, 15000],
    minPriceCents: 6000,
    feeProfile: 'medium',
    allowDemandFee: false,
  },
  {
    occupation: 'Landscaper',
    occupationSlug: 'landscaper',
    defaultModel: 'hourly',
    typicalRangeCents: [8000, 25000],
    minPriceCents: 8000,
    feeProfile: 'medium',
    allowDemandFee: true,
  },
  {
    occupation: 'Snow Removal',
    occupationSlug: 'snow-removal',
    defaultModel: 'flat',
    typicalRangeCents: [4000, 15000],
    minPriceCents: 4000,
    feeProfile: 'medium',
    allowDemandFee: true,
  },
  {
    occupation: 'Painter',
    occupationSlug: 'painter',
    defaultModel: 'flat_hourly',
    typicalRangeCents: [12000, 40000],
    minPriceCents: 12000,
    feeProfile: 'medium',
    allowDemandFee: false,
  },
  {
    occupation: 'Car Detailer',
    occupationSlug: 'car-detailer',
    defaultModel: 'flat',
    typicalRangeCents: [5000, 25000],
    minPriceCents: 5000,
    feeProfile: 'medium',
    allowDemandFee: false,
  },
  {
    occupation: 'Home Organizer',
    occupationSlug: 'home-organizer',
    defaultModel: 'hourly',
    typicalRangeCents: [8000, 20000],
    minPriceCents: 8000,
    feeProfile: 'medium',
    allowDemandFee: false,
  },
];

const SLUG_MAP = new Map(CATEGORY_CONFIG.map((c) => [c.occupationSlug.toLowerCase(), c]));

/** Legacy / canonical pricing keys from {@link ./minimums} and suggestions. */
const SLUG_ALIASES: Record<string, string> = {
  cleaning: 'cleaner',
  tutoring: 'tutor',
  dog_walker: 'dog-walker',
  moving: 'mover',
};

function normalizeOccupationKey(raw: string): string {
  return raw.trim().toLowerCase();
}

export function getCategoryPricingConfigForOccupationSlug(
  slug: string | null | undefined
): CategoryPricingConfig | null {
  if (!slug?.trim()) return null;
  const key = normalizeOccupationKey(slug);
  const mapped = SLUG_ALIASES[key] ?? key;
  return SLUG_MAP.get(mapped) ?? null;
}

/** Typical list-price band for UI hints; matches by display name or slug (case-insensitive). */
export function getSuggestedPriceRange(occupation: string): [number, number] | undefined {
  const key = normalizeOccupationKey(occupation);
  const bySlug = SLUG_MAP.get(key);
  if (bySlug) return bySlug.typicalRangeCents;
  const byName = CATEGORY_CONFIG.find((c) => normalizeOccupationKey(c.occupation) === key);
  return byName?.typicalRangeCents;
}

export function getFeeProfileForOccupationSlug(
  slug: string | null | undefined
): CategoryFeeProfile {
  return getCategoryPricingConfigForOccupationSlug(slug)?.feeProfile ?? 'medium';
}

export function getAllowDemandFeeForOccupationSlug(slug: string | null | undefined): boolean {
  return getCategoryPricingConfigForOccupationSlug(slug)?.allowDemandFee ?? true;
}
