import zipcodes from 'zipcodes';

/** Normalize to ZIP5; accepts "11212" or "11212-1234" or text containing a ZIP. */
export function normalizeUsZip5(input: string | null | undefined): string | null {
  if (input == null) return null;
  const trimmed = String(input).trim();
  const exact = trimmed.match(/^(\d{5})(?:-\d{4})?$/);
  if (exact) return exact[1]!;
  const anywhere = trimmed.match(/\b(\d{5})\b/);
  return anywhere ? anywhere[1]! : null;
}

export function isValidUsZip5(zip: string | null | undefined): boolean {
  const z = normalizeUsZip5(zip);
  return z != null && Boolean(zipcodes.lookup(z));
}

/** All ZIP codes within radius (miles) of center, including center when valid. */
export function zipsWithinRadiusMiles(centerZip: string, radiusMiles: number): Set<string> {
  const center = normalizeUsZip5(centerZip);
  if (!center || !zipcodes.lookup(center)) return new Set();
  const list = zipcodes.radius(center, radiusMiles) as unknown;
  if (!Array.isArray(list)) return new Set([center]);
  return new Set(list as string[]);
}

/** Match job_requests.service_category (slug or legacy display name) to pro category. */
export function jobRequestMatchesProCategory(
  requestCategory: string,
  proSlug: string,
  proName: string | null | undefined
): boolean {
  const r = (requestCategory || '').trim().toLowerCase();
  if (!r) return false;
  const slug = proSlug.trim().toLowerCase();
  if (r === slug) return true;
  const name = (proName || '').trim().toLowerCase();
  if (name && r === name) return true;
  return false;
}
