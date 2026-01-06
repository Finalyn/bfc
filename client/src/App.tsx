import { useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
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

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/hub" component={HubPage} />
      <Route path="/order" component={OrderPage} />
      <Route path="/dashboard" component={MyDashboard} />
      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/">
        <Redirect to="/login" />
      </Route>
    </Switch>
  );
}

function App() {
  useEffect(() => {
    const navigationType = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationType?.type === 'reload') {
      sessionStorage.removeItem("authenticated");
      sessionStorage.removeItem("adminAuthenticated");
    }
    
    const handleBeforeUnload = () => {
      sessionStorage.removeItem("authenticated");
      sessionStorage.removeItem("adminAuthenticated");
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
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
