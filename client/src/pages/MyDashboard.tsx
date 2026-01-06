import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Calendar, 
  ClipboardList, 
  Package,
  CheckCircle,
  Clock,
  Truck,
  Users,
  TrendingUp,
  BarChart3,
  Star,
  ShoppingCart,
  Filter
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isSameDay, isSameWeek, isSameMonth, getMonth, getYear, differenceInDays, addDays, addWeeks, addMonths, addYears, subDays, subWeeks, subMonths, subYears } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from "recharts";
import type { OrderDb } from "@shared/schema";

const STATUS_LABELS: Record<string, string> = {
  "EN_ATTENTE": "En attente",
  "CONFIRMEE": "Confirmée",
  "LIVRAISON_PROGRAMMEE": "Livraison programmée",
  "LIVREE": "Livrée",
  "INVENTAIRE": "Inventaire",
  "RETOUR_PREVU": "Retour prévu",
  "RETOUR_EFFECTUE": "Retour effectué",
  "TERMINEE": "Terminée",
  "ANNULEE": "Annulée",
};

const STATUS_COLORS: Record<string, string> = {
  "EN_ATTENTE": "bg-yellow-100 text-yellow-800",
  "CONFIRMEE": "bg-blue-100 text-blue-800",
  "LIVRAISON_PROGRAMMEE": "bg-purple-100 text-purple-800",
  "LIVREE": "bg-green-100 text-green-800",
  "INVENTAIRE": "bg-orange-100 text-orange-800",
  "RETOUR_PREVU": "bg-pink-100 text-pink-800",
  "RETOUR_EFFECTUE": "bg-indigo-100 text-indigo-800",
  "TERMINEE": "bg-gray-100 text-gray-800",
  "ANNULEE": "bg-red-100 text-red-800",
};

type CalendarView = "day" | "week" | "month" | "year";

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

interface OrdersResponse {
  data: OrderDb[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

interface ThemeSelection {
  theme: string;
  category: string;
  quantity?: string;
  deliveryDate?: string;
}

interface ClientAnalysis {
  name: string;
  enseigne: string;
  totalOrders: number;
  themes: { [key: string]: number };
  preferredThemes: string[];
  orderDates: Date[];
  avgDaysBetweenOrders: number;
  preferredMonths: number[];
  lastOrderDate: Date | null;
  totalQuantity: number;
}

export default function MyDashboard() {
  const [, setLocation] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  const [selectedCommercial, setSelectedCommercial] = useState<string>("mine");
  const [selectedAnalyticsClient, setSelectedAnalyticsClient] = useState<string>("all");
  
  const userName = sessionStorage.getItem("userName") || "";
  const userRole = sessionStorage.getItem("userRole") || "commercial";
  const isAdmin = userRole === "admin";
  const isAuthenticated = sessionStorage.getItem("authenticated") === "true";

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const { data: ordersResponse, isLoading } = useQuery<OrdersResponse>({
    queryKey: ["/api/admin/orders?pageSize=10000"],
  });

  interface CommerciauxResponse {
    data: Array<{ id: number; prenom: string; nom: string; displayName: string }>;
  }
  
  const { data: commerciauxResponse } = useQuery<CommerciauxResponse>({
    queryKey: ["/api/admin/commerciaux"],
    enabled: isAdmin,
  });

  const allOrders = ordersResponse?.data || [];
  const commerciaux = commerciauxResponse?.data || [];

  const filteredOrders = useMemo(() => {
    if (!isAdmin || selectedCommercial === "mine") {
      return allOrders.filter(order => order.salesRepName === userName);
    }
    if (selectedCommercial === "all") {
      return allOrders;
    }
    return allOrders.filter(order => order.salesRepName === selectedCommercial);
  }, [allOrders, isAdmin, selectedCommercial, userName]);

  const stats = useMemo(() => ({
    total: filteredOrders.length,
    enAttente: filteredOrders.filter(o => o.status === "EN_ATTENTE").length,
    enCours: filteredOrders.filter(o => ["CONFIRMEE", "LIVRAISON_PROGRAMMEE"].includes(o.status)).length,
    livrees: filteredOrders.filter(o => ["LIVREE", "INVENTAIRE", "RETOUR_PREVU", "RETOUR_EFFECTUE", "TERMINEE"].includes(o.status)).length,
  }), [filteredOrders]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getOrdersForDate = (date: Date) => {
    return filteredOrders.filter(order => {
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

  const clientAnalytics = useMemo(() => {
    const clientMap = new Map<string, ClientAnalysis>();

    filteredOrders.forEach(order => {
      const key = order.clientName || order.livraisonEnseigne;
      if (!key) return;

      let analysis = clientMap.get(key);
      if (!analysis) {
        analysis = {
          name: order.clientName,
          enseigne: order.livraisonEnseigne,
          totalOrders: 0,
          themes: {},
          preferredThemes: [],
          orderDates: [],
          avgDaysBetweenOrders: 0,
          preferredMonths: [],
          lastOrderDate: null,
          totalQuantity: 0,
        };
        clientMap.set(key, analysis);
      }

      analysis.totalOrders++;
      
      try {
        const rawDate = order.orderDate || order.createdAt;
        if (!rawDate) return;
        const dateStr = typeof rawDate === 'string' ? rawDate : rawDate.toISOString();
        const orderDate = parseISO(dateStr);
        analysis.orderDates.push(orderDate);
        
        if (!analysis.lastOrderDate || orderDate > analysis.lastOrderDate) {
          analysis.lastOrderDate = orderDate;
        }

        const month = getMonth(orderDate);
        if (!analysis.preferredMonths.includes(month)) {
          analysis.preferredMonths.push(month);
        }
      } catch (e) {}

      try {
        const selections: ThemeSelection[] = JSON.parse(order.themeSelections || "[]");
        selections.forEach(sel => {
          if (sel.theme) {
            analysis!.themes[sel.theme] = (analysis!.themes[sel.theme] || 0) + 1;
            if (sel.quantity) {
              analysis!.totalQuantity += parseInt(sel.quantity) || 0;
            }
          }
        });
      } catch (e) {}
    });

    clientMap.forEach((analysis) => {
      const sortedThemes = Object.entries(analysis.themes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([theme]) => theme);
      analysis.preferredThemes = sortedThemes;

      if (analysis.orderDates.length > 1) {
        analysis.orderDates.sort((a, b) => a.getTime() - b.getTime());
        let totalDays = 0;
        for (let i = 1; i < analysis.orderDates.length; i++) {
          totalDays += differenceInDays(analysis.orderDates[i], analysis.orderDates[i - 1]);
        }
        analysis.avgDaysBetweenOrders = Math.round(totalDays / (analysis.orderDates.length - 1));
      }
    });

    return Array.from(clientMap.values()).sort((a, b) => b.totalOrders - a.totalOrders);
  }, [filteredOrders]);

  const globalStats = useMemo(() => {
    const themeCount: { [key: string]: number } = {};
    const monthCount: { [key: number]: number } = {};

    filteredOrders.forEach(order => {
      try {
        const selections: ThemeSelection[] = JSON.parse(order.themeSelections || "[]");
        selections.forEach(sel => {
          if (sel.theme) {
            themeCount[sel.theme] = (themeCount[sel.theme] || 0) + 1;
          }
        });
      } catch (e) {}

      try {
        const rawDate = order.orderDate || order.createdAt;
        if (!rawDate) return;
        const dateStr = typeof rawDate === 'string' ? rawDate : rawDate.toISOString();
        const orderDate = parseISO(dateStr);
        const month = getMonth(orderDate);
        monthCount[month] = (monthCount[month] || 0) + 1;
      } catch (e) {}
    });

    const topThemes = Object.entries(themeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name: name.length > 20 ? name.substring(0, 20) + '...' : name, value, fullName: name }));

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      name: MONTH_NAMES[i],
      commandes: monthCount[i] || 0,
    }));

    return { topThemes, monthlyData };
  }, [filteredOrders]);

  const selectedClientData = useMemo(() => {
    if (selectedAnalyticsClient === "all") return null;
    return clientAnalytics.find(c => c.name === selectedAnalyticsClient || c.enseigne === selectedAnalyticsClient);
  }, [selectedAnalyticsClient, clientAnalytics]);

  const filterLabel = useMemo(() => {
    if (!isAdmin || selectedCommercial === "mine") return userName;
    if (selectedCommercial === "all") return "Tous les commerciaux";
    return selectedCommercial;
  }, [isAdmin, selectedCommercial, userName]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation("/hub")}
            data-testid="button-back-hub"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Menu
          </Button>
          <h1 className="text-lg font-semibold">Tableau de Bord</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {isAdmin && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-muted-foreground" />
                <Select value={selectedCommercial} onValueChange={setSelectedCommercial}>
                  <SelectTrigger className="flex-1" data-testid="select-commercial-filter">
                    <SelectValue placeholder="Filtrer par commercial" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les commerciaux</SelectItem>
                    <SelectItem value="mine">Mes commandes ({userName})</SelectItem>
                    {commerciaux.filter(c => c.displayName && c.displayName !== userName).map(commercial => (
                      <SelectItem key={commercial.id} value={commercial.displayName}>
                        {commercial.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>Données de : <strong className="text-foreground">{filterLabel}</strong></span>
        </div>

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders" data-testid="tab-orders">
              <ClipboardList className="w-4 h-4 mr-2" />
              Commandes
            </TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-calendar">
              <Calendar className="w-4 h-4 mr-2" />
              Calendrier
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analyse
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">Dernières commandes</CardTitle>
                <Badge variant="secondary">{filteredOrders.length} total</Badge>
              </CardHeader>
              <CardContent>
                {filteredOrders.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">Aucune commande</p>
                ) : (
                  <div className="space-y-3">
                    {filteredOrders.slice(0, 15).map((order) => (
                      <div 
                        key={order.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{order.clientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.orderCode} • {order.orderDate}
                            {isAdmin && selectedCommercial === "all" && (
                              <span className="ml-2 text-primary">• {order.salesRepName}</span>
                            )}
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
              <CardHeader className="flex flex-col gap-3">
                <div className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {calendarView === "day" && format(currentDate, "EEEE d MMMM yyyy", { locale: fr })}
                    {calendarView === "week" && `Semaine du ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM", { locale: fr })} au ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM yyyy", { locale: fr })}`}
                    {calendarView === "month" && format(currentDate, "MMMM yyyy", { locale: fr })}
                    {calendarView === "year" && format(currentDate, "yyyy", { locale: fr })}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (calendarView === "day") setCurrentDate(subDays(currentDate, 1));
                        else if (calendarView === "week") setCurrentDate(subWeeks(currentDate, 1));
                        else if (calendarView === "month") setCurrentDate(subMonths(currentDate, 1));
                        else setCurrentDate(subYears(currentDate, 1));
                      }}
                    >
                      ←
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentDate(new Date())}
                    >
                      Auj.
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (calendarView === "day") setCurrentDate(addDays(currentDate, 1));
                        else if (calendarView === "week") setCurrentDate(addWeeks(currentDate, 1));
                        else if (calendarView === "month") setCurrentDate(addMonths(currentDate, 1));
                        else setCurrentDate(addYears(currentDate, 1));
                      }}
                    >
                      →
                    </Button>
                  </div>
                </div>
                <div className="flex gap-1">
                  {(["day", "week", "month", "year"] as CalendarView[]).map(view => (
                    <Button
                      key={view}
                      variant={calendarView === view ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCalendarView(view)}
                      className="text-xs"
                    >
                      {view === "day" ? "Jour" : view === "week" ? "Semaine" : view === "month" ? "Mois" : "Année"}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {calendarView === "day" && (
                  <div className="space-y-2">
                    <div className="p-4 rounded-lg bg-muted/30">
                      <p className="font-medium text-center mb-2">{format(currentDate, "EEEE d MMMM", { locale: fr })}</p>
                      {getOrdersForDate(currentDate).length === 0 ? (
                        <p className="text-center text-muted-foreground text-sm">Aucun événement ce jour</p>
                      ) : (
                        <div className="space-y-2">
                          {getOrdersForDate(currentDate).map(order => (
                            <div key={order.id} className="p-2 bg-blue-100 dark:bg-blue-900 rounded text-sm">
                              <p className="font-medium">{order.clientName}</p>
                              <p className="text-xs text-muted-foreground">{order.orderCode} - {STATUS_LABELS[order.status]}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {calendarView === "week" && (
                  <div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                      {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(day => (
                        <div key={day} className="font-medium text-muted-foreground py-1">{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {eachDayOfInterval({ 
                        start: startOfWeek(currentDate, { weekStartsOn: 1 }), 
                        end: endOfWeek(currentDate, { weekStartsOn: 1 }) 
                      }).map(day => {
                        const dayOrders = getOrdersForDate(day);
                        const isToday = isSameDay(day, new Date());
                        return (
                          <div 
                            key={day.toISOString()}
                            className={`min-h-[80px] rounded-lg p-2 text-sm ${
                              isToday ? "bg-primary/10 border-2 border-primary" : 
                              dayOrders.length > 0 ? "bg-blue-50 dark:bg-blue-900/30" : "bg-muted/30"
                            }`}
                          >
                            <span className={`font-medium ${isToday ? "text-primary" : ""}`}>{format(day, "d")}</span>
                            {dayOrders.slice(0, 3).map(order => (
                              <div key={order.id} className="text-xs mt-1 p-1 bg-blue-100 dark:bg-blue-800 rounded truncate">
                                {order.clientName}
                              </div>
                            ))}
                            {dayOrders.length > 3 && (
                              <p className="text-xs text-muted-foreground">+{dayOrders.length - 3} autres</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {calendarView === "month" && (
                  <div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                      {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(day => (
                        <div key={day} className="font-medium text-muted-foreground py-1">{day}</div>
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
                              <span className="text-xs">{dayOrders.length}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {calendarView === "year" && (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                    {eachMonthOfInterval({ 
                      start: startOfYear(currentDate), 
                      end: endOfYear(currentDate) 
                    }).map(month => {
                      const monthOrders = filteredOrders.filter(order => {
                        try {
                          const themes = JSON.parse(order.themeSelections || "[]");
                          return themes.some((t: any) => {
                            if (!t.deliveryDate) return false;
                            const parts = t.deliveryDate.split("/");
                            if (parts.length !== 3) return false;
                            const orderMonth = parseInt(parts[1], 10) - 1;
                            const orderYear = parseInt(parts[2], 10);
                            return orderMonth === getMonth(month) && orderYear === getYear(month);
                          });
                        } catch { return false; }
                      });
                      const isCurrentMonth = isSameMonth(month, new Date());
                      return (
                        <div 
                          key={month.toISOString()}
                          className={`p-3 rounded-lg text-center cursor-pointer hover:bg-muted/50 ${
                            isCurrentMonth ? "bg-primary/10 border border-primary" : "bg-muted/30"
                          }`}
                          onClick={() => {
                            setCurrentDate(month);
                            setCalendarView("month");
                          }}
                        >
                          <p className="font-medium">{format(month, "MMM", { locale: fr })}</p>
                          {monthOrders.length > 0 && (
                            <Badge variant="secondary" className="mt-1">{monthOrders.length}</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-4 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{clientAnalytics.length}</p>
                      <p className="text-xs text-muted-foreground">Clients</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{filteredOrders.length}</p>
                      <p className="text-xs text-muted-foreground">Commandes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Package className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{globalStats.topThemes.length}</p>
                      <p className="text-xs text-muted-foreground">Thèmes actifs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {clientAnalytics.length > 0 
                          ? Math.round(filteredOrders.length / clientAnalytics.length * 10) / 10 
                          : 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Moy. cmd/client</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Thèmes les plus commandés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {globalStats.topThemes.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={globalStats.topThemes} layout="vertical">
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip 
                          formatter={(value, name, props) => [value, props.payload.fullName]}
                        />
                        <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Aucune donnée</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Commandes par mois
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={globalStats.monthlyData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="commandes" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Top 10 Clients
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {clientAnalytics.slice(0, 10).map((client, index) => (
                    <div 
                      key={client.name || client.enseigne} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{client.enseigne || client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{client.totalOrders} cmd</p>
                        {client.avgDaysBetweenOrders > 0 && (
                          <p className="text-xs text-muted-foreground">
                            ~{client.avgDaysBetweenOrders}j entre cmd
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {clientAnalytics.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">Aucun client</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Analyser un client spécifique</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedAnalyticsClient} onValueChange={setSelectedAnalyticsClient}>
                  <SelectTrigger data-testid="select-analytics-client">
                    <SelectValue placeholder="Choisir un client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Sélectionner un client</SelectItem>
                    {clientAnalytics.map(client => (
                      <SelectItem 
                        key={client.name || client.enseigne} 
                        value={client.name || client.enseigne}
                      >
                        {client.enseigne || client.name} ({client.totalOrders} cmd)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedClientData && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-xl font-bold text-blue-600">
                          {selectedClientData.avgDaysBetweenOrders || "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">Jours entre cmd</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-xl font-bold text-green-600">{selectedClientData.totalOrders}</p>
                        <p className="text-xs text-muted-foreground">Commandes</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-xl font-bold text-purple-600">
                          {selectedClientData.lastOrderDate 
                            ? format(selectedClientData.lastOrderDate, "dd/MM", { locale: fr })
                            : "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">Dernière cmd</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Thèmes préférés</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedClientData.preferredThemes.map((theme, i) => (
                          <Badge 
                            key={theme} 
                            variant={i === 0 ? "default" : "secondary"}
                          >
                            {theme} ({selectedClientData.themes[theme]})
                          </Badge>
                        ))}
                        {selectedClientData.preferredThemes.length === 0 && (
                          <p className="text-muted-foreground text-sm">Aucun thème</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Mois de commande habituels</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedClientData.preferredMonths.map(month => (
                          <Badge key={month} variant="outline">
                            {MONTH_NAMES[month]}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {Object.keys(selectedClientData.themes).length > 0 && (
                      <ResponsiveContainer width="100%" height={180}>
                        <RechartsPie>
                          <Pie
                            data={Object.entries(selectedClientData.themes)
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 6)
                              .map(([name, value]) => ({ name, value }))}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            label={({ name, percent }) => `${name.substring(0, 10)}${name.length > 10 ? '...' : ''} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {Object.entries(selectedClientData.themes)
                              .slice(0, 6)
                              .map((_, i) => (
                                <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPie>
                      </ResponsiveContainer>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
