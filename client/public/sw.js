const CACHE_NAME = 'bfc-app-v3';
const STATIC_CACHE = 'bfc-static-v3';
const DATA_CACHE = 'bfc-data-v3';
const PDF_CACHE = 'bfc-pdf-v1';

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
          .filter((name) => name.startsWith('bfc-') && !name.includes('-v3') && !name.includes('-v1'))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Background Sync - synchronisation automatique quand le réseau revient
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncPendingOrdersInBackground());
  }
});

async function syncPendingOrdersInBackground() {
  try {
    // Récupérer les commandes en attente depuis IndexedDB
    const db = await openOfflineDB();
    const tx = db.transaction('offline_orders', 'readonly');
    const store = tx.objectStore('offline_orders');
    const allOrders = await promisifyRequest(store.getAll());
    
    const pendingOrders = allOrders.filter(order => !order.syncedToServer || !order.emailSent);
    
    let successCount = 0;
    let failedCount = 0;
    
    for (const offlineOrder of pendingOrders) {
      try {
        // Synchroniser avec le serveur
        const response = await fetch('/api/orders/sync-offline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: offlineOrder.order })
        });
        
        if (response.ok) {
          const result = await response.json();
          
          // Mettre à jour le statut dans IndexedDB
          const updateTx = db.transaction('offline_orders', 'readwrite');
          const updateStore = updateTx.objectStore('offline_orders');
          offlineOrder.syncedToServer = true;
          offlineOrder.emailSent = result.emailsSent;
          if (result.emailError) offlineOrder.emailError = result.emailError;
          await promisifyRequest(updateStore.put(offlineOrder));
          
          if (result.emailsSent) successCount++;
          else failedCount++;
        }
      } catch (error) {
        console.error('Erreur sync ordre:', error);
        failedCount++;
      }
    }
    
    // Envoyer notification si des commandes ont été synchronisées
    if (successCount > 0) {
      await self.registration.showNotification('BFC APP - Synchronisation', {
        body: `${successCount} commande(s) synchronisée(s) et email(s) envoyé(s)`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        tag: 'sync-complete',
        renotify: true
      });
    }
    
    // Notifier les clients de la mise à jour
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        success: successCount,
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
      // Utiliser le même nom de store que l'application: "offline_orders"
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

self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification BFC APP',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'close', title: 'Fermer' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('BFC APP', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'close') return;
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (DATA_URLS.some(dataUrl => url.pathname.startsWith(dataUrl))) {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response(JSON.stringify({ error: 'Hors ligne' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (networkResponse.ok && request.url.startsWith(self.location.origin)) {
          const responseClone = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
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
});
