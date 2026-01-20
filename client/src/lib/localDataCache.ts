import { cacheData, getCachedData, initDB } from "./pwa";
import type { OrderDb, Commercial, Client, Fournisseur, Theme } from "@shared/schema";

const CACHE_KEYS = {
  ORDERS: "orders_cache",
  COMMERCIAUX: "commerciaux_cache",
  CLIENTS: "clients_cache",
  FOURNISSEURS: "fournisseurs_cache",
  THEMES: "themes_cache",
  DATA_COMMERCIAUX: "data_commerciaux_cache",
  DATA_CLIENTS: "data_clients_cache",
  DATA_SUPPLIERS: "data_suppliers_cache",
  DATA_THEMES: "data_themes_cache",
  LAST_SYNC: "last_sync_timestamp",
} as const;

export interface CachedDataWithMeta<T> {
  data: T;
  cachedAt: string;
  fromServer: boolean;
}

export async function cacheOrders(orders: OrderDb[]): Promise<void> {
  await cacheData(CACHE_KEYS.ORDERS, {
    data: orders,
    cachedAt: new Date().toISOString(),
    fromServer: true,
  });
}

export async function getCachedOrders(): Promise<OrderDb[] | null> {
  const cached = await getCachedData(CACHE_KEYS.ORDERS);
  return cached?.data || null;
}

export async function cacheCommerciaux(commerciaux: Commercial[]): Promise<void> {
  await cacheData(CACHE_KEYS.COMMERCIAUX, {
    data: commerciaux,
    cachedAt: new Date().toISOString(),
    fromServer: true,
  });
}

export async function getCachedCommerciaux(): Promise<Commercial[] | null> {
  const cached = await getCachedData(CACHE_KEYS.COMMERCIAUX);
  return cached?.data || null;
}

export async function cacheClients(clients: Client[]): Promise<void> {
  await cacheData(CACHE_KEYS.CLIENTS, {
    data: clients,
    cachedAt: new Date().toISOString(),
    fromServer: true,
  });
}

export async function getCachedClients(): Promise<Client[] | null> {
  const cached = await getCachedData(CACHE_KEYS.CLIENTS);
  return cached?.data || null;
}

export async function cacheFournisseurs(fournisseurs: Fournisseur[]): Promise<void> {
  await cacheData(CACHE_KEYS.FOURNISSEURS, {
    data: fournisseurs,
    cachedAt: new Date().toISOString(),
    fromServer: true,
  });
}

export async function getCachedFournisseurs(): Promise<Fournisseur[] | null> {
  const cached = await getCachedData(CACHE_KEYS.FOURNISSEURS);
  return cached?.data || null;
}

export async function cacheThemes(themes: Theme[]): Promise<void> {
  await cacheData(CACHE_KEYS.THEMES, {
    data: themes,
    cachedAt: new Date().toISOString(),
    fromServer: true,
  });
}

export async function getCachedThemes(): Promise<Theme[] | null> {
  const cached = await getCachedData(CACHE_KEYS.THEMES);
  return cached?.data || null;
}

export async function cacheDataCommerciaux(data: string[]): Promise<void> {
  await cacheData(CACHE_KEYS.DATA_COMMERCIAUX, {
    data,
    cachedAt: new Date().toISOString(),
    fromServer: true,
  });
}

export async function getCachedDataCommerciaux(): Promise<string[] | null> {
  const cached = await getCachedData(CACHE_KEYS.DATA_COMMERCIAUX);
  return cached?.data || null;
}

export async function cacheDataClients(data: Array<{ code: string; nom: string }>): Promise<void> {
  await cacheData(CACHE_KEYS.DATA_CLIENTS, {
    data,
    cachedAt: new Date().toISOString(),
    fromServer: true,
  });
}

export async function getCachedDataClients(): Promise<Array<{ code: string; nom: string }> | null> {
  const cached = await getCachedData(CACHE_KEYS.DATA_CLIENTS);
  return cached?.data || null;
}

interface FournisseurData {
  id: number;
  nom: string;
  nomCourt: string;
}

export async function cacheDataSuppliers(data: FournisseurData[]): Promise<void> {
  await cacheData(CACHE_KEYS.DATA_SUPPLIERS, {
    data,
    cachedAt: new Date().toISOString(),
    fromServer: true,
  });
}

export async function getCachedDataSuppliers(): Promise<FournisseurData[] | null> {
  const cached = await getCachedData(CACHE_KEYS.DATA_SUPPLIERS);
  return cached?.data || null;
}

export async function cacheDataThemes(data: Array<{ theme: string; fournisseur: string; categorie: string }>): Promise<void> {
  await cacheData(CACHE_KEYS.DATA_THEMES, {
    data,
    cachedAt: new Date().toISOString(),
    fromServer: true,
  });
}

export async function getCachedDataThemes(): Promise<Array<{ theme: string; fournisseur: string; categorie: string }> | null> {
  const cached = await getCachedData(CACHE_KEYS.DATA_THEMES);
  return cached?.data || null;
}

export async function setLastSyncTimestamp(): Promise<void> {
  await cacheData(CACHE_KEYS.LAST_SYNC, new Date().toISOString());
}

export async function getLastSyncTimestamp(): Promise<string | null> {
  return await getCachedData(CACHE_KEYS.LAST_SYNC);
}

export async function addOrderToLocalCache(order: OrderDb): Promise<void> {
  const cached = await getCachedOrders() || [];
  const existingIndex = cached.findIndex(o => o.orderCode === order.orderCode);
  if (existingIndex >= 0) {
    cached[existingIndex] = order;
  } else {
    cached.unshift(order);
  }
  await cacheOrders(cached);
}

export async function updateOrderInLocalCache(orderCode: string, updates: Partial<OrderDb>): Promise<void> {
  const cached = await getCachedOrders() || [];
  const index = cached.findIndex(o => o.orderCode === orderCode);
  if (index >= 0) {
    cached[index] = { ...cached[index], ...updates };
    await cacheOrders(cached);
  }
}

export async function deleteOrderFromLocalCache(orderCode: string): Promise<void> {
  const cached = await getCachedOrders() || [];
  const filtered = cached.filter(o => o.orderCode !== orderCode);
  await cacheOrders(filtered);
}

export async function initLocalCache(): Promise<void> {
  await initDB();
}

export async function clearAllCaches(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["cachedData"], "readwrite");
    const store = transaction.objectStore("cachedData");
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
