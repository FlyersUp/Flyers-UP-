"use client";

import { useEffect } from "react";
import { perfLog, perfLoggingEnabled } from "@/lib/perfBoot";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
    __ONESIGNAL_APP_ID__?: string;
    __ONESIGNAL_INIT_SCHEDULED__?: boolean;
  }
}

export default function OneSignalInit() {
  useEffect(() => {
    const schedule = () => {
      // Server injects via layout script (avoids webpack env inlining issues)
      const appId =
        typeof window !== "undefined"
          ? (window.__ONESIGNAL_APP_ID__ ?? process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID)
          : process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

      if (process.env.NODE_ENV === "development") {
        console.log("[OneSignal] component mounted, appId:", !!appId);
      }

      if (!appId) {
        console.warn("[OneSignal Debug] Missing NEXT_PUBLIC_ONESIGNAL_APP_ID");
        return;
      }

      // Only schedule init once per page load (avoids "SDK already initialized" when component remounts)
      if (window.__ONESIGNAL_INIT_SCHEDULED__) {
        return;
      }
      window.__ONESIGNAL_INIT_SCHEDULED__ = true;

      window.OneSignalDeferred = window.OneSignalDeferred || [];

      window.OneSignalDeferred.push(async function (OneSignal: any) {
        const t0 =
          perfLoggingEnabled() && typeof performance !== "undefined"
            ? performance.now()
            : 0;
        try {
          if (process.env.NODE_ENV === "development") {
            console.log("[OneSignal] init starting");
          }

          await OneSignal.init({
            appId,
            serviceWorkerPath: "/push/onesignal/OneSignalSDKWorker.js",
            serviceWorkerUpdaterPath: "/push/onesignal/OneSignalSDKUpdaterWorker.js",
            serviceWorkerParam: { scope: "/push/onesignal/" },
            allowLocalhostAsSecureOrigin: true,
          });

          if (perfLoggingEnabled() && typeof performance !== "undefined") {
            perfLog("onesignal init", performance.now() - t0);
          }

          if (process.env.NODE_ENV === "development") {
            const regs = await navigator.serviceWorker.getRegistrations();
            console.log("[OneSignal] init succeeded, SW registrations:", regs.length);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("already initialized")) {
            if (process.env.NODE_ENV === "development") {
              console.log("[OneSignal] Already initialized, skipping");
            }
          } else {
            console.error("[OneSignal] init failed", err);
          }
        }
      });
    };

    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(schedule, { timeout: 8000 });
    } else {
      timeoutId = setTimeout(schedule, 3000);
    }
    return () => {
      if (idleId !== undefined && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []);

  return null;
}
