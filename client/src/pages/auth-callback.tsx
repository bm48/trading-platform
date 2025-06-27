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
        console.log('Auth callback started, current URL:', window.location.href);
        console.log('URL hash:', window.location.hash);
        console.log('URL search:', window.location.search);
        
        // First, handle the OAuth callback from the URL hash
        const { data: authData, error: authError } = await supabase.auth.getSession();
        console.log('Initial session check:', { authData, authError });
        
        // If no session yet, try to refresh in case the callback is still processing
        if (!authData.session) {
          console.log('No session found, waiting for auth state change...');
          
          // Wait for auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              console.log('Auth state changed during callback:', event, session?.user?.email);
              
              if (event === 'SIGNED_IN' && session) {
                subscription.unsubscribe();
                
                // Check if there's a pending application workflow
                const redirectAfterAuth = sessionStorage.getItem('redirectAfterAuth');
                const pendingApplicationId = sessionStorage.getItem('pendingApplicationId');
                
                if (redirectAfterAuth === 'checkout-subscription' && pendingApplicationId) {
                  sessionStorage.removeItem('redirectAfterAuth');
                  sessionStorage.removeItem('pendingApplicationId');
                  navigate('/checkout?subscription=monthly');
                } else {
                  navigate('/dashboard');
                }
              } else if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
                subscription.unsubscribe();
                navigate('/?auth=error');
              }
            }
          );
          
          // Timeout fallback in case auth state change doesn't fire
          setTimeout(() => {
            subscription.unsubscribe();
            console.log('Auth callback timeout, redirecting to home');
            navigate('/');
          }, 5000);
          
        } else {
          // Session already exists
          console.log('Authentication successful:', authData.session.user.email);
          
          const redirectAfterAuth = sessionStorage.getItem('redirectAfterAuth');
          const pendingApplicationId = sessionStorage.getItem('pendingApplicationId');
          
          if (redirectAfterAuth === 'checkout-subscription' && pendingApplicationId) {
            sessionStorage.removeItem('redirectAfterAuth');
            sessionStorage.removeItem('pendingApplicationId');
            navigate('/checkout?subscription=monthly');
          } else {
            navigate('/dashboard');
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        navigate('/?auth=error');
      }
    };

    handleAuthCallback();
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