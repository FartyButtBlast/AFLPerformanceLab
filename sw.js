const CACHE_NAME = "afl-performance-app-v7";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./privacy.html",
  "./support.html",
  "./styles.css?v=logo-1",
  "./analytics-config.js?v=analytics-1",
  "./analytics.js?v=analytics-1",
  "./data-loader.js?v=live-data-1",
  "./data/afl-data.js?v=season-2026",
  "./data/player-positions.js?v=positions-2",
  "./data/news-feed.js?v=news-2",
  "./pwa.js?v=pwa-1",
  "./app.js?v=live-data-1",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-1024.png",
  "./icons/apple-touch-icon.png",
  "./icons/sportzlabs-logo.png",
  "./icons/sportzlabs-logo-black.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("./index.html")));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fresh = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fresh;
    }),
  );
});
