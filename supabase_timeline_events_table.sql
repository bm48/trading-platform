-- Complete Supabase table setup for Project Resolve AI
-- Run this entire script in your Supabase SQL Editor

-- Create timeline_events table
CREATE TABLE IF NOT EXISTS timeline_events (
  id SERIAL PRIMARY KEY,
  case_id INTEGER REFERENCES cases(id),
  contract_id INTEGER REFERENCES contracts(id),
  user_id VARCHAR NOT NULL,
  event_type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  event_date TIMESTAMP NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  case_id INTEGER REFERENCES cases(id),
  contract_id INTEGER REFERENCES contracts(id),
  title VARCHAR NOT NULL,
  file_path VARCHAR NOT NULL,
  file_type VARCHAR NOT NULL,
  file_size INTEGER NOT NULL,
  document_type VARCHAR DEFAULT 'upload',
  category VARCHAR DEFAULT 'general',
  description TEXT,
  version INTEGER DEFAULT 1,
  is_latest_version BOOLEAN DEFAULT TRUE,
  parent_document_id INTEGER REFERENCES documents(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR,
  full_name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  phone VARCHAR,
  business_name VARCHAR,
  abn VARCHAR,
  issue_type VARCHAR NOT NULL,
  amount_owed DECIMAL(10,2),
  issue_description TEXT NOT NULL,
  preferred_contact VARCHAR DEFAULT 'email',
  urgency_level VARCHAR DEFAULT 'medium',
  status VARCHAR DEFAULT 'pending',
  ai_analysis JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure sessions table exists (required for auth)
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_timeline_events_case_id ON timeline_events(case_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_contract_id ON timeline_events(contract_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_user_id ON timeline_events(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_contract_id ON documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);

-- Add RLS (Row Level Security) policies
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Timeline events policies
CREATE POLICY "Users can view their own timeline events" ON timeline_events
  FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "Users can insert their own timeline events" ON timeline_events
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Documents policies  
CREATE POLICY "Users can view their own documents" ON documents
  FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "Users can insert their own documents" ON documents
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE USING (user_id = auth.uid()::text);
CREATE POLICY "Users can delete their own documents" ON documents
  FOR DELETE USING (user_id = auth.uid()::text);

-- Applications policies
CREATE POLICY "Users can view their own applications" ON applications
  FOR SELECT USING (user_id = auth.uid()::text OR user_id IS NULL);
CREATE POLICY "Anyone can create applications" ON applications
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own applications" ON applications
  FOR UPDATE USING (user_id = auth.uid()::text);