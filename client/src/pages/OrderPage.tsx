import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { type InsertOrder, type Order } from "@shared/schema";
import { OrderForm } from "@/components/OrderForm";
import { SignatureStep } from "@/components/SignatureStep";
import { ReviewStep } from "@/components/ReviewStep";
import { SuccessStep } from "@/components/SuccessStep";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { showLocalNotification } from "@/lib/pwa";
import { saveOfflineOrder } from "@/lib/offlineStorage";
import { generateOrderPDFClient } from "@/lib/pdfGenerator";
import { Button } from "@/components/ui/button";
import { Check, WifiOff, ArrowLeft } from "lucide-react";

type Step = "form" | "preview" | "signature" | "review" | "success";

const STEPS = [
  { id: "form", label: "Formulaire", number: 1 },
  { id: "preview", label: "Vérification", number: 2 },
  { id: "signature", label: "Signature", number: 3 },
  { id: "review", label: "Validation", number: 4 },
  { id: "success", label: "Terminé", number: 5 },
];

function ProgressBar({ currentStep, onBackToMenu }: { currentStep: Step; onBackToMenu: () => void }) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);
  
  return (
    <div className="bg-white border-b sticky top-0 z-50 px-4 py-3">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBackToMenu}
            className="h-8 px-2"
            data-testid="button-back-menu"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Menu
          </Button>
        </div>
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
  const [savedOffline, setSavedOffline] = useState(false);
  const { toast } = useToast();
  const online = useOnlineStatus();

  const generateOrderMutation = useMutation({
    mutationFn: async (data: InsertOrder) => {
      if (!navigator.onLine) {
        const orderCode = `OFF-${Date.now().toString(36).toUpperCase()}`;
        const now = new Date().toISOString();
        
        const fullOrder: Order = {
          orderCode,
          orderDate: data.orderDate || now.split('T')[0],
          salesRepName: data.salesRepName,
          fournisseur: data.fournisseur || "BDIS",
          responsableName: data.responsableName,
          responsableTel: data.responsableTel,
          responsableEmail: data.responsableEmail,
          comptaTel: data.comptaTel,
          comptaEmail: data.comptaEmail,
          themeSelections: data.themeSelections,
          livraisonEnseigne: data.livraisonEnseigne,
          livraisonAdresse: data.livraisonAdresse,
          livraisonCpVille: data.livraisonCpVille,
          livraisonHoraires: data.livraisonHoraires,
          livraisonHayon: data.livraisonHayon,
          facturationRaisonSociale: data.facturationRaisonSociale,
          facturationAdresse: data.facturationAdresse,
          facturationCpVille: data.facturationCpVille,
          facturationMode: data.facturationMode,
          facturationRib: data.facturationRib,
          cgvAccepted: data.cgvAccepted,
          signature: data.signature,
          signatureLocation: data.signatureLocation,
          signatureDate: data.signatureDate,
          clientSignedName: data.clientSignedName,
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          newsletterAccepted: data.newsletterAccepted ?? true,
          createdAt: now,
        };
        
        try {
          const pdfBlob = await generateOrderPDFClient(fullOrder);
          await saveOfflineOrder(fullOrder, pdfBlob);
        } catch (pdfError) {
          console.error("Erreur génération PDF offline:", pdfError);
          await saveOfflineOrder(fullOrder);
        }
        
        return {
          orderCode,
          pdfUrl: "",
          excelUrl: "",
          emailsSent: false,
          emailError: null,
          isOffline: true,
        } as GeneratedOrder & { isOffline: boolean };
      }
      const response = await apiRequest<GeneratedOrder>("POST", "/api/orders/generate", data);
      return { ...response, isOffline: false };
    },
    onSuccess: (data) => {
      if ((data as any).isOffline) {
        setSavedOffline(true);
        setGeneratedOrder({
          orderCode: data.orderCode,
          pdfUrl: "",
          excelUrl: "",
          emailsSent: false,
          emailError: "Commande sauvegardée hors-ligne",
        });
        setCurrentStep("success");
        toast({
          title: "Commande sauvegardée",
          description: "La commande sera envoyée automatiquement dès que le réseau sera disponible",
        });
        return;
      }
      
      setSavedOffline(false);
      setGeneratedOrder(data);
      setEmailsSent(data.emailsSent);
      setEmailError(data.emailError || "");
      setCurrentStep("success");
      
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders?pageSize=10000"] });
      
      if (data.emailsSent) {
        toast({
          title: "Commande créée et envoyée !",
          description: `Les emails ont été envoyés automatiquement`,
        });
        showLocalNotification(
          "Commande envoyée",
          `La commande ${data.orderCode} a été générée et envoyée par email`
        );
      } else {
        toast({
          title: "Commande générée",
          description: data.emailError || "Les emails n'ont pas pu être envoyés",
          variant: data.emailError ? "destructive" : "default",
        });
      }
    },
    onError: async (error: Error, variables: InsertOrder) => {
      if (!navigator.onLine) {
        try {
          const orderCode = `OFF-${Date.now().toString(36).toUpperCase()}`;
          const now = new Date().toISOString();
          
          const fullOrder: Order = {
            orderCode,
            orderDate: variables.orderDate || now.split('T')[0],
            salesRepName: variables.salesRepName,
            fournisseur: variables.fournisseur || "BDIS",
            responsableName: variables.responsableName,
            responsableTel: variables.responsableTel,
            responsableEmail: variables.responsableEmail,
            comptaTel: variables.comptaTel,
            comptaEmail: variables.comptaEmail,
            themeSelections: variables.themeSelections,
            livraisonEnseigne: variables.livraisonEnseigne,
            livraisonAdresse: variables.livraisonAdresse,
            livraisonCpVille: variables.livraisonCpVille,
            livraisonHoraires: variables.livraisonHoraires,
            livraisonHayon: variables.livraisonHayon,
            facturationRaisonSociale: variables.facturationRaisonSociale,
            facturationAdresse: variables.facturationAdresse,
            facturationCpVille: variables.facturationCpVille,
            facturationMode: variables.facturationMode,
            facturationRib: variables.facturationRib,
            cgvAccepted: variables.cgvAccepted,
            signature: variables.signature,
            signatureLocation: variables.signatureLocation,
            signatureDate: variables.signatureDate,
            clientSignedName: variables.clientSignedName,
            clientName: variables.clientName,
            clientEmail: variables.clientEmail,
            newsletterAccepted: variables.newsletterAccepted ?? true,
            createdAt: now,
          };
          
          try {
            const pdfBlob = await generateOrderPDFClient(fullOrder);
            await saveOfflineOrder(fullOrder, pdfBlob);
          } catch (pdfError) {
            console.error("Erreur génération PDF offline:", pdfError);
            await saveOfflineOrder(fullOrder);
          }
          
          setSavedOffline(true);
          setGeneratedOrder({
            orderCode,
            pdfUrl: "",
            excelUrl: "",
            emailsSent: false,
            emailError: "Commande sauvegardée hors-ligne",
          });
          setCurrentStep("success");
          toast({
            title: "Commande sauvegardée",
            description: "Connexion perdue - la commande sera envoyée automatiquement dès le retour du réseau",
          });
          return;
        } catch (e) {
          console.error("Erreur sauvegarde offline:", e);
        }
      }
      // Vérifier si c'est une erreur de signature
      if (error.message && (
        error.message.includes("signature") || 
        error.message.includes("Signature")
      )) {
        // Effacer la signature invalide et retourner à l'étape signature
        setOrderData(prev => ({ ...prev, signature: undefined }));
        setCurrentStep("signature");
        toast({
          title: "Signature invalide",
          description: error.message || "Veuillez signer à nouveau",
          variant: "destructive",
        });
        return;
      }
      
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
      localStorage.removeItem("authenticated");
      window.location.href = "/login";
      return;
    }
    
    // Vérifier l'authentification
    const isAuthenticated = localStorage.getItem("authenticated") === "true";
    
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

  const handleBackToMenu = () => {
    setLocation("/hub");
  };

  return (
    <div className="min-h-screen bg-background">
      <ProgressBar currentStep={currentStep} onBackToMenu={handleBackToMenu} />
      
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
          fournisseur={orderData.fournisseur || "BDIS"}
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
          isOffline={savedOffline}
        />
      )}
    </div>
  );
}
