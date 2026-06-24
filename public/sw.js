const CACHE_NAME = 'heypass-v2';
const STATIC_CACHE = 'heypass-static-v2';
const DYNAMIC_CACHE = 'heypass-dynamic-v2';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline',
  '/globals.css',
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate - clean ALL old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API requests and auth
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth')) {
    return;
  }

  // Skip external resources
  if (url.origin !== self.location.origin) {
    return;
  }

  // For navigation requests (HTML pages), use network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/offline');
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cache, fetch in background to update
        event.waitUntil(
          fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, networkResponse.clone());
              });
            }
          }).catch(() => {})
        );
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network failed, return offline page for navigation
        if (request.mode === 'navigate') {
          return caches.match('/offline');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Background sync for offline scans
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-scans') {
    event.waitUntil(syncOfflineScans());
  }
});

async function syncOfflineScans() {
  try {
    const cache = await caches.open('offline-scans');
    const requests = await cache.keys();

    for (const request of requests) {
      const response = await cache.match(request);
      const data = await response.json();

      await fetch('/api/offline/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      await cache.delete(request);
    }
  } catch (error) {
    console.error('Failed to sync offline scans:', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title || 'HeyPass', {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: data.url,
      actions: data.actions || [],
    })
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data || '/';
  event.waitUntil(
    self.clients.openWindow(url)
  );
});
