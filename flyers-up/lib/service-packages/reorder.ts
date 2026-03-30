import type { ServicePackageRow } from '@/types/service-packages';

/**
 * Swap sort_order with adjacent package in ordered list. Returns new sort_order values to persist, or null if no move.
 */
export function computeReorderUpdates(
  ordered: Pick<ServicePackageRow, 'id' | 'sort_order'>[],
  packageId: string,
  direction: 'up' | 'down'
): { id: string; sort_order: number }[] | null {
  const idx = ordered.findIndex((r) => r.id === packageId);
  if (idx < 0) return null;
  const swapWith = direction === 'up' ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= ordered.length) return null;
  const a = ordered[idx]!;
  const b = ordered[swapWith]!;
  return [
    { id: a.id, sort_order: b.sort_order },
    { id: b.id, sort_order: a.sort_order },
  ];
}
