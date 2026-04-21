/**
 * Resolves which service category slug governs **payout evidence** rules (e.g. before/after photos).
 *
 * Prefer `bookings.pricing_category_slug` (stamped at quote time). When null — common on older rows —
 * fall back to the pro’s primary `service_categories.slug` from the embedded join on `service_pros`.
 */

function trimSlug(v: string | null | undefined): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

export function resolvePayoutEvidenceCategorySlug(row: Record<string, unknown>): string | null {
  const stamped = trimSlug((row as { pricing_category_slug?: string | null }).pricing_category_slug);
  if (stamped) return stamped;

  const sp = row.service_pros as
    | {
        service_categories?: { slug?: string | null } | ReadonlyArray<{ slug?: string | null }> | null;
      }
    | null
    | undefined;

  const sc = sp?.service_categories;
  if (Array.isArray(sc)) {
    return trimSlug(sc[0]?.slug ?? null);
  }
  if (sc && typeof sc === 'object' && 'slug' in sc) {
    return trimSlug((sc as { slug?: string | null }).slug ?? null);
  }
  return null;
}
