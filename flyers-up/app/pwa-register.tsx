"use client";

import { useEffect } from "react";

/**
 * TEMPORARY: Root PWA /sw.js registration disabled for OneSignal push isolation.
 * next-pwa register is off in next.config.js; this component is a no-op until re-enabled.
 */
export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // TEMPORARY: Do not register /sw.js - OneSignal uses /push/onesignal/ workers
    // const register = async () => {
    //   try {
    //     const reg = await navigator.serviceWorker.register("/sw.js");
    //     console.log("✅ Service worker registered:", reg);
    //   } catch (err) {
    //     console.error("❌ Service worker registration failed:", err);
    //   }
    // };
    // if (document.readyState === "complete") register();
    // else window.addEventListener("load", register);
    // return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
