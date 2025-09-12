// This file is intentionally blank. It will be replaced by next-pwa.
// The service worker logic, including Firebase Messaging, is injected during the build process.

importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js"
);
// workbox.setConfig({ debug: true });
// workbox.skipWaiting();
// workbox.clientsClaim();

// workbox.routing.registerRoute(
//   ({ request }) => request.destination === "image",
//   new workbox.strategies.CacheFirst()
// );
self.addEventListener("push", (event) => {
  const pushData = event.data.json();
  event.waitUntil(
    self.registration.showNotification(pushData.title, pushData.options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url));
});

workbox.routing.registerRoute(
  ({ url }) => url.origin,
  new workbox.strategies.NetworkFirst({
    cacheName: "everything",
    networkTimeoutSeconds: 5,
  })
);
