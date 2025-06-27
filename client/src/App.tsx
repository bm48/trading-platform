import { Switch, Route, useLocation } from "wouter";
import React from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import DemoDashboard from "@/pages/demo-dashboard";
import AdminDashboard from "@/pages/admin";
import AdminLogin from "@/pages/admin-login";
import { AdminProtectedRoute } from "@/components/admin-protected-route";
import CaseDetail from "@/pages/case-detail";
import ContractDetail from "@/pages/contract-detail";
import Calendar from "@/pages/calendar";
// import Analytics from "@/pages/analytics";
import ApplicationStatus from "@/pages/application-status";
import Checkout from "@/pages/checkout";
import Settings from "@/pages/settings";
import Profile from "@/pages/profile";
import IntakeForm from "@/pages/intake-form";
import TermsOfService from "@/pages/terms-of-service";
import AuthCallback from "@/pages/auth-callback";
import Auth from "@/pages/auth";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
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
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/admin">
        <AdminProtectedRoute component={AdminDashboard} />
      </Route>
      <Route path="/case/:id">
        <ProtectedRoute component={CaseDetail} />
      </Route>
      <Route path="/contract/:id">
        <ProtectedRoute component={ContractDetail} />
      </Route>
      <Route path="/calendar">
        <ProtectedRoute component={Calendar} />
      </Route>
      {/* <Route path="/analytics">
        <ProtectedRoute component={Analytics} />
      </Route> */}
      <Route path="/application-status/:id">
        <ApplicationStatus />
      </Route>
      <Route path="/intake-form/:id">
        <IntakeForm />
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
      <Route path="/auth" component={Auth} />
      <Route path="/auth/callback" component={AuthCallback} />
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
