import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { OrderDb } from "@shared/schema";
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
  FileDown,
  Calendar,
  Truck,
  ClipboardList,
  BarChart3,
  TrendingUp,
  Euro,
  CheckCircle2,
  Check,
  AlertCircle,
  Copy,
  FileSpreadsheet
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  createdAt?: string | null;
  updatedAt?: string | null;
  isFromExcel?: boolean;
  previousValues?: string | null;
  modificationApproved?: boolean;
  approvedAt?: string | null;
}

interface Theme {
  id: number;
  theme: string;
  fournisseur: string;
  categorie?: string | null;
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

type EntityType = "clients" | "themes" | "commerciaux" | "fournisseurs" | "orders" | "newsletter";


export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<EntityType>("clients");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState<string>("nom");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [clientBadgeFilter, setClientBadgeFilter] = useState<"ALL" | "NEW" | "MODIFIED" | "LAMBDA" | "NEWSLETTER">("ALL");
  const [orderFournisseurFilter, setOrderFournisseurFilter] = useState<string>("ALL");
  const pageSize = 50;
  const { toast } = useToast();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isCreating, setIsCreating] = useState(false);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDb | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);

  interface ThemeSelection {
    theme: string;
    quantity?: number;
    deliveryDate?: string;
    category?: string;
  }

  const parseThemeSelections = (themeSelections: string | null): ThemeSelection[] => {
    try {
      return JSON.parse(themeSelections || "[]");
    } catch {
      return [];
    }
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

  const exportAllDatabase = async () => {
    setExportingAll(true);
    try {
      const response = await fetch("/api/admin/export-all");
      if (!response.ok) throw new Error("Erreur lors de l'export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_base_donnees_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Export terminé", description: "La base de données a été exportée avec succès." });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'exporter la base de données", variant: "destructive" });
    } finally {
      setExportingAll(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, clientBadgeFilter]);

  const handleTabChange = (tab: EntityType) => {
    // Set sort field BEFORE changing tab to prevent bad query
    if (tab === "orders") {
      setSortField("orderDate");
    } else if (tab === "themes") {
      setSortField("theme");
    } else {
      setSortField("nom");
    }
    setCurrentPage(1);
    setActiveTab(tab);
  };

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("authenticated") === "true";
    const isAdminAuthenticated = localStorage.getItem("adminAuthenticated") === "true";
    
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

  // Liste complète des fournisseurs pour les formulaires (thèmes)
  const { data: allFournisseurs } = useQuery<PaginatedResponse<Fournisseur>>({
    queryKey: ["/api/admin/fournisseurs", "all"],
    queryFn: () => fetch(`/api/admin/fournisseurs?page=1&pageSize=100`).then(r => r.json()),
    enabled: !isCheckingAuth,
  });

  const { data: ordersTotals } = useQuery<PaginatedResponse<OrderDb>>({
    queryKey: ["/api/admin/orders", "totals"],
    queryFn: () => fetch(`/api/admin/orders?page=1&pageSize=1`).then(r => r.json()),
    enabled: !isCheckingAuth,
  });

  // Statistiques globales
  interface StatsData {
    totalClients: number;
    totalThemes: number;
    totalCommerciaux: number;
    totalFournisseurs: number;
    totalOrders: number;
    statusCounts: { [key: string]: number };
  }
  const { data: statsData } = useQuery<StatsData>({
    queryKey: ["/api/admin/stats"],
    queryFn: () => fetch(`/api/admin/stats`).then(r => r.json()),
    enabled: false,
  });

  const { data: clientsData, isLoading: clientsLoading } = useQuery<PaginatedResponse<Client>>({
    queryKey: ["/api/admin/clients", currentPage, debouncedSearch, sortField, sortDirection, clientBadgeFilter],
    queryFn: () => fetch(`/api/admin/clients${buildQueryParams()}&badgeFilter=${clientBadgeFilter}`).then(r => r.json()),
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
    queryKey: ["/api/admin/orders", currentPage, debouncedSearch, sortField, sortDirection, orderFournisseurFilter],
    queryFn: () => fetch(`/api/admin/orders${buildQueryParams()}${orderFournisseurFilter !== "ALL" ? `&fournisseur=${orderFournisseurFilter}` : ""}`).then(r => r.json()),
    enabled: !isCheckingAuth && activeTab === "orders",
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

  const approveClientMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/admin/clients/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/clients'] });
      toast({ title: "Succès", description: "Modification approuvée" });
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

  const [isImporting, setIsImporting] = useState(false);
  const [isMigratingCategories, setIsMigratingCategories] = useState(false);

  const handleMigrateCategories = async () => {
    setIsMigratingCategories(true);
    try {
      const response = await apiRequest("POST", "/api/admin/themes/migrate-categories");
      const result = await response.json();
      toast({ 
        title: "Migration réussie", 
        description: result.message 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/themes'] });
    } catch (error: any) {
      toast({ 
        title: "Erreur de migration", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsMigratingCategories(false);
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

  const handleImportExcel = async () => {
    if (isImporting) return;
    setIsImporting(true);
    try {
      const response = await fetch('/api/admin/import-excel', { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        toast({ 
          title: "Import réussi", 
          description: `Importé: ${data.imported.commerciaux} commerciaux, ${data.imported.fournisseurs} fournisseurs, ${data.imported.themes} thèmes, ${data.imported.clients} clients` 
        });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/clients'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/commerciaux'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/fournisseurs'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/themes'] });
      } else {
        throw new Error(data.message || "Erreur d'import");
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
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
        return { prenom: "", nom: "", role: "commercial", actif: true, motDePasse: "bfc26" };
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
              <Label htmlFor="theme">Thème / Produit</Label>
              <Input id="theme" value={editFormData.theme || ""} onChange={e => setEditFormData({...editFormData, theme: e.target.value})} data-testid="input-theme-name" />
            </div>
            <div>
              <Label htmlFor="fournisseur">Fournisseur</Label>
              <Select 
                value={editFormData.fournisseur || ""} 
                onValueChange={(value) => setEditFormData({...editFormData, fournisseur: value})}
              >
                <SelectTrigger data-testid="select-theme-fournisseur">
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  {allFournisseurs?.data?.map((f) => (
                    <SelectItem key={f.id} value={f.nomCourt || f.nom}>
                      {f.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="categorie">Catégorie</Label>
              <Select 
                value={editFormData.categorie || "TOUTE_ANNEE"} 
                onValueChange={(value) => setEditFormData({...editFormData, categorie: value})}
              >
                <SelectTrigger data-testid="select-theme-categorie">
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TOUTE_ANNEE">Toute l'année</SelectItem>
                  <SelectItem value="SAISONNIER">Saisonnier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case "commerciaux":
        return (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prenom">Prénom</Label>
                <Input id="prenom" value={editFormData.prenom || ""} onChange={e => setEditFormData({...editFormData, prenom: e.target.value})} data-testid="input-prenom" />
              </div>
              <div>
                <Label htmlFor="nom">Nom</Label>
                <Input id="nom" value={editFormData.nom || ""} onChange={e => setEditFormData({...editFormData, nom: e.target.value})} data-testid="input-nom" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Rôle</Label>
                <Select value={editFormData.role || "commercial"} onValueChange={v => setEditFormData({...editFormData, role: v})}>
                  <SelectTrigger data-testid="select-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="actif">Accès</Label>
                <Select value={editFormData.actif === false ? "false" : "true"} onValueChange={v => setEditFormData({...editFormData, actif: v === "true"})}>
                  <SelectTrigger data-testid="select-actif">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Actif</SelectItem>
                    <SelectItem value="false">Révoqué</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="motDePasse">Mot de passe</Label>
              <Input 
                id="motDePasse" 
                type="text"
                value={editFormData.motDePasse || "bfc26"} 
                onChange={e => setEditFormData({...editFormData, motDePasse: e.target.value})} 
                data-testid="input-mot-de-passe"
                placeholder="bfc26"
              />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-xs text-muted-foreground">Identifiant</Label>
              <p className="font-mono text-sm mt-1">
                {((editFormData.prenom || "") + (editFormData.nom || "")).toLowerCase().replace(/\s/g, '') || "-"}
              </p>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-2 sm:px-4"
                    data-testid="button-more-actions"
                  >
                    <Download className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => handleExport(activeTab)}
                    data-testid="menu-export"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exporter en Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={exportAllDatabase}
                    disabled={exportingAll}
                    data-testid="menu-export-all"
                  >
                    {exportingAll ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                    )}
                    {exportingAll ? "Export en cours..." : "Exporter toute la base"}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleImportExcel}
                    disabled={isImporting}
                    data-testid="menu-import-excel"
                  >
                    {isImporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {isImporting ? "Import en cours..." : "Importer depuis Excel"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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

        <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as EntityType)}>
          <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0 mb-4 sm:mb-6">
            <TabsList className="inline-flex w-max sm:w-auto">
              <TabsTrigger value="clients" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-clients">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Clients</span><span className="sm:hidden">Cli.</span> ({clientsTotals?.pagination.total || clientsData?.pagination.total || 0})
              </TabsTrigger>
              <TabsTrigger value="themes" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-themes">
                <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Thèmes</span><span className="sm:hidden">Thè.</span> ({themesTotals?.pagination.total || themesData?.pagination.total || 0})
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
                <span className="hidden sm:inline">Commandes</span><span className="sm:hidden">Cmd.</span> ({ordersTotals?.pagination.total || 0})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="clients">
            <Card>
              <CardContent className="p-0">
                <div className="p-3 border-b flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Filtrer par :</span>
                  <Select value={clientBadgeFilter} onValueChange={(v) => setClientBadgeFilter(v as any)}>
                    <SelectTrigger className="w-[140px] h-8" data-testid="select-badge-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tous</SelectItem>
                      <SelectItem value="NEW">Nouveaux</SelectItem>
                      <SelectItem value="MODIFIED">Modifiés</SelectItem>
                      <SelectItem value="LAMBDA">Lambda</SelectItem>
                      <SelectItem value="NEWSLETTER">Newsletter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                          {clientsData?.data.map((client) => {
                            const now = new Date();
                            const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                            const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
                            const createdAt = client.createdAt ? new Date(client.createdAt) : null;
                            const approvedAt = client.approvedAt ? new Date(client.approvedAt) : null;
                            const isNew = createdAt && createdAt > oneMonthAgo && !client.isFromExcel;
                            const hasPendingModification = client.modificationApproved === false && client.previousValues;
                            const hasRecentlyApproved = approvedAt && approvedAt > twoMonthsAgo;
                            
                            let previousData: { interloc?: string; tel?: string; portable?: string; mail?: string } = {};
                            if (client.previousValues) {
                              try {
                                previousData = JSON.parse(client.previousValues);
                              } catch (e) {}
                            }
                            
                            return (
                            <TableRow key={client.id || client.code} data-testid={`row-client-${client.id}`}>
                              <TableCell className="font-mono text-sm">{client.code}</TableCell>
                              <TableCell className="font-medium">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span>{client.nom}</span>
                                  {isNew && (
                                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-xs">
                                      Nouveau
                                    </Badge>
                                  )}
                                  {hasPendingModification && (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-xs cursor-pointer hover:bg-red-200">
                                          <AlertCircle className="w-3 h-3 mr-1" />
                                          Modifié
                                        </Badge>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-80">
                                        <div className="space-y-3">
                                          <h4 className="font-medium text-sm">Modifications en attente</h4>
                                          <div className="space-y-2 text-xs">
                                            {previousData.interloc !== client.interloc && (
                                              <div>
                                                <span className="font-medium">Interlocuteur:</span>
                                                <div className="text-muted-foreground line-through">{previousData.interloc || "(vide)"}</div>
                                                <div className="text-primary font-medium">{client.interloc || "(vide)"}</div>
                                              </div>
                                            )}
                                            {previousData.portable !== client.portable && (
                                              <div>
                                                <span className="font-medium">Portable:</span>
                                                <div className="text-muted-foreground line-through">{previousData.portable || "(vide)"}</div>
                                                <div className="text-primary font-medium">{client.portable || "(vide)"}</div>
                                              </div>
                                            )}
                                            {previousData.tel !== client.tel && (
                                              <div>
                                                <span className="font-medium">Téléphone:</span>
                                                <div className="text-muted-foreground line-through">{previousData.tel || "(vide)"}</div>
                                                <div className="text-primary font-medium">{client.tel || "(vide)"}</div>
                                              </div>
                                            )}
                                            {previousData.mail !== client.mail && (
                                              <div>
                                                <span className="font-medium">Email:</span>
                                                <div className="text-muted-foreground line-through">{previousData.mail || "(vide)"}</div>
                                                <div className="text-primary font-medium">{client.mail || "(vide)"}</div>
                                              </div>
                                            )}
                                          </div>
                                          <Button 
                                            size="sm" 
                                            className="w-full"
                                            onClick={() => approveClientMutation.mutate(client.id)}
                                            disabled={approveClientMutation.isPending}
                                          >
                                            {approveClientMutation.isPending ? (
                                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                              <Check className="w-4 h-4 mr-2" />
                                            )}
                                            Approuver
                                          </Button>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                  {hasRecentlyApproved && !hasPendingModification && (
                                    <Badge variant="outline" className="text-xs text-muted-foreground">
                                      Modifié le {approvedAt.toLocaleDateString("fr-FR")}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
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
                          );
                          })}
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
                <div className="p-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-sm text-muted-foreground">
                    Thèmes liés aux fournisseurs - Les modifications sont automatiquement reflétées dans les bons de commande
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMigrateCategories}
                    disabled={isMigratingCategories}
                    data-testid="button-migrate-categories"
                  >
                    {isMigratingCategories ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Package className="w-4 h-4 mr-2" />
                    )}
                    {isMigratingCategories ? "Migration..." : "Migrer catégories"}
                  </Button>
                </div>
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
                            <TableHead className="cursor-pointer" onClick={() => handleSort("categorie")}>
                              Catégorie <SortIcon field="categorie" />
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
                                <Badge variant={theme.categorie === "SAISONNIER" ? "secondary" : "outline"}>
                                  {theme.categorie === "SAISONNIER" ? "Saisonnier" : "Toute l'année"}
                                </Badge>
                              </TableCell>
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
                            <TableHead className="cursor-pointer" onClick={() => handleSort("prenom")}>
                              Prénom <SortIcon field="prenom" />
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("nom")}>
                              Nom <SortIcon field="nom" />
                            </TableHead>
                            <TableHead className="hidden sm:table-cell">Identifiant</TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("role")}>
                              Rôle <SortIcon field="role" />
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("actif")}>
                              Accès <SortIcon field="actif" />
                            </TableHead>
                            <TableHead className="w-24">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {commerciauxData?.data.map((commercial: any) => (
                            <TableRow key={commercial.id} data-testid={`row-commercial-${commercial.id}`}>
                              <TableCell className="font-mono text-sm">{commercial.id}</TableCell>
                              <TableCell>{commercial.prenom || "-"}</TableCell>
                              <TableCell className="font-medium">{commercial.nom}</TableCell>
                              <TableCell className="hidden sm:table-cell font-mono text-xs text-muted-foreground">
                                {((commercial.prenom || "") + commercial.nom).toLowerCase().replace(/\s/g, '')}
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${commercial.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                                  {commercial.role === 'admin' ? 'Admin' : 'Commercial'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${commercial.actif !== false ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'}`}>
                                  {commercial.actif !== false ? 'Actif' : 'Révoqué'}
                                </span>
                              </TableCell>
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
            <Card>
              <CardContent className="p-0">
                <div className="p-3 border-b flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Fournisseur :</span>
                  <Select value={orderFournisseurFilter} onValueChange={setOrderFournisseurFilter}>
                    <SelectTrigger className="w-40" data-testid="select-order-fournisseur-filter">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tous</SelectItem>
                      {allFournisseurs?.data?.map(f => (
                        <SelectItem key={f.id} value={f.nomCourt || f.nom}>{f.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {ordersLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("orderCode")}>
                              Code <SortIcon field="orderCode" />
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("orderDate")}>
                              Date <SortIcon field="orderDate" />
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort("salesRepName")}>
                              Commercial <SortIcon field="salesRepName" />
                            </TableHead>
                            <TableHead className="cursor-pointer hidden md:table-cell" onClick={() => handleSort("clientName")}>
                              Client <SortIcon field="clientName" />
                            </TableHead>
                            <TableHead className="hidden lg:table-cell">Livraison</TableHead>
                            <TableHead className="w-24">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ordersData?.data.map((order) => (
                            <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                              <TableCell className="font-mono text-sm">{order.orderCode}</TableCell>
                              <TableCell>{order.orderDate}</TableCell>
                              <TableCell className="font-medium">{order.salesRepName}</TableCell>
                              <TableCell className="hidden md:table-cell">{order.clientName}</TableCell>
                              <TableCell className="hidden lg:table-cell">{order.livraisonEnseigne}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => { setSelectedOrder(order); setOrderDetailOpen(true); }}
                                    data-testid={`button-view-order-${order.id}`}
                                  >
                                    <Eye className="w-4 h-4" />
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
              onClick={() => handleDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
                  <Label className="text-muted-foreground">Fournisseur</Label>
                  <p className="font-medium">{selectedOrder.fournisseur || "-"}</p>
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
                <h4 className="font-semibold mb-3">Thèmes / Produits commandés</h4>
                {parseThemeSelections(selectedOrder.themeSelections).length > 0 ? (
                  <div className="space-y-2">
                    {parseThemeSelections(selectedOrder.themeSelections).map((theme, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{theme.theme}</span>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          {theme.quantity && <span>Qté: {theme.quantity}</span>}
                          {theme.deliveryDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {theme.deliveryDate}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-muted p-3 rounded-md text-sm">
                    <pre className="whitespace-pre-wrap">{selectedOrder.themeSelections || "Aucun thème"}</pre>
                  </div>
                )}
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedOrder && downloadPdf(selectedOrder)}
                disabled={downloadingPdf}
                data-testid="button-download-order-pdf"
              >
                {downloadingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedOrder && downloadExcel(selectedOrder)}
                disabled={downloadingExcel}
                data-testid="button-download-order-excel"
              >
                {downloadingExcel ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                Excel
              </Button>
            </div>
            <Button variant="outline" onClick={() => setOrderDetailOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
