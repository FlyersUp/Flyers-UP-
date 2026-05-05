declare global {
  interface Window {
    Capacitor?: unknown;
  }
}

/** True when running inside the Capacitor native WebView (`@capacitor/core` bridge). */
export function isCapacitorApp(): boolean {
  return typeof window !== 'undefined' && Boolean(window.Capacitor);
}

/**
 * Client-side hosted-web compatibility signal.
 * Keep conservative; callers combine with {@link isCapacitorApp} before blocking UX.
 */
export function isSupportedBrowser(): boolean {
  if (typeof navigator === 'undefined') return true;
  const ua = navigator.userAgent;
  if (/MSIE |Trident\//i.test(ua)) return false;
  return true;
}
