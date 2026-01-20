import { isOnline, onOnlineStatusChange } from "./pwa";
import {
  cacheOrders,
  cacheCommerciaux,
  cacheClients,
  cacheFournisseurs,
  cacheThemes,
  cacheDataCommerciaux,
  cacheDataClients,
  cacheDataSuppliers,
  cacheDataThemes,
  setLastSyncTimestamp,
  getLastSyncTimestamp,
} from "./localDataCache";

type SyncStatus = {
  syncing: boolean;
  lastSync: string | null;
  error: string | null;
};

type SyncListener = (status: SyncStatus) => void;

let syncListeners: SyncListener[] = [];
let isSyncing = false;
let currentStatus: SyncStatus = {
  syncing: false,
  lastSync: null,
  error: null,
};

export function addDataSyncListener(callback: SyncListener): () => void {
  syncListeners.push(callback);
  callback(currentStatus);
  return () => {
    syncListeners = syncListeners.filter(cb => cb !== callback);
  };
}

function notifyListeners(status: SyncStatus) {
  currentStatus = status;
  syncListeners.forEach(cb => cb(status));
}

async function fetchAndCache<T>(
  url: string,
  cacheFunction: (data: T) => Promise<void>
): Promise<T | null> {
  try {
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      if (response.status === 401) return null;
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    await cacheFunction(data);
    return data;
  } catch (error) {
    console.error(`Erreur fetch ${url}:`, error);
    return null;
  }
}

async function fetchPaginatedAndCache<T>(
  url: string,
  cacheFunction: (data: T[]) => Promise<void>
): Promise<T[] | null> {
  try {
    const response = await fetch(`${url}?page=1&pageSize=10000`, { credentials: "include" });
    if (!response.ok) {
      if (response.status === 401) return null;
      throw new Error(`HTTP ${response.status}`);
    }
    const result = await response.json();
    const data = result.data || result;
    await cacheFunction(Array.isArray(data) ? data : []);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Erreur fetch ${url}:`, error);
    return null;
  }
}

export async function syncAllDataFromServer(): Promise<boolean> {
  if (isSyncing || !isOnline()) {
    return false;
  }

  isSyncing = true;
  notifyListeners({ syncing: true, lastSync: currentStatus.lastSync, error: null });

  try {
    const results = await Promise.allSettled([
      fetchPaginatedAndCache("/api/orders", cacheOrders),
      fetchPaginatedAndCache("/api/admin/commerciaux", cacheCommerciaux),
      fetchPaginatedAndCache("/api/admin/clients", cacheClients),
      fetchPaginatedAndCache("/api/admin/fournisseurs", cacheFournisseurs),
      fetchPaginatedAndCache("/api/admin/themes", cacheThemes),
      fetchAndCache("/api/data/commerciaux", cacheDataCommerciaux),
      fetchAndCache("/api/data/clients", cacheDataClients),
      fetchAndCache("/api/data/suppliers", cacheDataSuppliers),
      fetchAndCache("/api/data/themes", cacheDataThemes),
    ]);

    const hasErrors = results.some(r => r.status === "rejected");
    
    await setLastSyncTimestamp();
    const lastSync = new Date().toISOString();

    isSyncing = false;
    notifyListeners({
      syncing: false,
      lastSync,
      error: hasErrors ? "Certaines données n'ont pas pu être synchronisées" : null,
    });

    return !hasErrors;
  } catch (error: any) {
    isSyncing = false;
    notifyListeners({
      syncing: false,
      lastSync: currentStatus.lastSync,
      error: error.message || "Erreur de synchronisation",
    });
    return false;
  }
}

export async function initDataSync(): Promise<() => void> {
  const lastSync = await getLastSyncTimestamp();
  currentStatus.lastSync = lastSync;
  notifyListeners(currentStatus);

  if (isOnline()) {
    syncAllDataFromServer();
  }

  const unsubscribe = onOnlineStatusChange(async (online) => {
    if (online) {
      console.log("Connexion rétablie - synchronisation des données...");
      await syncAllDataFromServer();
    }
  });

  return unsubscribe;
}

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}
