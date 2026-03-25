'use client';

import { useEffect, useState } from 'react';

/** False on SSR and the first client paint; true after mount. Avoids Date.now() / locale hydration mismatches. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
