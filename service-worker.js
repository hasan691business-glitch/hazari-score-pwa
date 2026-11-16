/* Hazari Score — service worker
 * Precaches the whole app so it works fully offline.
 * Bump CACHE_VERSION whenever you deploy changes so phones pick them up. */
const CACHE_VERSION = "v2";
const CACHE_NAME = "hazari-score-" + CACHE_VERSION;

const PRECACHE = [
  "./",
  "index.html",
  "manifest.json",
  "splash.jpg",
  "winner.jpg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith("hazari-score-") && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Cache-first (instant + offline), refreshed in the background (stale-while-revalidate).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // leave third-party requests alone

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, { ignoreSearch: true });

    const refresh = fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
        return res;
      })
      .catch(() => null);

    if (cached) {
      event.waitUntil(refresh);
      return cached;
    }

    const fresh = await refresh;
    if (fresh) return fresh;

    // Offline and not cached: for page loads, fall back to the app shell.
    if (req.mode === "navigate") {
      const shell = await cache.match("index.html");
      if (shell) return shell;
    }
    return new Response("Offline", { status: 503, statusText: "Offline" });
  })());
});
