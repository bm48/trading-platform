import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import DemoDashboard from "@/pages/demo-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import CaseDetail from "@/pages/case-detail";
import Checkout from "@/pages/checkout";
import Settings from "@/pages/settings";
import TermsOfService from "@/pages/terms-of-service";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/demo-dashboard" component={DemoDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/case/:id" component={CaseDetail} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/settings" component={Settings} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/application/:id/complete" component={Checkout} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
