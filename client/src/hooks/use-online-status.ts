import { useState, useEffect } from "react";
import { isOnline, onOnlineStatusChange } from "@/lib/pwa";

export function useOnlineStatus() {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const unsubscribe = onOnlineStatusChange(setOnline);
    return unsubscribe;
  }, []);

  return online;
}
