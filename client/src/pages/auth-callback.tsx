import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function AuthCallback() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback started, current URL:', window.location.href);
        console.log('URL hash:', window.location.hash);
        console.log('URL search:', window.location.search);
        
        // Check if we have URL fragments that indicate OAuth callback
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken) {
          console.log('Found OAuth tokens in URL, processing authentication...');
          setStatus('processing');
          
          // Wait a moment for Supabase to process the tokens
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check session again after processing
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          console.log('Session after OAuth processing:', { sessionData, sessionError });
          
          if (sessionData.session && sessionData.session.user) {
            console.log('Authentication successful:', sessionData.session.user.email);
            setStatus('success');
            
            // Check for pending application workflow
            const redirectAfterAuth = sessionStorage.getItem('redirectAfterAuth');
            const pendingApplicationId = sessionStorage.getItem('pendingApplicationId');
            
            // Redirect after showing success briefly
            setTimeout(() => {
              if (redirectAfterAuth === 'checkout-subscription' && pendingApplicationId) {
                sessionStorage.removeItem('redirectAfterAuth');
                sessionStorage.removeItem('pendingApplicationId');
                navigate('/checkout?subscription=monthly');
              } else {
                navigate('/dashboard');
              }
            }, 1500);
            
            return;
          }
        }
        
        // Fallback: listen for auth state changes
        console.log('No OAuth tokens found, listening for auth state changes...');
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state changed during callback:', event, session?.user?.email);
            
            if (event === 'SIGNED_IN' && session) {
              subscription.unsubscribe();
              setStatus('success');
              
              // Check for pending application workflow
              const redirectAfterAuth = sessionStorage.getItem('redirectAfterAuth');
              const pendingApplicationId = sessionStorage.getItem('pendingApplicationId');
              
              setTimeout(() => {
                if (redirectAfterAuth === 'checkout-subscription' && pendingApplicationId) {
                  sessionStorage.removeItem('redirectAfterAuth');
                  sessionStorage.removeItem('pendingApplicationId');
                  navigate('/checkout?subscription=monthly');
                } else {
                  navigate('/dashboard');
                }
              }, 1500);
            } else if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
              subscription.unsubscribe();
              setStatus('error');
              setTimeout(() => navigate('/?auth=error'), 2000);
            }
          }
        );
        
        // Timeout fallback
        setTimeout(() => {
          subscription.unsubscribe();
          console.log('Auth callback timeout, checking final session state...');
          
          supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
              setStatus('success');
              setTimeout(() => navigate('/dashboard'), 1500);
            } else {
              setStatus('error');
              setTimeout(() => navigate('/'), 2000);
            }
          });
        }, 8000);
        
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setTimeout(() => navigate('/?auth=error'), 2000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {status === 'processing' && (
            <>
              <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-semibold mb-2">Completing sign in...</h2>
              <p className="text-gray-600">
                Please wait while we finish setting up your account.
              </p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Sign in successful!</h2>
              <p className="text-gray-600">
                Redirecting you to your dashboard...
              </p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Sign in failed</h2>
              <p className="text-gray-600">
                There was an error signing you in. Redirecting back...
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}