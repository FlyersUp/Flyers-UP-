'use client';

import { useEffect, useState } from 'react';

/**
 * Launch mode defaults ON until `/api/feature-flags/launch-mode` resolves.
 */
export function useLaunchMode(): boolean {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/feature-flags/launch-mode', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { enabled?: boolean }) => {
        if (!cancelled) setEnabled(Boolean(d.enabled));
      })
      .catch(() => {
        /* keep default true */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return enabled;
}
