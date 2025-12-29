import { useState, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { THEMES_TOUTE_ANNEE, THEMES_SAISONNIER, type ThemeSelection } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { ClipboardList, ArrowRight, Building2, Truck, FileText, User, Store, UserPlus, Edit, Loader2 } from "lucide-react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { ClientModal } from "./ClientModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const MONTHS = [
  { value: "01", label: "janv." },
  { value: "02", label: "févr." },
  { value: "03", label: "mars" },
  { value: "04", label: "avr." },
  { value: "05", label: "mai" },
  { value: "06", label: "juin" },
  { value: "07", label: "juil." },
  { value: "08", label: "août" },
  { value: "09", label: "sept." },
  { value: "10", label: "oct." },
  { value: "11", label: "nov." },
  { value: "12", label: "déc." },
];
const YEARS = ["2025", "2026", "2027"];

// Composant de saisie de date avec sélecteurs déroulants
function DateInput({ value, onChange, testId }: { 
  value: string; 
  onChange: (value: string) => void; 
  testId?: string;
}) {
  const parts = value ? value.split("-") : ["", "", ""];
  const year = parts[0] || "";
  const month = parts[1] || "";
  const day = parts[2] || "";

  const updateDate = (d: string, m: string, y: string) => {
    if (d && m && y) {
      onChange(`${y}-${m}-${d}`);
    }
  };

  return (
    <div className="flex items-center gap-2" data-testid={testId}>
      <Select value={day} onValueChange={(d) => updateDate(d, month, year)}>
        <SelectTrigger className="w-20 h-12">
          <SelectValue placeholder="Jour" />
        </SelectTrigger>
        <SelectContent>
          {DAYS.map((d) => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={month} onValueChange={(m) => updateDate(day, m, year)}>
        <SelectTrigger className="w-24 h-12">
          <SelectValue placeholder="Mois" />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={year} onValueChange={(y) => updateDate(day, month, y)}>
        <SelectTrigger className="w-24 h-12">
          <SelectValue placeholder="Année" />
        </SelectTrigger>
        <SelectContent>
          {YEARS.map((y) => (
            <SelectItem key={y} value={y}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Version compacte pour les tableaux de thèmes (jour + mois seulement, année = 2026)
function CompactDateInput({ value, onChange, testId }: { 
  value: string; 
  onChange: (value: string) => void;
  testId?: string;
}) {
  const parts = value ? value.split("-") : ["", "", ""];
  const month = parts[1] || "";
  const day = parts[2] || "";

  const updateDate = (d: string, m: string) => {
    if (d && m) {
      onChange(`2026-${m}-${d}`);
    } else {
      onChange("");
    }
  };

  return (
    <div className="flex items-center gap-1" data-testid={testId}>
      <Select value={day} onValueChange={(d) => updateDate(d, month)}>
        <SelectTrigger className="w-14 h-8 text-xs px-1">
          <SelectValue placeholder="JJ" />
        </SelectTrigger>
        <SelectContent>
          {DAYS.map((d) => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={month} onValueChange={(m) => updateDate(day, m)}>
        <SelectTrigger className="w-16 h-8 text-xs px-1">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface Client {
  id: string;
  code: string;
  nom: string;
  adresse1: string;
  adresse2?: string;
  codePostal: string;
  ville: string;
  pays?: string;
  interloc: string;
  tel: string;
  portable: string;
  fax?: string;
  mail: string;
  displayName: string;
  isFromDb?: boolean;
}

const formSchema = z.object({
  orderDate: z.string().min(1, "La date est requise"),
  salesRepName: z.string().min(1, "Le nom du commercial est requis"),
  responsableName: z.string().min(1, "Le nom du responsable est requis"),
  responsableTel: z.string().min(1, "Le téléphone du responsable est requis"),
  responsableEmail: z.string().email("Email responsable invalide"),
  comptaTel: z.string().optional(),
  comptaEmail: z.string().optional(),
  livraisonEnseigne: z.string().min(1, "L'enseigne est requise"),
  livraisonAdresse: z.string().min(1, "L'adresse de livraison est requise"),
  livraisonCpVille: z.string().min(1, "Le CP/Ville de livraison est requis"),
  livraisonHoraires: z.string().optional(),
  livraisonHayon: z.boolean(),
  facturationRaisonSociale: z.string().min(1, "La raison sociale est requise"),
  facturationAdresse: z.string().min(1, "L'adresse de facturation est requise"),
  facturationCpVille: z.string().min(1, "Le CP/Ville de facturation est requis"),
  facturationMode: z.enum(["VIREMENT", "CHEQUE", "LCR"]),
  facturationRib: z.string().optional(),
  remarks: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface OrderFormProps {
  onNext: (data: any) => void;
  initialData?: any;
}

export function OrderForm({ onNext, initialData }: OrderFormProps) {
  const [themeSelections, setThemeSelections] = useState<ThemeSelection[]>(
    initialData?.themeSelections ? JSON.parse(initialData.themeSelections) : []
  );
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientModalMode, setClientModalMode] = useState<"create" | "edit">("create");
  const [selectedClientData, setSelectedClientData] = useState<Client | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [originalClientData, setOriginalClientData] = useState<Client | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  const [clientChanges, setClientChanges] = useState<{field: string, old: string, new: string}[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Mutation pour mettre à jour le client
  const updateClientMutation = useMutation({
    mutationFn: async (data: { id: number, updates: any }) => {
      return apiRequest("PATCH", `/api/admin/clients/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      toast({ title: "Client mis à jour", description: "Les informations du client ont été sauvegardées dans la base de données." });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const today = formatInTimeZone(new Date(), "Europe/Paris", "yyyy-MM-dd");
  
  // Récupérer le nom du commercial connecté
  const connectedUserName = sessionStorage.getItem("userName") || "";

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderDate: initialData?.orderDate || today,
      salesRepName: initialData?.salesRepName || connectedUserName,
      responsableName: initialData?.responsableName || "",
      responsableTel: initialData?.responsableTel || "",
      responsableEmail: initialData?.responsableEmail || "",
      comptaTel: initialData?.comptaTel || "",
      comptaEmail: initialData?.comptaEmail || "",
      livraisonEnseigne: initialData?.livraisonEnseigne || "",
      livraisonAdresse: initialData?.livraisonAdresse || "",
      livraisonCpVille: initialData?.livraisonCpVille || "",
      livraisonHoraires: initialData?.livraisonHoraires || "",
      livraisonHayon: initialData?.livraisonHayon || false,
      facturationRaisonSociale: initialData?.facturationRaisonSociale || "",
      facturationAdresse: initialData?.facturationAdresse || "",
      facturationCpVille: initialData?.facturationCpVille || "",
      facturationMode: initialData?.facturationMode || "VIREMENT",
      facturationRib: initialData?.facturationRib || "",
      remarks: initialData?.remarks || "",
    },
  });

  const { data: commerciaux = [] } = useQuery<any[]>({ queryKey: ["/api/data/commerciaux"] });
  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/data/clients"] });

  const commerciauxOptions = useMemo<ComboboxOption[]>(() => 
    commerciaux.map(c => ({
      value: c.displayName,
      label: c.displayName,
    })), [commerciaux]);

  const clientsOptions = useMemo<ComboboxOption[]>(() => 
    clients.map(c => ({
      value: c.id,
      label: c.displayName,
    })), [clients]);

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      // Sauvegarder les données originales pour détecter les modifications
      setOriginalClientData(selectedClient);
      setSelectedClientData(selectedClient);
      
      const adresseComplete = selectedClient.adresse2 
        ? `${selectedClient.adresse1}, ${selectedClient.adresse2}`
        : selectedClient.adresse1;
      const cpVille = `${selectedClient.codePostal} ${selectedClient.ville}`.trim();
      
      setValue("livraisonEnseigne", selectedClient.nom);
      setValue("livraisonAdresse", adresseComplete);
      setValue("livraisonCpVille", cpVille);
      
      setValue("facturationRaisonSociale", selectedClient.nom);
      setValue("facturationAdresse", adresseComplete);
      setValue("facturationCpVille", cpVille);
      
      if (selectedClient.interloc) {
        setValue("responsableName", selectedClient.interloc);
      }
      if (selectedClient.tel || selectedClient.portable) {
        setValue("responsableTel", selectedClient.portable || selectedClient.tel);
      }
      if (selectedClient.mail) {
        setValue("responsableEmail", selectedClient.mail);
      }

      // Vérifier si des informations importantes manquent
      const missingInfo = [];
      if (!selectedClient.mail) missingInfo.push("email");
      if (!selectedClient.tel && !selectedClient.portable) missingInfo.push("téléphone");
      if (!selectedClient.interloc) missingInfo.push("interlocuteur");
      
      if (missingInfo.length > 0) {
        toast({
          title: "Informations manquantes",
          description: `Ce client n'a pas de ${missingInfo.join(", ")}. Vous pouvez compléter ses informations.`,
          action: (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                setClientModalMode("edit");
                setClientModalOpen(true);
              }}
            >
              Compléter
            </Button>
          ),
        });
      }
    }
  };

  const handleNewClient = () => {
    setSelectedClientData(null);
    setClientModalMode("create");
    setClientModalOpen(true);
  };

  const handleClientModalSuccess = (client: any) => {
    // Mettre à jour le client sélectionné
    setSelectedClientId(client.id);
    
    // Pré-remplir le formulaire avec le nouveau client
    const adresseComplete = client.adresse2 
      ? `${client.adresse1}, ${client.adresse2}`
      : client.adresse1 || "";
    const cpVille = `${client.codePostal || ""} ${client.ville || ""}`.trim();
    
    setValue("livraisonEnseigne", client.nom);
    setValue("livraisonAdresse", adresseComplete);
    setValue("livraisonCpVille", cpVille);
    
    setValue("facturationRaisonSociale", client.nom);
    setValue("facturationAdresse", adresseComplete);
    setValue("facturationCpVille", cpVille);
    
    if (client.interloc) {
      setValue("responsableName", client.interloc);
    }
    if (client.tel || client.portable) {
      setValue("responsableTel", client.portable || client.tel);
    }
    if (client.mail) {
      setValue("responsableEmail", client.mail);
    }
  };

  const updateThemeSelection = (theme: string, category: "TOUTE_ANNEE" | "SAISONNIER", field: "quantity" | "deliveryDate", value: string) => {
    setThemeSelections(prev => {
      const existing = prev.find(t => t.theme === theme && t.category === category);
      if (existing) {
        return prev.map(t => 
          t.theme === theme && t.category === category 
            ? { ...t, [field]: value }
            : t
        );
      } else {
        return [...prev, { theme, category, [field]: value }];
      }
    });
  };

  const getThemeValue = (theme: string, category: "TOUTE_ANNEE" | "SAISONNIER", field: "quantity" | "deliveryDate"): string => {
    const selection = themeSelections.find(t => t.theme === theme && t.category === category);
    return selection?.[field] || "";
  };

  // Fonction pour détecter les changements dans les informations client
  const detectClientChanges = (data: FormData): {field: string, old: string, new: string}[] => {
    if (!originalClientData) return [];
    
    const changes: {field: string, old: string, new: string}[] = [];
    
    // Comparer le nom du responsable avec l'interlocuteur
    if (data.responsableName !== (originalClientData.interloc || "") && data.responsableName) {
      changes.push({ 
        field: "Interlocuteur", 
        old: originalClientData.interloc || "(vide)", 
        new: data.responsableName 
      });
    }
    
    // Comparer le téléphone
    const originalTel = originalClientData.portable || originalClientData.tel || "";
    if (data.responsableTel !== originalTel && data.responsableTel) {
      changes.push({ 
        field: "Téléphone", 
        old: originalTel || "(vide)", 
        new: data.responsableTel 
      });
    }
    
    // Comparer l'email
    if (data.responsableEmail !== (originalClientData.mail || "") && data.responsableEmail) {
      changes.push({ 
        field: "Email", 
        old: originalClientData.mail || "(vide)", 
        new: data.responsableEmail 
      });
    }
    
    return changes;
  };

  const proceedWithSubmit = (data: FormData) => {
    const filteredSelections = themeSelections.filter(t => t.quantity || t.deliveryDate);
    
    onNext({
      ...data,
      themeSelections: JSON.stringify(filteredSelections),
      clientName: data.responsableName,
      clientEmail: data.responsableEmail,
      supplier: "BDIS",
      productTheme: filteredSelections.map(t => t.theme).join(", ") || "Divers",
      quantity: filteredSelections.map(t => t.quantity).filter(Boolean).join(", ") || "1",
      deliveryDate: filteredSelections[0]?.deliveryDate || data.orderDate,
    });
  };

  // Extraire l'ID numérique de la base de données à partir du format "db-123"
  const getDbIdFromClientId = (clientId: string): number | null => {
    if (clientId && clientId.startsWith("db-")) {
      const numId = parseInt(clientId.replace("db-", ""), 10);
      return isNaN(numId) ? null : numId;
    }
    return null;
  };

  const onSubmit = (data: FormData) => {
    // Vérifier si un client existant de la BDD a été sélectionné
    const dbId = originalClientData ? getDbIdFromClientId(originalClientData.id) : null;
    
    if (originalClientData && dbId && originalClientData.isFromDb) {
      const changes = detectClientChanges(data);
      
      if (changes.length > 0) {
        // Des modifications ont été détectées, proposer de sauvegarder
        setClientChanges(changes);
        setPendingFormData(data);
        setUpdateDialogOpen(true);
        return;
      }
    }
    
    // Pas de modifications ou pas de client sélectionné, continuer directement
    proceedWithSubmit(data);
  };

  const handleUpdateClient = async () => {
    const dbId = originalClientData ? getDbIdFromClientId(originalClientData.id) : null;
    
    if (!originalClientData || !pendingFormData || !dbId) {
      // Continuer sans mise à jour
      proceedWithSubmit(pendingFormData);
      setUpdateDialogOpen(false);
      return;
    }
    
    // Préparer les données de mise à jour
    const updates: any = {};
    if (pendingFormData.responsableName !== (originalClientData.interloc || "")) {
      updates.interloc = pendingFormData.responsableName;
    }
    if (pendingFormData.responsableTel !== (originalClientData.portable || originalClientData.tel || "")) {
      updates.portable = pendingFormData.responsableTel;
    }
    if (pendingFormData.responsableEmail !== (originalClientData.mail || "")) {
      updates.mail = pendingFormData.responsableEmail;
    }
    
    try {
      await updateClientMutation.mutateAsync({ id: dbId, updates });
    } catch (e) {
      // Erreur déjà gérée par le mutation
    }
    
    setUpdateDialogOpen(false);
    proceedWithSubmit(pendingFormData);
  };

  const handleSkipUpdate = () => {
    setUpdateDialogOpen(false);
    if (pendingFormData) {
      proceedWithSubmit(pendingFormData);
    }
  };

  const facturationMode = watch("facturationMode");

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">BON DE COMMANDE 2026</h1>
                <p className="text-sm text-muted-foreground">Remplissez tous les champs obligatoires (*)</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* En-tête : Date et Commercial */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informations générales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="orderDate" className="text-sm font-medium">
                      DATE <span className="text-destructive">*</span>
                    </Label>
                    <Controller
                      name="orderDate"
                      control={control}
                      render={({ field }) => (
                        <DateInput
                          value={field.value}
                          onChange={field.onChange}
                          testId="input-order-date"
                        />
                      )}
                    />
                    {errors.orderDate && (
                      <p className="text-xs text-destructive">{errors.orderDate.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      COMMERCIAL <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={connectedUserName}
                      disabled
                      className="h-12 text-base bg-muted"
                      data-testid="input-sales-rep"
                    />
                    <input type="hidden" {...register("salesRepName")} />
                    {errors.salesRepName && (
                      <p className="text-xs text-destructive">{errors.salesRepName.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sélection Client (pré-remplissage) */}
            <Card className="border-2 border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Sélection du client
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Sélectionnez un client existant ou créez-en un nouveau
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Combobox
                  options={clientsOptions}
                  value={selectedClientId}
                  onValueChange={handleClientSelect}
                  placeholder="Rechercher un client..."
                  searchPlaceholder="Tapez le nom ou la ville..."
                  emptyText="Aucun client trouvé"
                  testId="select-client"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleNewClient}
                  className="w-full h-11"
                  data-testid="button-new-client"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Nouveau client
                </Button>
              </CardContent>
            </Card>

            {/* Responsable et Service comptabilité */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Contacts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Responsable */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm border-b pb-2">Responsable <span className="text-destructive">*</span></h3>
                    <div className="space-y-2">
                      <Input
                        {...register("responsableName")}
                        className="h-11 text-base"
                        placeholder="Nom du responsable"
                        data-testid="input-responsable-name"
                      />
                      {errors.responsableName && (
                        <p className="text-xs text-destructive">{errors.responsableName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Input
                        {...register("responsableTel")}
                        className="h-11 text-base"
                        placeholder="Tél."
                        data-testid="input-responsable-tel"
                      />
                      {errors.responsableTel && (
                        <p className="text-xs text-destructive">{errors.responsableTel.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Input
                        type="email"
                        {...register("responsableEmail")}
                        className="h-11 text-base"
                        placeholder="E-mail"
                        data-testid="input-responsable-email"
                      />
                      {errors.responsableEmail && (
                        <p className="text-xs text-destructive">{errors.responsableEmail.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Service comptabilité */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm border-b pb-2">Service comptabilité</h3>
                    <div className="space-y-2">
                      <Input
                        {...register("comptaTel")}
                        className="h-11 text-base"
                        placeholder="Tél."
                        data-testid="input-compta-tel"
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        type="email"
                        {...register("comptaEmail")}
                        className="h-11 text-base"
                        placeholder="E-mail"
                        data-testid="input-compta-email"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Thèmes - Tableau */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Sélection des thèmes</CardTitle>
                <p className="text-sm text-muted-foreground">Indiquez la quantité et la date de livraison pour chaque thème souhaité</p>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Colonne TOUTE L'ANNEE */}
                  <div>
                    <h3 className="font-bold text-sm bg-primary text-primary-foreground p-2 rounded-t-md text-center">TOUTE L'ANNEE</h3>
                    <div className="border border-t-0 rounded-b-md">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="p-2 text-left font-medium">THEME</th>
                            <th className="p-2 text-center font-medium w-16">QTE</th>
                            <th className="p-2 text-center font-medium w-28">Date livr.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {THEMES_TOUTE_ANNEE.map((theme, idx) => (
                            <tr key={theme} className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                              <td className="p-1.5 text-xs font-medium">{theme}</td>
                              <td className="p-1">
                                <Input
                                  className="h-9 text-sm text-center px-1"
                                  placeholder=""
                                  inputMode="numeric"
                                  value={getThemeValue(theme, "TOUTE_ANNEE", "quantity")}
                                  onChange={(e) => updateThemeSelection(theme, "TOUTE_ANNEE", "quantity", e.target.value)}
                                  data-testid={`input-qty-${theme.replace(/\s|\//g, "-").toLowerCase()}`}
                                />
                              </td>
                              <td className="p-1">
                                <CompactDateInput
                                  value={getThemeValue(theme, "TOUTE_ANNEE", "deliveryDate")}
                                  onChange={(val) => updateThemeSelection(theme, "TOUTE_ANNEE", "deliveryDate", val)}
                                  testId={`input-date-${theme.replace(/\s|\//g, "-").toLowerCase()}`}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Colonne SAISONNIER */}
                  <div>
                    <h3 className="font-bold text-sm bg-gray-400 text-white p-2 rounded-t-md text-center">SAISONNIER</h3>
                    <div className="border border-t-0 rounded-b-md">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="p-2 text-left font-medium">THEME</th>
                            <th className="p-2 text-center font-medium w-16">QTE</th>
                            <th className="p-2 text-center font-medium w-28">Date livr.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {THEMES_SAISONNIER.map((theme, idx) => (
                            <tr key={theme} className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                              <td className="p-1.5 text-xs font-medium">{theme}</td>
                              <td className="p-1">
                                <Input
                                  className="h-9 text-sm text-center px-1"
                                  placeholder=""
                                  inputMode="numeric"
                                  value={getThemeValue(theme, "SAISONNIER", "quantity")}
                                  onChange={(e) => updateThemeSelection(theme, "SAISONNIER", "quantity", e.target.value)}
                                  data-testid={`input-qty-sais-${theme.replace(/\s|\//g, "-").toLowerCase()}`}
                                />
                              </td>
                              <td className="p-1">
                                <CompactDateInput
                                  value={getThemeValue(theme, "SAISONNIER", "deliveryDate")}
                                  onChange={(val) => updateThemeSelection(theme, "SAISONNIER", "deliveryDate", val)}
                                  testId={`input-date-sais-${theme.replace(/\s|\//g, "-").toLowerCase()}`}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Livraison et Facturation */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Livraison */}
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    LIVRAISON <span className="text-destructive">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">ENSEIGNE</Label>
                    <Input
                      {...register("livraisonEnseigne")}
                      className="h-11 text-base"
                      placeholder="Nom de l'enseigne"
                      data-testid="input-livraison-enseigne"
                    />
                    {errors.livraisonEnseigne && (
                      <p className="text-xs text-destructive">{errors.livraisonEnseigne.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">ADRESSE</Label>
                    <Input
                      {...register("livraisonAdresse")}
                      className="h-11 text-base"
                      placeholder="Adresse de livraison"
                      data-testid="input-livraison-adresse"
                    />
                    {errors.livraisonAdresse && (
                      <p className="text-xs text-destructive">{errors.livraisonAdresse.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">CP / VILLE</Label>
                    <Input
                      {...register("livraisonCpVille")}
                      className="h-11 text-base"
                      placeholder="Code postal et ville"
                      data-testid="input-livraison-cpville"
                    />
                    {errors.livraisonCpVille && (
                      <p className="text-xs text-destructive">{errors.livraisonCpVille.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Horaires de livraison</Label>
                    <Input
                      {...register("livraisonHoraires")}
                      className="h-11 text-base"
                      placeholder="Ex: 8h-12h / 14h-18h"
                      data-testid="input-livraison-horaires"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <Label className="text-xs font-medium">Camion avec hayon :</Label>
                    <Controller
                      name="livraisonHayon"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              checked={field.value === true}
                              onChange={() => field.onChange(true)}
                              className="w-4 h-4"
                              data-testid="radio-hayon-oui"
                            />
                            <span className="text-sm">Oui</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              checked={field.value === false}
                              onChange={() => field.onChange(false)}
                              className="w-4 h-4"
                              data-testid="radio-hayon-non"
                            />
                            <span className="text-sm">Non</span>
                          </label>
                        </div>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Facturation */}
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    FACTURATION <span className="text-destructive">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">RAISON SOCIALE</Label>
                    <Input
                      {...register("facturationRaisonSociale")}
                      className="h-11 text-base"
                      placeholder="Raison sociale"
                      data-testid="input-facturation-raison"
                    />
                    {errors.facturationRaisonSociale && (
                      <p className="text-xs text-destructive">{errors.facturationRaisonSociale.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">ADRESSE</Label>
                    <Input
                      {...register("facturationAdresse")}
                      className="h-11 text-base"
                      placeholder="Adresse de facturation"
                      data-testid="input-facturation-adresse"
                    />
                    {errors.facturationAdresse && (
                      <p className="text-xs text-destructive">{errors.facturationAdresse.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">CP / VILLE</Label>
                    <Input
                      {...register("facturationCpVille")}
                      className="h-11 text-base"
                      placeholder="Code postal et ville"
                      data-testid="input-facturation-cpville"
                    />
                    {errors.facturationCpVille && (
                      <p className="text-xs text-destructive">{errors.facturationCpVille.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">MODE DE RÈGLEMENT</Label>
                    <Controller
                      name="facturationMode"
                      control={control}
                      render={({ field }) => (
                        <div className="flex flex-wrap gap-4 pt-1">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              value="VIREMENT"
                              checked={field.value === "VIREMENT"}
                              onChange={() => field.onChange("VIREMENT")}
                              className="w-4 h-4"
                              data-testid="radio-mode-virement"
                            />
                            <span className="text-sm">VIREMENT</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              value="CHEQUE"
                              checked={field.value === "CHEQUE"}
                              onChange={() => field.onChange("CHEQUE")}
                              className="w-4 h-4"
                              data-testid="radio-mode-cheque"
                            />
                            <span className="text-sm">CHÈQUE</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              value="LCR"
                              checked={field.value === "LCR"}
                              onChange={() => field.onChange("LCR")}
                              className="w-4 h-4"
                              data-testid="radio-mode-lcr"
                            />
                            <span className="text-sm">LCR</span>
                          </label>
                        </div>
                      )}
                    />
                  </div>
                  {facturationMode === "LCR" && (
                    <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-600 dark:text-amber-400 text-lg">⚠️</span>
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            RIB obligatoire pour le mode LCR
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="facturationRib" className="text-sm text-amber-700 dark:text-amber-300">
                            Numéro de RIB (IBAN)
                          </Label>
                          <Input
                            id="facturationRib"
                            {...register("facturationRib")}
                            className="h-12 text-base bg-white dark:bg-background"
                            placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                            data-testid="input-rib"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Remarques */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">REMARQUES</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  {...register("remarks")}
                  className="min-h-24 text-sm resize-none"
                  placeholder="Remarques ou instructions particulières..."
                  data-testid="input-remarks"
                />
              </CardContent>
            </Card>
          </form>
        </div>
      </div>

      {/* Bouton fixé en bas */}
      <div className="sticky bottom-0 left-0 right-0 p-4 bg-background border-t border-border shadow-lg">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleSubmit(onSubmit)}
            data-testid="button-next-signature"
            className="w-full h-14 text-base font-medium"
            size="lg"
          >
            Continuer vers la signature
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>

      {/* Modale de création/modification de client */}
      <ClientModal
        open={clientModalOpen}
        onOpenChange={setClientModalOpen}
        mode={clientModalMode}
        clientData={selectedClientData}
        onSuccess={handleClientModalSuccess}
      />

      {/* Dialogue de proposition de mise à jour du client */}
      <AlertDialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mettre à jour le client ?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-3">
                  Vous avez modifié les informations de contact de ce client. 
                  Voulez-vous sauvegarder ces modifications dans la base de données ?
                </p>
                <div className="bg-muted rounded-md p-3 space-y-2">
                  {clientChanges.map((change, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium">{change.field} :</span>{" "}
                      <span className="text-muted-foreground line-through">{change.old}</span>
                      {" → "}
                      <span className="text-primary font-medium">{change.new}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipUpdate}>
              Non, continuer sans sauvegarder
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleUpdateClient}
              disabled={updateClientMutation.isPending}
            >
              {updateClientMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                "Oui, mettre à jour le client"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
