import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function AuthCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the auth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          navigate('/?auth=error');
          return;
        }

        if (data.session) {
          console.log('Authentication successful:', data.session.user.email);
          // Redirect to dashboard on successful authentication
          navigate('/dashboard');
        } else {
          // No session found, redirect to home
          navigate('/');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        navigate('/?auth=error');
      }
    };

    // Add a small delay to ensure the URL hash is processed
    const timer = setTimeout(handleAuthCallback, 100);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold mb-2">Completing sign in...</h2>
          <p className="text-gray-600">
            Please wait while we finish setting up your account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}