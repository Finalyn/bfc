import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, User, FileText } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { APP_VERSION } from "@/lib/version";

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
      const data = await apiRequest("POST", "/api/auth/login", {
        username,
        password
      });
      
      if (data.success) {
        localStorage.setItem("authenticated", "true");
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("userRole", data.user.role);
        localStorage.setItem("userName", data.user.fullName);
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
        <div className="text-center mt-4">
          <Link href="/legal" className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1" data-testid="link-legal">
            <FileText className="w-3 h-3" />
            Mentions légales et CGU
          </Link>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2" data-testid="text-app-version">
          Version {APP_VERSION}
        </p>
      </div>
    </div>
  );
}
