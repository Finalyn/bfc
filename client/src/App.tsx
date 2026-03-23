import { useEffect, lazy, Suspense } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OfflineBanner } from "@/components/OfflineBanner";
import { MobileAppGate } from "@/components/MobileAppGate";
import LoginPage from "@/pages/LoginPage";
import HubPage from "@/pages/HubPage";
import { initDataSync } from "@/lib/offlineDataSync";
import { initLocalCache } from "@/lib/localDataCache";
import { initAutoSync } from "@/lib/offlineSync";

// Code splitting — pages lourdes chargées à la demande
const OrderPage = lazy(() => import("@/pages/OrderPage"));
const AdminLoginPage = lazy(() => import("@/pages/AdminLoginPage"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const MyDashboard = lazy(() => import("@/pages/MyDashboard"));
const LegalPage = lazy(() => import("@/pages/LegalPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function HomeRedirect() {
  const isAuthenticated = localStorage.getItem("authenticated") === "true";
  return <Redirect to={isAuthenticated ? "/hub" : "/login"} />;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/hub" component={HubPage} />
        <Route path="/order" component={OrderPage} />
        <Route path="/dashboard" component={MyDashboard} />
        <Route path="/admin/login" component={AdminLoginPage} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/analytics" component={AnalyticsPage} />
        <Route path="/legal" component={LegalPage} />
        <Route path="/">
          <HomeRedirect />
        </Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const initOffline = async () => {
      await initLocalCache();
      await initDataSync();
    };
    initOffline();

    // Auto-sync des commandes offline quand le réseau revient (global)
    const unsubAutoSync = initAutoSync();

    // Écouter les messages du service worker (navigation depuis notification)
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE' && event.data.url) {
        setLocation(event.data.url);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      unsubAutoSync();
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MobileAppGate>
          <Toaster />
          <Router />
          <OfflineBanner />
        </MobileAppGate>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
