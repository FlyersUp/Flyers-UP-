'use client';

import { useEffect } from 'react';

/**
 * Keeps `fu-standalone` on <html> in sync when display mode changes (edge cases).
 * First paint is handled by the blocking script in app/layout.tsx (matchMedia + iOS navigator.standalone).
 */
function applyStandaloneClass() {
  if (typeof document === 'undefined') return;
  try {
    const mq = window.matchMedia?.('(display-mode: standalone)');
    const fromMedia = Boolean(mq?.matches);
    const nav = navigator as Navigator & { standalone?: boolean };
    const fromIos = typeof nav.standalone === 'boolean' && nav.standalone === true;
    document.documentElement.classList.toggle('fu-standalone', fromMedia || fromIos);
  } catch {
    // ignore
  }
}

export function StandaloneModeSync() {
  useEffect(() => {
    applyStandaloneClass();
    const mq = window.matchMedia?.('(display-mode: standalone)');
    if (!mq?.addEventListener) return;
    mq.addEventListener('change', applyStandaloneClass);
    return () => mq.removeEventListener('change', applyStandaloneClass);
  }, []);

  return null;
}
