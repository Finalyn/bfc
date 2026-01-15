import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  Filter,
  Edit,
  Eye,
  FileText,
  FileSpreadsheet,
  Download,
  CloudOff,
  Cloud,
  RefreshCw,
  Wifi,
  WifiOff,
  Mail,
  AlertCircle
} from "lucide-react";
import { getOfflineOrders, deleteOfflineOrder, type OfflineOrder, isOnline, onOnlineStatusChange, onOfflineOrdersChange } from "@/lib/offlineStorage";
import { syncPendingOrders, initAutoSync, addSyncListener } from "@/lib/offlineSync";
import { generateOrderPDFClient, downloadPDFBlob } from "@/lib/pdfGenerator";
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isSameDay, isSameWeek, isSameMonth, getMonth, getYear, differenceInDays, addDays, addWeeks, addMonths, addYears, subDays, subWeeks, subMonths, subYears } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from "recharts";
import type { OrderDb } from "@shared/schema";
import { FOURNISSEURS_CONFIG } from "@shared/fournisseurs";

const formatDateShort = (date: string | null | undefined): string => {
  if (!date) return "-";
  try {
    return format(parseISO(date), "dd/MM/yy", { locale: fr });
  } catch {
    return date;
  }
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

interface DateUpdateData {
  dateLivraison?: string;
  dateInventairePrevu?: string;
  dateInventaire?: string;
  dateRetour?: string;
}

type DateEventType = "livraison" | "inventairePrevu" | "inventaire" | "retour";

interface OrderEvent {
  order: OrderDb;
  eventType: DateEventType;
  dateLabel: string;
}

const DATE_EVENT_CONFIG: Record<DateEventType, { label: string; color: string; bgColor: string }> = {
  livraison: { label: "Livraison", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900" },
  inventairePrevu: { label: "Inventaire prévu", color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900" },
  inventaire: { label: "Inventaire", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900" },
  retour: { label: "Retour", color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900" },
};

export default function MyDashboard() {
  const [, setLocation] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  const [selectedCommercial, setSelectedCommercial] = useState<string>("mine");
  const [selectedFournisseur, setSelectedFournisseur] = useState<string>("all");
  const [selectedAnalyticsClient, setSelectedAnalyticsClient] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderDb | null>(null);
  const [datesDialogOpen, setDatesDialogOpen] = useState(false);
  const [datesUpdate, setDatesUpdate] = useState<DateUpdateData>({});
  const [previewOrder, setPreviewOrder] = useState<OrderDb | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);
  const [dayDetailDialogOpen, setDayDetailDialogOpen] = useState(false);
  const [offlineOrders, setOfflineOrders] = useState<OfflineOrder[]>([]);
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(false);
  const [sendingEmailFor, setSendingEmailFor] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadOfflineOrders = async () => {
      const orders = await getOfflineOrders();
      setOfflineOrders(orders);
    };
    loadOfflineOrders();

    const unsubOnline = onOnlineStatusChange((status) => {
      setOnline(status);
      if (status) {
        toast({ title: "Connexion rétablie", description: "Synchronisation des commandes en cours..." });
      }
    });

    const unsubSync = addSyncListener(async (status) => {
      setSyncing(status.syncing);
      if (!status.syncing && status.lastSyncResult) {
        const { success, failed } = status.lastSyncResult;
        if (success > 0) {
          toast({ 
            title: "Synchronisation terminée", 
            description: `${success} commande(s) synchronisée(s)${failed > 0 ? `, ${failed} échec(s)` : ""}`
          });
        }
        const updated = await getOfflineOrders();
        setOfflineOrders(updated);
      }
    });

    const unsubAutoSync = initAutoSync();

    const unsubOfflineChange = onOfflineOrdersChange(async () => {
      const updated = await getOfflineOrders();
      setOfflineOrders(updated);
    });

    return () => {
      unsubOnline();
      unsubSync();
      unsubAutoSync();
      unsubOfflineChange();
    };
  }, [toast]);
  
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

  const updateDatesMutation = useMutation({
    mutationFn: async ({ orderId, data }: { orderId: number; data: DateUpdateData }) => {
      return apiRequest("PATCH", `/api/admin/orders/${orderId}/dates`, data);
    },
    onSuccess: () => {
      toast({ title: "Dates mises à jour", description: "Les dates de la commande ont été modifiées avec succès." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders?pageSize=10000"] });
      setDatesDialogOpen(false);
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Impossible de mettre à jour les dates", variant: "destructive" });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ orderCode, clientEmail }: { orderCode: string; clientEmail: string }) => {
      setSendingEmailFor(orderCode);
      return apiRequest("POST", "/api/orders/send-emails", { orderCode, clientEmail });
    },
    onSuccess: (_, variables) => {
      toast({ title: "Emails envoyés", description: `Les emails pour ${variables.orderCode} ont été envoyés avec succès.` });
      setSendingEmailFor(null);
    },
    onError: (error: any, variables) => {
      toast({ 
        title: "Erreur d'envoi", 
        description: error.message || "Impossible d'envoyer les emails. Réessayez plus tard.", 
        variant: "destructive" 
      });
      setSendingEmailFor(null);
    },
  });

  const openDatesDialog = (order: OrderDb) => {
    setSelectedOrder(order);
    setDatesUpdate({
      dateLivraison: order.dateLivraison || "",
      dateInventairePrevu: order.dateInventairePrevu || "",
      dateInventaire: order.dateInventaire || "",
      dateRetour: order.dateRetour || "",
    });
    setDatesDialogOpen(true);
  };

  const handleDatesSubmit = () => {
    if (!selectedOrder) return;
    updateDatesMutation.mutate({
      orderId: selectedOrder.id,
      data: datesUpdate,
    });
  };

  const openPreviewDialog = (order: OrderDb) => {
    setPreviewOrder(order);
    setPreviewDialogOpen(true);
  };

  const downloadPdf = async (order: OrderDb) => {
    setDownloadingPdf(true);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/pdf`);
      if (!response.ok) throw new Error("Erreur lors du téléchargement");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${order.orderCode || "commande"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "PDF téléchargé", description: "Le fichier PDF a été téléchargé avec succès." });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de télécharger le PDF", variant: "destructive" });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const downloadExcel = async (order: OrderDb) => {
    setDownloadingExcel(true);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/excel`);
      if (!response.ok) throw new Error("Erreur lors du téléchargement");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${order.orderCode || "commande"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Excel téléchargé", description: "Le fichier Excel a été téléchargé avec succès." });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de télécharger le fichier Excel", variant: "destructive" });
    } finally {
      setDownloadingExcel(false);
    }
  };

  const parseThemeSelections = (themeSelections: string | null): ThemeSelection[] => {
    try {
      return JSON.parse(themeSelections || "[]");
    } catch {
      return [];
    }
  };

  const filteredOrders = useMemo(() => {
    let orders = allOrders;
    
    if (!isAdmin || selectedCommercial === "mine") {
      orders = orders.filter(order => order.salesRepName === userName);
    } else if (selectedCommercial !== "all") {
      orders = orders.filter(order => order.salesRepName === selectedCommercial);
    }
    
    if (selectedFournisseur !== "all") {
      orders = orders.filter(order => order.fournisseur === selectedFournisseur);
    }
    
    return orders;
  }, [allOrders, isAdmin, selectedCommercial, selectedFournisseur, userName]);


  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getOrdersForDate = (date: Date) => {
    return filteredOrders.filter(order => {
      if (order.dateLivraison) {
        try {
          const deliveryDate = parseISO(order.dateLivraison);
          return isSameDay(deliveryDate, date);
        } catch {
          return false;
        }
      }
      return false;
    });
  };

  const getOrderEventsForDate = (date: Date): OrderEvent[] => {
    const events: OrderEvent[] = [];
    
    filteredOrders.forEach(order => {
      const checkDate = (dateStr: string | null | undefined, eventType: DateEventType) => {
        if (!dateStr) return;
        try {
          const d = parseISO(dateStr);
          if (isSameDay(d, date)) {
            events.push({ order, eventType, dateLabel: formatDateShort(dateStr) });
          }
        } catch {}
      };

      checkDate(order.dateLivraison, "livraison");
      checkDate(order.dateInventairePrevu, "inventairePrevu");
      checkDate(order.dateInventaire, "inventaire");
      checkDate(order.dateRetour, "retour");
    });

    return events;
  };

  const openDayDetailDialog = (date: Date) => {
    setSelectedDayDate(date);
    setDayDetailDialogOpen(true);
  };

  const selectedDayEvents = selectedDayDate ? getOrderEventsForDate(selectedDayDate) : [];
  const groupedEvents = selectedDayEvents.reduce((acc, event) => {
    if (!acc[event.eventType]) acc[event.eventType] = [];
    acc[event.eventType].push(event);
    return acc;
  }, {} as Record<DateEventType, OrderEvent[]>);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    
    const thisMonthOrders = filteredOrders.filter(o => {
      if (!o.orderDate) return false;
      try {
        const orderDate = parseISO(o.orderDate);
        return orderDate >= thisMonthStart && orderDate <= thisMonthEnd;
      } catch { return false; }
    });
    
    const upcomingDeliveries = filteredOrders.filter(o => {
      if (!o.dateLivraison) return false;
      try {
        const deliveryDate = parseISO(o.dateLivraison);
        return deliveryDate >= now;
      } catch { return false; }
    });
    
    const pendingInventory = filteredOrders.filter(o => 
      o.dateLivraison && !o.dateInventaire
    );
    
    const pendingReturn = filteredOrders.filter(o => 
      o.dateInventaire && !o.dateRetour
    );
    
    return {
      total: filteredOrders.length,
      thisMonth: thisMonthOrders.length,
      upcomingDeliveries: upcomingDeliveries.length,
      pendingInventory: pendingInventory.length,
      pendingReturn: pendingReturn.length,
    };
  }, [filteredOrders]);

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
    const fournisseurCount: { [key: string]: number } = {};

    filteredOrders.forEach(order => {
      const fournisseur = order.fournisseur || "BDIS";
      fournisseurCount[fournisseur] = (fournisseurCount[fournisseur] || 0) + 1;
      
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

    const fournisseurData = Object.entries(fournisseurCount)
      .map(([id, count]) => {
        const config = FOURNISSEURS_CONFIG.find(f => f.id === id);
        return { name: config?.nom || id, value: count, id };
      })
      .sort((a, b) => b.value - a.value);

    return { topThemes, monthlyData, fournisseurData };
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
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <div className="flex items-center gap-3 flex-1">
                <Filter className="w-5 h-5 text-muted-foreground" />
                {isAdmin && (
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
                )}
                <Select value={selectedFournisseur} onValueChange={setSelectedFournisseur}>
                  <SelectTrigger className="flex-1" data-testid="select-fournisseur-filter">
                    <SelectValue placeholder="Filtrer par fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les fournisseurs</SelectItem>
                    {FOURNISSEURS_CONFIG.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>Données de : <strong className="text-foreground">{filterLabel}</strong></span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.thisMonth}</p>
                  <p className="text-xs text-muted-foreground">Ce mois</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.upcomingDeliveries}</p>
                  <p className="text-xs text-muted-foreground">À livrer</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.pendingInventory}</p>
                  <p className="text-xs text-muted-foreground">À inventorier</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.pendingReturn}</p>
                  <p className="text-xs text-muted-foreground">À retourner</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="orders" data-testid="tab-orders">
              <ClipboardList className="w-4 h-4 mr-2" />
              Commandes
            </TabsTrigger>
            <TabsTrigger value="offline" data-testid="tab-offline" className="relative">
              <CloudOff className="w-4 h-4 mr-2" />
              Hors ligne
              {offlineOrders.length > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {offlineOrders.length}
                </Badge>
              )}
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
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2"
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
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs whitespace-nowrap">
                            {order.fournisseur || "BDIS"}
                          </Badge>
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            Liv: {formatDateShort(order.dateLivraison)}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openPreviewDialog(order)}
                            data-testid={`button-preview-order-${order.id}`}
                            title="Voir détails"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openDatesDialog(order)}
                            data-testid={`button-edit-dates-${order.id}`}
                            title="Modifier dates"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => sendEmailMutation.mutate({ 
                              orderCode: order.orderCode, 
                              clientEmail: order.clientEmail || "" 
                            })}
                            disabled={sendingEmailFor === order.orderCode || !order.clientEmail}
                            data-testid={`button-send-email-${order.id}`}
                            title={order.clientEmail ? "Envoyer les emails" : "Email client manquant"}
                          >
                            {sendingEmailFor === order.orderCode ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="offline" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Commandes hors ligne</CardTitle>
                  <Badge variant={online ? "default" : "secondary"} className="flex items-center gap-1">
                    {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    {online ? "En ligne" : "Hors ligne"}
                  </Badge>
                </div>
                {offlineOrders.length > 0 && online && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      setSyncing(true);
                      await syncPendingOrders();
                      const updated = await getOfflineOrders();
                      setOfflineOrders(updated);
                      setSyncing(false);
                    }}
                    disabled={syncing}
                    data-testid="button-sync-offline"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Synchronisation..." : "Synchroniser"}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {offlineOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Cloud className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune commande hors ligne</p>
                    <p className="text-xs mt-2">Les commandes créées hors ligne apparaîtront ici</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {offlineOrders.map((offlineOrder) => (
                      <div 
                        key={offlineOrder.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 gap-2"
                        data-testid={`offline-order-${offlineOrder.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{offlineOrder.order.clientName || offlineOrder.order.livraisonEnseigne}</p>
                          <p className="text-xs text-muted-foreground">
                            {offlineOrder.order.orderCode} • {format(new Date(offlineOrder.createdAt), "dd/MM/yyyy HH:mm", { locale: fr })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {offlineOrder.emailSent ? (
                            <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                              <Mail className="w-3 h-3" />
                              Envoyé
                            </Badge>
                          ) : offlineOrder.emailError ? (
                            <Badge variant="destructive" className="flex items-center gap-1" title={offlineOrder.emailError}>
                              <AlertCircle className="w-3 h-3" />
                              Erreur
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              En attente
                            </Badge>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={async () => {
                              try {
                                const pdfBlob = await generateOrderPDFClient(offlineOrder.order as any);
                                downloadPDFBlob(pdfBlob, `${offlineOrder.order.orderCode}.pdf`);
                              } catch (error) {
                                toast({ title: "Erreur", description: "Impossible de télécharger le PDF", variant: "destructive" });
                              }
                            }}
                            data-testid={`button-download-offline-pdf-${offlineOrder.id}`}
                            title="Télécharger PDF"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          {offlineOrder.syncedToServer && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={async () => {
                                if (confirm("Supprimer cette commande locale ? (La commande a été synchronisée avec le serveur)")) {
                                  await deleteOfflineOrder(offlineOrder.id);
                                  const updated = await getOfflineOrders();
                                  setOfflineOrders(updated);
                                  toast({ title: "Commande supprimée", description: "La commande locale a été supprimée" });
                                }
                              }}
                              data-testid={`button-delete-offline-${offlineOrder.id}`}
                              title="Supprimer"
                            >
                              <Edit className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
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
                    <div 
                      className="p-4 rounded-lg bg-muted/30 cursor-pointer hover-elevate"
                      onClick={() => openDayDetailDialog(currentDate)}
                      data-testid="calendar-day-detail"
                    >
                      <p className="font-medium text-center mb-2">{format(currentDate, "EEEE d MMMM", { locale: fr })}</p>
                      {(() => {
                        const dayEvents = getOrderEventsForDate(currentDate);
                        if (dayEvents.length === 0) {
                          return <p className="text-center text-muted-foreground text-sm">Aucun événement ce jour</p>;
                        }
                        return (
                          <div className="space-y-2">
                            {dayEvents.slice(0, 5).map((event, idx) => (
                              <div key={`${event.order.id}-${event.eventType}-${idx}`} className={`p-2 ${DATE_EVENT_CONFIG[event.eventType].bgColor} rounded text-sm`}>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-medium ${DATE_EVENT_CONFIG[event.eventType].color}`}>
                                    {DATE_EVENT_CONFIG[event.eventType].label}
                                  </span>
                                </div>
                                <p className="font-medium">{event.order.clientName}</p>
                                <p className="text-xs text-muted-foreground">{event.order.orderCode}</p>
                              </div>
                            ))}
                            {dayEvents.length > 5 && (
                              <p className="text-xs text-center text-muted-foreground">+{dayEvents.length - 5} autres événements</p>
                            )}
                          </div>
                        );
                      })()}
                      <p className="text-xs text-center text-primary mt-2">Cliquer pour voir les détails</p>
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
                        const dayEvents = getOrderEventsForDate(day);
                        const isToday = isSameDay(day, new Date());
                        return (
                          <div 
                            key={day.toISOString()}
                            className={`min-h-[80px] rounded-lg p-2 text-sm cursor-pointer hover-elevate ${
                              isToday ? "bg-primary/10 border-2 border-primary" : 
                              dayEvents.length > 0 ? "bg-blue-50 dark:bg-blue-900/30" : "bg-muted/30"
                            }`}
                            onClick={() => openDayDetailDialog(day)}
                            data-testid={`calendar-week-day-${format(day, "yyyy-MM-dd")}`}
                          >
                            <span className={`font-medium ${isToday ? "text-primary" : ""}`}>{format(day, "d")}</span>
                            {dayEvents.slice(0, 3).map((event, idx) => (
                              <div key={`${event.order.id}-${event.eventType}-${idx}`} className={`text-xs mt-1 p-1 ${DATE_EVENT_CONFIG[event.eventType].bgColor} rounded truncate`}>
                                <span className={`${DATE_EVENT_CONFIG[event.eventType].color} font-medium`}>{DATE_EVENT_CONFIG[event.eventType].label.substring(0, 3)}</span> {event.order.clientName}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <p className="text-xs text-muted-foreground">+{dayEvents.length - 3} autres</p>
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
                        const dayEvents = getOrderEventsForDate(day);
                        const isToday = isSameDay(day, new Date());
                        return (
                          <div 
                            key={day.toISOString()}
                            className={`h-12 rounded-lg flex flex-col items-center justify-center text-sm cursor-pointer hover-elevate ${
                              isToday ? "bg-primary text-primary-foreground" : 
                              dayEvents.length > 0 ? "bg-blue-100 dark:bg-blue-900" : ""
                            }`}
                            onClick={() => openDayDetailDialog(day)}
                            data-testid={`calendar-month-day-${format(day, "yyyy-MM-dd")}`}
                          >
                            <span>{format(day, "d")}</span>
                            {dayEvents.length > 0 && (
                              <span className="text-xs">{dayEvents.length}</span>
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
                  <Truck className="w-4 h-4" />
                  Répartition par fournisseur
                </CardTitle>
              </CardHeader>
              <CardContent>
                {globalStats.fournisseurData.length > 0 ? (
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsPie>
                        <Pie
                          data={globalStats.fournisseurData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {globalStats.fournisseurData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {globalStats.fournisseurData.map((item, index) => (
                        <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.value} cmd</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Aucune donnée</p>
                )}
              </CardContent>
            </Card>

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

      <Dialog open={dayDetailDialogOpen} onOpenChange={setDayDetailDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedDayDate && format(selectedDayDate, "EEEE d MMMM yyyy", { locale: fr })}
            </DialogTitle>
          </DialogHeader>
          {selectedDayEvents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun événement ce jour</p>
          ) : (
            <div className="space-y-4">
              {(["livraison", "inventairePrevu", "inventaire", "retour"] as DateEventType[]).map(eventType => {
                const events = groupedEvents[eventType];
                if (!events || events.length === 0) return null;
                const config = DATE_EVENT_CONFIG[eventType];
                return (
                  <div key={eventType} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${config.bgColor}`} />
                      <h3 className={`font-semibold text-sm ${config.color}`}>{config.label} ({events.length})</h3>
                    </div>
                    <div className="space-y-2 pl-5">
                      {events.map((event, idx) => (
                        <div 
                          key={`${event.order.id}-${eventType}-${idx}`}
                          className={`p-3 ${config.bgColor} rounded-lg cursor-pointer hover-elevate`}
                          onClick={() => {
                            setDayDetailDialogOpen(false);
                            openPreviewDialog(event.order);
                          }}
                          data-testid={`order-event-${event.order.id}-${eventType}`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">{event.order.clientName}</p>
                            <Badge variant="outline" className="text-xs">{event.order.orderCode}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{event.order.salesRepName}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-muted-foreground">
                              {event.order.livraisonEnseigne && `${event.order.livraisonEnseigne}`}
                            </p>
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDayDetailDialogOpen(false);
                                  openPreviewDialog(event.order);
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Voir
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDayDetailDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Aperçu de la commande
            </DialogTitle>
          </DialogHeader>
          {previewOrder && (
            <div className="space-y-6">
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xl font-bold">{previewOrder.orderCode}</p>
                  <Badge variant="secondary">{previewOrder.fournisseur || "BDIS"}</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                  <div className="p-2 bg-background rounded">
                    <p className="text-muted-foreground">Commande</p>
                    <p className="font-medium">{formatDateShort(previewOrder.orderDate)}</p>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <p className="text-muted-foreground">Livraison</p>
                    <p className="font-medium">{formatDateShort(previewOrder.dateLivraison)}</p>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <p className="text-muted-foreground">Inv. prévu</p>
                    <p className="font-medium">{formatDateShort(previewOrder.dateInventairePrevu)}</p>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <p className="text-muted-foreground">Inventaire</p>
                    <p className="font-medium">{formatDateShort(previewOrder.dateInventaire)}</p>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <p className="text-muted-foreground">Retour</p>
                    <p className="font-medium">{formatDateShort(previewOrder.dateRetour)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">Commercial</h3>
                  <p>{previewOrder.salesRepName}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">Client</h3>
                  <p className="font-medium">{previewOrder.clientName}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <p>{previewOrder.clientName}</p>
                  <p>{previewOrder.clientTel}</p>
                  <p>{previewOrder.clientEmail}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">Adresse de livraison</h3>
                <div className="text-sm">
                  <p className="font-medium">{previewOrder.livraisonEnseigne}</p>
                  <p>{previewOrder.livraisonAdresse}</p>
                  <p>{previewOrder.livraisonCpVille}</p>
                  {previewOrder.livraisonHoraires && <p>Horaires: {previewOrder.livraisonHoraires}</p>}
                  {previewOrder.livraisonHayon && <Badge variant="outline" className="mt-1">Hayon requis</Badge>}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">Facturation</h3>
                <div className="text-sm">
                  <p className="font-medium">{previewOrder.facturationRaisonSociale}</p>
                  <p>{previewOrder.facturationAdresse}</p>
                  <p>{previewOrder.facturationCpVille}</p>
                  <p>Mode: {previewOrder.facturationMode}</p>
                </div>
              </div>

              {previewOrder.themeSelections && parseThemeSelections(previewOrder.themeSelections).length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">Thèmes commandés</h3>
                  <div className="space-y-2">
                    {parseThemeSelections(previewOrder.themeSelections).map((theme, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/20 rounded text-sm">
                        <span>{theme.theme}</span>
                        <div className="flex items-center gap-3">
                          {theme.quantity && <span>Qté: {theme.quantity}</span>}
                          {theme.deliveryDate && <span className="text-muted-foreground">{theme.deliveryDate}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">Dates clés</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p>Commande: {previewOrder.orderDate}</p>
                  {previewOrder.dateLivraison && <p>Livraison: {previewOrder.dateLivraison}</p>}
                  {previewOrder.dateInventairePrevu && <p>Inventaire prévu: {previewOrder.dateInventairePrevu}</p>}
                  {previewOrder.dateInventaire && <p>Inventaire: {previewOrder.dateInventaire}</p>}
                  {previewOrder.dateRetour && <p>Retour: {previewOrder.dateRetour}</p>}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => previewOrder && downloadPdf(previewOrder)}
              disabled={downloadingPdf}
              className="flex-1"
              data-testid="button-download-pdf"
            >
              <FileText className="h-4 w-4 mr-2" />
              {downloadingPdf ? "Téléchargement..." : "Télécharger PDF"}
            </Button>
            <Button
              variant="outline"
              onClick={() => previewOrder && downloadExcel(previewOrder)}
              disabled={downloadingExcel}
              className="flex-1"
              data-testid="button-download-excel"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {downloadingExcel ? "Téléchargement..." : "Télécharger Excel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={datesDialogOpen} onOpenChange={setDatesDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier les dates</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="font-medium">{selectedOrder.clientName}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.orderCode}</p>
                <p className="text-xs text-muted-foreground mt-1">Date de commande: {selectedOrder.orderDate}</p>
              </div>

              <div className="space-y-2">
                <Label>Date de livraison</Label>
                <Input
                  type="date"
                  value={datesUpdate.dateLivraison || ""}
                  onChange={(e) => setDatesUpdate(prev => ({ ...prev, dateLivraison: e.target.value }))}
                  data-testid="input-date-livraison"
                />
              </div>

              <div className="space-y-2">
                <Label>Date d'inventaire prévu</Label>
                <Input
                  type="date"
                  value={datesUpdate.dateInventairePrevu || ""}
                  onChange={(e) => setDatesUpdate(prev => ({ ...prev, dateInventairePrevu: e.target.value }))}
                  data-testid="input-date-inventaire-prevu"
                />
              </div>

              <div className="space-y-2">
                <Label>Date d'inventaire</Label>
                <Input
                  type="date"
                  value={datesUpdate.dateInventaire || ""}
                  onChange={(e) => setDatesUpdate(prev => ({ ...prev, dateInventaire: e.target.value }))}
                  data-testid="input-date-inventaire"
                />
              </div>

              <div className="space-y-2">
                <Label>Date de retour</Label>
                <Input
                  type="date"
                  value={datesUpdate.dateRetour || ""}
                  onChange={(e) => setDatesUpdate(prev => ({ ...prev, dateRetour: e.target.value }))}
                  data-testid="input-date-retour"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDatesDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleDatesSubmit}
              disabled={updateDatesMutation.isPending}
              data-testid="button-save-dates"
            >
              {updateDatesMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
