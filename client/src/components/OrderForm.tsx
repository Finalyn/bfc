import { useState } from "react";
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
import { ClipboardList, ArrowRight, Building2, Truck, FileText, User, Store } from "lucide-react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useQuery } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";

interface Client {
  id: string;
  code: string;
  nom: string;
  adresse1: string;
  adresse2: string;
  codePostal: string;
  ville: string;
  pays: string;
  interloc: string;
  tel: string;
  portable: string;
  fax: string;
  mail: string;
  displayName: string;
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
  facturationRib: z.boolean().optional(),
  cgvAccepted: z.boolean().refine(val => val === true, { message: "Vous devez accepter les CGV" }),
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

  const today = formatInTimeZone(new Date(), "Europe/Paris", "yyyy-MM-dd");

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
      salesRepName: initialData?.salesRepName || "",
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
      facturationRib: initialData?.facturationRib || false,
      cgvAccepted: initialData?.cgvAccepted || false,
      remarks: initialData?.remarks || "",
    },
  });

  const { data: commerciaux = [] } = useQuery<any[]>({ queryKey: ["/api/data/commerciaux"] });
  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/data/clients"] });

  const commerciauxOptions: ComboboxOption[] = commerciaux.map(c => ({
    value: c.displayName,
    label: c.displayName,
  }));

  const clientsOptions: ComboboxOption[] = clients.map(c => ({
    value: c.id,
    label: c.displayName,
  }));

  const handleClientSelect = (clientId: string) => {
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
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

  const onSubmit = (data: FormData) => {
    const filteredSelections = themeSelections.filter(t => t.quantity || t.deliveryDate);
    
    onNext({
      ...data,
      cgvAccepted: data.cgvAccepted,
      themeSelections: JSON.stringify(filteredSelections),
      clientName: data.responsableName,
      clientEmail: data.responsableEmail,
      supplier: "BDIS",
      productTheme: filteredSelections.map(t => t.theme).join(", ") || "Divers",
      quantity: filteredSelections.map(t => t.quantity).filter(Boolean).join(", ") || "1",
      deliveryDate: filteredSelections[0]?.deliveryDate || data.orderDate,
    });
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
                <p className="text-sm text-muted-foreground">Étape 1/4 - Informations</p>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orderDate" className="text-sm font-medium">
                      DATE <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="orderDate"
                      type="date"
                      data-testid="input-order-date"
                      {...register("orderDate")}
                      className="h-12 text-base"
                    />
                    {errors.orderDate && (
                      <p className="text-xs text-destructive">{errors.orderDate.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      COMMERCIAL <span className="text-destructive">*</span>
                    </Label>
                    <Controller
                      name="salesRepName"
                      control={control}
                      render={({ field }) => (
                        <Combobox
                          options={commerciauxOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Sélectionner"
                          searchPlaceholder="Rechercher..."
                          emptyText="Aucun commercial trouvé"
                          testId="select-sales-rep"
                        />
                      )}
                    />
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
                  Sélectionnez un client existant pour pré-remplir les informations de livraison et facturation
                </p>
              </CardHeader>
              <CardContent>
                <Combobox
                  options={clientsOptions}
                  value=""
                  onValueChange={handleClientSelect}
                  placeholder="Rechercher un client..."
                  searchPlaceholder="Tapez le nom ou la ville..."
                  emptyText="Aucun client trouvé"
                  testId="select-client"
                />
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
                        className="h-10 text-sm"
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
                        className="h-10 text-sm"
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
                        className="h-10 text-sm"
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
                        className="h-10 text-sm"
                        placeholder="Tél."
                        data-testid="input-compta-tel"
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        type="email"
                        {...register("comptaEmail")}
                        className="h-10 text-sm"
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
                                  className="h-7 text-xs text-center px-1"
                                  placeholder=""
                                  value={getThemeValue(theme, "TOUTE_ANNEE", "quantity")}
                                  onChange={(e) => updateThemeSelection(theme, "TOUTE_ANNEE", "quantity", e.target.value)}
                                  data-testid={`input-qty-${theme.replace(/\s|\//g, "-").toLowerCase()}`}
                                />
                              </td>
                              <td className="p-1">
                                <Input
                                  type="date"
                                  className="h-7 text-xs px-1"
                                  value={getThemeValue(theme, "TOUTE_ANNEE", "deliveryDate")}
                                  onChange={(e) => updateThemeSelection(theme, "TOUTE_ANNEE", "deliveryDate", e.target.value)}
                                  data-testid={`input-date-${theme.replace(/\s|\//g, "-").toLowerCase()}`}
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
                    <h3 className="font-bold text-sm bg-orange-500 text-white p-2 rounded-t-md text-center">SAISONNIER</h3>
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
                                  className="h-7 text-xs text-center px-1"
                                  placeholder=""
                                  value={getThemeValue(theme, "SAISONNIER", "quantity")}
                                  onChange={(e) => updateThemeSelection(theme, "SAISONNIER", "quantity", e.target.value)}
                                  data-testid={`input-qty-sais-${theme.replace(/\s|\//g, "-").toLowerCase()}`}
                                />
                              </td>
                              <td className="p-1">
                                <Input
                                  type="date"
                                  className="h-7 text-xs px-1"
                                  value={getThemeValue(theme, "SAISONNIER", "deliveryDate")}
                                  onChange={(e) => updateThemeSelection(theme, "SAISONNIER", "deliveryDate", e.target.value)}
                                  data-testid={`input-date-sais-${theme.replace(/\s|\//g, "-").toLowerCase()}`}
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
                      className="h-10 text-sm"
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
                      className="h-10 text-sm"
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
                      className="h-10 text-sm"
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
                      className="h-10 text-sm"
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
                      className="h-10 text-sm"
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
                      className="h-10 text-sm"
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
                      className="h-10 text-sm"
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
                    <Controller
                      name="facturationRib"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center gap-2 cursor-pointer pt-2">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-rib"
                          />
                          <span className="text-xs text-muted-foreground">(Joindre un RIB)</span>
                        </label>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* CGV Info */}
            <Card className="border-2 bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">EXTRAIT DES CGV</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-3">
                <div className="space-y-1">
                  <p>• RÈGLEMENT À 30 JOURS DATE DE FACTURE</p>
                  <p>• Escompte de 2% pour paiement comptant</p>
                  <p>• Port payé aller et retour à notre charge uniquement pour les box mis en surface de vente</p>
                  <p className="text-[10px] pt-2 italic">
                    Nous nous réservons la propriété des marchandises fournies jusqu'au dernier jour de leur parfait paiement, conformément aux dispositions de la loi n°80335 du 12 mai 1980
                  </p>
                </div>
                <div className="pt-2 border-t">
                  <Controller
                    name="cgvAccepted"
                    control={control}
                    render={({ field }) => (
                      <label className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-cgv"
                          className="mt-0.5"
                        />
                        <span className="text-sm font-medium text-foreground">
                          J'ai lu et j'accepte les Conditions Générales de Vente <span className="text-destructive">*</span>
                        </span>
                      </label>
                    )}
                  />
                  {errors.cgvAccepted && (
                    <p className="text-xs text-destructive mt-1">{errors.cgvAccepted.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

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
    </div>
  );
}
