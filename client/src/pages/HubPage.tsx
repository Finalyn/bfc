import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, Database, LogOut, User, BarChart3, Settings, TrendingUp } from "lucide-react";

export default function HubPage() {
  const [, setLocation] = useLocation();

  const isAuthenticated = sessionStorage.getItem("authenticated") === "true";
  const userRole = sessionStorage.getItem("userRole") || "commercial";
  const userName = sessionStorage.getItem("userName") || "";
  const isAdmin = userRole === "admin";
  
  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const handleLogout = () => {
    sessionStorage.removeItem("authenticated");
    sessionStorage.removeItem("adminAuthenticated");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("userRole");
    sessionStorage.removeItem("userName");
    setLocation("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
              {userName}
            </span>
          </div>
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
                  <BarChart3 className="w-8 h-8 text-green-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Mon Tableau de Bord
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Mes stats, commandes et calendrier
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 hover:border-purple-500"
            onClick={() => setLocation("/profile")}
            data-testid="card-profile"
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center border border-purple-200">
                  <Settings className="w-8 h-8 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Mon Profil
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Gérer mes notifications et paramètres
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 hover:border-orange-500"
            onClick={() => setLocation("/analytics")}
            data-testid="card-analytics"
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center border border-orange-200">
                  <TrendingUp className="w-8 h-8 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Analyse Clients
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Habitudes, tendances et statistiques
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card 
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 hover:border-gray-500"
              onClick={() => {
                sessionStorage.setItem("adminAuthenticated", "true");
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
                      Gérer les clients, thèmes et commerciaux
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-8 text-center">
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="text-gray-600 dark:text-gray-400"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </div>
    </div>
  );
}
