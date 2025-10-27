import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PenTool, Eraser, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SignatureStepProps {
  onNext: (signature: string) => void;
  onBack: () => void;
}

export function SignatureStep({ onNext, onBack }: SignatureStepProps) {
  const signatureRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [error, setError] = useState<string>("");

  const clearSignature = () => {
    signatureRef.current?.clear();
    setIsEmpty(true);
    setError("");
  };

  const handleNext = () => {
    if (signatureRef.current?.isEmpty()) {
      setError("Veuillez signer avant de continuer");
      return;
    }

    const signatureData = signatureRef.current?.toDataURL();
    if (signatureData) {
      onNext(signatureData);
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

        <Card className="border-2">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Demandez au client de signer ci-dessous
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
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border shadow-2xl">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button
            onClick={onBack}
            data-testid="button-back-to-form"
            variant="outline"
            className="h-14 px-6"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour
          </Button>
          <Button
            onClick={handleNext}
            data-testid="button-next-review"
            className="flex-1 h-14 text-base font-medium"
            size="lg"
          >
            Valider la signature
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
