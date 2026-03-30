'use client';

import { useEffect, useState } from 'react';
import type { GrowthMenuResponseDto } from '@/lib/pro/growth-menu-types';

export function useProGrowthMenu() {
  const [data, setData] = useState<GrowthMenuResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/pro/growth-menu', { credentials: 'include' });
        const j = (await res.json()) as GrowthMenuResponseDto & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setData(null);
          setError(j.error ?? 'Could not load');
          return;
        }
        if (j.ok && Array.isArray(j.items)) {
          setData(j);
        } else {
          setData(null);
          setError('Invalid response');
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setError('Could not load');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, error, loading };
}
