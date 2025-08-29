const CACHE_NAME = 'darts-manager-v1';
const OFFLINE_URL = '/offline';

// Resources to cache on install
const STATIC_RESOURCES = [
  '/',
  '/dashboard',
  '/attendance',
  '/statistics',
  '/warmup',
  '/offline',
  '/manifest.json'
];

// Install event - cache static resources
self.addEventListener('install', event => {
  console.log('Service Worker: Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('Service Worker: Static resources cached');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache static resources', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activate event');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return response;
        }

        // Try to fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cache successful responses for next time
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Network failed, serve offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            
            // For other requests, just fail
            return new Response('Network error', { 
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Background sync for offline data submission (if supported)
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync event', event.tag);
  
  if (event.tag === 'sync-attendance') {
    event.waitUntil(syncAttendanceData());
  }
  
  if (event.tag === 'sync-scores') {
    event.waitUntil(syncScoreData());
  }
});

// Sync attendance data when back online
async function syncAttendanceData() {
  try {
    // Get pending attendance data from IndexedDB
    const pendingData = await getPendingData('attendance');
    
    if (pendingData && pendingData.length > 0) {
      console.log('Service Worker: Syncing attendance data', pendingData);
      // Send to server (implement actual sync logic here)
      await clearPendingData('attendance');
    }
  } catch (error) {
    console.error('Service Worker: Failed to sync attendance data', error);
  }
}

// Sync score data when back online
async function syncScoreData() {
  try {
    // Get pending score data from IndexedDB
    const pendingData = await getPendingData('scores');
    
    if (pendingData && pendingData.length > 0) {
      console.log('Service Worker: Syncing score data', pendingData);
      // Send to server (implement actual sync logic here)
      await clearPendingData('scores');
    }
  } catch (error) {
    console.error('Service Worker: Failed to sync score data', error);
  }
}

// Helper functions for IndexedDB operations
async function getPendingData(store) {
  return new Promise((resolve, reject) => {
    // Implement IndexedDB read operation
    resolve([]);
  });
}

async function clearPendingData(store) {
  return new Promise((resolve, reject) => {
    // Implement IndexedDB clear operation
    resolve();
  });
}

// Push notification handling (for match reminders)
self.addEventListener('push', event => {
  console.log('Service Worker: Push event received');
  
  const options = {
    body: 'Match reminder: Check your team selection!',
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/dashboard'
    },
    actions: [
      {
        action: 'view',
        title: 'View Dashboard',
        icon: '/icon-96x96.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Darts Manager', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification click event');
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      self.clients.openWindow(event.notification.data.url || '/dashboard')
    );
  }
});