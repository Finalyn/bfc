import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  Download, 
  Mail, 
  FileText, 
  FileSpreadsheet,
  Send,
  RotateCcw,
  Loader2,
  AlertCircle,
  WifiOff,
  CloudOff,
  Clock
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getOfflineOrderPDF } from "@/lib/offlineStorage";
import { useToast } from "@/hooks/use-toast";

interface SuccessStepProps {
  orderCode: string;
  pdfUrl: string;
  excelUrl: string;
  onSendEmails: () => void;
  onNewOrder: () => void;
  isSending: boolean;
  emailsSent: boolean;
  emailError?: string;
  isOffline?: boolean;
}

export function SuccessStep({ 
  orderCode, 
  pdfUrl, 
  excelUrl, 
  onSendEmails,
  onNewOrder,
  isSending,
  emailsSent,
  emailError,
  isOffline = false
}: SuccessStepProps) {
  const { toast } = useToast();
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleDownloadOfflinePDF = async () => {
    setDownloadingPDF(true);
    try {
      const pdfBlob = await getOfflineOrderPDF(orderCode);
      if (pdfBlob) {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${orderCode}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({
          title: "PDF téléchargé",
          description: "Le bon de commande a été téléchargé avec succès",
        });
      } else {
        toast({
          title: "PDF non disponible",
          description: "Le PDF n'a pas pu être généré hors ligne",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le PDF",
        variant: "destructive",
      });
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (isOffline) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24">
        <div className="max-w-lg mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Commande enregistrée</h1>
                <p className="text-sm text-muted-foreground">Synchronisation automatique</p>
              </div>
            </div>
          </div>

          <Card className="border-2 mb-4">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Numéro de commande
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-center text-foreground" data-testid="text-order-code-offline">
                  {orderCode}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 mb-4">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Bon de commande</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">PDF disponible</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {orderCode}.pdf
                  </p>
                </div>
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={handleDownloadOfflinePDF}
                  disabled={downloadingPDF}
                  data-testid="button-download-pdf-offline"
                  className="h-10 w-10"
                >
                  {downloadingPDF ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-500/50 mb-4">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Synchronisation automatique
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Dès que le réseau sera disponible, votre commande sera automatiquement synchronisée et les emails envoyés.
                </p>
              </div>
              
              <div className="space-y-2 text-sm">
                <p className="font-medium">Vous recevrez une notification quand :</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>La commande sera enregistrée sur le serveur</li>
                  <li>Les emails seront envoyés au client et à l'agence</li>
                </ul>
              </div>

              <Alert className="bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Vous pouvez fermer l'application. La synchronisation se fera automatiquement en arrière-plan.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border shadow-2xl">
          <div className="max-w-lg mx-auto">
            <Button
              onClick={onNewOrder}
              data-testid="button-new-order-offline"
              className="w-full h-12 sm:h-14 text-sm sm:text-base font-medium"
              size="lg"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Nouvelle commande
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Commande créée !</h1>
              <p className="text-sm text-muted-foreground">Étape 4/4 - Envoi</p>
            </div>
          </div>
        </div>

        <Card className="border-2 mb-4">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Numéro de commande
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-center text-foreground" data-testid="text-order-code">
                {orderCode}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 mb-4">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Fichiers générés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover-elevate">
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Bon de commande</p>
                <p className="text-xs text-muted-foreground truncate">
                  {orderCode}.pdf
                </p>
              </div>
              <a href={pdfUrl} download={`${orderCode}.pdf`}>
                <Button 
                  size="icon" 
                  variant="outline"
                  data-testid="button-download-pdf"
                  className="h-10 w-10"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </a>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover-elevate">
              <div className="w-12 h-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-chart-2" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Tableau Excel</p>
                <p className="text-xs text-muted-foreground truncate">
                  {orderCode}.xlsx
                </p>
              </div>
              <a href={excelUrl} download={`${orderCode}.xlsx`}>
                <Button 
                  size="icon" 
                  variant="outline"
                  data-testid="button-download-excel"
                  className="h-10 w-10"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {emailsSent ? (
          <Card className="border-2 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1">
                    Emails envoyés automatiquement !
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Le client et l'agence BFC ont reçu les documents par email.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : emailError && emailError.length > 0 ? (
          <>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{emailError}</AlertDescription>
            </Alert>
            <Card className="border-2 bg-muted/30 mb-4">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground text-center">
                  Vous pouvez réessayer d'envoyer les emails manuellement
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="border-2 bg-muted/30 mb-4">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1">
                    Envoi en cours...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Les emails sont en cours d'envoi automatique
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border shadow-2xl">
        <div className="max-w-lg mx-auto space-y-2 sm:space-y-3">
          {emailError && emailError.length > 0 && !emailsSent && (
            <Button
              onClick={onSendEmails}
              data-testid="button-resend-emails"
              className="w-full h-12 sm:h-14 text-sm sm:text-base font-medium"
              size="lg"
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                  Renvoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Renvoyer les emails
                </>
              )}
            </Button>
          )}
          
          <Button
            onClick={onNewOrder}
            data-testid="button-new-order"
            variant={emailsSent ? "default" : "outline"}
            className="w-full h-12 sm:h-14 text-sm sm:text-base font-medium"
            size="lg"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Nouvelle commande
          </Button>
        </div>
      </div>
    </div>
  );
}
