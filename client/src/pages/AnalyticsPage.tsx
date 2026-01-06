import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  TrendingUp, 
  Users, 
  Calendar, 
  Package,
  BarChart3,
  PieChart,
  Clock,
  Star,
  ShoppingCart
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { format, parseISO, getMonth, getYear, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

interface OrderDb {
  id: number;
  orderCode: string;
  orderDate: string;
  salesRepName: string;
  clientName: string;
  clientEmail: string;
  themeSelections: string;
  livraisonEnseigne: string;
  status: string;
  createdAt: string;
}

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

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function AnalyticsPage() {
  const [, setLocation] = useLocation();
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const isAuthenticated = sessionStorage.getItem("authenticated") === "true";

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const { data: ordersResponse, isLoading } = useQuery<OrdersResponse>({
    queryKey: ["/api/admin/orders?pageSize=10000"],
  });

  const orders = ordersResponse?.data || [];

  const clientAnalytics = useMemo(() => {
    const clientMap = new Map<string, ClientAnalysis>();

    orders.forEach(order => {
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
        const orderDate = parseISO(order.orderDate || order.createdAt);
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

    clientMap.forEach((analysis, key) => {
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
  }, [orders]);

  const globalStats = useMemo(() => {
    const themeCount: { [key: string]: number } = {};
    const monthCount: { [key: number]: number } = {};
    const yearMonthCount: { [key: string]: number } = {};

    orders.forEach(order => {
      try {
        const selections: ThemeSelection[] = JSON.parse(order.themeSelections || "[]");
        selections.forEach(sel => {
          if (sel.theme) {
            themeCount[sel.theme] = (themeCount[sel.theme] || 0) + 1;
          }
        });
      } catch (e) {}

      try {
        const orderDate = parseISO(order.orderDate || order.createdAt);
        const month = getMonth(orderDate);
        const year = getYear(orderDate);
        monthCount[month] = (monthCount[month] || 0) + 1;
        
        const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
        yearMonthCount[yearMonth] = (yearMonthCount[yearMonth] || 0) + 1;
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

    const trendData = Object.entries(yearMonthCount)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([yearMonth, count]) => {
        const [year, month] = yearMonth.split('-');
        return {
          name: `${MONTH_NAMES[parseInt(month) - 1]} ${year.slice(2)}`,
          commandes: count,
        };
      });

    return { topThemes, monthlyData, trendData };
  }, [orders]);

  const selectedClientData = useMemo(() => {
    if (selectedClient === "all") return null;
    return clientAnalytics.find(c => c.name === selectedClient || c.enseigne === selectedClient);
  }, [selectedClient, clientAnalytics]);

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
          <h1 className="text-lg font-semibold">Analyse des Clients</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
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
                  <p className="text-2xl font-bold">{orders.length}</p>
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
                      ? Math.round(orders.length / clientAnalytics.length * 10) / 10 
                      : 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Moy. cmd/client</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="global" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full md:w-auto">
            <TabsTrigger value="global" className="gap-2" data-testid="tab-global">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Vue Globale</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2" data-testid="tab-clients">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Par Client</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-2" data-testid="tab-trends">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Tendances</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="space-y-6">
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
                    <ResponsiveContainer width="100%" height={300}>
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
                  <ResponsiveContainer width="100%" height={300}>
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
          </TabsContent>

          <TabsContent value="clients" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sélectionner un client</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger data-testid="select-client">
                    <SelectValue placeholder="Choisir un client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les clients</SelectItem>
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
              </CardContent>
            </Card>

            {selectedClientData && (
              <>
                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Clock className="w-8 h-8 text-blue-500" />
                        <div>
                          <p className="text-xl font-bold">
                            {selectedClientData.avgDaysBetweenOrders || "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Jours moy. entre commandes
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <ShoppingCart className="w-8 h-8 text-green-500" />
                        <div>
                          <p className="text-xl font-bold">{selectedClientData.totalOrders}</p>
                          <p className="text-xs text-muted-foreground">Commandes totales</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-8 h-8 text-purple-500" />
                        <div>
                          <p className="text-xl font-bold">
                            {selectedClientData.lastOrderDate 
                              ? format(selectedClientData.lastOrderDate, "dd/MM/yy", { locale: fr })
                              : "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground">Dernière commande</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Thèmes préférés de {selectedClientData.enseigne || selectedClientData.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedClientData.preferredThemes.map((theme, i) => (
                        <Badge 
                          key={theme} 
                          variant={i === 0 ? "default" : "secondary"}
                          className="text-sm"
                        >
                          {theme} ({selectedClientData.themes[theme]})
                        </Badge>
                      ))}
                      {selectedClientData.preferredThemes.length === 0 && (
                        <p className="text-muted-foreground">Aucun thème enregistré</p>
                      )}
                    </div>

                    {Object.keys(selectedClientData.themes).length > 0 && (
                      <ResponsiveContainer width="100%" height={200}>
                        <RechartsPie>
                          <Pie
                            data={Object.entries(selectedClientData.themes)
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 8)
                              .map(([name, value]) => ({ name, value }))}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) => `${name.substring(0, 10)}... (${(percent * 100).toFixed(0)}%)`}
                          >
                            {Object.entries(selectedClientData.themes)
                              .slice(0, 8)
                              .map((_, i) => (
                                <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPie>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Périodes de commande habituelles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedClientData.preferredMonths.map(month => (
                        <Badge key={month} variant="outline" className="text-sm">
                          {MONTH_NAMES[month]}
                        </Badge>
                      ))}
                      {selectedClientData.preferredMonths.length === 0 && (
                        <p className="text-muted-foreground">Aucune donnée de période</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {selectedClient === "all" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Analyse complète des clients</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Client</th>
                          <th className="text-center p-2">Commandes</th>
                          <th className="text-left p-2">Thème favori</th>
                          <th className="text-center p-2">Fréquence</th>
                          <th className="text-center p-2">Dernière cmd</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientAnalytics.slice(0, 20).map(client => (
                          <tr key={client.name || client.enseigne} className="border-b">
                            <td className="p-2">
                              <p className="font-medium">{client.enseigne || client.name}</p>
                            </td>
                            <td className="text-center p-2">
                              <Badge variant="secondary">{client.totalOrders}</Badge>
                            </td>
                            <td className="p-2">
                              {client.preferredThemes[0] ? (
                                <span className="text-xs">{client.preferredThemes[0]}</span>
                              ) : "-"}
                            </td>
                            <td className="text-center p-2">
                              {client.avgDaysBetweenOrders > 0 
                                ? `~${client.avgDaysBetweenOrders}j` 
                                : "-"}
                            </td>
                            <td className="text-center p-2 text-xs">
                              {client.lastOrderDate 
                                ? format(client.lastOrderDate, "dd/MM/yy", { locale: fr })
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Évolution des commandes (12 derniers mois)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {globalStats.trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={globalStats.trendData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="commandes" 
                        stroke="#2563eb" 
                        strokeWidth={2}
                        dot={{ fill: '#2563eb' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Pas assez de données</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="w-4 h-4" />
                  Répartition par thème
                </CardTitle>
              </CardHeader>
              <CardContent>
                {globalStats.topThemes.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={globalStats.topThemes}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {globalStats.topThemes.map((_, i) => (
                          <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => [value, props.payload.fullName]} />
                    </RechartsPie>
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
                  Saisonnalité des commandes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={globalStats.monthlyData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="commandes" radius={[4, 4, 0, 0]}>
                      {globalStats.monthlyData.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Identifiez les mois les plus actifs pour anticiper les besoins
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
