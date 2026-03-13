"use client";

import { useEffect } from "react";

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
    // Server injects via layout script (avoids webpack env inlining issues)
    const appId =
      typeof window !== "undefined"
        ? (window.__ONESIGNAL_APP_ID__ ?? process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID)
        : process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

    console.log("[OneSignal Debug] component mounted");
    console.log("[OneSignal Debug] appId exists:", !!appId);

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
      try {
        console.log("[OneSignal Debug] init starting");

        await OneSignal.init({
          appId,
          serviceWorkerPath: "/push/onesignal/OneSignalSDKWorker.js",
          serviceWorkerUpdaterPath: "/push/onesignal/OneSignalSDKUpdaterWorker.js",
          serviceWorkerParam: { scope: "/push/onesignal/" },
          allowLocalhostAsSecureOrigin: true,
        });

        console.log("[OneSignal Debug] init succeeded");

        const regs = await navigator.serviceWorker.getRegistrations();
        console.log(
          "[OneSignal Debug] service worker registrations:",
          regs.map((r) => ({
            scope: r.scope,
            scriptURL:
              r.active?.scriptURL ||
              r.installing?.scriptURL ||
              r.waiting?.scriptURL,
          }))
        );

        console.log("[OneSignal Debug] Notification.permission:", Notification.permission);
        console.log(
          "[OneSignal Debug] OneSignal.User.PushSubscription.optedIn:",
          await OneSignal.User.PushSubscription.optedIn
        );
        console.log(
          "[OneSignal Debug] OneSignal.User.PushSubscription.id:",
          OneSignal.User.PushSubscription.id
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("already initialized")) {
          console.log("[OneSignal Debug] Already initialized, skipping");
        } else {
          console.error("[OneSignal Debug] init failed", err);
        }
      }
    });
  }, []);

  return null;
}
