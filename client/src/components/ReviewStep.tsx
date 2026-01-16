import { useState } from "react";
import { type Order, type ThemeSelection, THEMES_TOUTE_ANNEE, THEMES_SAISONNIER } from "@shared/schema";
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
  Truck,
  FileText,
  CheckCircle2,
  Loader2,
  Phone,
  MapPin
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ReviewStepProps {
  orderData: any;
  onBack: () => void;
  onGenerate?: () => void;
  onNext?: () => void;
  isGenerating?: boolean;
  isPreview?: boolean;
  stepNumber?: number;
  totalSteps?: number;
}

export function ReviewStep({ 
  orderData, 
  onBack, 
  onGenerate, 
  onNext,
  isGenerating = false, 
  isPreview = false,
  stepNumber = 3,
  totalSteps = 4
}: ReviewStepProps) {
  const themeSelections: ThemeSelection[] = orderData.themeSelections 
    ? JSON.parse(orderData.themeSelections) 
    : [];
  
  const filteredThemes = themeSelections.filter(t => t.quantity || t.deliveryDate);
  const categoriesUniques = Array.from(new Set(filteredThemes.map(t => t.category)));
  const themesByCategory = categoriesUniques.map(cat => ({
    category: cat,
    themes: filteredThemes.filter(t => t.category === cat)
  }));

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isPreview ? "Vérification" : "Confirmation finale"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Étape {stepNumber}/{totalSteps} - {isPreview ? "Vérifiez les informations" : "Prêt à générer"}
              </p>
            </div>
          </div>
        </div>

        {/* En-tête */}
        <Card className="border-2 mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">DATE</p>
                <p className="text-sm font-medium" data-testid="text-order-date">
                  {format(new Date(orderData.orderDate), "d MMMM yyyy", { locale: fr })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">COMMERCIAL</p>
                <p className="text-sm font-medium" data-testid="text-sales-rep-name">
                  {orderData.salesRepName}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card className="border-2 mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Responsable */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm border-b pb-1">Responsable</h3>
                <div className="space-y-1 text-sm">
                  <p data-testid="text-responsable-name">{orderData.responsableName}</p>
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    <span data-testid="text-responsable-tel">{orderData.responsableTel}</span>
                  </p>
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <Mail className="w-3 h-3" />
                    <span data-testid="text-responsable-email">{orderData.responsableEmail}</span>
                  </p>
                </div>
              </div>
              
              {/* Service comptabilité */}
              {(orderData.comptaTel || orderData.comptaEmail) && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm border-b pb-1">Service comptabilité</h3>
                  <div className="space-y-1 text-sm">
                    {orderData.comptaTel && (
                      <p className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        <span>{orderData.comptaTel}</span>
                      </p>
                    )}
                    {orderData.comptaEmail && (
                      <p className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span>{orderData.comptaEmail}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Thèmes sélectionnés */}
        {themesByCategory.length > 0 && (
          <Card className="border-2 mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Produits commandés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {themesByCategory.map((group, groupIdx) => (
                  <div key={groupIdx}>
                    <h3 className="font-bold text-xs bg-primary text-primary-foreground p-2 rounded-t-md text-center">
                      {group.category}
                    </h3>
                    <div className="border border-t-0 rounded-b-md p-2 space-y-1">
                      {group.themes.map((t, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span>{t.theme}</span>
                          <span className="text-muted-foreground">
                            {t.quantity && `Qté: ${t.quantity}`}
                            {t.quantity && t.deliveryDate && " - "}
                            {t.deliveryDate && format(new Date(t.deliveryDate), "dd/MM/yy")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Livraison et Facturation */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* Livraison */}
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                LIVRAISON
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium" data-testid="text-livraison-enseigne">{orderData.livraisonEnseigne}</p>
              <p className="text-muted-foreground">{orderData.livraisonAdresse}</p>
              <p className="text-muted-foreground">{orderData.livraisonCpVille}</p>
              {orderData.livraisonHoraires && (
                <p className="text-xs text-muted-foreground">Horaires: {orderData.livraisonHoraires}</p>
              )}
              <Badge variant={orderData.livraisonHayon ? "default" : "secondary"} className="mt-2">
                Hayon: {orderData.livraisonHayon ? "Oui" : "Non"}
              </Badge>
            </CardContent>
          </Card>

          {/* Facturation */}
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                FACTURATION
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium" data-testid="text-facturation-raison">{orderData.facturationRaisonSociale}</p>
              <p className="text-muted-foreground">{orderData.facturationAdresse}</p>
              <p className="text-muted-foreground">{orderData.facturationCpVille}</p>
              <Badge variant="outline" className="mt-2">
                {orderData.facturationMode}
              </Badge>
              {orderData.facturationRib && (
                <p className="text-xs text-muted-foreground mt-2">
                  RIB: {orderData.facturationRib}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Remarques */}
        {orderData.remarks && (
          <Card className="border-2 mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                REMARQUES
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground" data-testid="text-remarks">
                {orderData.remarks}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Signature - uniquement si pas en preview */}
        {!isPreview && orderData.signature && (
          <Card className="border-2 mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Signature client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Nom</p>
                  <p className="font-medium">{orderData.clientSignedName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lieu</p>
                  <p className="font-medium">{orderData.signatureLocation}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {format(new Date(orderData.signatureDate), "d MMM yyyy", { locale: fr })}
                  </p>
                </div>
              </div>
              {orderData.signature && (
                <div className="mt-3 p-2 bg-muted/30 rounded-md">
                  <img 
                    src={orderData.signature} 
                    alt="Signature du client" 
                    className="max-h-20 mx-auto"
                  />
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Badge variant="secondary">Signature capturée</Badge>
                {orderData.cgvAccepted && (
                  <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
                    CGV acceptées
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-2 bg-muted/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              {isPreview 
                ? "Vérifiez les informations ci-dessus avant de passer à la signature."
                : "En cliquant sur \"Générer\", un bon de commande PDF et un fichier Excel seront créés automatiquement."
              }
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border shadow-2xl">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            onClick={onBack}
            data-testid="button-back"
            variant="outline"
            className="h-14 px-6"
            disabled={isGenerating}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour
          </Button>
          {isPreview ? (
            <Button
              onClick={onNext}
              data-testid="button-continue-to-signature"
              className="flex-1 h-14 text-base font-medium"
              size="lg"
            >
              Continuer vers la signature
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
