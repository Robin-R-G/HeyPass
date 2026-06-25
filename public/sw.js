const CACHE_NAME = 'heypass-v3';

// Install — skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate — delete ALL old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          console.log('[SW] Deleting cache:', name);
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch — NEVER cache JS/CSS/HTML, always network-first
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip API, auth, external
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth')) return;
  if (url.origin !== self.location.origin) return;

  // Skip all _next/ resources (JS, CSS, chunks) — always network
  if (url.pathname.startsWith('/_next/')) return;

  // For navigation (HTML), network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match('/offline') || new Response('Offline', { status: 503 }))
    );
    return;
  }

  // For everything else (images, fonts, etc), network-first
  event.respondWith(
    fetch(request)
      .then((response) => response)
      .catch(() => caches.match(request) || new Response('Offline', { status: 503 }))
  );
});

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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(self.clients.openWindow(url));
});
