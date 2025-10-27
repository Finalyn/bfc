import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PenTool, Eraser, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

interface SignatureData {
  signature: string;
  signatureLocation: string;
  signatureDate: string;
  clientSignedName: string;
}

interface SignatureStepProps {
  onNext: (data: SignatureData) => void;
  onBack: () => void;
}

export function SignatureStep({ onNext, onBack }: SignatureStepProps) {
  const signatureRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [error, setError] = useState<string>("");
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      signatureLocation: "",
      signatureDate: formatInTimeZone(new Date(), "Europe/Paris", "yyyy-MM-dd"),
      clientSignedName: "",
    },
  });

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
              <p className="text-sm text-muted-foreground">Étape 2/4 - Signature</p>
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
                    className="h-12 text-base"
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
            <div className="max-w-lg mx-auto flex gap-3">
              <Button
                type="button"
                onClick={onBack}
                data-testid="button-back-to-form"
                variant="outline"
                className="h-14 px-6"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Retour
              </Button>
              <Button
                type="submit"
                data-testid="button-next-review"
                className="flex-1 h-14 text-base font-medium"
                size="lg"
              >
                Valider la signature
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
