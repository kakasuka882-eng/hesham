const CACHE_NAME = "chat-egy-pwa-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/features.html",
  "/manifest.json",
  "/css/portal.css",
  "/css/features.css",
  "/images/chat-egy-logo.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.map((cache) => {
        if (cache !== CACHE_NAME) return caches.delete(cache);
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});