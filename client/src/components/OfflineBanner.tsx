import { useState, useEffect } from "react";
import { Wifi, WifiOff, Download, RefreshCw, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { getPendingOrders, syncPendingOrders } from "@/lib/pwa";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const { installable, install } = usePwaInstall();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkPending = async () => {
      try {
        const pending = await getPendingOrders();
        setPendingCount(pending.length);
      } catch (e) {
        console.error("Erreur check pending orders:", e);
      }
    };
    
    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (online && pendingCount > 0 && !syncing) {
      handleSync();
    }
  }, [online]);

  const handleSync = async () => {
    if (syncing || pendingCount === 0) return;
    
    setSyncing(true);
    try {
      const result = await syncPendingOrders(async (order) => {
        await apiRequest("POST", "/api/orders", order);
      });
      
      if (result.synced > 0) {
        toast({
          title: "Synchronisation terminée",
          description: `${result.synced} commande(s) envoyée(s) avec succès`,
        });
      }
      
      if (result.failed > 0) {
        toast({
          title: "Erreur de synchronisation",
          description: `${result.failed} commande(s) n'ont pas pu être envoyées`,
          variant: "destructive",
        });
      }
      
      const pending = await getPendingOrders();
      setPendingCount(pending.length);
    } catch (e) {
      console.error("Erreur sync:", e);
    } finally {
      setSyncing(false);
    }
  };

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) {
      toast({
        title: "Application installée",
        description: "L'application a été ajoutée à votre écran d'accueil",
      });
    }
  };

  if (dismissed && online && pendingCount === 0 && !installable) {
    return null;
  }

  const showBanner = !online || pendingCount > 0 || installable;
  
  if (!showBanner) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 p-2 ${!online ? 'bg-destructive' : pendingCount > 0 ? 'bg-amber-500' : 'bg-primary'} text-white shadow-lg`}>
      <div className="container mx-auto flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {!online ? (
            <>
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">Mode hors-ligne</span>
            </>
          ) : pendingCount > 0 ? (
            <>
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">
                {syncing ? 'Synchronisation...' : `${pendingCount} commande(s) en attente`}
              </span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Installer l'application</span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {online && pendingCount > 0 && !syncing && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSync}
              className="h-7 text-xs"
              data-testid="button-sync-orders"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Synchroniser
            </Button>
          )}
          
          {installable && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleInstall}
              className="h-7 text-xs"
              data-testid="button-install-pwa"
            >
              <Download className="w-3 h-3 mr-1" />
              Installer
            </Button>
          )}
          
          {online && pendingCount === 0 && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDismissed(true)}
              className="h-6 w-6 text-white hover:bg-white/20"
              data-testid="button-dismiss-banner"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function OnlineStatusIndicator() {
  const online = useOnlineStatus();
  
  return (
    <div className={`flex items-center gap-1 text-xs ${online ? 'text-green-600' : 'text-destructive'}`}>
      {online ? (
        <>
          <Wifi className="w-3 h-3" />
          <span>En ligne</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Hors ligne</span>
        </>
      )}
    </div>
  );
}
