import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { type InsertOrder, type Order } from "@shared/schema";
import { OrderForm } from "@/components/OrderForm";
import { SignatureStep } from "@/components/SignatureStep";
import { ReviewStep } from "@/components/ReviewStep";
import { SuccessStep } from "@/components/SuccessStep";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Check } from "lucide-react";

type Step = "form" | "preview" | "signature" | "review" | "success";

const STEPS = [
  { id: "form", label: "Formulaire", number: 1 },
  { id: "preview", label: "Vérification", number: 2 },
  { id: "signature", label: "Signature", number: 3 },
  { id: "review", label: "Validation", number: 4 },
  { id: "success", label: "Terminé", number: 5 },
];

function ProgressBar({ currentStep }: { currentStep: Step }) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);
  
  return (
    <div className="bg-white border-b sticky top-0 z-50 px-4 py-3">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                      isCompleted 
                        ? "bg-green-500 border-green-500 text-white" 
                        : isCurrent 
                          ? "bg-gray-800 border-gray-800 text-white" 
                          : "bg-white border-gray-300 text-gray-400"
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : step.number}
                  </div>
                  <span className={`text-xs mt-1 hidden sm:block ${isCurrent ? "font-semibold text-gray-800" : "text-gray-500"}`}>
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-8 sm:w-16 h-1 mx-1 rounded ${index < currentIndex ? "bg-green-500" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface GeneratedOrder {
  orderCode: string;
  pdfUrl: string;
  excelUrl: string;
  emailsSent: boolean;
  emailError?: string | null;
}

export default function OrderPage() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<Step>("form");
  const [orderData, setOrderData] = useState<Partial<InsertOrder>>({});
  const [generatedOrder, setGeneratedOrder] = useState<GeneratedOrder | null>(null);
  const [emailsSent, setEmailsSent] = useState(false);
  const [emailError, setEmailError] = useState<string>("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { toast } = useToast();

  const generateOrderMutation = useMutation({
    mutationFn: async (data: InsertOrder) => {
      const response = await apiRequest<GeneratedOrder>("POST", "/api/orders/generate", data);
      return response;
    },
    onSuccess: (data) => {
      setGeneratedOrder(data);
      setEmailsSent(data.emailsSent);
      setEmailError(data.emailError || "");
      setCurrentStep("success");
      
      if (data.emailsSent) {
        toast({
          title: "Commande créée et envoyée !",
          description: `Les emails ont été envoyés automatiquement`,
        });
      } else {
        toast({
          title: "Commande générée",
          description: data.emailError || "Les emails n'ont pas pu être envoyés",
          variant: data.emailError ? "destructive" : "default",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer la commande",
        variant: "destructive",
      });
    },
  });

  const sendEmailsMutation = useMutation({
    mutationFn: async () => {
      if (!generatedOrder) throw new Error("Aucune commande générée");
      await apiRequest("POST", "/api/orders/send-emails", {
        orderCode: generatedOrder.orderCode,
        clientEmail: orderData.clientEmail,
      });
    },
    onSuccess: () => {
      setEmailsSent(true);
      setEmailError("");
      toast({
        title: "Emails envoyés !",
        description: "Le client et l'agence ont reçu les documents",
      });
    },
    onError: (error: Error) => {
      setEmailError(error.message || "Impossible d'envoyer les emails");
      toast({
        title: "Erreur d'envoi",
        description: error.message || "Impossible d'envoyer les emails",
        variant: "destructive",
      });
    },
  });

  // Scroll en haut à chaque changement d'étape
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentStep]);

  // Vérifier l'authentification au chargement
  useEffect(() => {
    // Détecter si c'est un rechargement de page (pas une navigation normale)
    const navigationType = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const isPageReload = navigationType?.type === 'reload';
    
    // Si c'est un rechargement, effacer l'authentification et rediriger
    if (isPageReload) {
      sessionStorage.removeItem("authenticated");
      window.location.href = "/login";
      return;
    }
    
    // Vérifier l'authentification
    const isAuthenticated = sessionStorage.getItem("authenticated") === "true";
    
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    
    setIsCheckingAuth(false);
  }, [setLocation]);

  // Afficher un loader pendant la vérification
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification...</p>
        </div>
      </div>
    );
  }

  const handleFormNext = (data: Partial<InsertOrder>) => {
    setOrderData({ ...orderData, ...data });
    setCurrentStep("preview");
  };

  const handlePreviewNext = () => {
    setCurrentStep("signature");
  };

  const handleSignatureNext = (signatureData: { signature: string; signatureLocation: string; signatureDate: string; clientSignedName: string; cgvAccepted: boolean }) => {
    setOrderData({ 
      ...orderData, 
      signature: signatureData.signature,
      signatureLocation: signatureData.signatureLocation,
      signatureDate: signatureData.signatureDate,
      clientSignedName: signatureData.clientSignedName,
      cgvAccepted: signatureData.cgvAccepted
    });
    setCurrentStep("review");
  };

  const handleGenerate = () => {
    if (orderData.clientName && orderData.signature) {
      generateOrderMutation.mutate(orderData as InsertOrder);
    }
  };

  const handleSendEmails = () => {
    sendEmailsMutation.mutate();
  };

  const handleNewOrder = () => {
    setCurrentStep("form");
    setOrderData({});
    setGeneratedOrder(null);
    setEmailsSent(false);
    setEmailError("");
  };

  return (
    <div className="min-h-screen bg-background">
      <ProgressBar currentStep={currentStep} />
      
      {currentStep === "form" && (
        <OrderForm onNext={handleFormNext} initialData={orderData} />
      )}
      {currentStep === "preview" && orderData.salesRepName && (
        <ReviewStep
          orderData={orderData}
          onBack={() => setCurrentStep("form")}
          onNext={handlePreviewNext}
          isPreview={true}
          stepNumber={2}
          totalSteps={5}
        />
      )}
      {currentStep === "signature" && (
        <SignatureStep
          onNext={handleSignatureNext}
          onBack={() => setCurrentStep("preview")}
          stepNumber={3}
          totalSteps={5}
        />
      )}
      {currentStep === "review" && orderData.signature && (
        <ReviewStep
          orderData={orderData}
          onBack={() => setCurrentStep("signature")}
          onGenerate={handleGenerate}
          isGenerating={generateOrderMutation.isPending}
          isPreview={false}
          stepNumber={4}
          totalSteps={5}
        />
      )}
      {currentStep === "success" && generatedOrder && (
        <SuccessStep
          orderCode={generatedOrder.orderCode}
          pdfUrl={generatedOrder.pdfUrl}
          excelUrl={generatedOrder.excelUrl}
          onSendEmails={handleSendEmails}
          onNewOrder={handleNewOrder}
          isSending={sendEmailsMutation.isPending}
          emailsSent={emailsSent}
          emailError={emailError}
        />
      )}
    </div>
  );
}
