"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        console.log("✅ Service worker registered:", reg);
      } catch (err) {
        console.error("❌ Service worker registration failed:", err);
      }
    };

    // Register after full load to avoid edge issues with Next/App Router
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
