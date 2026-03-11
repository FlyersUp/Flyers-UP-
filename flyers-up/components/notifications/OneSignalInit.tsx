"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void | Promise<void>>;
  }
}

export default function OneSignalInit() {
  useEffect(() => {
    console.log("OneSignalInit mounted");
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) {
      console.error("Missing NEXT_PUBLIC_ONESIGNAL_APP_ID");
      return;
    }

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal: any) {
      try {
        await OneSignal.init({
          appId,
          serviceWorkerPath: "/push/onesignal/OneSignalSDKWorker.js",
          serviceWorkerUpdaterPath: "/push/onesignal/OneSignalSDKUpdaterWorker.js",
          serviceWorkerParam: { scope: "/push/onesignal/" },
          allowLocalhostAsSecureOrigin: true,
        });

        console.log("OneSignal init done");
      } catch (err) {
        console.error("OneSignal init failed", err);
      }
    });
  }, []);

  return null;
}
