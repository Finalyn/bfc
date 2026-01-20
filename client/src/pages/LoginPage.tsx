import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, User } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F3F4F6]">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm border-l-4 border-[#003366] p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-[#003366] rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-[#003366]">
              BFC APP
            </h1>
            <p className="text-sm text-[#6B7280]">
              Connexion à votre espace commercial
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-[#6B7280]">
                Identifiant
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
                <Input
                  id="username"
                  type="text"
                  data-testid="input-username"
                  placeholder="Votre identifiant"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  className="h-12 text-base pl-10 border-[#E8F1F8] focus:border-[#003366] focus:ring-[#003366]/20"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-[#6B7280]">
                Mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
                <Input
                  id="password"
                  type="password"
                  data-testid="input-password"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      e.preventDefault();
                      handleSubmit(e as any);
                    }
                  }}
                  className="h-12 text-base pl-10 border-[#E8F1F8] focus:border-[#003366] focus:ring-[#003366]/20"
                  disabled={isLoading}
                  autoComplete="current-password"
                  enterKeyHint="go"
                />
              </div>
            </div>

            <Button
              type="submit"
              data-testid="button-login"
              className="w-full h-14 text-base font-medium bg-[#003366] hover:bg-[#002244] text-white rounded-lg shadow-md"
              disabled={isLoading}
            >
              {isLoading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[#9CA3AF] mt-6" data-testid="text-app-version">
          Version {APP_VERSION}
        </p>
      </div>
    </div>
  );
}
