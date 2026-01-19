import { type Order } from "@shared/schema";

const DB_NAME = "bfc_offline_db";
const DB_VERSION = 1;
const ORDERS_STORE = "offline_orders";

export interface OfflineOrder {
  id: string;
  order: Order;
  pdfBlob?: Blob;
  createdAt: string;
  emailSent: boolean;
  emailSentAt?: string;
  emailError?: string;
  syncedToServer: boolean;
  syncedAt?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(ORDERS_STORE)) {
        const store = db.createObjectStore(ORDERS_STORE, { keyPath: "id" });
        store.createIndex("emailSent", "emailSent", { unique: false });
        store.createIndex("syncedToServer", "syncedToServer", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

export async function saveOfflineOrder(order: Order, pdfBlob?: Blob): Promise<OfflineOrder> {
  const db = await openDB();
  
  const offlineOrder: OfflineOrder = {
    id: order.orderCode,
    order,
    pdfBlob,
    createdAt: new Date().toISOString(),
    emailSent: false,
    syncedToServer: false,
  };
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ORDERS_STORE, "readwrite");
    const store = tx.objectStore(ORDERS_STORE);
    const request = store.put(offlineOrder);
    
    request.onsuccess = () => {
      notifyOfflineOrdersChange();
      resolve(offlineOrder);
    };
    request.onerror = () => reject(request.error);
    
    tx.oncomplete = () => db.close();
  });
}

export async function getOfflineOrders(): Promise<OfflineOrder[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ORDERS_STORE, "readonly");
    const store = tx.objectStore(ORDERS_STORE);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    
    tx.oncomplete = () => db.close();
  });
}

export async function getOfflineOrder(id: string): Promise<OfflineOrder | null> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ORDERS_STORE, "readonly");
    const store = tx.objectStore(ORDERS_STORE);
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    
    tx.oncomplete = () => db.close();
  });
}

export async function getPendingEmailOrders(): Promise<OfflineOrder[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ORDERS_STORE, "readonly");
    const store = tx.objectStore(ORDERS_STORE);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const orders = request.result || [];
      // Filter manually since IDBKeyRange.only(false) is not valid
      resolve(orders.filter((order: OfflineOrder) => order.emailSent === false));
    };
    request.onerror = () => reject(request.error);
    
    tx.oncomplete = () => db.close();
  });
}

export async function markEmailSent(id: string, success: boolean, error?: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ORDERS_STORE, "readwrite");
    const store = tx.objectStore(ORDERS_STORE);
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const order = getRequest.result as OfflineOrder;
      if (order) {
        order.emailSent = success;
        order.emailSentAt = new Date().toISOString();
        if (error) order.emailError = error;
        store.put(order);
      }
      resolve();
    };
    getRequest.onerror = () => reject(getRequest.error);
    
    tx.oncomplete = () => db.close();
  });
}

export async function markSyncedToServer(id: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ORDERS_STORE, "readwrite");
    const store = tx.objectStore(ORDERS_STORE);
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const order = getRequest.result as OfflineOrder;
      if (order) {
        order.syncedToServer = true;
        order.syncedAt = new Date().toISOString();
        store.put(order);
      }
      resolve();
    };
    getRequest.onerror = () => reject(getRequest.error);
    
    tx.oncomplete = () => db.close();
  });
}

export async function deleteOfflineOrder(id: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ORDERS_STORE, "readwrite");
    const store = tx.objectStore(ORDERS_STORE);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    
    tx.oncomplete = () => db.close();
  });
}

export async function clearAllOfflineOrders(): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ORDERS_STORE, "readwrite");
    const store = tx.objectStore(ORDERS_STORE);
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    
    tx.oncomplete = () => db.close();
  });
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function onOnlineStatusChange(callback: (isOnline: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

type OfflineOrdersChangeListener = () => void;
const offlineOrdersListeners: Set<OfflineOrdersChangeListener> = new Set();

export function notifyOfflineOrdersChange(): void {
  offlineOrdersListeners.forEach(listener => listener());
}

export function onOfflineOrdersChange(callback: OfflineOrdersChangeListener): () => void {
  offlineOrdersListeners.add(callback);
  return () => {
    offlineOrdersListeners.delete(callback);
  };
}
