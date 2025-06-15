import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for Supabase database connection"
  );
}

// Create Supabase client for authentication operations only
export const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Use direct PostgreSQL connection for Drizzle ORM
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set for direct database connection");
}

// Configure postgres client for Drizzle
const client = postgres(connectionString, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });