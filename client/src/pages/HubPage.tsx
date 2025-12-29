import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, Database, LogOut } from "lucide-react";

export default function HubPage() {
  const [, setLocation] = useLocation();

  // Vérification immédiate sans state
  const isAuthenticated = sessionStorage.getItem("authenticated") === "true";
  
  if (!isAuthenticated) {
    // Redirection immédiate sans affichage
    setLocation("/login");
    return null;
  }

  const handleLogout = () => {
    sessionStorage.removeItem("authenticated");
    sessionStorage.removeItem("adminAuthenticated");
    setLocation("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Gestion Commerciale
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
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 hover:border-gray-500"
            onClick={() => setLocation("/admin/login")}
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
