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
  AlertCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SuccessStepProps {
  orderCode: string;
  pdfUrl: string;
  excelUrl: string;
  onSendEmails: () => void;
  onNewOrder: () => void;
  isSending: boolean;
  emailsSent: boolean;
  emailError?: string;
}

export function SuccessStep({ 
  orderCode, 
  pdfUrl, 
  excelUrl, 
  onSendEmails,
  onNewOrder,
  isSending,
  emailsSent,
  emailError
}: SuccessStepProps) {
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
        ) : emailError ? (
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
        <div className="max-w-lg mx-auto space-y-3">
          {emailError && !emailsSent && (
            <Button
              onClick={onSendEmails}
              data-testid="button-resend-emails"
              className="w-full h-14 text-base font-medium"
              size="lg"
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Renvoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Renvoyer les emails
                </>
              )}
            </Button>
          )}
          
          <Button
            onClick={onNewOrder}
            data-testid="button-new-order"
            variant={emailsSent ? "default" : "outline"}
            className="w-full h-14 text-base font-medium"
            size="lg"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Nouvelle commande
          </Button>
        </div>
      </div>
    </div>
  );
}
