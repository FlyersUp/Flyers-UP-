// W3C: message handler must be added during initial evaluation of worker script.
// Add no-op listener before OneSignal loads to satisfy browser requirement.
self.addEventListener("message", function () {});

importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
