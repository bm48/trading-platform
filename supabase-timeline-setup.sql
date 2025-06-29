-- Create timeline_events table in Supabase
-- Copy and paste this entire SQL into your Supabase SQL Editor

-- Drop the table if it exists (optional - only if you want to start fresh)
-- DROP TABLE IF EXISTS timeline_events;

-- Create the timeline_events table
CREATE TABLE IF NOT EXISTS timeline_events (
  id SERIAL PRIMARY KEY,
  case_id INTEGER,
  contract_id INTEGER,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'milestone',
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP NOT NULL DEFAULT NOW(),
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  type TEXT DEFAULT 'milestone',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for timeline_events
-- Policy for SELECT (users can only see their own timeline entries)
CREATE POLICY "Users can view own timeline entries" ON timeline_events
  FOR SELECT USING (user_id = auth.uid()::text);

-- Policy for INSERT (users can only create their own timeline entries)
CREATE POLICY "Users can insert own timeline entries" ON timeline_events
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Policy for UPDATE (users can only update their own timeline entries)
CREATE POLICY "Users can update own timeline entries" ON timeline_events
  FOR UPDATE USING (user_id = auth.uid()::text);

-- Policy for DELETE (users can only delete their own timeline entries)
CREATE POLICY "Users can delete own timeline entries" ON timeline_events
  FOR DELETE USING (user_id = auth.uid()::text);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_timeline_events_case_id ON timeline_events(case_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_contract_id ON timeline_events(contract_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_user_id ON timeline_events(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_date ON timeline_events(date);