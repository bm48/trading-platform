import { createClient } from '@supabase/supabase-js';

if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for Supabase database connection"
  );
}

// Create Supabase client for both authentication and database operations
export const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);