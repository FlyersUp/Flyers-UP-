/**
 * Presentation data for occupation cards.
 * UI-only; derived from slug/index. No backend changes.
 */

export type TopPickBadge = 'Fast' | 'Popular' | 'Best Value';

const PRESETS = [
  { rating: 4.8, jobs: 142, availability: 45, fromPrice: 40, pros: 32 },
  { rating: 4.9, jobs: 98, availability: 30, fromPrice: 55, pros: 28 },
  { rating: 4.7, jobs: 203, availability: 60, fromPrice: 35, pros: 45 },
  { rating: 4.8, jobs: 87, availability: 50, fromPrice: 50, pros: 19 },
  { rating: 4.6, jobs: 156, availability: 90, fromPrice: 45, pros: 24 },
] as const;

export function getOccupationPresentation(
  slug: string,
  index: number
): {
  rating: number;
  jobs: number;
  availability: number;
  fromPrice: number;
  pros: number;
} {
  const preset = PRESETS[index % PRESETS.length];
  const hash = slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rating = Math.min(5, preset.rating + (hash % 3) * 0.05);
  return {
    rating: Math.round(rating * 10) / 10,
    jobs: preset.jobs + (hash % 50),
    availability: preset.availability + (hash % 3) * 15,
    fromPrice: preset.fromPrice + (hash % 5) * 5,
    pros: preset.pros + (hash % 15),
  };
}

export function getTopPickBadge(index: number): TopPickBadge {
  const badges: TopPickBadge[] = ['Popular', 'Fast', 'Best Value', 'Popular', 'Fast'];
  return badges[index % badges.length];
}
