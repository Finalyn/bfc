import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOrderSchema, type InsertOrder } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, ArrowRight } from "lucide-react";

interface OrderFormProps {
  onNext: (data: Partial<InsertOrder>) => void;
  initialData?: Partial<InsertOrder>;
}

export function OrderForm({ onNext, initialData }: OrderFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Partial<InsertOrder>>({
    resolver: zodResolver(insertOrderSchema.omit({ signature: true })),
    defaultValues: initialData || {
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

  const onSubmit = (data: Partial<InsertOrder>) => {
    onNext(data);
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
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
                <Label htmlFor="clientName" className="text-sm font-medium">
                  Nom du client <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="clientName"
                  data-testid="input-client-name"
                  {...register("clientName")}
                  className="h-12 text-base"
                  placeholder="Ex: Entreprise ABC"
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
                <Input
                  id="supplier"
                  data-testid="input-supplier"
                  {...register("supplier")}
                  className="h-12 text-base"
                  placeholder="Ex: Fournisseur XYZ"
                />
                {errors.supplier && (
                  <p className="text-xs text-destructive">{errors.supplier.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="productTheme" className="text-sm font-medium">
                  Thématique produit <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="productTheme"
                  data-testid="input-product-theme"
                  {...register("productTheme")}
                  className="h-12 text-base"
                  placeholder="Ex: Équipement de bureau"
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

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border shadow-2xl">
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
