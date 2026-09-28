// MyLocation360 - Service Worker (Network-First & Instant Cache Purge)
const CACHE_NAME = 'mylocation360-v5-live';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First Strategy: ALWAYS fetch fresh from live network!
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If successful network response, return directly
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache only when offline
        return caches.match(event.request);
      })
  );
});

// PWA Widgets Lifecycle Handlers
self.addEventListener('widgetinstall', (event) => {
  console.log('[ServiceWorker] Widget installed:', event.widget.tag);
});

self.addEventListener('widgetclick', (event) => {
  if (event.widget.tag === 'mylocation-widget') {
    event.waitUntil(clients.openWindow('/?feature=location'));
  } else if (event.widget.tag === 'weather-widget') {
    event.waitUntil(clients.openWindow('/?feature=weather'));
  }
});
