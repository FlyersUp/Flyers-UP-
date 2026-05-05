'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { isSupportedBrowser } from '@/lib/browserPlatform';

export function BrowserCompatibilityGate({ children }: { children: ReactNode }) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const isCapacitor = typeof window !== 'undefined' && window.Capacitor;

    if (!isSupportedBrowser() && !isCapacitor) {
      setBlocked(true);
    }
  }, []);

  if (blocked) {
    return (
      <div
        role="alert"
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <div className="mx-4 max-w-md rounded-xl border border-[var(--hairline)] bg-surface p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-text">Incompatible browser</h2>
          <p className="mt-2 text-sm text-muted">
            Please open Flyers Up in a current version of Safari, Chrome, Firefox, or Edge.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
