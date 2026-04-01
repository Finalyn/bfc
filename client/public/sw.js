const STATIC_CACHE = 'bfc-static-v5';
const DATA_CACHE = 'bfc-data-v5';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

const DATA_URLS = [
  '/api/data/commerciaux',
  '/api/data/clients',
  '/api/data/fournisseurs',
  '/api/data/themes',
];

// Versions de cache à conserver
const VALID_CACHES = [STATIC_CACHE, DATA_CACHE];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('bfc-') && !VALID_CACHES.includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// === BACKGROUND SYNC ===
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncPendingOrdersInBackground());
  }
});

async function syncPendingOrdersInBackground() {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction('offline_orders', 'readonly');
    const store = tx.objectStore('offline_orders');
    const allOrders = await promisifyRequest(store.getAll());

    // Sync orders that haven't been sent to server yet
    const pendingOrders = allOrders.filter(order => !order.syncedToServer);

    let syncedCount = 0;
    let failedCount = 0;

    for (const offlineOrder of pendingOrders) {
      try {
        const response = await fetch('/api/orders/sync-offline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: offlineOrder.order })
        });

        if (response.ok) {
          const result = await response.json();

          const updateTx = db.transaction('offline_orders', 'readwrite');
          const updateStore = updateTx.objectStore('offline_orders');
          offlineOrder.syncedToServer = true;
          offlineOrder.syncedAt = new Date().toISOString();
          offlineOrder.emailSent = result.emailsSent || false;
          if (result.emailError) offlineOrder.emailError = result.emailError;
          await promisifyRequest(updateStore.put(offlineOrder));

          syncedCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error('Erreur sync ordre:', error);
        failedCount++;
      }
    }

    // Notification de résultat
    if (syncedCount > 0) {
      await self.registration.showNotification('BFC APP - Synchronisation', {
        body: `${syncedCount} commande(s) synchronisée(s) avec succès`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        tag: 'sync-complete',
        renotify: true
      });
    }

    // Notifier l'app
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        success: syncedCount,
        failed: failedCount
      });
    });

  } catch (error) {
    console.error('Background sync error:', error);
  }
}

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('bfc_offline_db', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline_orders')) {
        const store = db.createObjectStore('offline_orders', { keyPath: 'id' });
        store.createIndex('emailSent', 'emailSent', { unique: false });
        store.createIndex('syncedToServer', 'syncedToServer', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// === PUSH NOTIFICATIONS ===
self.addEventListener('push', (event) => {
  let title = 'BFC APP';
  let options = {
    body: 'Nouvelle notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: { url: '/' },
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'close', title: 'Fermer' }
    ]
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.title || title;
      options.body = payload.body || options.body;
      if (payload.icon) options.icon = payload.icon;
      if (payload.badge) options.badge = payload.badge;
      if (payload.tag) options.tag = payload.tag;
      if (payload.data) options.data = payload.data;
    } catch (e) {
      options.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const rawUrl = (event.notification.data && event.notification.data.url) || '/';
  // Validate URL is a relative path within our app (prevent open-redirect)
  const targetUrl = rawUrl.startsWith('/') ? rawUrl : '/';
  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Chercher un onglet/fenêtre déjà ouvert
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Naviguer vers la bonne page et focus
          return client.focus().then((focusedClient) => {
            if (focusedClient) {
              focusedClient.postMessage({ type: 'NAVIGATE', url: targetUrl });
            }
          });
        }
      }
      // Aucun onglet ouvert — ouvrir une nouvelle fenêtre
      return clients.openWindow(fullUrl);
    })
  );
});

// === FETCH HANDLER ===
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Data API URLs: network-first, cache fallback
  if (DATA_URLS.some(dataUrl => url.pathname.startsWith(dataUrl))) {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            // Only cache valid JSON responses to prevent cache poisoning
            const contentType = networkResponse.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              cache.put(request, networkResponse.clone());
            }
          }
          return networkResponse;
        } catch (error) {
          const cachedResponse = await cache.match(request);
          if (cachedResponse) return cachedResponse;
          return new Response(JSON.stringify({ error: 'Hors ligne' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })
    );
    return;
  }

  // Other API calls: let them pass through (no caching)
  if (url.pathname.startsWith('/api/')) return;

  // App assets (JS, CSS, HTML, images): cache-first with network update
  // This ensures the app works offline after the first visit
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Return cache immediately if available
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok && networkResponse.type === 'basic' && request.url.startsWith(self.location.origin)) {
          const responseClone = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback for navigation
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
        return null;
      });

      // If cached, return immediately; otherwise wait for network
      if (cachedResponse) {
        // Update cache in background (stale-while-revalidate)
        fetchPromise;
        return cachedResponse;
      }
      return fetchPromise.then(response => {
        if (response) return response;
        // Last resort for navigation
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Hors ligne', { status: 503 });
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_DATA') {
    event.waitUntil(
      caches.open(DATA_CACHE).then(async (cache) => {
        for (const url of DATA_URLS) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
            }
          } catch (e) {
            console.log('Failed to cache:', url);
          }
        }
      })
    );
  }

  if (event.data && event.data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name === DATA_CACHE)
            .map((name) => caches.delete(name))
        );
      })
    );
  }
});
