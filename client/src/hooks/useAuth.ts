import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const logout = async () => {
    try {
      console.log("Starting logout process...");
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Supabase logout error:", error);
        throw error;
      }
      
      // Clear all cached queries
      queryClient.clear();
      
      // Clear local user state
      setUser(null);
      
      // Show success message
      toast({
        title: "Logged out successfully",
        description: "You have been signed out of your account.",
      });
      
      console.log("Logout successful, redirecting...");
      
      // Small delay before redirect to allow toast to show
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      
    } catch (error) {
      console.error("Error during logout:", error);
      
      // Show error message
      toast({
        title: "Logout error",
        description: "There was an issue logging out. Redirecting anyway...",
        variant: "destructive",
      });
      
      // Clear local state and redirect even if there's an error
      setUser(null);
      queryClient.clear();
      
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    role: user?.user_metadata?.role || 'user',
    isAdmin: user?.user_metadata?.role === 'admin',
    logout,
  };
}
