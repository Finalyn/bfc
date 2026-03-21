import { getOfflineOrders, getPendingEmailOrders, markEmailSent, markSyncedToServer, isOnline, onOnlineStatusChange, type OfflineOrder } from "./offlineStorage";
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
  // Get all offline orders that need sync (not synced to server) OR need email retry
  const allOfflineOrders = await getOfflineOrders();
  const pendingOrders = allOfflineOrders.filter(o => !o.syncedToServer || !o.emailSent);

  notifyListeners({ syncing: true, pendingCount: pendingOrders.length });
  
  let success = 0;
  let failed = 0;
  
  for (const offlineOrder of pendingOrders) {
    try {
      if (!offlineOrder.syncedToServer) {
        // Sync to server (saves order in DB + sends emails)
        const syncResult = await syncOrderToServer(offlineOrder);
        // Mark as synced regardless of email result - the order is saved
        await markSyncedToServer(offlineOrder.id);
        await markEmailSent(offlineOrder.id, syncResult.emailSent, syncResult.error);
        success++;
      } else if (!offlineOrder.emailSent) {
        // Already synced but email failed - retry email only
        const emailSuccess = await sendEmailForOrder(offlineOrder);
        await markEmailSent(offlineOrder.id, emailSuccess);
        if (emailSuccess) success++;
        else failed++;
      }
    } catch (error: any) {
      console.error("Sync error for order:", offlineOrder.id, error);
      failed++;
    }
  }
  
  isSyncing = false;
  
  const allRemaining = await getOfflineOrders();
  const remaining = allRemaining.filter(o => !o.syncedToServer || !o.emailSent);
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
      console.log("Connexion rétablie - synchronisation...");
      // Sync des modifications clients en attente
      try {
        const { syncPendingClientChanges } = await import("@/components/ClientModal");
        const clientsSynced = await syncPendingClientChanges();
        if (clientsSynced > 0) console.log(`[SYNC] ${clientsSynced} client(s) synchronisé(s)`);
      } catch (e) {
        console.error("[SYNC] Erreur sync clients:", e);
      }
      // Sync des commandes en attente
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
