'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CategoryGateRowView, CategoryVisibleState } from '@/lib/marketplace/categoryGateTypes';

export type CategoryGateFetchState =
  | { status: 'idle' | 'loading' }
  | { status: 'ok'; gateUnknown: boolean; occupationSlug: string | null; row: CategoryGateRowView | null }
  | { status: 'error' };

export function useCategoryGate(serviceSlug: string, boroughSlug: string) {
  const [state, setState] = useState<CategoryGateFetchState>({ status: 'idle' });

  const reload = useCallback(async () => {
    if (!serviceSlug || !boroughSlug) return;
    setState({ status: 'loading' });
    try {
      const res = await fetch(
        `/api/marketplace/category-gate?serviceSlug=${encodeURIComponent(serviceSlug)}&boroughSlug=${encodeURIComponent(boroughSlug)}`,
        { cache: 'no-store' }
      );
      const data = (await res.json()) as {
        ok?: boolean;
        gateUnknown?: boolean;
        occupationSlug?: string | null;
        row?: CategoryGateRowView | null;
      };
      if (!data?.ok) {
        setState({ status: 'error' });
        return;
      }
      setState({
        status: 'ok',
        gateUnknown: Boolean(data.gateUnknown),
        occupationSlug: data.occupationSlug ?? null,
        row: (data.row as CategoryGateRowView | null) ?? null,
      });
    } catch {
      setState({ status: 'error' });
    }
  }, [serviceSlug, boroughSlug]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, reload };
}

export function visibleStateFromGate(state: CategoryGateFetchState): CategoryVisibleState | 'legacy' | 'unlisted' {
  if (state.status !== 'ok') return 'legacy';
  if (state.gateUnknown || !state.row) return 'legacy';
  if (!state.row.isCustomerVisible) return 'unlisted';
  return state.row.visibleState;
}
