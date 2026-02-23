/**
 * Flyer Wall helpers: safe formatting (never render raw JSON).
 */

/** Tagline with fallback */
export function formatTagline(pro: { tagline?: string | null; primaryCategory?: string }): string {
  if (pro.tagline?.trim()) return pro.tagline.trim();
  const cat = pro.primaryCategory || 'Service';
  return `${cat} professional. Message to learn more.`;
}

/** Availability: never return JSON.stringify. Human-readable summary only. */
export function formatAvailability(avail: string | object | unknown[] | null | undefined): string {
  if (avail == null || avail === '') return 'Hours vary — message to confirm';

  if (typeof avail === 'string') {
    const trimmed = avail.trim();
    if (!trimmed) return 'Hours vary — message to confirm';
    // If it looks like JSON, try to parse and format
    const first = trimmed.charAt(0);
    if (first === '{' || first === '[') {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return formatAvailabilityParsed(parsed);
      } catch {
        return 'Hours vary — message to confirm';
      }
    }
    // Plain string - use as-is if reasonable length
    if (trimmed.length <= 80) return trimmed;
    return 'Hours vary — message to confirm';
  }

  if (typeof avail === 'object') {
    return formatAvailabilityParsed(avail);
  }

  return 'Hours vary — message to confirm';
}

function formatAvailabilityParsed(val: unknown): string {
  if (val == null) return 'Hours vary — message to confirm';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    if (val.length === 0) return 'Hours vary — message to confirm';
    const first = val[0];
    if (typeof first === 'object' && first && 'days' in first && 'hours' in first) {
      const d = first as { days?: string; hours?: string };
      if (d.days && d.hours) return `${d.days} • ${d.hours}`;
    }
    return 'Hours vary — message to confirm';
  }
  if (typeof val === 'object') {
    const o = val as Record<string, unknown>;
    const days = o.days ?? o.weekdays;
    const hours = o.hours ?? o.time;
    if (typeof days === 'string' && typeof hours === 'string') return `${days} • ${hours}`;
    if (typeof days === 'string') return days;
    if (typeof hours === 'string') return hours;
  }
  return 'Hours vary — message to confirm';
}

/** Distance/radius for display */
export function formatDistance(pro: {
  serviceRadius?: number | null;
  serviceRadiusMiles?: number | null;
  maxDistanceMinutes?: number | null;
}): string {
  const miles = pro.serviceRadius ?? pro.serviceRadiusMiles ?? null;
  const minutes = pro.maxDistanceMinutes ?? null;
  if (miles != null && miles > 0) return `Up to ${miles} mile${miles === 1 ? '' : 's'}`;
  if (minutes != null && minutes > 0) return `Up to ${minutes} min drive`;
  return 'Contact for area';
}
