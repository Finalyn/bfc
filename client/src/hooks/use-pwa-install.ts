import { useState, useEffect } from "react";
import { canInstall, promptInstall } from "@/lib/pwa";

export function usePwaInstall() {
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    const handleInstallAvailable = () => {
      setInstallable(canInstall());
    };

    window.addEventListener("pwa-install-available", handleInstallAvailable);
    setInstallable(canInstall());

    return () => {
      window.removeEventListener("pwa-install-available", handleInstallAvailable);
    };
  }, []);

  const install = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setInstallable(false);
    }
    return accepted;
  };

  return { installable, install };
}
