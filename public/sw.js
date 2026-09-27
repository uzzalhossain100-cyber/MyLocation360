// MyLocation360 - Service Worker with PWA Widgets & Shortcuts Support
const CACHE_NAME = 'mylocation360-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/app.js',
  '/js/map.js',
  '/js/weather.js',
  '/js/animation.js',
  '/assets/icon-192.svg',
  '/assets/icon-512.svg',
  '/widgets/location.json',
  '/widgets/location-data.json',
  '/widgets/weather.json',
  '/widgets/weather-data.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Let network handle API and tiles directly
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('tile') || 
      event.request.url.includes('windy') || 
      event.request.url.includes('open-meteo')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => cachedResponse);
    })
  );
});

// PWA Widgets Lifecycle Handlers (W3C Widgets API)
self.addEventListener('widgetinstall', (event) => {
  console.log('[ServiceWorker] Widget installed:', event.widget.tag);
  event.waitUntil(renderWidget(event.widget));
});

self.addEventListener('widgetresume', (event) => {
  console.log('[ServiceWorker] Widget resumed:', event.widget.tag);
  event.waitUntil(renderWidget(event.widget));
});

self.addEventListener('widgetclick', (event) => {
  console.log('[ServiceWorker] Widget clicked:', event.widget.tag, event.action);
  if (event.widget.tag === 'mylocation-widget') {
    event.waitUntil(clients.openWindow('/?feature=location'));
  } else if (event.widget.tag === 'weather-widget') {
    event.waitUntil(clients.openWindow('/?feature=weather'));
  }
});

async function renderWidget(widget) {
  // Render MS Adaptive Cards or custom JSON payload for PWA Widget Host
  try {
    const templatePath = widget.definition.msAcTemplate;
    const dataPath = widget.definition.data;
    const template = await (await fetch(templatePath)).text();
    const data = await (await fetch(dataPath)).text();
    await self.widgets.updateByTag(widget.tag, { template, data });
  } catch (err) {
    console.warn('[ServiceWorker] Widget render err:', err);
  }
}
