import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useLocation } from 'wouter';
import { useEffect } from 'react';

interface AdminProtectedRouteProps {
  component: React.ComponentType;
}

export function AdminProtectedRoute({ component: Component }: AdminProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/admin-login');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Component />;
}