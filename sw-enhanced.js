// Sara Uylar - Enhanced Service Worker
const CACHE_NAME = 'sara-uylar-v2.0';
const STATIC_CACHE = 'sara-uylar-static-v2.0';
const DYNAMIC_CACHE = 'sara-uylar-dynamic-v2.0';
const IMAGE_CACHE = 'sara-uylar-images-v2.0';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/index.html',
    '/modern-index.html',
    '/css/modern-real-estate.css',
    '/js/modern-real-estate-app.js',
    '/images/default-house.svg',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// API endpoints to cache
const API_ENDPOINTS = [
    '/api/listings.php',
    '/api/listing.php'
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('SW: Installing...');
    
    event.waitUntil(
        Promise.all([
            caches.open(STATIC_CACHE).then(cache => {
                console.log('SW: Caching static files');
                return cache.addAll(STATIC_FILES);
            }),
            self.skipWaiting()
        ])
    );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
    console.log('SW: Activating...');
    
    event.waitUntil(
        Promise.all([
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE && 
                            cacheName !== IMAGE_CACHE) {
                            console.log('SW: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            self.clients.claim()
        ])
    );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Handle different types of requests
    if (request.method === 'GET') {
        if (isStaticFile(url.pathname)) {
            event.respondWith(cacheFirst(request, STATIC_CACHE));
        } else if (isAPIRequest(url.pathname)) {
            event.respondWith(networkFirst(request, DYNAMIC_CACHE));
        } else if (isImageRequest(request)) {
            event.respondWith(cacheFirst(request, IMAGE_CACHE));
        } else {
            event.respondWith(networkFirst(request, DYNAMIC_CACHE));
        }
    }
});

// Background sync for offline actions
self.addEventListener('sync', event => {
    console.log('SW: Background sync:', event.tag);
    
    if (event.tag === 'sync-listings') {
        event.waitUntil(syncListings());
    } else if (event.tag === 'sync-favorites') {
        event.waitUntil(syncFavorites());
    }
});

// Push notifications
self.addEventListener('push', event => {
    console.log('SW: Push received');
    
    const options = {
        body: event.data ? event.data.text() : 'Yangi e\'lon qo\'shildi!',
        icon: '/images/icon-192.png',
        badge: '/images/badge-72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Ko\'rish',
                icon: '/images/checkmark.png'
            },
            {
                action: 'close',
                title: 'Yopish',
                icon: '/images/xmark.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Sara Uylar', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    console.log('SW: Notification click');
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Helper functions
function isStaticFile(pathname) {
    return pathname.endsWith('.css') || 
           pathname.endsWith('.js') || 
           pathname.endsWith('.html') ||
           pathname.endsWith('.svg') ||
           pathname === '/' ||
           pathname.includes('/fonts/');
}

function isAPIRequest(pathname) {
    return pathname.startsWith('/api/');
}

function isImageRequest(request) {
    return request.destination === 'image' ||
           request.url.includes('/uploads/') ||
           request.url.includes('/images/');
}

// Cache strategies
async function cacheFirst(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            // Update cache in background
            fetch(request).then(response => {
                if (response.ok) {
                    cache.put(request, response.clone());
                }
            }).catch(() => {});
            
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('SW: Cache first failed:', error);
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('SW: Network failed, trying cache');
        
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            return caches.match('/offline.html') || 
                   new Response('Offline', { status: 503 });
        }
        
        return new Response('Offline', { status: 503 });
    }
}

// Background sync functions
async function syncListings() {
    try {
        console.log('SW: Syncing listings...');
        
        // Get pending listings from IndexedDB
        const pendingListings = await getPendingListings();
        
        for (const listing of pendingListings) {
            try {
                const response = await fetch('/api/listings.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(listing)
                });
                
                if (response.ok) {
                    await removePendingListing(listing.id);
                    console.log('SW: Listing synced successfully');
                }
            } catch (error) {
                console.error('SW: Failed to sync listing:', error);
            }
        }
    } catch (error) {
        console.error('SW: Sync listings failed:', error);
    }
}

async function syncFavorites() {
    try {
        console.log('SW: Syncing favorites...');
        // Implementation for syncing favorites
    } catch (error) {
        console.error('SW: Sync favorites failed:', error);
    }
}

// IndexedDB helpers (simplified)
async function getPendingListings() {
    // Return empty array for now
    return [];
}

async function removePendingListing(id) {
    // Implementation for removing from IndexedDB
}

// Message handler for communication with main thread
self.addEventListener('message', event => {
    console.log('SW: Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(DYNAMIC_CACHE).then(cache => {
                return cache.addAll(event.data.payload);
            })
        );
    }
});

console.log('SW: Service Worker loaded');