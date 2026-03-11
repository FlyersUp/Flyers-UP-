"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

export default function OneSignalInit() {
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

    console.log("[OneSignal] mounted");
    console.log("[OneSignal] appId exists:", !!appId);

    if (!appId) {
      console.error("[OneSignal] Missing NEXT_PUBLIC_ONESIGNAL_APP_ID");
      return;
    }

    window.OneSignalDeferred = window.OneSignalDeferred || [];

    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        console.log("[OneSignal] init starting");

        await OneSignal.init({
          appId,
          serviceWorkerPath: "/sw.js",
          serviceWorkerParam: { scope: "/" },
          allowLocalhostAsSecureOrigin: true,
        });

        console.log("[OneSignal] init done");

        const regs = await navigator.serviceWorker.getRegistrations();
        console.log(
          "[OneSignal] registrations:",
          regs.map((r) => ({
            scope: r.scope,
            scriptURL:
              r.active?.scriptURL ||
              r.installing?.scriptURL ||
              r.waiting?.scriptURL,
          }))
        );

        console.log(
          "[OneSignal] permission:",
          Notification.permission
        );
        console.log(
          "[OneSignal] optedIn:",
          await OneSignal.User.PushSubscription.optedIn
        );
        console.log(
          "[OneSignal] subscription id:",
          OneSignal.User.PushSubscription.id
        );
      } catch (err) {
        console.error("[OneSignal] init failed", err);
      }
    });
  }, []);

  return null;
}
