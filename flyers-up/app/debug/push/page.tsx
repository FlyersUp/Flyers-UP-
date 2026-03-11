"use client";

import { useState, useEffect } from "react";
import OneSignalInit from "@/components/notifications/OneSignalInit";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

type DebugState = {
  permission: string;
  oneSignalExists: boolean;
  optedIn: boolean | null;
  subscriptionId: string | null;
  registrations: Array<{ scope: string; scriptURL: string }>;
  error: string | null;
};

export default function DebugPushPage() {
  const [state, setState] = useState<DebugState>({
    permission: "unknown",
    oneSignalExists: false,
    optedIn: null,
    subscriptionId: null,
    registrations: [],
    error: null,
  });

  const [serverSeesAppId, setServerSeesAppId] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/debug/onesignal-env")
      .then((r) => r.json())
      .then((d) => setServerSeesAppId(d.hasAppId))
      .catch(() => setServerSeesAppId(null));
  }, []);

  const refreshState = async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      const permission = typeof Notification !== "undefined" ? Notification.permission : "unsupported";
      const oneSignalExists = typeof window !== "undefined" && !!window.OneSignal;

      let optedIn: boolean | null = null;
      let subscriptionId: string | null = null;

      if (window.OneSignal?.User?.PushSubscription) {
        try {
          optedIn = await window.OneSignal.User.PushSubscription.optedIn;
          subscriptionId = window.OneSignal.User.PushSubscription.id ?? null;
        } catch (e) {
          console.error("[OneSignal Debug] Error reading subscription:", e);
        }
      }

      setState({
        permission,
        oneSignalExists,
        optedIn,
        subscriptionId,
        registrations: regs.map((r) => ({
          scope: r.scope,
          scriptURL:
            r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "",
        })),
        error: null,
      });
    } catch (err) {
      console.error("[OneSignal Debug] refreshState failed:", err);
      setState((s) => ({ ...s, error: String(err) }));
    }
  };

  useEffect(() => {
    refreshState();
  }, []);

  const handleInit = async () => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) {
      console.error("[OneSignal Debug] Missing NEXT_PUBLIC_ONESIGNAL_APP_ID");
      setState((s) => ({ ...s, error: "Missing appId" }));
      return;
    }
    if (!window.OneSignalDeferred) {
      window.OneSignalDeferred = [];
    }
    window.OneSignalDeferred.push(async function (OneSignal: any) {
      try {
        console.log("[OneSignal Debug] Manual init starting");
        await OneSignal.init({
          appId,
          serviceWorkerPath: "/push/onesignal/OneSignalSDKWorker.js",
          serviceWorkerUpdaterPath: "/push/onesignal/OneSignalSDKUpdaterWorker.js",
          serviceWorkerParam: { scope: "/push/onesignal/" },
          allowLocalhostAsSecureOrigin: true,
        });
        console.log("[OneSignal Debug] Manual init succeeded");
        await refreshState();
      } catch (err) {
        console.error("[OneSignal Debug] Manual init failed", err);
        setState((s) => ({ ...s, error: String(err) }));
      }
    });
    // If SDK already loaded, trigger deferred
    if (window.OneSignal) {
      window.OneSignalDeferred.forEach((fn) => fn(window.OneSignal));
    }
  };

  const handleRequestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      console.log("[OneSignal Debug] Permission result:", result);
      await refreshState();
    } catch (err) {
      console.error("[OneSignal Debug] Request permission failed:", err);
      setState((s) => ({ ...s, error: String(err) }));
    }
  };

  const handleOptIn = async () => {
    if (!window.OneSignal?.User?.PushSubscription) {
      console.error("[OneSignal Debug] OneSignal not ready");
      setState((s) => ({ ...s, error: "OneSignal not ready" }));
      return;
    }
    try {
      await window.OneSignal.User.PushSubscription.optIn();
      console.log("[OneSignal Debug] optIn succeeded");
      await refreshState();
    } catch (err) {
      console.error("[OneSignal Debug] optIn failed", err);
      setState((s) => ({ ...s, error: String(err) }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-mono text-sm">
      <OneSignalInit />
      <h1 className="mb-4 text-xl font-bold">Push Debug (OneSignal isolation)</h1>

      <div className="mb-4 rounded bg-white p-4 shadow">
        <h2 className="mb-2 font-semibold">State</h2>
        <pre className="whitespace-pre-wrap break-all">
          {JSON.stringify(
            {
              permission: state.permission,
              oneSignalExists: state.oneSignalExists,
              optedIn: state.optedIn,
              subscriptionId: state.subscriptionId,
              registrations: state.registrations,
              error: state.error,
            },
            null,
            2
          )}
        </pre>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={refreshState}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Refresh state
        </button>
        <button
          onClick={handleInit}
          className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          Init OneSignal
        </button>
        <button
          onClick={handleRequestPermission}
          className="rounded bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
        >
          Request permission
        </button>
        <button
          onClick={handleOptIn}
          className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
        >
          OneSignal optIn
        </button>
      </div>

      <p className="mt-4 text-gray-600">
        Success: permission=granted, optedIn=true, subscriptionId=non-empty, registration for
        /push/onesignal/OneSignalSDKWorker.js
      </p>

      {serverSeesAppId === false && (
        <div className="mt-4 rounded border-2 border-amber-500 bg-amber-50 p-4">
          <p className="font-semibold text-amber-800">
            Missing NEXT_PUBLIC_ONESIGNAL_APP_ID
          </p>
          <p className="mt-1 text-sm text-amber-700">
            .env.local must be in <code className="rounded bg-amber-100 px-1">flyers-up/</code> (next to next.config.js). Restart dev server after adding.
          </p>
          <p className="mt-2 text-sm text-amber-700">
            Add to <code className="rounded bg-amber-100 px-1">.env.local</code>:{" "}
            <code>NEXT_PUBLIC_ONESIGNAL_APP_ID=your-app-id</code>
          </p>
        </div>
      )}
    </div>
  );
}
