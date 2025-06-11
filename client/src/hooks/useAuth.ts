import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      // Clear all queries when auth state changes
      queryClient.invalidateQueries();
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    role: user?.user_metadata?.role || 'user',
    isAdmin: user?.user_metadata?.role === 'admin',
  };
}
