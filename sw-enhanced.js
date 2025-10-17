const CACHE_NAME = 'sara-uylar-v2';
const STATIC_CACHE = 'sara-static-v2';
const DYNAMIC_CACHE = 'sara-dynamic-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/material-you.css',
  '/js/enhanced-app.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Google+Sans:wght@300;400;500;600;700&display=swap'
];

const CACHE_STRATEGIES = {
  '/api/': 'networkFirst',
  '/uploads/': 'cacheFirst',
  '.css': 'staleWhileRevalidate',
  '.js': 'staleWhileRevalidate',
  '.jpg': 'cacheFirst',
  '.png': 'cacheFirst',
  '.webp': 'cacheFirst'
};

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event with advanced caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Determine cache strategy
  let strategy = 'networkFirst'; // default
  
  for (const [pattern, strategyName] of Object.entries(CACHE_STRATEGIES)) {
    if (url.pathname.includes(pattern) || url.pathname.endsWith(pattern)) {
      strategy = strategyName;
      break;
    }
  }
  
  event.respondWith(
    handleRequest(request, strategy)
  );
});

async function handleRequest(request, strategy) {
  switch (strategy) {
    case 'cacheFirst':
      return cacheFirst(request);
    case 'networkFirst':
      return networkFirst(request);
    case 'staleWhileRevalidate':
      return staleWhileRevalidate(request);
    default:
      return networkFirst(request);
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Network failed, no cache available');
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  const networkResponsePromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        const cache = caches.open(DYNAMIC_CACHE);
        cache.then(c => c.put(request, networkResponse.clone()));
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);
  
  return cachedResponse || networkResponsePromise;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle offline actions when back online
  const offlineActions = await getOfflineActions();
  
  for (const action of offlineActions) {
    try {
      await processOfflineAction(action);
      await removeOfflineAction(action.id);
    } catch (error) {
      console.log('Failed to sync action:', error);
    }
  }
}

async function getOfflineActions() {
  // Get offline actions from IndexedDB
  return [];
}

async function processOfflineAction(action) {
  // Process offline action
  switch (action.type) {
    case 'add-listing':
      await fetch('/api/listings.php', {
        method: 'POST',
        body: JSON.stringify(action.data)
      });
      break;
    case 'toggle-favorite':
      // Handle favorite toggle
      break;
  }
}

async function removeOfflineAction(id) {
  // Remove processed action from IndexedDB
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: data.tag || 'sara-notification',
    data: data.data || {},
    actions: [
      {
        action: 'view',
        title: 'Ko\'rish'
      },
      {
        action: 'dismiss',
        title: 'Yopish'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Message handling for cache updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then(cache => cache.addAll(event.data.urls))
    );
  }
});