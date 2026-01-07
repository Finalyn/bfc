import { getPendingEmailOrders, markEmailSent, markSyncedToServer, isOnline, onOnlineStatusChange, type OfflineOrder } from "./offlineStorage";
import { apiRequest } from "./queryClient";

type SyncCallback = (status: { 
  syncing: boolean; 
  pendingCount: number; 
  lastSyncResult?: { success: number; failed: number };
}) => void;

let syncListeners: SyncCallback[] = [];
let isSyncing = false;

export function addSyncListener(callback: SyncCallback): () => void {
  syncListeners.push(callback);
  return () => {
    syncListeners = syncListeners.filter(cb => cb !== callback);
  };
}

function notifyListeners(status: Parameters<SyncCallback>[0]) {
  syncListeners.forEach(cb => cb(status));
}

async function syncOrderToServer(offlineOrder: OfflineOrder): Promise<{ emailSent: boolean; error?: string }> {
  try {
    const response = await apiRequest("POST", "/api/orders/sync-offline", {
      order: offlineOrder.order,
    });
    
    const result = await response.json();
    return { emailSent: result.emailsSent, error: result.emailError };
  } catch (error: any) {
    return { emailSent: false, error: error.message || "Erreur de synchronisation" };
  }
}

async function sendEmailForOrder(offlineOrder: OfflineOrder): Promise<boolean> {
  try {
    await apiRequest("POST", "/api/orders/send-emails", {
      orderCode: offlineOrder.order.orderCode,
      clientEmail: offlineOrder.order.responsableEmail || offlineOrder.order.clientEmail,
    });
    return true;
  } catch (error) {
    console.error("Erreur envoi email:", error);
    return false;
  }
}

export async function syncPendingOrders(): Promise<{ success: number; failed: number }> {
  if (isSyncing || !isOnline()) {
    return { success: 0, failed: 0 };
  }
  
  isSyncing = true;
  const pendingOrders = await getPendingEmailOrders();
  
  notifyListeners({ syncing: true, pendingCount: pendingOrders.length });
  
  let success = 0;
  let failed = 0;
  
  for (const offlineOrder of pendingOrders) {
    try {
      if (!offlineOrder.syncedToServer) {
        const syncResult = await syncOrderToServer(offlineOrder);
        if (syncResult.emailSent) {
          await markSyncedToServer(offlineOrder.id);
          await markEmailSent(offlineOrder.id, true);
          success++;
        } else {
          await markEmailSent(offlineOrder.id, false, syncResult.error);
          failed++;
        }
      } else if (!offlineOrder.emailSent) {
        const emailSuccess = await sendEmailForOrder(offlineOrder);
        await markEmailSent(offlineOrder.id, emailSuccess);
        if (emailSuccess) success++;
        else failed++;
      }
    } catch (error: any) {
      console.error("Sync error for order:", offlineOrder.id, error);
      await markEmailSent(offlineOrder.id, false, error.message);
      failed++;
    }
  }
  
  isSyncing = false;
  
  const remaining = await getPendingEmailOrders();
  notifyListeners({ 
    syncing: false, 
    pendingCount: remaining.length,
    lastSyncResult: { success, failed }
  });
  
  return { success, failed };
}

export function initAutoSync(): () => void {
  const unsubscribe = onOnlineStatusChange(async (online) => {
    if (online) {
      console.log("Connexion rétablie - synchronisation des commandes...");
      await syncPendingOrders();
    }
  });
  
  if (isOnline()) {
    syncPendingOrders();
  }
  
  return unsubscribe;
}

export async function getPendingCount(): Promise<number> {
  const pending = await getPendingEmailOrders();
  return pending.length;
}
