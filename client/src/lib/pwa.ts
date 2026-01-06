const DB_NAME = 'bdis-offline-db';
const DB_VERSION = 1;
const ORDERS_STORE = 'pendingOrders';
const DATA_STORE = 'cachedData';

let db: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      if (!database.objectStoreNames.contains(ORDERS_STORE)) {
        const ordersStore = database.createObjectStore(ORDERS_STORE, { keyPath: 'id', autoIncrement: true });
        ordersStore.createIndex('status', 'status', { unique: false });
        ordersStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      
      if (!database.objectStoreNames.contains(DATA_STORE)) {
        database.createObjectStore(DATA_STORE, { keyPath: 'key' });
      }
    };
  });
}

export async function savePendingOrder(orderData: any): Promise<number> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([ORDERS_STORE], 'readwrite');
    const store = transaction.objectStore(ORDERS_STORE);
    
    const order = {
      ...orderData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    
    const request = store.add(order);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingOrders(): Promise<any[]> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([ORDERS_STORE], 'readonly');
    const store = transaction.objectStore(ORDERS_STORE);
    const index = store.index('status');
    const request = index.getAll('pending');
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function updateOrderStatus(id: number, status: string): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([ORDERS_STORE], 'readwrite');
    const store = transaction.objectStore(ORDERS_STORE);
    
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const order = getRequest.result;
      if (order) {
        order.status = status;
        order.syncedAt = status === 'synced' ? new Date().toISOString() : undefined;
        const putRequest = store.put(order);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function deletePendingOrder(id: number): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([ORDERS_STORE], 'readwrite');
    const store = transaction.objectStore(ORDERS_STORE);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function cacheData(key: string, data: any): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([DATA_STORE], 'readwrite');
    const store = transaction.objectStore(DATA_STORE);
    
    const request = store.put({ key, data, cachedAt: new Date().toISOString() });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedData(key: string): Promise<any | null> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([DATA_STORE], 'readonly');
    const store = transaction.objectStore(DATA_STORE);
    const request = store.get(key);
    
    request.onsuccess = () => resolve(request.result?.data || null);
    request.onerror = () => reject(request.error);
  });
}

export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker enregistré:', registration.scope);
        
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('Nouvelle version disponible');
              }
            });
          }
        });
      } catch (error) {
        console.error('Erreur enregistrement Service Worker:', error);
      }
    });
  }
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

export async function syncPendingOrders(submitFn: (order: any) => Promise<any>): Promise<{ synced: number; failed: number }> {
  const pendingOrders = await getPendingOrders();
  let synced = 0;
  let failed = 0;
  
  for (const order of pendingOrders) {
    try {
      await submitFn(order);
      await updateOrderStatus(order.id, 'synced');
      synced++;
    } catch (error) {
      console.error('Erreur sync order:', order.id, error);
      failed++;
    }
  }
  
  return { synced, failed };
}

let deferredPrompt: any = null;

export function setupInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  });
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  
  return outcome === 'accepted';
}

export function canInstall(): boolean {
  return deferredPrompt !== null;
}
