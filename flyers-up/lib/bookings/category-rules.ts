/**
 * Centralized service-category payout and evidence rules.
 * Used by isAutoConfirmAllowed, isPayoutEligible, and completion validation.
 */

export type EvidenceRequirementLevel = 'physical' | 'standard' | 'virtual';

export interface CategoryRule {
  slug: string;
  evidenceRequirementLevel: EvidenceRequirementLevel;
  minimumDurationMinutes: number;
  requiresBeforeAfterPhotos: boolean;
  requiresArrivalVerification: boolean;
}

const DEFAULT_RULE: CategoryRule = {
  slug: 'default',
  evidenceRequirementLevel: 'standard',
  minimumDurationMinutes: 30,
  requiresBeforeAfterPhotos: false,
  requiresArrivalVerification: true,
};

/** Physical services: cleaning, painting, junk removal, moving, landscaping */
const PHYSICAL_SLUGS = [
  'cleaning',
  'cleaning-services',
  'painting',
  'moving',
  'junk-removal',
  'landscaping',
  'lawn-care',
  'handyman',
  'home-organizer',
];

/** Virtual/consulting: tutor, consultant - no location check */
const VIRTUAL_SLUGS = ['tutor', 'consultant', 'it-technician'];

type RuleEntry = [string, Partial<CategoryRule>];

const CATEGORY_RULES = new Map<string, Partial<CategoryRule>>([
  ...PHYSICAL_SLUGS.map(
    (s): RuleEntry => [
      s,
      {
        evidenceRequirementLevel: 'physical' as const,
        minimumDurationMinutes: 60,
        requiresBeforeAfterPhotos: true,
        requiresArrivalVerification: true,
      },
    ]
  ),
  ...VIRTUAL_SLUGS.map(
    (s): RuleEntry => [
      s,
      {
        evidenceRequirementLevel: 'virtual' as const,
        minimumDurationMinutes: 15,
        requiresBeforeAfterPhotos: false,
        requiresArrivalVerification: false,
      },
    ]
  ),
  ['barber', { minimumDurationMinutes: 30, requiresArrivalVerification: true }] as RuleEntry,
  ['personal-trainer', { minimumDurationMinutes: 45, requiresArrivalVerification: true }] as RuleEntry,
  ['photographer', { minimumDurationMinutes: 60, requiresBeforeAfterPhotos: true }] as RuleEntry,
  ['dog-walker', { minimumDurationMinutes: 20, requiresArrivalVerification: true }] as RuleEntry,
]);

export function getCategoryRule(categorySlug: string | null | undefined): CategoryRule {
  if (!categorySlug) return DEFAULT_RULE;
  const slug = String(categorySlug).toLowerCase().trim();
  const override = CATEGORY_RULES.get(slug);
  return { ...DEFAULT_RULE, slug, ...override };
}

export function getMinimumDurationMinutes(categorySlug: string | null | undefined): number {
  return getCategoryRule(categorySlug).minimumDurationMinutes;
}

export function requiresBeforeAfterPhotos(categorySlug: string | null | undefined): boolean {
  return getCategoryRule(categorySlug).requiresBeforeAfterPhotos;
}

export function requiresArrivalVerification(categorySlug: string | null | undefined): boolean {
  return getCategoryRule(categorySlug).requiresArrivalVerification;
}
