"use client";

import { useEffect } from "react";

/**
 * Load OneSignal SDK after hydration to avoid:
 * - React 418 hydration mismatch (SW/MessagePort activity during hydrate)
 * - "Event handler of 'message' must be added on initial evaluation" (SW timing)
 */
export default function OneSignalLoader() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) return;

    // Defer until after hydration to avoid React 418 and SW message handler timing issues
    const id = setTimeout(() => {
      if (document.querySelector('script[src*="OneSignalSDK.page"]')) return;

      const script = document.createElement("script");
      script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
      script.defer = true;
      document.head.appendChild(script);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  return null;
}
