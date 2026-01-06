import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Calendar, 
  ClipboardList, 
  TrendingUp, 
  Package,
  CheckCircle,
  Clock,
  Truck,
  Euro
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import type { OrderDb } from "@shared/schema";

const STATUS_LABELS: Record<string, string> = {
  "EN_ATTENTE": "En attente",
  "CONFIRMEE": "Confirmée",
  "EN_PREPARATION": "En préparation",
  "EXPEDIEE": "Expédiée",
  "LIVREE": "Livrée",
  "PAYEE": "Payée",
  "TERMINEE": "Terminée",
  "ANNULEE": "Annulée",
};

const STATUS_COLORS: Record<string, string> = {
  "EN_ATTENTE": "bg-yellow-100 text-yellow-800",
  "CONFIRMEE": "bg-blue-100 text-blue-800",
  "EN_PREPARATION": "bg-purple-100 text-purple-800",
  "EXPEDIEE": "bg-orange-100 text-orange-800",
  "LIVREE": "bg-green-100 text-green-800",
  "PAYEE": "bg-emerald-100 text-emerald-800",
  "TERMINEE": "bg-gray-100 text-gray-800",
  "ANNULEE": "bg-red-100 text-red-800",
};

export default function MyDashboard() {
  const [, setLocation] = useLocation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const userName = sessionStorage.getItem("userName") || "";
  const isAuthenticated = sessionStorage.getItem("authenticated") === "true";

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  interface OrdersResponse {
    data: OrderDb[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }

  const { data: ordersResponse, isLoading } = useQuery<OrdersResponse>({
    queryKey: ["/api/admin/orders?pageSize=1000"],
  });

  const allOrders = ordersResponse?.data || [];
  const myOrders = allOrders.filter(order => order.salesRepName === userName);

  const stats = {
    total: myOrders.length,
    enAttente: myOrders.filter(o => o.status === "EN_ATTENTE").length,
    enCours: myOrders.filter(o => ["CONFIRMEE", "EN_PREPARATION", "EXPEDIEE"].includes(o.status)).length,
    livrees: myOrders.filter(o => ["LIVREE", "PAYEE", "TERMINEE"].includes(o.status)).length,
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getOrdersForDate = (date: Date) => {
    return myOrders.filter(order => {
      try {
        const selections = JSON.parse(order.themeSelections || "[]");
        return selections.some((sel: any) => {
          if (sel.deliveryDate) {
            const deliveryDate = parseISO(sel.deliveryDate);
            return isSameDay(deliveryDate, date);
          }
          return false;
        });
      } catch {
        return false;
      }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation("/hub")}
            data-testid="button-back-hub"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Menu
          </Button>
          <h1 className="text-lg font-semibold">Mon Tableau de Bord</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Commandes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.enAttente}</p>
                  <p className="text-xs text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.enCours}</p>
                  <p className="text-xs text-muted-foreground">En cours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.livrees}</p>
                  <p className="text-xs text-muted-foreground">Livrées</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders" data-testid="tab-my-orders">
              <ClipboardList className="w-4 h-4 mr-2" />
              Mes Commandes
            </TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-my-calendar">
              <Calendar className="w-4 h-4 mr-2" />
              Calendrier
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mes dernières commandes</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center py-4 text-muted-foreground">Chargement...</p>
                ) : myOrders.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">Aucune commande</p>
                ) : (
                  <div className="space-y-3">
                    {myOrders.slice(0, 10).map((order) => (
                      <div 
                        key={order.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{order.clientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.orderCode} • {order.orderDate}
                          </p>
                        </div>
                        <Badge className={STATUS_COLORS[order.status] || ""}>
                          {STATUS_LABELS[order.status] || order.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  {format(currentMonth, "MMMM yyyy", { locale: fr })}
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                  >
                    ←
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                  >
                    →
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                  {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(day => (
                    <div key={day} className="font-medium text-muted-foreground py-1">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-12" />
                  ))}
                  {daysInMonth.map(day => {
                    const dayOrders = getOrdersForDate(day);
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div 
                        key={day.toISOString()}
                        className={`h-12 rounded-lg flex flex-col items-center justify-center text-sm ${
                          isToday ? "bg-primary text-primary-foreground" : 
                          dayOrders.length > 0 ? "bg-blue-100 dark:bg-blue-900" : ""
                        }`}
                      >
                        <span>{format(day, "d")}</span>
                        {dayOrders.length > 0 && (
                          <span className="text-xs">{dayOrders.length} liv.</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
