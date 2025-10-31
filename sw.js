const CACHE_VERSION = '2.1.0';
const CACHE_NAME = `sara-uylar-v${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  `/css/modern-real-estate.css?v=${CACHE_VERSION}`,
  `/js/modern-real-estate-app.js?v=${CACHE_VERSION}`,
  '/images/default-house.svg',
  `/manifest.json?v=${CACHE_VERSION}`
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Installing cache:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
  );
  // Force immediate activation
  self.skipWaiting();
});

// Fetch event
self.addEventListener('fetch', event => {
  // Skip cache for API requests and dynamic content
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('_t=') ||
      event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Always fetch from network for HTML files to get latest version
        if (event.request.url.endsWith('.html') || event.request.url.endsWith('/')) {
          return fetch(event.request).catch(() => response);
        }
        
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old caches
          if (cacheName !== CACHE_NAME && cacheName.startsWith('sara-uylar-')) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Force immediate control of all clients
      return self.clients.claim();
    })
  );
});

// Handle cache update messages
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }).then(() => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({success: true});
      }
    });
  }
});