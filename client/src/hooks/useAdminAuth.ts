import { useState, useEffect } from 'react';

interface AdminSession {
  isAdmin: boolean;
  email: string;
  sessionId: string;
  expiresAt: string;
}

export function useAdminAuth() {
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    try {
      const response = await fetch('/api/admin/session', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAdminSession(data.admin);
      } else {
        setAdminSession(null);
      }
    } catch (error) {
      setAdminSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAdmin = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const adminSession = data.admin || { 
          isAdmin: true, 
          email, 
          sessionId: data.sessionId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          userId: data.admin?.userId || 'admin'
        };
        setAdminSession(adminSession);
        setIsLoading(false);
        console.log('Admin session set:', adminSession);
        return true;
      }
      setIsLoading(false);
      return false;
    } catch (error) {
      setIsLoading(false);
      return false;
    }
  };

  const logoutAdmin = async (): Promise<void> => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      // Ignore logout errors
    } finally {
      setAdminSession(null);
    }
  };

  return {
    adminSession,
    isAuthenticated: !!adminSession?.isAdmin,
    isLoading,
    loginAdmin,
    logoutAdmin,
    checkAdminSession,
  };
}