/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any[] };

// Required by CRA's Workbox InjectManifest plugin
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _precacheManifest = self.__WB_MANIFEST || [];

const CACHE_NAME = 'mybudget-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

const API_ORIGINS = [
  'supabase.co',
  'posthog.com',
  'sentry.io',
];

// ─── Install: pre-cache static assets ────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ─── Activate: clean up old caches ───────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch: Cache First for static, Network First for API ────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension requests
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  const isApi = API_ORIGINS.some((origin) => url.hostname.includes(origin));

  if (isApi) {
    // Network First — try network, fall back to cache
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached ?? Response.error()))
    );
  } else {
    // Cache First — serve from cache, update in background
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          return response;
        });
        return cached ?? networkFetch;
      })
    );
  }
});

// ─── Background Sync ─────────────────────────────────────────────────
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-pending-transactions') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) =>
          client.postMessage({ type: 'TRIGGER_SYNC' })
        );
      })
    );
  }
});

export {};
