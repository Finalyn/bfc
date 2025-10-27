import { useState } from "react";
import { type InsertOrder } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  FileCheck, 
  ArrowLeft,
  ArrowRight,
  User, 
  Building2, 
  Package, 
  Calendar, 
  Mail,
  MessageSquare,
  Hash,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ReviewStepProps {
  orderData: InsertOrder;
  onBack: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function ReviewStep({ orderData, onBack, onGenerate, isGenerating }: ReviewStepProps) {
  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Révision</h1>
              <p className="text-sm text-muted-foreground">Étape 3/4 - Vérification</p>
            </div>
          </div>
        </div>

        <Card className="border-2 mb-4">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Récapitulatif de la commande
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Commercial</p>
                <p className="text-base font-medium text-foreground" data-testid="text-sales-rep-name">
                  {orderData.salesRepName}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Client</p>
                <p className="text-base font-medium text-foreground" data-testid="text-client-name">
                  {orderData.clientName}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-base text-foreground" data-testid="text-client-email">
                  {orderData.clientEmail}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Fournisseur</p>
                <p className="text-base text-foreground" data-testid="text-supplier">
                  {orderData.supplier}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Produit</p>
                <p className="text-base text-foreground" data-testid="text-product-theme">
                  {orderData.productTheme}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <Hash className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Quantité</p>
                <p className="text-base text-foreground" data-testid="text-quantity">
                  {orderData.quantity}
                </p>
                {orderData.quantityNote && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {orderData.quantityNote}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Livraison souhaitée</p>
                <p className="text-base text-foreground" data-testid="text-delivery-date">
                  {format(new Date(orderData.deliveryDate), "d MMMM yyyy", { locale: fr })}
                </p>
              </div>
            </div>

            {orderData.remarks && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Remarques</p>
                    <p className="text-base text-foreground" data-testid="text-remarks">
                      {orderData.remarks}
                    </p>
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 text-muted-foreground mt-0.5 flex items-center justify-center">
                ✓
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Signature client</p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-foreground"><span className="font-medium">Nom:</span> {orderData.clientSignedName}</p>
                  <p className="text-sm text-foreground"><span className="font-medium">Lieu:</span> {orderData.signatureLocation}</p>
                  <p className="text-sm text-foreground"><span className="font-medium">Date:</span> {format(new Date(orderData.signatureDate), "d MMMM yyyy", { locale: fr })}</p>
                </div>
                <Badge variant="secondary" className="mt-2">
                  Signature capturée
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 bg-muted/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              En cliquant sur "Générer", un bon de commande PDF et un fichier Excel seront créés automatiquement.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border shadow-2xl">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button
            onClick={onBack}
            data-testid="button-back-to-signature"
            variant="outline"
            className="h-14 px-6"
            disabled={isGenerating}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour
          </Button>
          <Button
            onClick={onGenerate}
            data-testid="button-generate-order"
            className="flex-1 h-14 text-base font-medium"
            size="lg"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                Générer la commande
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
