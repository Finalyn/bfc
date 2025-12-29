import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer votre identifiant et mot de passe",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        username,
        password
      });
      
      const data = await response.json();
      
      if (data.success) {
        sessionStorage.setItem("authenticated", "true");
        sessionStorage.setItem("user", JSON.stringify(data.user));
        sessionStorage.setItem("userRole", data.user.role);
        sessionStorage.setItem("userName", data.user.fullName);
        setLocation("/hub");
      } else {
        throw new Error(data.error || "Erreur de connexion");
      }
    } catch (error: any) {
      toast({
        title: "Accès refusé",
        description: error.message || "Identifiant ou mot de passe incorrect",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-200">
              <Lock className="w-8 h-8 text-gray-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gestion de Commandes
            </h1>
            <p className="text-sm text-gray-600">
              Connectez-vous avec votre identifiant commercial
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Identifiant
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  data-testid="input-username"
                  placeholder="Identifiant"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  className="h-12 text-base pl-10"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  data-testid="input-password"
                  placeholder="Entrez le mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      e.preventDefault();
                      handleSubmit(e as any);
                    }
                  }}
                  className="h-12 text-base pl-10"
                  disabled={isLoading}
                  autoComplete="current-password"
                  enterKeyHint="go"
                />
              </div>
            </div>

            <Button
              type="submit"
              data-testid="button-login"
              className="w-full h-14 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Application réservée aux commerciaux BFC
        </p>
      </div>
    </div>
  );
}
