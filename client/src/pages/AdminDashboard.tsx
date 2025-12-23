import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowLeft, 
  Download, 
  Search, 
  Users, 
  Package, 
  UserCircle, 
  Building2,
  ChevronUp,
  ChevronDown,
  Edit,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  code: string;
  nom: string;
  adresse1?: string;
  adresse2?: string;
  codePostal?: string;
  ville?: string;
  interloc?: string;
  tel?: string;
  portable?: string;
  mail?: string;
}

interface Theme {
  id: string;
  theme: string;
  fournisseur: string;
}

interface Commercial {
  id: string;
  nom: string;
}

interface Fournisseur {
  id: string;
  nom: string;
  nomCourt: string;
}

type SortDirection = "asc" | "desc";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState("clients");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("nom");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const { toast } = useToast();

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

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/data/clients"],
    enabled: !isCheckingAuth,
  });

  const { data: themes = [], isLoading: themesLoading } = useQuery<Theme[]>({
    queryKey: ["/api/data/themes"],
    enabled: !isCheckingAuth,
  });

  const { data: commerciaux = [], isLoading: commerciauxLoading } = useQuery<Commercial[]>({
    queryKey: ["/api/data/commerciaux"],
    enabled: !isCheckingAuth,
  });

  const { data: fournisseurs = [], isLoading: fournisseursLoading } = useQuery<Fournisseur[]>({
    queryKey: ["/api/data/fournisseurs"],
    enabled: !isCheckingAuth,
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortData = <T extends Record<string, any>>(data: T[], field: string): T[] => {
    return [...data].sort((a, b) => {
      const aVal = (a[field] || "").toString().toLowerCase();
      const bVal = (b[field] || "").toString().toLowerCase();
      if (sortDirection === "asc") {
        return aVal.localeCompare(bVal);
      }
      return bVal.localeCompare(aVal);
    });
  };

  const filterData = <T extends Record<string, any>>(data: T[]): T[] => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(item => 
      Object.values(item).some(val => 
        val && val.toString().toLowerCase().includes(term)
      )
    );
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

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? 
      <ChevronUp className="w-4 h-4 inline ml-1" /> : 
      <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredClients = sortData(filterData(clients), sortField);
  const filteredThemes = sortData(filterData(themes), sortField === "nom" ? "theme" : sortField);
  const filteredCommerciaux = sortData(filterData(commerciaux), sortField);
  const filteredFournisseurs = sortData(filterData(fournisseurs), sortField);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Base de données</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleExport(activeTab)}
              data-testid="button-export"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="clients" className="gap-2" data-testid="tab-clients">
              <Users className="w-4 h-4" />
              Clients ({clients.length})
            </TabsTrigger>
            <TabsTrigger value="themes" className="gap-2" data-testid="tab-themes">
              <Package className="w-4 h-4" />
              Thèmes ({themes.length})
            </TabsTrigger>
            <TabsTrigger value="commerciaux" className="gap-2" data-testid="tab-commerciaux">
              <UserCircle className="w-4 h-4" />
              Commerciaux ({commerciaux.length})
            </TabsTrigger>
            <TabsTrigger value="fournisseurs" className="gap-2" data-testid="tab-fournisseurs">
              <Building2 className="w-4 h-4" />
              Fournisseurs ({fournisseurs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients">
            <Card>
              <CardContent className="p-0">
                {clientsLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  </div>
                ) : (
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
                          <TableHead className="hidden xl:table-cell">Interlocuteur</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClients.slice(0, 100).map((client) => (
                          <TableRow key={client.id} data-testid={`row-client-${client.id}`}>
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
                            <TableCell className="hidden xl:table-cell">
                              {client.interloc || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredClients.length > 100 && (
                      <p className="p-4 text-center text-sm text-muted-foreground">
                        Affichage des 100 premiers résultats sur {filteredClients.length}
                      </p>
                    )}
                  </div>
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredThemes.map((theme, idx) => (
                          <TableRow key={idx} data-testid={`row-theme-${idx}`}>
                            <TableCell className="font-medium">{theme.theme}</TableCell>
                            <TableCell>{theme.fournisseur || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCommerciaux.map((commercial) => (
                          <TableRow key={commercial.id} data-testid={`row-commercial-${commercial.id}`}>
                            <TableCell className="font-mono text-sm">{commercial.id}</TableCell>
                            <TableCell className="font-medium">{commercial.nom}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFournisseurs.map((fournisseur) => (
                          <TableRow key={fournisseur.id} data-testid={`row-fournisseur-${fournisseur.id}`}>
                            <TableCell className="font-mono text-sm">{fournisseur.nomCourt}</TableCell>
                            <TableCell className="font-medium">{fournisseur.nom}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
