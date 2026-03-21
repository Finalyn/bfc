import { useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OfflineBanner } from "@/components/OfflineBanner";
import { MobileAppGate } from "@/components/MobileAppGate";
import OrderPage from "@/pages/OrderPage";
import LoginPage from "@/pages/LoginPage";
import HubPage from "@/pages/HubPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import MyDashboard from "@/pages/MyDashboard";
import LegalPage from "@/pages/LegalPage";
import ProfilePage from "@/pages/ProfilePage";
import { initDataSync } from "@/lib/offlineDataSync";
import { initLocalCache } from "@/lib/localDataCache";
import { initAutoSync } from "@/lib/offlineSync";

function HomeRedirect() {
  const isAuthenticated = localStorage.getItem("authenticated") === "true";
  return <Redirect to={isAuthenticated ? "/hub" : "/login"} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/hub" component={HubPage} />
      <Route path="/order" component={OrderPage} />
      <Route path="/dashboard" component={MyDashboard} />
      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/legal" component={LegalPage} />
      <Route path="/">
        <HomeRedirect />
      </Route>
    </Switch>
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
