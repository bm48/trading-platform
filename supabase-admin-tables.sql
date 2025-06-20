-- Admin Sessions Table for Project Resolve AI
-- Run this in your Supabase SQL Editor

-- Create admin_sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text UNIQUE NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_sessions_session_id ON admin_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- Enable RLS
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can manage admin sessions
CREATE POLICY "Only admins can manage sessions" ON admin_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        (auth.users.raw_user_meta_data->>'role')::text = 'admin' OR
        (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
      )
    )
  );

-- Update users table to ensure role column exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = user_id 
    AND (
      (auth.users.raw_user_meta_data->>'role')::text = 'admin' OR
      (auth.users.raw_user_meta_data->>'is_admin')::boolean = true
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON admin_sessions TO authenticated;