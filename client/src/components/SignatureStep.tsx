import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PenTool, Eraser, ArrowRight, ArrowLeft, AlertCircle, FileText, Mail, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { FOURNISSEURS_CONFIG } from "@shared/fournisseurs";

interface SignatureData {
  signature: string;
  signatureLocation: string;
  signatureDate: string;
  clientSignedName: string;
  cgvAccepted: boolean;
  newsletterAccepted: boolean;
}

interface SignatureStepProps {
  onNext: (data: SignatureData) => void;
  onBack: () => void;
  stepNumber?: number;
  totalSteps?: number;
  fournisseur?: string;
}

export function SignatureStep({ onNext, onBack, stepNumber = 2, totalSteps = 4, fournisseur = "BDIS" }: SignatureStepProps) {
  const signatureRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [error, setError] = useState<string>("");
  const [cgvDialogOpen, setCgvDialogOpen] = useState(false);
  
  const fournisseurConfig = FOURNISSEURS_CONFIG.find(f => f.id === fournisseur) || FOURNISSEURS_CONFIG[0];
  const cgvLines = fournisseurConfig.cgv.split('\n').slice(0, 8);
  const cgvExtrait = cgvLines.join('\n');
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      signatureLocation: "",
      signatureDate: formatInTimeZone(new Date(), "Europe/Paris", "yyyy-MM-dd"),
      clientSignedName: "",
      newsletterAccepted: true,
    },
  });
  
  const newsletterAccepted = watch("newsletterAccepted");

  const clearSignature = () => {
    signatureRef.current?.clear();
    setIsEmpty(true);
    setError("");
  };

  const onSubmit = (formData: any) => {
    if (signatureRef.current?.isEmpty()) {
      setError("Veuillez signer avant de continuer");
      return;
    }

    const signatureDataURL = signatureRef.current?.toDataURL();
    if (signatureDataURL) {
      onNext({
        signature: signatureDataURL,
        signatureLocation: formData.signatureLocation,
        signatureDate: formData.signatureDate,
        clientSignedName: formData.clientSignedName,
        cgvAccepted: true,
        newsletterAccepted: formData.newsletterAccepted,
      });
    }
  };

  const handleSignatureEnd = () => {
    setIsEmpty(signatureRef.current?.isEmpty() ?? true);
    setError("");
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <PenTool className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Signature Client</h1>
              <p className="text-sm text-muted-foreground">Étape {stepNumber}/{totalSteps} - Signature</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-2">
            <CardContent className="p-6 space-y-4">
              {/* Champs de texte */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signatureLocation" className="text-sm font-medium">
                    Lieu de signature <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="signatureLocation"
                    data-testid="input-signature-location"
                    {...register("signatureLocation", { required: "Le lieu est requis" })}
                    className="h-12 text-base"
                    placeholder="Ex: Paris"
                  />
                  {errors.signatureLocation && (
                    <p className="text-xs text-destructive">{errors.signatureLocation.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signatureDate" className="text-sm font-medium">
                    Date de signature <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="signatureDate"
                    type="date"
                    data-testid="input-signature-date"
                    {...register("signatureDate", { required: "La date est requise" })}
                    className="h-12 text-sm sm:text-base [&::-webkit-calendar-picker-indicator]:opacity-100"
                  />
                  {errors.signatureDate && (
                    <p className="text-xs text-destructive">{errors.signatureDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientSignedName" className="text-sm font-medium">
                    Nom et prénom du client <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="clientSignedName"
                    data-testid="input-client-signed-name"
                    {...register("clientSignedName", { required: "Le nom est requis" })}
                    className="h-12 text-base"
                    placeholder="Ex: Marie Durand"
                  />
                  {errors.clientSignedName && (
                    <p className="text-xs text-destructive">{errors.clientSignedName.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Extrait des CGV du fournisseur */}
          <Card className="border-2 bg-muted/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  CGV - {fournisseurConfig.nom}
                </CardTitle>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCgvDialogOpen(true)}
                  className="h-7 text-xs"
                  data-testid="button-voir-cgv"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Voir plus
                </Button>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-3">
              <div className="whitespace-pre-wrap text-[11px] leading-relaxed max-h-32 overflow-hidden">
                {cgvExtrait}...
              </div>
              <div className="pt-3 border-t">
                <p className="text-sm font-medium text-foreground text-center bg-primary/10 p-3 rounded-lg">
                  En signant ci-dessous, vous acceptez les CGV de {fournisseurConfig.nom}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Dialogue CGV complet */}
          <Dialog open={cgvDialogOpen} onOpenChange={setCgvDialogOpen}>
            <DialogContent className="max-w-lg max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Conditions Générales de Vente - {fournisseurConfig.nom}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {fournisseurConfig.cgv}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* Newsletter */}
          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="newsletterAccepted"
                  data-testid="checkbox-newsletter"
                  checked={newsletterAccepted}
                  onCheckedChange={(checked) => {
                    const event = { target: { name: "newsletterAccepted", value: checked } };
                    register("newsletterAccepted").onChange(event as any);
                  }}
                  {...register("newsletterAccepted")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label 
                    htmlFor="newsletterAccepted" 
                    className="text-sm font-medium cursor-pointer flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4 text-primary" />
                    Recevoir la newsletter
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Je souhaite recevoir les offres et actualités par email
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Zone de signature */}
          <Card className="border-2">
            <CardContent className="p-6 space-y-4">
              {/* Signature */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Signature du client <span className="text-destructive">*</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Signez avec votre doigt ou un stylet directement sur l'écran
                </p>
              </div>

              <div className="relative">
              <div
                className={`border-2 rounded-xl overflow-hidden ${
                  isEmpty ? "border-dashed" : "border-solid"
                }`}
                style={{ touchAction: "none" }}
              >
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    className: "w-full h-64 touch-none",
                    style: { backgroundColor: "#ffffff" },
                  }}
                  onEnd={handleSignatureEnd}
                  backgroundColor="#ffffff"
                  penColor="#000000"
                  dotSize={2}
                  minWidth={1}
                  maxWidth={3}
                  velocityFilterWeight={0.7}
                  data-testid="canvas-signature"
                />
                {isEmpty && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-gray-400 text-sm">Signez ici avec votre doigt</p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

              <Button
                type="button"
                onClick={clearSignature}
                data-testid="button-clear-signature"
                variant="outline"
                className="w-full h-12"
                disabled={isEmpty}
              >
                <Eraser className="w-4 h-4 mr-2" />
                Effacer la signature
              </Button>
            </CardContent>
          </Card>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border shadow-2xl">
            <div className="max-w-lg mx-auto flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                type="button"
                onClick={onBack}
                data-testid="button-back-to-form"
                variant="outline"
                className="h-12 sm:h-14 px-4 sm:px-6 order-2 sm:order-1"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Retour
              </Button>
              <Button
                type="submit"
                data-testid="button-next-review"
                className="flex-1 h-12 sm:h-14 text-sm sm:text-base font-medium order-1 sm:order-2"
                size="lg"
              >
                Valider la signature
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
