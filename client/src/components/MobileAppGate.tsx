import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share, Plus, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { APP_VERSION } from "@/lib/version";

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}

function AndroidIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/>
    </svg>
  );
}

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
                    <AppleIcon className="w-5 h-5 text-gray-700" />
                    <span className="font-medium text-gray-900 flex-1">iPhone / iPad</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>

                  <button
                    onClick={() => setScreen("android")}
                    className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                  >
                    <AndroidIcon className="w-5 h-5 text-gray-700" />
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
