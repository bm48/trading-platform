import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import DemoDashboard from "@/pages/demo-dashboard";
import AdminDashboard from "@/pages/admin";
import CaseDetail from "@/pages/case-detail";
import Calendar from "@/pages/calendar";
import Checkout from "@/pages/checkout";
import Settings from "@/pages/settings";
import Profile from "@/pages/profile";
import IntakeForm from "@/pages/intake-form";
import TermsOfService from "@/pages/terms-of-service";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    window.location.href = '/';
    return null;
  }
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/demo-dashboard">
        <ProtectedRoute component={DemoDashboard} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} />
      </Route>
      <Route path="/case/:id">
        <ProtectedRoute component={CaseDetail} />
      </Route>
      <Route path="/calendar">
        <ProtectedRoute component={Calendar} />
      </Route>
      <Route path="/checkout">
        <ProtectedRoute component={Checkout} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={Profile} />
      </Route>
      <Route path="/intake">
        <ProtectedRoute component={IntakeForm} />
      </Route>
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/application/:id/complete">
        <ProtectedRoute component={Checkout} />
      </Route>
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
