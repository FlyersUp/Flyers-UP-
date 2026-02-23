/**
 * Flyer Wall helpers: stable tilt, offset, and formatting.
 * Seeded by pro.id for consistent layout across renders.
 */

/** Stable tilt between -2 and +2 degrees, seeded by pro id */
export function seededTilt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
  return ((h % 41) / 41) * 4 - 2; // -2 to +2
}

/** Stable Y offset 0–6px for organic stacking, seeded by pro id */
export function seededOffset(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
  return Math.abs(h % 7); // 0–6
}

/** Format distance/radius for display */
export function formatDistance(pro: {
  serviceRadius?: number | null;
  serviceRadiusMiles?: number | null;
}): string {
  const miles = pro.serviceRadius ?? pro.serviceRadiusMiles ?? null;
  if (miles != null && miles > 0) return `Up to ${miles} mile${miles === 1 ? '' : 's'}`;
  return 'Contact for area';
}
