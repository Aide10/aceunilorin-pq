const CACHE_NAME = 'aceunilorin-pq-v1';

// Core assets to cache on install (shell caching)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: cache static shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network-first for Firebase/Paystack, Cache-first for static assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go network for Firebase, Paystack, and external APIs
  const networkOnly = [
    'firebaseio.com',
    'googleapis.com',
    'paystack.co',
    'firestore.googleapis.com',
    'identitytoolkit.googleapis.com'
  ];

  if (networkOnly.some(domain => url.hostname.includes(domain))) {
    return; // Let browser handle it normally
  }

  // For same-origin requests: Cache-first, fallback to network
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          // Cache successful GET responses
          if (
            event.request.method === 'GET' &&
            response.status === 200
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      }).catch(() => {
        // Offline fallback: return cached index.html for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
    );
  }
});

