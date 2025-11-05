import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOrderSchema, type InsertOrder } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, ArrowRight } from "lucide-react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useQuery } from "@tanstack/react-query";

interface OrderFormProps {
  onNext: (data: Partial<InsertOrder>) => void;
  initialData?: Partial<InsertOrder>;
}

export function OrderForm({ onNext, initialData }: OrderFormProps) {
  const [selectedFournisseur, setSelectedFournisseur] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Partial<InsertOrder>>({
    resolver: zodResolver(insertOrderSchema.omit({ signature: true, signatureLocation: true, signatureDate: true, clientSignedName: true })),
    defaultValues: initialData || {
      salesRepName: "",
      clientName: "",
      clientEmail: "",
      supplier: "",
      productTheme: "",
      quantity: "",
      quantityNote: "",
      deliveryDate: "",
      remarks: "",
    },
  });

  // Charger les données
  const { data: commerciaux = [] } = useQuery<any[]>({ queryKey: ["/api/data/commerciaux"] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/data/clients"] });
  const { data: fournisseurs = [] } = useQuery<any[]>({ queryKey: ["/api/data/fournisseurs"] });
  const { data: allThemes = [] } = useQuery<any[]>({ queryKey: ["/api/data/themes"] });

  // Trouver le nomCourt du fournisseur sélectionné pour filtrer les thèmes
  const selectedFournisseurCourt = selectedFournisseur
    ? fournisseurs.find(f => f.nom === selectedFournisseur)?.nomCourt
    : null;

  // Filtrer les thèmes par fournisseur sélectionné (utiliser nomCourt)
  const themes = selectedFournisseurCourt
    ? allThemes.filter(t => t.fournisseur === selectedFournisseurCourt)
    : allThemes;

  // Options pour les combobox
  const commerciauxOptions: ComboboxOption[] = commerciaux.map(c => ({
    value: c.displayName,
    label: c.displayName,
  }));

  const clientsOptions: ComboboxOption[] = clients.map(c => ({
    value: c.id,
    label: c.displayName,
  }));

  const fournisseursOptions: ComboboxOption[] = fournisseurs.map(f => ({
    value: f.nom,
    label: f.nom,
  }));

  const themesOptions: ComboboxOption[] = themes.map(t => ({
    value: t.theme,
    label: t.theme,
  }));

  const onSubmit = (data: Partial<InsertOrder>) => {
    onNext(data);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="max-w-lg mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Nouvelle Commande</h1>
                <p className="text-sm text-muted-foreground">Étape 1/4 - Informations</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-2">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="salesRepName" className="text-sm font-medium">
                  Nom du commercial <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="salesRepName"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      options={commerciauxOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Sélectionner un commercial"
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

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Nom du client <span className="text-destructive">*</span>
                </Label>
                <Combobox
                  options={clientsOptions}
                  value={selectedClient}
                  onValueChange={(value) => {
                    setSelectedClient(value);
                    const client = clients.find(c => c.id === value);
                    if (client) {
                      setValue("clientName", client.nom);
                      setValue("clientEmail", client.mail || "");
                    }
                  }}
                  placeholder="Sélectionner un client"
                  searchPlaceholder="Rechercher..."
                  emptyText="Aucun client trouvé"
                  testId="select-client"
                />
                {/* Permettre aussi la saisie manuelle si le client n'est pas dans la liste */}
                <Controller
                  name="clientName"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      className="h-12 text-base mt-2"
                      placeholder="Ou saisir manuellement"
                      data-testid="input-client-name"
                    />
                  )}
                />
                {errors.clientName && (
                  <p className="text-xs text-destructive">{errors.clientName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientEmail" className="text-sm font-medium">
                  Email du client <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="clientEmail"
                  type="email"
                  data-testid="input-client-email"
                  {...register("clientEmail")}
                  className="h-12 text-base"
                  placeholder="client@exemple.com"
                />
                {errors.clientEmail && (
                  <p className="text-xs text-destructive">{errors.clientEmail.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier" className="text-sm font-medium">
                  Fournisseur <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="supplier"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      options={fournisseursOptions}
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedFournisseur(value);
                        // Réinitialiser le thème quand on change de fournisseur
                        setValue("productTheme", "");
                      }}
                      placeholder="Sélectionner un fournisseur"
                      searchPlaceholder="Rechercher..."
                      emptyText="Aucun fournisseur trouvé"
                      testId="select-supplier"
                    />
                  )}
                />
                {errors.supplier && (
                  <p className="text-xs text-destructive">{errors.supplier.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="productTheme" className="text-sm font-medium">
                  Thématique produit <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="productTheme"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      options={themesOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={selectedFournisseur ? "Sélectionner une thématique" : "Sélectionner d'abord un fournisseur"}
                      searchPlaceholder="Rechercher..."
                      emptyText="Aucune thématique trouvée"
                      disabled={!selectedFournisseur}
                      testId="select-product-theme"
                    />
                  )}
                />
                {errors.productTheme && (
                  <p className="text-xs text-destructive">{errors.productTheme.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-sm font-medium">
                  Quantité <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quantity"
                  data-testid="input-quantity"
                  {...register("quantity")}
                  className="h-12 text-base"
                  placeholder="Ex: 50 unités"
                />
                {errors.quantity && (
                  <p className="text-xs text-destructive">{errors.quantity.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantityNote" className="text-sm font-medium">
                  Annotation quantité (optionnel)
                </Label>
                <Textarea
                  id="quantityNote"
                  data-testid="input-quantity-note"
                  {...register("quantityNote")}
                  className="min-h-20 text-base resize-none"
                  placeholder="Détails supplémentaires sur la quantité..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryDate" className="text-sm font-medium">
                  Date de livraison souhaitée <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  data-testid="input-delivery-date"
                  {...register("deliveryDate")}
                  className="h-12 text-base"
                />
                {errors.deliveryDate && (
                  <p className="text-xs text-destructive">{errors.deliveryDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks" className="text-sm font-medium">
                  Remarques (optionnel)
                </Label>
                <Textarea
                  id="remarks"
                  data-testid="input-remarks"
                  {...register("remarks")}
                  className="min-h-32 text-base resize-none"
                  placeholder="Remarques ou instructions particulières..."
                />
              </div>
            </CardContent>
          </Card>
        </form>
        </div>
      </div>

      {/* Bouton fixé en bas */}
      <div className="sticky bottom-0 left-0 right-0 p-4 bg-background border-t border-border shadow-lg">
        <div className="max-w-lg mx-auto">
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
