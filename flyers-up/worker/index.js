/* OneSignal removed for isolation - using /push/onesignal/ dedicated workers */

/* Listeners at top level */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  // your logic here
});
