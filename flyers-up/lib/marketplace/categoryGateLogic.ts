import type { CategoryGateResolution, CategoryVisibleState } from '@/lib/marketplace/categoryGateTypes';

/**
 * Pure gate resolver (mirrors SQL `resolve_category_borough_gate`).
 * Used in tests and anywhere we need client-side previews without hitting the DB.
 */
export function resolveCategoryBoroughGate(params: {
  activeProCount: number | null;
  forceHidden: boolean;
  forceVisible: boolean;
  thresholdStrong: number;
}): CategoryGateResolution {
  const { activeProCount, forceHidden, forceVisible, thresholdStrong } = params;
  const t = Math.max(1, thresholdStrong);

  if (forceHidden) {
    return { visibleState: 'inactive', isCustomerVisible: false };
  }

  const n = activeProCount == null || Number.isNaN(activeProCount) ? -1 : activeProCount;

  let base: CategoryVisibleState;
  if (n < 0) base = 'inactive';
  else if (n >= t) base = 'strong';
  else if (n >= 1) base = 'weak';
  else base = 'inactive';

  if (forceVisible) {
    return {
      isCustomerVisible: true,
      visibleState: base === 'inactive' ? 'weak' : base,
    };
  }

  return {
    visibleState: base,
    isCustomerVisible: base !== 'inactive',
  };
}

/** True when the occupation should appear in customer category pickers for this borough. */
export function isOccupationListedForBorough(row: { isCustomerVisible: boolean }): boolean {
  return row.isCustomerVisible;
}

/** True when direct booking UI (pro list) should be shown for this slice. */
export function showDirectBookingList(visibleState: CategoryVisibleState): boolean {
  return visibleState === 'strong' || visibleState === 'weak';
}
