/**
 * Pro profile IA: single source of truth for what we mean by each field.
 *
 * - primaryOccupation: service_pros.occupation_id → occupations (signup)
 * - offeredServices: pro_services → occupation_services (names/slugs) for that occupation only
 * - specialties: pro_specialties (optional differentiators, max 8)
 * - addOns: service_addons
 */

export const MULTI_OCCUPATION_MODE = false;

/** Legacy JSON `services_offered` on service_pros (category/subcategory slugs); not authoritative when pro_services rows exist. */
export function warnLegacyServicesNotInOccupationServices(
  legacySlugs: string[],
  occupationServiceSlugs: Set<string>
): void {
  if (process.env.NODE_ENV !== 'development') return;
  if (!legacySlugs.length || occupationServiceSlugs.size === 0) return;
  const orphans = legacySlugs.filter(
    (s) => typeof s === 'string' && s.trim() && !occupationServiceSlugs.has(s.trim())
  );
  if (orphans.length > 0) {
    console.warn(
      '[ProProfile] services_offered contains slugs that are not selected occupation services (hidden from Services Offered):',
      orphans
    );
  }
}
