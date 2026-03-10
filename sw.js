// CoastCheck NZ — Service Worker
// Caches shell for offline, always fetches fresh data from APIs

const CACHE_NAME = 'coastcheck-v3';
const SHELL = [
  '/',
  '/index.html',
  '/spot.html',
  '/stoke.html',
  '/admin.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Install — cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - API calls (open-meteo, marine-api) → network only, never cache (live data)
// - App shell → cache first, fall back to network
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Always hit network for live API data
  if (
    url.includes('open-meteo.com') ||
    url.includes('marine-api.open-meteo.com') ||
    url.includes('api.open-meteo.com')
  ) {
    e.respondWith(fetch(e.request));
    return;
  }

  // App shell — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        // Cache new pages as they're visited
        if (response.ok && e.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — return index
        return caches.match('/index.html');
      });
    })
  );
});
