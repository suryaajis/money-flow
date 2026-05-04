/*
 * Money Flow Service Worker
 * --------------------------
 * Custom (no next-pwa / Serwist) so it stays compatible with Next.js 16.
 *
 * Strategies:
 *   - Precache: app shell pages (`/dashboard`, `/transactions`, ...) + the
 *     offline fallback are warmed on `install`.
 *   - Navigation requests (HTML documents): network-first, falling back to
 *     cached page, then `/offline`.
 *   - Static assets under `/_next/static/`, `/icons/`, fonts, manifest:
 *     cache-first (immutable once hashed by Next.js).
 *   - Images: stale-while-revalidate.
 *   - Everything else (incl. server actions, API): network-first.
 *
 * Bumping CACHE_VERSION wipes old caches on the next activation.
 */

const CACHE_VERSION = "v1";
const PRECACHE = `money-flow-precache-${CACHE_VERSION}`;
const RUNTIME = `money-flow-runtime-${CACHE_VERSION}`;

const APP_SHELL = [
  "/",
  "/dashboard",
  "/transactions",
  "/categories",
  "/analytics",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      // `addAll` rejects atomically; precache best-effort instead so a single
      // 404 doesn't prevent the SW from installing.
      await Promise.all(
        APP_SHELL.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {
            /* ignore individual failures */
          }),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== PRECACHE && k !== RUNTIME)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// Allow the page to trigger an immediate activation after a new SW is installed.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

const isStaticAsset = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/icons/") ||
  url.pathname === "/manifest.webmanifest" ||
  /\.(?:css|js|woff2?|ttf|otf)$/.test(url.pathname);

const isImage = (request, url) =>
  request.destination === "image" ||
  /\.(?:png|jpg|jpeg|gif|webp|svg|ico)$/.test(url.pathname);

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok && request.method === "GET") {
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh && fresh.ok && request.method === "GET") {
    cache.put(request, fresh.clone()).catch(() => {});
  }
  return fresh;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok && request.method === "GET") {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => undefined);
  return cached || (await networkPromise) || Promise.reject(new Error("offline"));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let the browser handle CORS/cross-origin

  // Navigation requests: network-first, fall back to cache, then `/offline`.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(RUNTIME);
          cache.put(request, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match("/offline");
          if (offline) return offline;
          return new Response("Offline", { status: 503, statusText: "Offline" });
        }
      })(),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, PRECACHE));
    return;
  }

  if (isImage(request, url)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME));
    return;
  }

  // API / everything else: network-first.
  event.respondWith(networkFirst(request, RUNTIME));
});
