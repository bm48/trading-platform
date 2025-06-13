import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for Supabase database connection"
  );
}

// Create Supabase client for admin operations
export const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Create direct database connection for Drizzle ORM using DATABASE_URL
// This allows the project to work with both Supabase and other PostgreSQL providers
const connectionString = process.env.DATABASE_URL || process.env.VITE_SUPABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or VITE_SUPABASE_URL must be set");
}

const client = postgres(connectionString, {
  ssl: connectionString.includes('supabase') ? 'require' : false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });