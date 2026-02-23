'use client';

/**
 * Minimal sort/filter bar for Flyer Wall.
 * Placeholder for future filters; currently minimal.
 */
export function FlyerFiltersBar({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm text-muted">
      <span>{count} pro{count !== 1 ? 's' : ''} available</span>
    </div>
  );
}
