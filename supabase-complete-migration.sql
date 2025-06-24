-- Complete Supabase Migration Script for Project Resolve AI
-- This script creates all necessary tables for the application

-- 1. Users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  profile_image_url VARCHAR(500),
  role VARCHAR(50) DEFAULT 'user',
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  subscription_status VARCHAR(50) DEFAULT 'none',
  plan_type VARCHAR(50) DEFAULT 'none',
  strategy_packs_remaining INTEGER DEFAULT 0,
  has_initial_strategy_pack BOOLEAN DEFAULT false,
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Applications table (initial form submissions)
CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  trade VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  issue_type VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2),
  start_date TIMESTAMP WITH TIME ZONE,
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  ai_analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Cases table (detailed legal cases)
CREATE TABLE IF NOT EXISTS cases (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  case_number VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  issue_type VARCHAR(100) NOT NULL,
  amount VARCHAR(255),
  description TEXT,
  priority VARCHAR(50) DEFAULT 'medium',
  ai_analysis JSONB,
  strategy_pack JSONB,
  next_action VARCHAR(255),
  next_action_due TIMESTAMP WITH TIME ZONE,
  progress INTEGER DEFAULT 0,
  mood_score INTEGER DEFAULT 5,
  stress_level VARCHAR(50) DEFAULT 'medium',
  urgency_feeling VARCHAR(50) DEFAULT 'moderate',
  confidence_level INTEGER DEFAULT 5,
  client_satisfaction INTEGER DEFAULT 5,
  mood_notes TEXT,
  last_mood_update TIMESTAMP WITH TIME ZONE,
  -- Case outcome tracking fields
  outcome VARCHAR(50),
  recovery_amount DECIMAL(12,2),
  resolution_method VARCHAR(100),
  satisfaction_score INTEGER,
  outcome_notes TEXT,
  case_closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  contract_number VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  contract_type VARCHAR(100) NOT NULL,
  parties JSONB,
  value DECIMAL(12,2),
  terms TEXT,
  ai_analysis JSONB,
  next_action VARCHAR(255),
  next_action_due TIMESTAMP WITH TIME ZONE,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Documents table
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
  contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(100),
  storage_bucket VARCHAR(100) DEFAULT 'documents',
  is_public BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Timeline Events table
CREATE TABLE IF NOT EXISTS timeline_events (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caseid INTEGER REFERENCES cases(id) ON DELETE CASCADE,
  contractid INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
  event_type VARCHAR(100) DEFAULT 'general',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Calendar Integrations table
CREATE TABLE IF NOT EXISTS calendar_integrations (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_user_id VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  calendar_id VARCHAR(255),
  calendar_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Calendar Events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  integration_id INTEGER REFERENCES calendar_integrations(id) ON DELETE CASCADE,
  case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL,
  contract_id INTEGER REFERENCES contracts(id) ON DELETE SET NULL,
  provider_event_id VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(500),
  attendees JSONB,
  is_synced BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Success Metrics table (for analytics)
CREATE TABLE IF NOT EXISTS success_metrics (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_type VARCHAR(100) NOT NULL,
  metric_value DECIMAL(12,2) NOT NULL,
  metric_period VARCHAR(50) NOT NULL,
  additional_data JSONB,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Case Outcome History table (for tracking changes)
CREATE TABLE IF NOT EXISTS case_outcome_history (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outcome_type VARCHAR(50) NOT NULL,
  previous_value VARCHAR(255),
  new_value VARCHAR(255),
  change_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON cases(case_number);
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_contract_id ON documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_caseid ON timeline_events(caseid);
CREATE INDEX IF NOT EXISTS idx_timeline_events_contractid ON timeline_events(contractid);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_success_metrics_user_id ON success_metrics(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE success_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_outcome_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = auth.uid() OR id::text = auth.uid()::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid() OR id::text = auth.uid()::text);

-- Applications policies
CREATE POLICY "Users can view own applications" ON applications
  FOR SELECT USING (user_id::text = auth.uid()::text OR user_id IS NULL);

CREATE POLICY "Anyone can create applications" ON applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own applications" ON applications
  FOR UPDATE USING (user_id::text = auth.uid()::text);

-- Cases policies
CREATE POLICY "Users can view own cases" ON cases
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can create own cases" ON cases
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update own cases" ON cases
  FOR UPDATE USING (user_id::text = auth.uid()::text);

-- Contracts policies
CREATE POLICY "Users can view own contracts" ON contracts
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can create own contracts" ON contracts
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update own contracts" ON contracts
  FOR UPDATE USING (user_id::text = auth.uid()::text);

-- Documents policies
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can create own documents" ON documents
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- Timeline events policies
CREATE POLICY "Users can view own timeline events" ON timeline_events
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can create own timeline events" ON timeline_events
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- Calendar integrations policies
CREATE POLICY "Users can view own calendar integrations" ON calendar_integrations
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can manage own calendar integrations" ON calendar_integrations
  FOR ALL USING (user_id::text = auth.uid()::text);

-- Calendar events policies
CREATE POLICY "Users can view own calendar events" ON calendar_events
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can manage own calendar events" ON calendar_events
  FOR ALL USING (user_id::text = auth.uid()::text);

-- Success metrics policies
CREATE POLICY "Users can view own success metrics" ON success_metrics
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can create own success metrics" ON success_metrics
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- Case outcome history policies
CREATE POLICY "Users can view own case outcome history" ON case_outcome_history
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can create own case outcome history" ON case_outcome_history
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- Admin policies (for users with admin role)
CREATE POLICY "Admins can view all data" ON applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all cases" ON cases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all contracts" ON contracts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'admin'
    )
  );