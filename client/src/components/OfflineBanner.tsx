import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div className="fixed top-3 right-3 z-50">
      <div className="bg-red-500 text-white rounded-full w-9 h-9 flex items-center justify-center shadow-lg">
        <WifiOff className="w-4 h-4" />
      </div>
    </div>
  );
}

export function OnlineStatusIndicator() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-destructive">
      <WifiOff className="w-3 h-3" />
      <span>Hors ligne</span>
    </div>
  );
}
