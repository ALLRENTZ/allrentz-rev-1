// ALLRENTZ Service Worker - Enterprise Offline Support
// Version 1.0.0

const CACHE_NAME = 'allrentz-v1';
const STATIC_CACHE_NAME = 'allrentz-static-v1';
const DYNAMIC_CACHE_NAME = 'allrentz-dynamic-v1';

// Critical resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html', // Fallback page
];

// Routes that should work offline
const OFFLINE_ROUTES = [
  '/',
  '/browse',
  '/how-it-works',
  '/customer-dashboard',
  '/vendor-dashboard'
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/equipment',
  '/api/categories',
  '/api/vendors'
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { url, method } = request;

  // Only handle GET requests
  if (method !== 'GET') return;

  // Handle different resource types with appropriate strategies
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
  } else if (isAPIRequest(url)) {
    event.respondWith(networkFirstWithFallback(request, DYNAMIC_CACHE_NAME));
  } else if (isNavigationRequest(request)) {
    event.respondWith(navigationHandler(request));
  } else {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE_NAME));
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'equipment-request') {
    event.waitUntil(syncEquipmentRequests());
  } else if (event.tag === 'quote-request') {
    event.waitUntil(syncQuoteRequests());
  }
});

// Push notifications for equipment updates
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received');
  
  const options = {
    body: 'Equipment availability update',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: event.data ? event.data.json() : {},
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/icons/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('ALLRENTZ', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/equipment/' + event.notification.data.equipmentId)
    );
  }
});

// Caching Strategies Implementation

// Cache First - for static assets
async function cacheFirst(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('📦 Cache hit:', request.url);
      return cachedResponse;
    }

    console.log('🌐 Cache miss, fetching:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('❌ Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network First with Fallback - for API requests
async function networkFirstWithFallback(request, cacheName) {
  try {
    console.log('🌐 Network first:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📦 Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Add offline indicator header
      const response = cachedResponse.clone();
      response.headers.set('X-Served-By', 'ServiceWorker-Cache');
      return response;
    }
    
    // Return offline fallback for API requests
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'This content is not available offline',
      cached: false
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Stale While Revalidate - for images and other resources
async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      const cache = caches.open(cacheName);
      cache.then(c => c.put(request, networkResponse.clone()));
    }
    return networkResponse;
  }).catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

// Navigation Handler - for SPA routes
async function navigationHandler(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // If offline, serve cached routes or fallback
    const url = new URL(request.url);
    
    // Check if route should work offline
    if (OFFLINE_ROUTES.includes(url.pathname)) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      const cachedResponse = await cache.match('/');
      if (cachedResponse) return cachedResponse;
    }
    
    // Serve offline fallback page
    const cache = await caches.open(STATIC_CACHE_NAME);
    const offlinePage = await cache.match('/offline.html');
    return offlinePage || new Response('Offline', { status: 503 });
  }
}

// Helper Functions

function isStaticAsset(url) {
  return url.includes('/assets/') || 
         url.includes('/icons/') ||
         url.includes('.css') ||
         url.includes('.js') ||
         url.includes('.woff') ||
         url.includes('.woff2');
}

function isAPIRequest(url) {
  return url.includes('/api/') || 
         url.includes('supabase.co') ||
         CACHEABLE_APIS.some(api => url.includes(api));
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && 
          request.headers.get('accept').includes('text/html'));
}

// Background Sync Handlers

async function syncEquipmentRequests() {
  try {
    console.log('🔄 Syncing equipment requests...');
    
    // Get pending requests from IndexedDB
    const pendingRequests = await getPendingRequests('equipment-requests');
    
    for (const request of pendingRequests) {
      try {
        const response = await fetch('/api/equipment/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request.data)
        });
        
        if (response.ok) {
          await removePendingRequest('equipment-requests', request.id);
          console.log('✅ Synced equipment request:', request.id);
        }
      } catch (error) {
        console.error('❌ Failed to sync request:', request.id, error);
      }
    }
  } catch (error) {
    console.error('❌ Equipment sync failed:', error);
  }
}

async function syncQuoteRequests() {
  try {
    console.log('🔄 Syncing quote requests...');
    
    const pendingRequests = await getPendingRequests('quote-requests');
    
    for (const request of pendingRequests) {
      try {
        const response = await fetch('/api/quotes/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request.data)
        });
        
        if (response.ok) {
          await removePendingRequest('quote-requests', request.id);
          console.log('✅ Synced quote request:', request.id);
        }
      } catch (error) {
        console.error('❌ Failed to sync quote:', request.id, error);
      }
    }
  } catch (error) {
    console.error('❌ Quote sync failed:', error);
  }
}

// IndexedDB helpers (simplified - would use idb library in production)
async function getPendingRequests(storeName) {
  // In production, implement proper IndexedDB operations
  return [];
}

async function removePendingRequest(storeName, id) {
  // In production, implement proper IndexedDB operations
  return true;
}

// Service Worker messaging
self.addEventListener('message', (event) => {
  console.log('📨 Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('🎯 ALLRENTZ Service Worker loaded successfully');