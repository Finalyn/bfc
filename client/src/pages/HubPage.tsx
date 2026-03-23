import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, Database, LogOut, User, LayoutDashboard } from "lucide-react";
import { APP_VERSION } from "@/lib/version";

export default function HubPage() {
  const [, setLocation] = useLocation();

  const isAuthenticated = localStorage.getItem("authenticated") === "true";
  const userRole = localStorage.getItem("userRole") || "commercial";
  const userName = localStorage.getItem("userName") || "";
  const isAdmin = userRole === "admin";
  
  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    // Clear cached sensitive data from service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHES' });
    }
    localStorage.removeItem("authenticated");
    localStorage.removeItem("adminAuthenticated");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("pendingClientChanges");
    setLocation("/login");
  };

  const handleAdminAccess = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setLocation("/admin/login");
      return;
    }
    try {
      const res = await fetch("/api/admin/auth/elevate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: parseInt(userId) }),
        credentials: "include",
      });
      if (res.ok) {
        localStorage.setItem("adminAuthenticated", "true");
        setLocation("/admin");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Accès refusé");
      }
    } catch {
      setLocation("/admin/login");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900 overflow-hidden fixed inset-0">
      {/* Header avec profil et déconnexion */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setLocation("/profile")}
          data-testid="button-profile"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {userName}
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleLogout}
          className="text-gray-600 dark:text-gray-400"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </Button>
      </header>

      {/* Contenu principal */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              BFC APP
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choisissez votre espace de travail
            </p>
          </div>

        <div className="grid gap-3">
          <Card 
            className="cursor-pointer transition-shadow hover:shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden"
            onClick={() => setLocation("/order")}
            data-testid="card-order"
          >
            <CardContent className="p-0">
              <div className="flex items-stretch">
                <div className="w-1 bg-primary" />
                <div className="flex items-center gap-4 p-4 flex-1">
                  <ClipboardList className="w-6 h-6 text-primary" />
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Bon de commande
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Créer et envoyer des commandes clients
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-shadow hover:shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden"
            onClick={() => setLocation("/dashboard")}
            data-testid="card-dashboard"
          >
            <CardContent className="p-0">
              <div className="flex items-stretch">
                <div className="w-1 bg-green-500" />
                <div className="flex items-center gap-4 p-4 flex-1">
                  <LayoutDashboard className="w-6 h-6 text-green-600" />
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Tableau de Bord
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Suivi des commandes et calendrier
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card 
              className="cursor-pointer transition-shadow hover:shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden"
              onClick={handleAdminAccess}
              data-testid="card-database"
            >
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  <div className="w-1 bg-gray-400" />
                  <div className="flex items-center gap-4 p-4 flex-1">
                    <Database className="w-6 h-6 text-gray-500" />
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Base de données
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Gérer clients, thèmes, fournisseurs
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
          <p className="text-xs text-gray-400 text-center mt-6" data-testid="text-app-version">
            v{APP_VERSION}
          </p>
        </div>
      </div>
    </div>
  );
}
