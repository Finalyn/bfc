import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight } from "lucide-react";
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
        localStorage.setItem("userId", String(data.user.id));
        localStorage.setItem("userEmail", data.user.email || "");
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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 overflow-hidden fixed inset-0">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-gray-900">BFC APP</h1>
          <p className="text-sm text-gray-500">Gestion de commandes</p>
        </div>

        {/* Card */}
        <Card className="border-0 border-l-4 border-l-blue-500 shadow-md rounded-xl">
          <CardContent className="p-6">
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Connexion</h2>
                <p className="text-sm text-gray-500">Espace commercial</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="username" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Identifiant
                  </label>
                  <Input
                    id="username"
                    type="text"
                    data-testid="input-username"
                    placeholder="Identifiant"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    className="h-11 text-base"
                    disabled={isLoading}
                    autoComplete="username"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Mot de passe
                  </label>
                  <Input
                    id="password"
                    type="password"
                    data-testid="input-password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isLoading) {
                        e.preventDefault();
                        handleSubmit(e as any);
                      }
                    }}
                    className="h-11 text-base"
                    disabled={isLoading}
                    autoComplete="current-password"
                    enterKeyHint="go"
                  />
                </div>

                <Button
                  type="submit"
                  data-testid="button-login"
                  className="w-full h-12 text-base font-medium gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? "Connexion..." : "Se connecter"}
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </Button>
              </form>

              <p className="text-xs text-gray-400 text-center pt-2">Application interne BFC</p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400" data-testid="text-app-version">
          v{APP_VERSION} - <a href="mailto:support@finalyn.app" className="text-blue-400 hover:underline">support@finalyn.app</a>
        </p>
      </div>
    </div>
  );
}
