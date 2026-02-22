'use client';

import { useEffect, useState } from 'react';

/**
 * Auth page Suspense fallback that shows a recovery option if loading takes too long.
 * useSearchParams() can suspend; this gives users a way out if something hangs.
 */
export default function AuthLoadingFallback() {
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowRecovery(true), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg flex flex-col items-center justify-center gap-4 px-4">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <div className="text-sm text-muted">Loading…</div>
      {showRecovery && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-sm text-accent hover:underline"
        >
          Taking too long? Click to try again
        </button>
      )}
    </div>
  );
}
