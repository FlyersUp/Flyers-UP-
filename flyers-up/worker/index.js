/* OneSignal removed for isolation - using /push/onesignal/ dedicated workers */

/* W3C: message handler must be added during initial evaluation of worker script */
self.addEventListener("message", function () {});

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
