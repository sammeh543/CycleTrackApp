// Service Worker for CycleSense PWA

const CACHE_NAME = 'cyclesense-v2';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html'
];

// Install event - precache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const currentCaches = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or fetch from network
self.addEventListener('fetch', event => {
  // For API requests, always go to network first
  if (event.request.url.includes('/api/')) {
    event.respondWith(networkFirst(event.request));
  }
  // For non-API requests, try cache first
  else {
    event.respondWith(cacheFirst(event.request));
  }
});

// Cache-first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // If fetch fails and we don't have a cached response, show fallback
    return caches.match('/index.html');
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    // Try to get from network first
    const networkResponse = await fetch(request);
    
    // Clone and cache only GET responses
    if (request.method === 'GET' && networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      try {
        await cache.put(request, networkResponse.clone());
      } catch (e) {
        console.warn('Service Worker: cache.put failed', e);
      }
    }
    return networkResponse;
  } catch (error) {
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cached response and network failed, return error
    return new Response(JSON.stringify({ error: 'Network request failed' }), {
      status: 408,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
