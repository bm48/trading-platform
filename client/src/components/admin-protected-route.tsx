import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useLocation } from 'wouter';
import { useEffect, useState } from 'react';

interface AdminProtectedRouteProps {
  component: React.ComponentType;
}

export function AdminProtectedRoute({ component: Component }: AdminProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [, setLocation] = useLocation();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !hasRedirected) {
      console.log('AdminProtectedRoute: Redirecting to admin-login');
      setHasRedirected(true);
      setLocation('/admin-login');
    }
  }, [isAuthenticated, isLoading, hasRedirected, setLocation]);

  // Show loading while determining authentication status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // If authenticated, render the component
  if (isAuthenticated) {
    console.log('AdminProtectedRoute: User is authenticated, rendering admin component');
    return <Component />;
  }

  // If not authenticated and haven't redirected yet, show loading
  if (!hasRedirected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Return null while redirecting
  return null;
}