import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ClipboardList, Database, LogOut, User, LayoutDashboard, FileText, ChevronRight } from "lucide-react";
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
    <div className="min-h-screen flex flex-col bg-[#F3F4F6] dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-[#E8F1F8] dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#003366] flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-sm font-medium text-[#2C3E50] dark:text-gray-200 block">
                {userName}
              </span>
              <span className="text-xs text-[#6B7280]">Commercial</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleLogout}
            className="text-[#6B7280] hover:text-[#2C3E50]"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-[#003366] dark:text-white mb-1">
              BFC APP
            </h1>
            <p className="text-sm text-[#6B7280]">
              Sélectionnez votre espace de travail
            </p>
          </div>

          <div className="space-y-4">
            <div 
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border-l-4 border-[#003366] cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setLocation("/order")}
              data-testid="card-order"
            >
              <div className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#E8F1F8] flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-[#003366]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-medium text-[#2C3E50] dark:text-white">
                    Bon de commande
                  </h2>
                  <p className="text-sm text-[#6B7280]">
                    Créer et envoyer des commandes
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#6B7280]" />
              </div>
            </div>

            <div 
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border-l-4 border-[#003366] cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setLocation("/dashboard")}
              data-testid="card-dashboard"
            >
              <div className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#E8F1F8] flex items-center justify-center">
                  <LayoutDashboard className="w-6 h-6 text-[#003366]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-medium text-[#2C3E50] dark:text-white">
                    Tableau de Bord
                  </h2>
                  <p className="text-sm text-[#6B7280]">
                    Stats, commandes et calendrier
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#6B7280]" />
              </div>
            </div>

            {isAdmin && (
              <div 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border-l-4 border-[#003366] cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  localStorage.setItem("adminAuthenticated", "true");
                  setLocation("/admin");
                }}
                data-testid="card-database"
              >
                <div className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#E8F1F8] flex items-center justify-center">
                    <Database className="w-6 h-6 text-[#003366]" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-medium text-[#2C3E50] dark:text-white">
                      Base de données
                    </h2>
                    <p className="text-sm text-[#6B7280]">
                      Gérer clients et fournisseurs
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#6B7280]" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="py-4 text-center space-y-2 bg-white dark:bg-gray-800 border-t border-[#E8F1F8]">
        <Link href="/legal" className="text-xs text-[#6B7280] hover:text-[#003366] inline-flex items-center gap-1" data-testid="link-legal">
          <FileText className="w-3 h-3" />
          Mentions légales
        </Link>
        <p className="text-xs text-[#9CA3AF]" data-testid="text-app-version">
          Version {APP_VERSION}
        </p>
      </footer>
    </div>
  );
}
