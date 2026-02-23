import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Apple, Smartphone, Share, Plus, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { APP_VERSION } from "@/lib/version";

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

type Screen = "select" | "ios" | "android";

export function MobileAppGate({ children }: MobileAppGateProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [screen, setScreen] = useState<Screen>("select");
  const { installable, install } = usePwaInstall();

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(detectMobileDevice());
      setIsInstalled(isStandalonePwa());
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => setIsInstalled(isStandalonePwa());
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      window.removeEventListener('resize', checkDevice);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const handleAndroidClick = async () => {
    if (installable) {
      await install();
    } else {
      setScreen("android");
    }
  };

  if (!isMobile || isInstalled) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-gray-900">BFC APP</h1>
          <p className="text-sm text-gray-500">Gestion de commandes</p>
        </div>

        {/* Card */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-6">
            {screen === "select" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Installer l'application</h2>
                  <p className="text-sm text-gray-500">Choisissez votre appareil</p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setScreen("ios")}
                    className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                  >
                    <Apple className="w-5 h-5 text-gray-700" />
                    <span className="font-medium text-gray-900 flex-1">iPhone / iPad</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>

                  <button
                    onClick={handleAndroidClick}
                    className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                  >
                    <Smartphone className="w-5 h-5 text-gray-700" />
                    <span className="font-medium text-gray-900 flex-1">Android</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            )}

            {screen === "ios" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Installer l'application</h2>
                  <p className="text-sm text-blue-500">iPhone / iPad</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      1
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <span>Dans le navigateur, appuyez sur</span>
                      <Share className="w-4 h-4 text-blue-500" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      2
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Plus className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">"Sur l'écran d'accueil"</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      3
                    </div>
                    <span className="text-gray-700">Confirmez l'installation</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => setScreen("select")}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Retour
                </Button>
              </div>
            )}

            {screen === "android" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Installer l'application</h2>
                  <p className="text-sm text-blue-500">Android</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      1
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <span>Appuyez sur</span>
                      <span className="font-mono text-xs bg-gray-200 px-2 py-0.5 rounded">&#8942;</span>
                      <span>(Menu)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      2
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Download className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">"Installer l'application"</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      3
                    </div>
                    <span className="text-gray-700">Confirmez l'installation</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => setScreen("select")}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Retour
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-1">
          <p className="text-xs text-gray-400">Application interne BFC</p>
          <p className="text-xs text-gray-400">
            v{APP_VERSION} - <a href="mailto:support@finalyn.app" className="text-blue-400 hover:underline">support@finalyn.app</a>
          </p>
        </div>
      </div>
    </div>
  );
}
