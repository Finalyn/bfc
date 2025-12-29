import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Download, 
  Search, 
  Users, 
  Package, 
  UserCircle, 
  Building2,
  ChevronUp,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShoppingCart,
  Eye,
  FileText,
  Calendar,
  Truck,
  ClipboardList
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: number;
  code: string;
  nom: string;
  adresse1?: string;
  codePostal?: string;
  ville?: string;
  interloc?: string;
  tel?: string;
  portable?: string;
  mail?: string;
}

interface Theme {
  id: number;
  theme: string;
  fournisseur: string;
}

interface Commercial {
  id: number;
  nom: string;
}

interface Fournisseur {
  id: number;
  nom: string;
  nomCourt: string;
}

interface OrderDb {
  id: number;
  orderCode: string;
  orderDate: string;
  salesRepName: string;
  clientName: string;
  clientEmail: string;
  clientTel: string;
  themeSelections: string;
  livraisonEnseigne: string;
  livraisonAdresse: string;
  livraisonCpVille: string;
  facturationRaisonSociale: string;
  facturationMode: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

const ORDER_STATUSES = [
  { value: "EN_ATTENTE", label: "En attente", color: "bg-yellow-100 text-yellow-800" },
  { value: "CONFIRMEE", label: "Confirmée", color: "bg-blue-100 text-blue-800" },
  { value: "EN_PREPARATION", label: "En préparation", color: "bg-indigo-100 text-indigo-800" },
  { value: "EXPEDIEE", label: "Expédiée", color: "bg-purple-100 text-purple-800" },
  { value: "LIVREE", label: "Livrée", color: "bg-green-100 text-green-800" },
  { value: "PAYEE", label: "Payée", color: "bg-emerald-100 text-emerald-800" },
  { value: "TERMINEE", label: "Terminée", color: "bg-gray-100 text-gray-800" },
  { value: "ANNULEE", label: "Annulée", color: "bg-red-100 text-red-800" },
];

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

type EntityType = "clients" | "themes" | "commerciaux" | "fournisseurs" | "orders" | "calendar";

interface CalendarEvent {
  id: string;
  date: string;
  type: "order" | "delivery";
  orderCode: string;
  clientName: string;
  salesRepName: string;
  themeName?: string;
  quantity?: number;
  status: string;
  orderId: number;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<EntityType>("clients");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState<string>("nom");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const { toast } = useToast();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isCreating, setIsCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDb | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [calendarEventType, setCalendarEventType] = useState<"all" | "order" | "delivery">("all");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeTab]);

  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem("authenticated") === "true";
    const isAdminAuthenticated = sessionStorage.getItem("adminAuthenticated") === "true";
    
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    
    if (!isAdminAuthenticated) {
      setLocation("/admin/login");
      return;
    }
    
    setIsCheckingAuth(false);
  }, [setLocation]);

  const buildQueryParams = () => {
    return `?page=${currentPage}&pageSize=${pageSize}&search=${encodeURIComponent(debouncedSearch)}&sortField=${sortField}&sortDir=${sortDirection}`;
  };

  // Charger les totaux de toutes les entités dès le départ pour les compteurs des onglets
  const { data: clientsTotals } = useQuery<PaginatedResponse<Client>>({
    queryKey: ["/api/admin/clients", "totals"],
    queryFn: () => fetch(`/api/admin/clients?page=1&pageSize=1`).then(r => r.json()),
    enabled: !isCheckingAuth,
  });

  const { data: themesTotals } = useQuery<PaginatedResponse<Theme>>({
    queryKey: ["/api/admin/themes", "totals"],
    queryFn: () => fetch(`/api/admin/themes?page=1&pageSize=1`).then(r => r.json()),
    enabled: !isCheckingAuth,
  });

  const { data: commerciauxTotals } = useQuery<PaginatedResponse<Commercial>>({
    queryKey: ["/api/admin/commerciaux", "totals"],
    queryFn: () => fetch(`/api/admin/commerciaux?page=1&pageSize=1`).then(r => r.json()),
    enabled: !isCheckingAuth,
  });

  const { data: fournisseursTotals } = useQuery<PaginatedResponse<Fournisseur>>({
    queryKey: ["/api/admin/fournisseurs", "totals"],
    queryFn: () => fetch(`/api/admin/fournisseurs?page=1&pageSize=1`).then(r => r.json()),
    enabled: !isCheckingAuth,
  });

  const { data: ordersTotals } = useQuery<PaginatedResponse<OrderDb>>({
    queryKey: ["/api/admin/orders", "totals"],
    queryFn: () => fetch(`/api/admin/orders?page=1&pageSize=1`).then(r => r.json()),
    enabled: !isCheckingAuth,
  });

  const { data: clientsData, isLoading: clientsLoading } = useQuery<PaginatedResponse<Client>>({
    queryKey: ["/api/admin/clients", currentPage, debouncedSearch, sortField, sortDirection],
    queryFn: () => fetch(`/api/admin/clients${buildQueryParams()}`).then(r => r.json()),
    enabled: !isCheckingAuth && activeTab === "clients",
  });

  const { data: themesData, isLoading: themesLoading } = useQuery<PaginatedResponse<Theme>>({
    queryKey: ["/api/admin/themes", currentPage, debouncedSearch, sortField, sortDirection],
    queryFn: () => fetch(`/api/admin/themes${buildQueryParams()}`).then(r => r.json()),
    enabled: !isCheckingAuth && activeTab === "themes",
  });

  const { data: commerciauxData, isLoading: commerciauxLoading } = useQuery<PaginatedResponse<Commercial>>({
    queryKey: ["/api/admin/commerciaux", currentPage, debouncedSearch, sortField, sortDirection],
    queryFn: () => fetch(`/api/admin/commerciaux${buildQueryParams()}`).then(r => r.json()),
    enabled: !isCheckingAuth && activeTab === "commerciaux",
  });

  const { data: fournisseursData, isLoading: fournisseursLoading } = useQuery<PaginatedResponse<Fournisseur>>({
    queryKey: ["/api/admin/fournisseurs", currentPage, debouncedSearch, sortField, sortDirection],
    queryFn: () => fetch(`/api/admin/fournisseurs${buildQueryParams()}`).then(r => r.json()),
    enabled: !isCheckingAuth && activeTab === "fournisseurs",
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery<PaginatedResponse<OrderDb>>({
    queryKey: ["/api/admin/orders", currentPage, debouncedSearch, sortField, sortDirection, statusFilter],
    queryFn: () => fetch(`/api/admin/orders${buildQueryParams()}&status=${statusFilter}`).then(r => r.json()),
    enabled: !isCheckingAuth && activeTab === "orders",
  });

  // Charger toutes les commandes pour le calendrier
  const { data: calendarOrdersData, isLoading: calendarLoading } = useQuery<PaginatedResponse<OrderDb>>({
    queryKey: ["/api/admin/orders", "calendar"],
    queryFn: () => fetch(`/api/admin/orders?page=1&pageSize=1000`).then(r => r.json()),
    enabled: !isCheckingAuth && activeTab === "calendar",
  });

  // Construire les événements du calendrier
  const calendarEvents: CalendarEvent[] = (() => {
    if (!calendarOrdersData?.data) return [];
    const events: CalendarEvent[] = [];
    
    calendarOrdersData.data.forEach(order => {
      // Événement de commande
      events.push({
        id: `order-${order.id}`,
        date: order.orderDate,
        type: "order",
        orderCode: order.orderCode,
        clientName: order.clientName,
        salesRepName: order.salesRepName,
        status: order.status,
        orderId: order.id,
      });
      
      // Événements de livraison depuis themeSelections
      try {
        const selections = JSON.parse(order.themeSelections || "[]");
        if (Array.isArray(selections)) {
          selections.forEach((sel: any, idx: number) => {
            if (sel.deliveryDate && sel.deliveryDate.trim()) {
              events.push({
                id: `delivery-${order.id}-${idx}`,
                date: sel.deliveryDate,
                type: "delivery",
                orderCode: order.orderCode,
                clientName: order.clientName,
                salesRepName: order.salesRepName,
                themeName: sel.theme,
                quantity: sel.quantity,
                status: order.status,
                orderId: order.id,
              });
            }
          });
        }
      } catch (e) {
        // Ignorer les erreurs de parsing
      }
    });
    
    // Filtrer par type si nécessaire
    let filtered = events;
    if (calendarEventType !== "all") {
      filtered = events.filter(e => e.type === calendarEventType);
    }
    
    // Filtrer par mois
    filtered = filtered.filter(e => e.date.startsWith(calendarMonth));
    
    // Trier par date
    return filtered.sort((a, b) => a.date.localeCompare(b.date));
  })();

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/admin/orders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Succès", description: "Statut mis à jour" });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      setDeleteDialogOpen(false);
      toast({ title: "Succès", description: "Commande supprimée" });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/admin/${activeTab}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/${activeTab}`] });
      setEditModalOpen(false);
      toast({ title: "Succès", description: "Élément créé avec succès" });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/admin/${activeTab}/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/${activeTab}`] });
      setEditModalOpen(false);
      toast({ title: "Succès", description: "Élément modifié avec succès" });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/${activeTab}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/${activeTab}`] });
      setDeleteDialogOpen(false);
      toast({ title: "Succès", description: "Élément supprimé avec succès" });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleExport = async (entity: string) => {
    try {
      const response = await fetch(`/api/admin/export/${entity}`);
      if (!response.ok) throw new Error("Erreur d'export");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entity}_export.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "Export réussi", description: `${entity} exporté en Excel` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'exporter les données", variant: "destructive" });
    }
  };

  const openCreateModal = () => {
    setIsCreating(true);
    setEditingItem(null);
    setEditFormData(getEmptyFormData());
    setEditModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setIsCreating(false);
    setEditingItem(item);
    setEditFormData({ ...item });
    setEditModalOpen(true);
  };

  const openDeleteDialog = (item: any) => {
    setEditingItem(item);
    setDeleteDialogOpen(true);
  };

  const getEmptyFormData = () => {
    switch (activeTab) {
      case "clients":
        return { code: "", nom: "", adresse1: "", codePostal: "", ville: "", interloc: "", tel: "", portable: "", mail: "" };
      case "themes":
        return { theme: "", fournisseur: "" };
      case "commerciaux":
        return { nom: "" };
      case "fournisseurs":
        return { nom: "", nomCourt: "" };
      default:
        return {};
    }
  };

  const handleSave = () => {
    if (isCreating) {
      createMutation.mutate(editFormData);
    } else {
      updateMutation.mutate({ id: editingItem.id, data: editFormData });
    }
  };

  const handleDelete = () => {
    if (editingItem?.id) {
      deleteMutation.mutate(editingItem.id);
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? 
      <ChevronUp className="w-4 h-4 inline ml-1" /> : 
      <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  const Pagination = ({ pagination }: { pagination: { page: number; totalPages: number; total: number } }) => {
    if (pagination.totalPages <= 1) return null;
    
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-t gap-2">
        <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
          <span className="hidden sm:inline">Page </span>{pagination.page}/{pagination.totalPages} ({pagination.total})
        </p>
        <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 sm:px-3"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={pagination.page <= 1}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Précédent</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 sm:px-3"
            onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={pagination.page >= pagination.totalPages}
            data-testid="button-next-page"
          >
            <span className="hidden sm:inline">Suivant</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderFormFields = () => {
    switch (activeTab) {
      case "clients":
        return (
          <div className="grid gap-3 sm:gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="code" className="text-sm">Code</Label>
                <Input id="code" value={editFormData.code || ""} onChange={e => setEditFormData({...editFormData, code: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="nom" className="text-sm">Nom</Label>
                <Input id="nom" value={editFormData.nom || ""} onChange={e => setEditFormData({...editFormData, nom: e.target.value})} />
              </div>
            </div>
            <div>
              <Label htmlFor="adresse1" className="text-sm">Adresse</Label>
              <Input id="adresse1" value={editFormData.adresse1 || ""} onChange={e => setEditFormData({...editFormData, adresse1: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="codePostal" className="text-sm">Code Postal</Label>
                <Input id="codePostal" value={editFormData.codePostal || ""} onChange={e => setEditFormData({...editFormData, codePostal: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="ville" className="text-sm">Ville</Label>
                <Input id="ville" value={editFormData.ville || ""} onChange={e => setEditFormData({...editFormData, ville: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="tel" className="text-sm">Téléphone</Label>
                <Input id="tel" value={editFormData.tel || ""} onChange={e => setEditFormData({...editFormData, tel: e.target.value})} />
              </div>
              <div>
                <Label htmlFor="portable" className="text-sm">Portable</Label>
                <Input id="portable" value={editFormData.portable || ""} onChange={e => setEditFormData({...editFormData, portable: e.target.value})} />
              </div>
            </div>
            <div>
              <Label htmlFor="mail" className="text-sm">Email</Label>
              <Input id="mail" type="email" value={editFormData.mail || ""} onChange={e => setEditFormData({...editFormData, mail: e.target.value})} />
            </div>
            <div>
              <Label htmlFor="interloc" className="text-sm">Interlocuteur</Label>
              <Input id="interloc" value={editFormData.interloc || ""} onChange={e => setEditFormData({...editFormData, interloc: e.target.value})} />
            </div>
          </div>
        );
      case "themes":
        return (
          <div className="grid gap-4">
            <div>
              <Label htmlFor="theme">Thème</Label>
              <Input id="theme" value={editFormData.theme || ""} onChange={e => setEditFormData({...editFormData, theme: e.target.value})} />
            </div>
            <div>
              <Label htmlFor="fournisseur">Fournisseur</Label>
              <Input id="fournisseur" value={editFormData.fournisseur || ""} onChange={e => setEditFormData({...editFormData, fournisseur: e.target.value})} />
            </div>
          </div>
        );
      case "commerciaux":
        return (
          <div className="grid gap-4">
            <div>
              <Label htmlFor="nom">Nom</Label>
              <Input id="nom" value={editFormData.nom || ""} onChange={e => setEditFormData({...editFormData, nom: e.target.value})} />
            </div>
          </div>
        );
      case "fournisseurs":
        return (
          <div className="grid gap-4">
            <div>
              <Label htmlFor="nom">Nom complet</Label>
              <Input id="nom" value={editFormData.nom || ""} onChange={e => setEditFormData({...editFormData, nom: e.target.value})} />
            </div>
            <div>
              <Label htmlFor="nomCourt">Nom court (code)</Label>
              <Input id="nomCourt" value={editFormData.nomCourt || ""} onChange={e => setEditFormData({...editFormData, nomCourt: e.target.value})} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getTabLabel = () => {
    switch (activeTab) {
      case "clients": return "Client";
      case "themes": return "Thème";
      case "commerciaux": return "Commercial";
      case "fournisseurs": return "Fournisseur";
      case "orders": return "Commande";
      default: return "Élément";
    }
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = ORDER_STATUSES.find(s => s.value === status) || { label: status, color: "bg-gray-100" };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const openOrderDetail = (order: OrderDb) => {
    setSelectedOrder(order);
    setOrderDetailOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/hub")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg sm:text-xl font-bold">Base de données</h1>
          </div>
          {activeTab !== "calendar" && (
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                onClick={openCreateModal}
                data-testid="button-add"
                size="sm"
                className="h-9 px-2 sm:px-4"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Ajouter</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport(activeTab)}
                data-testid="button-export"
                size="sm"
                className="h-9 px-2 sm:px-4"
              >
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Exporter</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:max-w-md"
              data-testid="input-search"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EntityType)}>
          <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0 mb-4 sm:mb-6">
            <TabsList className="inline-flex w-max sm:w-auto">
              <TabsTrigger value="clients" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-clients">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Clients</span> ({clientsTotals?.pagination.total || clientsData?.pagination.total || 0})
              </TabsTrigger>
              <TabsTrigger value="themes" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-themes">
                <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Thèmes</span> ({themesTotals?.pagination.total || themesData?.pagination.total || 0})
              </TabsTrigger>
              <TabsTrigger value="commerciaux" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-commerciaux">
                <UserCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Commerciaux</span><span className="sm:hidden">Com.</span> ({commerciauxTotals?.pagination.total || commerciauxData?.pagination.total || 0})
              </TabsTrigger>
              <TabsTrigger value="fournisseurs" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-fournisseurs">
                <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Fournisseurs</span><span className="sm:hidden">Four.</span> ({fournisseursTotals?.pagination.total || fournisseursData?.pagination.total || 0})
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-orders">
                <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Commandes</span><span className="sm:hidden">Cmd</span> ({ordersTotals?.pagination.total || ordersData?.pagination.total || 0})
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-calendar">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Calendrier</span><span className="sm:hidden">Cal.</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="clients">
            <Card>
              <CardContent className="p-0">
                {clientsLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("code")}>
                              Code <SortIcon field="code" />
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("nom")}>
                              Nom <SortIcon field="nom" />
                            </TableHead>
                            <TableHead className="cursor-pointer hidden md:table-cell" onClick={() => handleSort("ville")}>
                              Ville <SortIcon field="ville" />
                            </TableHead>
                            <TableHead className="hidden lg:table-cell">Téléphone</TableHead>
                            <TableHead className="hidden lg:table-cell">Email</TableHead>
                            <TableHead className="w-24">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clientsData?.data.map((client) => (
                            <TableRow key={client.id || client.code} data-testid={`row-client-${client.id}`}>
                              <TableCell className="font-mono text-sm">{client.code}</TableCell>
                              <TableCell className="font-medium">{client.nom}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                {client.codePostal} {client.ville}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                {client.portable || client.tel || "-"}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                {client.mail || "-"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => openEditModal(client)} data-testid={`button-edit-client-${client.id}`}>
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  {client.id > 0 && (
                                    <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(client)} data-testid={`button-delete-client-${client.id}`}>
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {clientsData?.pagination && <Pagination pagination={clientsData.pagination} />}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="themes">
            <Card>
              <CardContent className="p-0">
                {themesLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("theme")}>
                              Thème <SortIcon field="theme" />
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("fournisseur")}>
                              Fournisseur <SortIcon field="fournisseur" />
                            </TableHead>
                            <TableHead className="w-24">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {themesData?.data.map((theme) => (
                            <TableRow key={theme.id} data-testid={`row-theme-${theme.id}`}>
                              <TableCell className="font-medium">{theme.theme}</TableCell>
                              <TableCell>{theme.fournisseur || "-"}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => openEditModal(theme)} data-testid={`button-edit-theme-${theme.id}`}>
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(theme)} data-testid={`button-delete-theme-${theme.id}`}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {themesData?.pagination && <Pagination pagination={themesData.pagination} />}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commerciaux">
            <Card>
              <CardContent className="p-0">
                {commerciauxLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("id")}>
                              ID <SortIcon field="id" />
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("nom")}>
                              Nom <SortIcon field="nom" />
                            </TableHead>
                            <TableHead className="w-24">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {commerciauxData?.data.map((commercial) => (
                            <TableRow key={commercial.id} data-testid={`row-commercial-${commercial.id}`}>
                              <TableCell className="font-mono text-sm">{commercial.id}</TableCell>
                              <TableCell className="font-medium">{commercial.nom}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => openEditModal(commercial)} data-testid={`button-edit-commercial-${commercial.id}`}>
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(commercial)} data-testid={`button-delete-commercial-${commercial.id}`}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {commerciauxData?.pagination && <Pagination pagination={commerciauxData.pagination} />}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fournisseurs">
            <Card>
              <CardContent className="p-0">
                {fournisseursLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("nomCourt")}>
                              Code <SortIcon field="nomCourt" />
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("nom")}>
                              Nom <SortIcon field="nom" />
                            </TableHead>
                            <TableHead className="w-24">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fournisseursData?.data.map((fournisseur) => (
                            <TableRow key={fournisseur.id} data-testid={`row-fournisseur-${fournisseur.id}`}>
                              <TableCell className="font-mono text-sm">{fournisseur.nomCourt}</TableCell>
                              <TableCell className="font-medium">{fournisseur.nom}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => openEditModal(fournisseur)} data-testid={`button-edit-fournisseur-${fournisseur.id}`}>
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(fournisseur)} data-testid={`button-delete-fournisseur-${fournisseur.id}`}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {fournisseursData?.pagination && <Pagination pagination={fournisseursData.pagination} />}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <div className="mb-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-status-filter">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les statuts</SelectItem>
                  {ORDER_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Card>
              <CardContent className="p-0">
                {ordersLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  </div>
                ) : ordersData?.data.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune commande trouvée</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="cursor-pointer text-xs sm:text-sm" onClick={() => handleSort("orderCode")}>
                              <span className="hidden sm:inline">N° </span>Cmd <SortIcon field="orderCode" />
                            </TableHead>
                            <TableHead className="cursor-pointer text-xs sm:text-sm hidden sm:table-cell" onClick={() => handleSort("orderDate")}>
                              Date <SortIcon field="orderDate" />
                            </TableHead>
                            <TableHead className="cursor-pointer text-xs sm:text-sm" onClick={() => handleSort("clientName")}>
                              Client <SortIcon field="clientName" />
                            </TableHead>
                            <TableHead className="hidden lg:table-cell">Commercial</TableHead>
                            <TableHead className="cursor-pointer text-xs sm:text-sm" onClick={() => handleSort("status")}>
                              Statut <SortIcon field="status" />
                            </TableHead>
                            <TableHead className="w-20 sm:w-32 text-xs sm:text-sm">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ordersData?.data.map((order) => (
                            <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                              <TableCell className="font-mono text-xs sm:text-sm">
                                <div>{order.orderCode}</div>
                                <div className="text-xs text-muted-foreground sm:hidden">{order.orderDate}</div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-sm">{order.orderDate}</TableCell>
                              <TableCell className="font-medium text-xs sm:text-sm">
                                <div className="truncate max-w-[100px] sm:max-w-none">{order.clientName}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-[100px] sm:max-w-none">{order.livraisonEnseigne}</div>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">{order.salesRepName}</TableCell>
                              <TableCell>
                                <Select 
                                  value={order.status} 
                                  onValueChange={(newStatus) => updateOrderStatusMutation.mutate({ id: order.id, status: newStatus })}
                                >
                                  <SelectTrigger className="w-24 sm:w-36 h-7 sm:h-8 text-xs" data-testid={`select-status-${order.id}`}>
                                    <SelectValue>{getStatusBadge(order.status)}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ORDER_STATUSES.map(s => (
                                      <SelectItem key={s.value} value={s.value}>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.color}`}>
                                          {s.label}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-0.5 sm:gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openOrderDetail(order)} data-testid={`button-view-order-${order.id}`}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-download-order-${order.id}`}>
                                        <Download className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => window.open(`/api/admin/orders/${order.id}/pdf`, '_blank')}>
                                        <FileText className="w-4 h-4 mr-2 text-red-600" />
                                        Télécharger PDF
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => window.open(`/api/admin/orders/${order.id}/excel`, '_blank')}>
                                        <FileText className="w-4 h-4 mr-2 text-green-600" />
                                        Télécharger Excel
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => {
                                        window.open(`/api/admin/orders/${order.id}/pdf`, '_blank');
                                        window.open(`/api/admin/orders/${order.id}/excel`, '_blank');
                                      }}>
                                        <Download className="w-4 h-4 mr-2" />
                                        Télécharger les deux
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingItem(order); setDeleteDialogOpen(true); }} data-testid={`button-delete-order-${order.id}`}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {ordersData?.pagination && <Pagination pagination={ordersData.pagination} />}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      const [year, month] = calendarMonth.split('-').map(Number);
                      const newDate = new Date(year, month - 2);
                      setCalendarMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
                      setSelectedCalendarDate(null);
                    }}
                    data-testid="button-prev-month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h2 className="text-lg font-semibold min-w-[140px] text-center capitalize" data-testid="calendar-month-display">
                    {new Date(calendarMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </h2>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      const [year, month] = calendarMonth.split('-').map(Number);
                      const newDate = new Date(year, month);
                      setCalendarMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
                      setSelectedCalendarDate(null);
                    }}
                    data-testid="button-next-month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <Select value={calendarEventType} onValueChange={(v) => setCalendarEventType(v as "all" | "order" | "delivery")}>
                  <SelectTrigger className="w-full sm:w-48" data-testid="select-event-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les événements</SelectItem>
                    <SelectItem value="order">Commandes uniquement</SelectItem>
                    <SelectItem value="delivery">Livraisons uniquement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {calendarLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                </div>
              ) : (
                <>
                  <Card>
                    <CardContent className="p-1 sm:p-3">
                      <div className="grid grid-cols-7 gap-0.5 mb-1">
                        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                          <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-0.5">
                        {(() => {
                          const [year, month] = calendarMonth.split('-').map(Number);
                          const firstDay = new Date(year, month - 1, 1);
                          const lastDay = new Date(year, month, 0);
                          const daysInMonth = lastDay.getDate();
                          let startDayOfWeek = firstDay.getDay();
                          startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
                          
                          const eventsByDate: { [key: string]: CalendarEvent[] } = {};
                          calendarEvents.forEach(event => {
                            if (!eventsByDate[event.date]) eventsByDate[event.date] = [];
                            eventsByDate[event.date].push(event);
                          });
                          
                          const getStatusColor = (status: string) => {
                            switch (status) {
                              case 'PAYEE': return 'bg-emerald-500';
                              case 'TERMINEE': return 'bg-gray-500';
                              case 'LIVREE': return 'bg-green-500';
                              case 'EXPEDIEE': return 'bg-purple-500';
                              case 'EN_PREPARATION': return 'bg-indigo-500';
                              case 'CONFIRMEE': return 'bg-blue-500';
                              case 'ANNULEE': return 'bg-red-500';
                              default: return 'bg-yellow-500';
                            }
                          };
                          
                          const cells = [];
                          for (let i = 0; i < startDayOfWeek; i++) {
                            cells.push(<div key={`empty-${i}`} className="aspect-square border border-gray-100 dark:border-gray-800 rounded" />);
                          }
                          
                          const today = new Date().toISOString().split('T')[0];
                          
                          for (let day = 1; day <= daysInMonth; day++) {
                            const dateStr = `${calendarMonth}-${String(day).padStart(2, '0')}`;
                            const dayEvents = eventsByDate[dateStr] || [];
                            const isToday = dateStr === today;
                            const isSelected = dateStr === selectedCalendarDate;
                            
                            const orders = dayEvents.filter(e => e.type === 'order');
                            const deliveries = dayEvents.filter(e => e.type === 'delivery');
                            
                            cells.push(
                              <button
                                key={day}
                                onClick={() => setSelectedCalendarDate(dateStr === selectedCalendarDate ? null : dateStr)}
                                className={`aspect-square p-0.5 rounded border text-center flex flex-col items-center justify-start transition-colors overflow-hidden ${
                                  isSelected 
                                    ? 'bg-primary text-primary-foreground border-primary' 
                                    : isToday 
                                      ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700' 
                                      : dayEvents.length > 0 
                                        ? 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700' 
                                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                                data-testid={`calendar-day-${dateStr}`}
                              >
                                <span className={`text-xs font-medium leading-tight ${isSelected ? '' : isToday ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                                  {day}
                                </span>
                                {dayEvents.length > 0 && (
                                  <div className="flex flex-col gap-0.5 w-full px-0.5 mt-0.5 overflow-hidden">
                                    {orders.slice(0, 2).map((evt, i) => (
                                      <div key={`o-${i}`} className={`h-1 w-full rounded-sm ${isSelected ? 'bg-white/60' : getStatusColor(evt.status)}`} title={`${evt.orderCode} - ${evt.clientName}`} />
                                    ))}
                                    {deliveries.slice(0, 2).map((evt, i) => (
                                      <div key={`d-${i}`} className={`h-1 w-full rounded-sm ${isSelected ? 'bg-white/40' : 'bg-green-400'} border-l-2 border-green-700`} title={`Livraison: ${evt.themeName}`} />
                                    ))}
                                    {dayEvents.length > 4 && (
                                      <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 4}</span>
                                    )}
                                  </div>
                                )}
                              </button>
                            );
                          }
                          
                          return cells;
                        })()}
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-3 pt-2 border-t text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1"><span className="w-2 h-1 rounded-sm bg-yellow-500" /> En attente</div>
                        <div className="flex items-center gap-1"><span className="w-2 h-1 rounded-sm bg-blue-500" /> Confirmée</div>
                        <div className="flex items-center gap-1"><span className="w-2 h-1 rounded-sm bg-purple-500" /> Expédiée</div>
                        <div className="flex items-center gap-1"><span className="w-2 h-1 rounded-sm bg-green-500" /> Livrée</div>
                        <div className="flex items-center gap-1"><span className="w-2 h-1 rounded-sm bg-emerald-500" /> Payée</div>
                      </div>
                    </CardContent>
                  </Card>

                  {selectedCalendarDate && (
                    <Card>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">
                            {new Date(selectedCalendarDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </h3>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedCalendarDate(null)}>
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                        </div>
                        {(() => {
                          const dayEvents = calendarEvents.filter(e => e.date === selectedCalendarDate);
                          if (dayEvents.length === 0) {
                            return <p className="text-sm text-muted-foreground">Aucun événement ce jour</p>;
                          }
                          return (
                            <div className="space-y-2">
                              {dayEvents.map(event => (
                                <div 
                                  key={event.id} 
                                  className={`flex items-start gap-3 p-2 sm:p-3 rounded-lg border ${
                                    event.type === 'order' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                                  }`}
                                  data-testid={`event-${event.id}`}
                                >
                                  <div className={`p-2 rounded-full shrink-0 ${event.type === 'order' ? 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-200' : 'bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-200'}`}>
                                    {event.type === 'order' ? <ClipboardList className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-medium text-sm">{event.orderCode}</span>
                                      <Badge variant={event.type === 'order' ? 'default' : 'secondary'} className="text-xs">
                                        {event.type === 'order' ? 'Commande' : 'Livraison'}
                                      </Badge>
                                      {getStatusBadge(event.status)}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1 truncate">{event.clientName}</p>
                                    {event.themeName && (
                                      <p className="text-xs text-muted-foreground">
                                        {event.themeName} {event.quantity ? `(x${event.quantity})` : ''}
                                      </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">Commercial: {event.salesRepName}</p>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => {
                                      const order = calendarOrdersData?.data.find(o => o.id === event.orderId);
                                      if (order) openOrderDetail(order);
                                    }}
                                    data-testid={`button-view-event-${event.id}`}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? `Ajouter un ${getTabLabel()}` : `Modifier le ${getTabLabel()}`}
            </DialogTitle>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (activeTab === "orders" && editingItem?.id) {
                  deleteOrderMutation.mutate(editingItem.id);
                } else {
                  handleDelete();
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {(deleteMutation.isPending || deleteOrderMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={orderDetailOpen} onOpenChange={setOrderDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Détails de la commande {selectedOrder?.orderCode}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Date de commande</Label>
                  <p className="font-medium">{selectedOrder.orderDate}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Statut</Label>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Informations client</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Nom</Label>
                    <p className="font-medium">{selectedOrder.clientName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedOrder.clientEmail || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Téléphone</Label>
                    <p className="font-medium">{selectedOrder.clientTel || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Commercial</Label>
                    <p className="font-medium">{selectedOrder.salesRepName}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Livraison</h4>
                <div className="space-y-2">
                  <div>
                    <Label className="text-muted-foreground">Enseigne</Label>
                    <p className="font-medium">{selectedOrder.livraisonEnseigne}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Adresse</Label>
                    <p className="font-medium">{selectedOrder.livraisonAdresse}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">CP / Ville</Label>
                    <p className="font-medium">{selectedOrder.livraisonCpVille}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Facturation</h4>
                <div className="space-y-2">
                  <div>
                    <Label className="text-muted-foreground">Raison sociale</Label>
                    <p className="font-medium">{selectedOrder.facturationRaisonSociale}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Mode de paiement</Label>
                    <p className="font-medium">{selectedOrder.facturationMode}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Thèmes commandés</h4>
                <div className="bg-muted p-3 rounded-md text-sm">
                  <pre className="whitespace-pre-wrap">{selectedOrder.themeSelections}</pre>
                </div>
              </div>

              {selectedOrder.createdAt && (
                <div className="border-t pt-4 text-sm text-muted-foreground">
                  <p>Créée le : {new Date(selectedOrder.createdAt).toLocaleString("fr-FR")}</p>
                  {selectedOrder.updatedAt && (
                    <p>Mise à jour : {new Date(selectedOrder.updatedAt).toLocaleString("fr-FR")}</p>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDetailOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
