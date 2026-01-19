import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
  LogOut,
  Calendar,
  Truck,
  Package,
  RotateCcw,
  FileText
} from "lucide-react";
import { 
  getNotificationPermission, 
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  saveSubscription,
  removeSubscription,
  isSubscribedToPush
} from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const userName = localStorage.getItem("userName") || "";
  const userRole = localStorage.getItem("userRole") || "commercial";
  const isAuthenticated = localStorage.getItem("authenticated") === "true";
  
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const { data: eventsData } = useQuery<{ events: Array<{ type: string; date: string; orderCode: string; clientName: string }> }>({
    queryKey: ['/api/notifications/events', userName],
    queryFn: async () => {
      const response = await fetch(`/api/notifications/events/${encodeURIComponent(userName)}`);
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json();
    },
    enabled: !!userName,
  });

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
    isSubscribedToPush().then(setIsPushSubscribed);
  }, []);

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const handleNotificationToggle = async () => {
    if (isSubscribing) return;
    setIsSubscribing(true);
    
    try {
      if (isPushSubscribed) {
        await unsubscribeFromPush();
        await removeSubscription(userName);
        setIsPushSubscribed(false);
        toast({
          title: "Notifications désactivées",
          description: "Vous ne recevrez plus de notifications",
        });
      } else {
        const granted = await requestNotificationPermission();
        if (!granted) {
          setNotifPermission("denied");
          toast({
            title: "Notifications refusées",
            description: "Autorisez les notifications dans les paramètres du navigateur",
            variant: "destructive",
          });
          return;
        }
        
        setNotifPermission("granted");
        const subscription = await subscribeToPush();
        
        if (subscription) {
          await saveSubscription(subscription, userName);
          setIsPushSubscribed(true);
          toast({
            title: "Notifications activées",
            description: "Vous recevrez des rappels pour vos livraisons et inventaires",
          });
        }
      }
    } catch (error) {
      console.error("Error toggling notifications:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier les notifications",
        variant: "destructive",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'livraison': return <Truck className="w-4 h-4 text-blue-500" />;
      case 'inventaire_prevu': return <Package className="w-4 h-4 text-orange-500" />;
      case 'inventaire': return <Package className="w-4 h-4 text-green-500" />;
      case 'retour': return <RotateCcw className="w-4 h-4 text-purple-500" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'livraison': return 'Livraison';
      case 'inventaire_prevu': return 'Inventaire prévu';
      case 'inventaire': return 'Inventaire';
      case 'retour': return 'Retour';
      default: return type;
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
                  Rappels pour livraisons, inventaires et retours
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
                  checked={isPushSubscribed}
                  onCheckedChange={handleNotificationToggle}
                  disabled={isSubscribing}
                  data-testid="switch-notifications"
                />
              )}
            </div>
            
            {isPushSubscribed && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notifications activées
                </p>
              </div>
            )}
            
            {notifPermission === "denied" && !isPushSubscribed && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                  <BellOff className="w-4 h-4" />
                  Notifications bloquées. Modifiez les paramètres du navigateur.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {eventsData?.events && eventsData.events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Événements à venir (7 jours)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {eventsData.events.slice(0, 5).map((event, idx) => (
                <div 
                  key={`${event.orderCode}-${event.type}-${idx}`}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  {getEventIcon(event.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{getEventLabel(event.type)}</p>
                    <p className="text-xs text-muted-foreground truncate">{event.clientName}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {format(parseISO(event.date), 'dd MMM', { locale: fr })}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Button 
          variant="ghost" 
          className="w-full"
          onClick={() => setLocation("/legal")}
          data-testid="button-legal"
        >
          <FileText className="w-4 h-4 mr-2" />
          Mentions légales et CGU
        </Button>

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
