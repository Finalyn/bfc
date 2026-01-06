import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, Download, Share, Plus, ArrowDown } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";

interface MobileAppGateProps {
  children: React.ReactNode;
}

function detectMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
  
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth < 768;
  
  return mobileRegex.test(userAgent.toLowerCase()) || (isTouchDevice && isSmallScreen);
}

function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://') ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
}

function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
}

export function MobileAppGate({ children }: MobileAppGateProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const { installable, install } = usePwaInstall();

  useEffect(() => {
    const checkDevice = () => {
      const mobile = detectMobileDevice();
      const standalone = isStandalonePwa();
      
      setIsMobile(mobile);
      setIsInstalled(standalone);
    };

    checkDevice();
    
    window.addEventListener('resize', checkDevice);
    
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      setIsInstalled(isStandalonePwa());
    };
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('resize', checkDevice);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS()) {
      setShowIOSInstructions(true);
    } else if (installable) {
      await install();
    } else {
      setShowIOSInstructions(true);
    }
  };

  if (!isMobile || isInstalled) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-2 border-primary/20">
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              BFC APP
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Pour une meilleure expérience, installez l'application sur votre téléphone
            </p>
          </div>

          {!showIOSInstructions ? (
            <>
              <Button 
                size="lg" 
                className="w-full h-14 text-lg gap-3"
                onClick={handleInstall}
                data-testid="button-install-app"
              >
                <Download className="w-5 h-5" />
                Installer l'application
              </Button>

              <div className="text-sm text-muted-foreground space-y-2">
                <p>Avantages de l'application :</p>
                <ul className="text-left space-y-1 pl-4">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Accès rapide depuis l'écran d'accueil
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Notifications push pour les commandes
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Mode hors-ligne
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <p className="font-medium text-gray-900 dark:text-white">
                {isIOS() ? "Installation sur iPhone/iPad :" : "Installation manuelle :"}
              </p>
              
              <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
                    1
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Appuyez sur</span>
                    {isIOS() ? (
                      <Share className="w-5 h-5 text-primary" />
                    ) : (
                      <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">⋮</span>
                    )}
                    <span>{isIOS() ? "(Partager)" : "(Menu)"}</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
                    2
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Sélectionnez</span>
                    {isIOS() ? (
                      <>
                        <Plus className="w-5 h-5 text-primary" />
                        <span className="font-medium">"Sur l'écran d'accueil"</span>
                      </>
                    ) : (
                      <span className="font-medium">"Installer l'application"</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
                    3
                  </div>
                  <span>Confirmez l'installation</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-primary">
                <ArrowDown className="w-5 h-5 animate-bounce" />
                <span className="text-sm font-medium">Barre de navigation en bas</span>
                <ArrowDown className="w-5 h-5 animate-bounce" />
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowIOSInstructions(false)}
              >
                Retour
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Cette application nécessite une installation pour fonctionner sur mobile
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
