// ClimaStyle Service Worker v1.2
const CACHE_VERSION = 'climastyle-v1.2';
const API_CACHE = 'climastyle-api-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './css/components.css',
  './css/animations.css',
  './js/app.js',
  './js/weather-api.js',
  './js/recommendations.js',
  './js/ui.js',
  './js/storage.js',
  './js/geolocation.js',
  './js/utils.js',
  './manifest.json',
  './favicon.svg'
];

// ── Install: cache static assets ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION && key !== API_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: route strategy ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // API calls → Stale-While-Revalidate
  if (url.hostname.includes('open-meteo.com')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Static assets → Cache-First
  event.respondWith(handleStaticRequest(request));
});

async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);

  // Return cached immediately, but also update in background
  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => {
      // Network failed, return cached if available
      return cached || new Response(
        JSON.stringify({ error: 'Sin conexión' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    });

  // If we have cached data, return it immediately (stale)
  // and let the fetch update the cache in background
  return cached || fetchPromise;
}

async function handleStaticRequest(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline fallback for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('./index.html');
    }
    return new Response('Offline', { status: 503 });
  }
}

