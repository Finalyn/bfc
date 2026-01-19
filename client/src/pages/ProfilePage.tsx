import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  User, 
  Bell, 
  BellOff,
  Shield,
  LogOut
} from "lucide-react";
import { getNotificationPermission, requestNotificationPermission } from "@/lib/pwa";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const userName = localStorage.getItem("userName") || "";
  const userRole = localStorage.getItem("userRole") || "commercial";
  const isAuthenticated = localStorage.getItem("authenticated") === "true";
  
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, []);

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const handleNotificationToggle = async () => {
    if (notifPermission === "granted") {
      toast({
        title: "Notifications",
        description: "Pour désactiver les notifications, allez dans les paramètres de votre navigateur",
      });
      return;
    }
    
    const permission = await requestNotificationPermission();
    setNotifPermission(permission);
    
    if (permission === "granted") {
      toast({
        title: "Notifications activées",
        description: "Vous recevrez des notifications pour vos commandes",
      });
    } else if (permission === "denied") {
      toast({
        title: "Notifications refusées",
        description: "Vous pouvez les activer dans les paramètres de votre navigateur",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authenticated");
    localStorage.removeItem("adminAuthenticated");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation("/hub")}
            data-testid="button-back-hub"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Menu
          </Button>
          <h1 className="text-lg font-semibold">Mon Profil</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-5 h-5" />
              Informations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Nom</span>
              <span className="font-medium">{userName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Rôle</span>
              <Badge variant={userRole === "admin" ? "default" : "secondary"}>
                <Shield className="w-3 h-3 mr-1" />
                {userRole === "admin" ? "Administrateur" : "Commercial"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="notif-toggle">Notifications push</Label>
                <p className="text-xs text-muted-foreground">
                  Recevoir des notifications pour les commandes
                </p>
              </div>
              {notifPermission === "unsupported" ? (
                <Badge variant="outline">
                  <BellOff className="w-3 h-3 mr-1" />
                  Non supporté
                </Badge>
              ) : (
                <Switch
                  id="notif-toggle"
                  checked={notifPermission === "granted"}
                  onCheckedChange={handleNotificationToggle}
                  data-testid="switch-notifications"
                />
              )}
            </div>
            
            {notifPermission === "granted" && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Les notifications sont activées
                </p>
              </div>
            )}
            
            {notifPermission === "denied" && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                  <BellOff className="w-4 h-4" />
                  Les notifications sont bloquées. Modifiez les paramètres de votre navigateur.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </Button>
      </main>
    </div>
  );
}
