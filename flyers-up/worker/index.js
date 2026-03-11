/* OneSignal removed for isolation - using /push/onesignal/ dedicated workers */

/* Listeners at top level (message removed - was causing "must be added on initial evaluation" warning) */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
