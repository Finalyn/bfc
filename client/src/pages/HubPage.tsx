import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, Database, LogOut, User, LayoutDashboard, FileText } from "lucide-react";
import { Link } from "wouter";
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

  const handleLogout = () => {
    localStorage.removeItem("authenticated");
    localStorage.removeItem("adminAuthenticated");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    setLocation("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Header avec profil et déconnexion */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
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
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              BFC APP
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Choisissez votre espace de travail
            </p>
          </div>

        <div className="grid gap-4">
          <Card 
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 hover:border-primary"
            onClick={() => setLocation("/order")}
            data-testid="card-order"
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ClipboardList className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Bon de commande
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Créer et envoyer des commandes clients
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 hover:border-green-500"
            onClick={() => setLocation("/dashboard")}
            data-testid="card-dashboard"
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center border border-green-200">
                  <LayoutDashboard className="w-8 h-8 text-green-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Tableau de Bord
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Stats, commandes, calendrier et analyse clients
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card 
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 hover:border-gray-500"
              onClick={() => {
                localStorage.setItem("adminAuthenticated", "true");
                setLocation("/admin");
              }}
              data-testid="card-database"
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center border border-gray-200">
                    <Database className="w-8 h-8 text-gray-500 dark:text-gray-300" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Base de données
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Gérer clients, thèmes, fournisseurs
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        </div>
      </div>
      <footer className="py-4 text-center space-y-2">
        <Link href="/legal" className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 inline-flex items-center gap-1" data-testid="link-legal">
          <FileText className="w-3 h-3" />
          Mentions légales et CGU
        </Link>
        <p className="text-xs text-gray-400" data-testid="text-app-version">
          Version {APP_VERSION}
        </p>
      </footer>
    </div>
  );
}
