import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        // Check for OAuth callback in URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken) {
          console.log('OAuth tokens found in URL, setting session...');
          // Set the session manually from OAuth tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          
          if (error) {
            console.error('Error setting OAuth session:', error);
          } else {
            console.log('OAuth session set successfully:', data.user?.email);
            setAuthState({
              user: data.user || null,
              session: data.session,
              loading: false,
              isAuthenticated: !!data.user,
            });
            return;
          }
        }
        
        // Regular session check
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        console.log('Initial session check:', { hasSession: !!session, userEmail: session?.user?.email });
        
        setAuthState({
          user: session?.user || null,
          session,
          loading: false,
          isAuthenticated: !!session?.user,
        });
      } catch (err) {
        console.error('Error in getInitialSession:', err);
        setAuthState({
          user: null,
          session: null,
          loading: false,
          isAuthenticated: false,
        });
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        console.log('New auth state will be:', { 
          hasUser: !!session?.user, 
          isAuthenticated: !!session?.user,
          userEmail: session?.user?.email 
        });
        
        setAuthState({
          user: session?.user || null,
          session,
          loading: false,
          isAuthenticated: !!session?.user,
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    console.log('signInWithGoogle called, initiating OAuth flow...');
    console.log('Current origin:', window.location.origin);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    console.log('OAuth response:', { data, error });

    if (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }

    console.log('OAuth flow initiated successfully, user should be redirected to Google');
    return data;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?redirect=checkout`,
        data: {
          full_name: fullName,
          first_name: fullName.split(' ')[0],
          last_name: fullName.split(' ').slice(1).join(' ') || '',
        },
      },
    });

    if (error) {
      console.error('Error signing up:', error);
      throw error;
    }

    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Error signing in:', error);
      throw error;
    }

    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return {
    ...authState,
    signInWithGoogle,
    signUp,
    signIn,
    signOut,
  };
}