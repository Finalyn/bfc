import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Database, ArrowLeft } from "lucide-react";

export default function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer le mot de passe administrateur",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    if (password === "slf25") {
      localStorage.setItem("adminAuthenticated", "true");
      setLocation("/admin");
    } else {
      toast({
        title: "Accès refusé",
        description: "Mot de passe administrateur incorrect",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 border border-gray-200">
              <Database className="w-8 h-8 text-gray-500 dark:text-gray-300" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Base de données
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Entrez le mot de passe administrateur
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-sm font-medium">
                Mot de passe admin
              </Label>
              <Input
                id="admin-password"
                type="password"
                data-testid="input-admin-password"
                placeholder="Mot de passe administrateur"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
                className="h-12 text-base"
                disabled={isLoading}
                autoComplete="off"
              />
            </div>

            <Button
              type="submit"
              data-testid="button-admin-login"
              className="w-full h-14 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? "Vérification..." : "Accéder à la base de données"}
            </Button>
          </form>

          <div className="text-center">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/hub")}
              className="text-gray-600 dark:text-gray-400"
              data-testid="button-back-hub"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au menu
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
