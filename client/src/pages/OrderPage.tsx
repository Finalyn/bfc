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

type Step = "form" | "signature" | "review" | "success";

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
    setCurrentStep("signature");
  };

  const handleSignatureNext = (signature: string) => {
    setOrderData({ ...orderData, signature });
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
    <>
      {currentStep === "form" && (
        <OrderForm onNext={handleFormNext} initialData={orderData} />
      )}
      {currentStep === "signature" && (
        <SignatureStep
          onNext={handleSignatureNext}
          onBack={() => setCurrentStep("form")}
        />
      )}
      {currentStep === "review" && orderData.clientName && (
        <ReviewStep
          orderData={orderData as InsertOrder}
          onBack={() => setCurrentStep("signature")}
          onGenerate={handleGenerate}
          isGenerating={generateOrderMutation.isPending}
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
    </>
  );
}
