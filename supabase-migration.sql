-- Complete Supabase Database Schema for Project Resolve AI
-- Run this SQL in your Supabase SQL Editor to create all required tables

-- Enable Row Level Security (RLS) and create necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR UNIQUE,
    first_name VARCHAR,
    last_name VARCHAR,
    profile_image_url VARCHAR,
    role VARCHAR DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
    stripe_customer_id VARCHAR,
    stripe_subscription_id VARCHAR,
    subscription_status VARCHAR DEFAULT 'none' CHECK (subscription_status IN ('none', 'active', 'past_due', 'canceled')),
    plan_type VARCHAR DEFAULT 'none' CHECK (plan_type IN ('none', 'strategy_pack', 'monthly_subscription')),
    strategy_packs_remaining INTEGER DEFAULT 0,
    has_initial_strategy_pack BOOLEAN DEFAULT false,
    subscription_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications table (initial form submissions)
CREATE TABLE IF NOT EXISTS public.applications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    full_name VARCHAR NOT NULL,
    phone VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    trade VARCHAR NOT NULL,
    state VARCHAR NOT NULL,
    issue_type VARCHAR NOT NULL,
    amount DECIMAL,
    start_date TIMESTAMPTZ,
    description TEXT NOT NULL,
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    ai_analysis JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cases table (after payment and detailed processing)
CREATE TABLE IF NOT EXISTS public.cases (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    application_id INTEGER REFERENCES public.applications(id) ON DELETE SET NULL,
    title VARCHAR NOT NULL,
    case_number VARCHAR UNIQUE NOT NULL,
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'on_hold')),
    issue_type VARCHAR NOT NULL,
    amount VARCHAR,
    description TEXT,
    priority VARCHAR DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    ai_analysis JSONB,
    strategy_pack JSONB,
    next_action VARCHAR,
    next_action_due TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contracts table
CREATE TABLE IF NOT EXISTS public.contracts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    contract_number VARCHAR UNIQUE NOT NULL,
    status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'signed')),
    client_name VARCHAR,
    project_description TEXT,
    value DECIMAL,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    terms JSONB,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table (supports both documents and photos)
CREATE TABLE IF NOT EXISTS public.documents (
    id SERIAL PRIMARY KEY,
    caseid INTEGER REFERENCES public.cases(id) ON DELETE CASCADE,
    contractid INTEGER REFERENCES public.contracts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    filename VARCHAR NOT NULL,
    original_name VARCHAR NOT NULL,
    file_type VARCHAR NOT NULL,
    mime_type VARCHAR NOT NULL,
    file_size INTEGER NOT NULL,
    upload_path VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR DEFAULT 'general' CHECK (category IN ('evidence', 'contract', 'correspondence', 'generated', 'photos', 'general')),
    version INTEGER DEFAULT 1,
    is_latest_version BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timeline events table
CREATE TABLE IF NOT EXISTS public.timeline_events (
    id SERIAL PRIMARY KEY,
    caseid INTEGER REFERENCES public.cases(id) ON DELETE CASCADE,
    contractid INTEGER REFERENCES public.contracts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_type VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar integrations table
CREATE TABLE IF NOT EXISTS public.calendar_integrations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider VARCHAR NOT NULL CHECK (provider IN ('google', 'microsoft')),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    calendar_id VARCHAR,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    case_id INTEGER REFERENCES public.cases(id) ON DELETE CASCADE,
    contract_id INTEGER REFERENCES public.contracts(id) ON DELETE CASCADE,
    integration_id INTEGER REFERENCES public.calendar_integrations(id) ON DELETE SET NULL,
    external_event_id VARCHAR,
    title VARCHAR NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location VARCHAR,
    attendees JSONB,
    reminder_minutes INTEGER DEFAULT 15,
    is_synced BOOLEAN DEFAULT false,
    sync_status VARCHAR DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI generations table (for strategy packs and documents)
CREATE TABLE IF NOT EXISTS public.ai_generations (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR NOT NULL CHECK (type IN ('strategy_pack', 'demand_letter', 'notice_to_complete', 'adjudication_application')),
    status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'sent')),
    word_doc_id INTEGER REFERENCES public.documents(id) ON DELETE SET NULL,
    pdf_doc_id INTEGER REFERENCES public.documents(id) ON DELETE SET NULL,
    ai_content JSONB,
    intake_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    sent_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON public.applications(created_at);

CREATE INDEX IF NOT EXISTS idx_cases_user_id ON public.cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON public.cases(case_number);

CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON public.contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON public.contracts(contract_number);

CREATE INDEX IF NOT EXISTS idx_documents_caseid ON public.documents(caseid);
CREATE INDEX IF NOT EXISTS idx_documents_contractid ON public.documents(contractid);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);

CREATE INDEX IF NOT EXISTS idx_timeline_events_caseid ON public.timeline_events(caseid);
CREATE INDEX IF NOT EXISTS idx_timeline_events_contractid ON public.timeline_events(contractid);
CREATE INDEX IF NOT EXISTS idx_timeline_events_event_date ON public.timeline_events(event_date);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON public.calendar_events(start_time);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Applications: Users can create applications, view their own, admins can view all
CREATE POLICY "Anyone can create applications" ON public.applications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own applications" ON public.applications
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
    );

CREATE POLICY "Admins can update applications" ON public.applications
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
    );

-- Cases: Users can only access their own cases
CREATE POLICY "Users can manage own cases" ON public.cases
    FOR ALL USING (auth.uid() = user_id);

-- Contracts: Users can only access their own contracts
CREATE POLICY "Users can manage own contracts" ON public.contracts
    FOR ALL USING (auth.uid() = user_id);

-- Documents: Users can only access documents for their cases/contracts
CREATE POLICY "Users can manage own documents" ON public.documents
    FOR ALL USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM public.cases WHERE id = documents.caseid AND user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.contracts WHERE id = documents.contractid AND user_id = auth.uid())
    );

-- Timeline events: Users can only access events for their cases/contracts
CREATE POLICY "Users can manage own timeline events" ON public.timeline_events
    FOR ALL USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM public.cases WHERE id = timeline_events.caseid AND user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.contracts WHERE id = timeline_events.contractid AND user_id = auth.uid())
    );

-- Calendar integrations: Users can only access their own integrations
CREATE POLICY "Users can manage own calendar integrations" ON public.calendar_integrations
    FOR ALL USING (auth.uid() = user_id);

-- Calendar events: Users can only access their own events
CREATE POLICY "Users can manage own calendar events" ON public.calendar_events
    FOR ALL USING (auth.uid() = user_id);

-- AI generations: Users can access generations for their own cases
CREATE POLICY "Users can manage own AI generations" ON public.ai_generations
    FOR ALL USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM public.cases WHERE id = ai_generations.case_id AND user_id = auth.uid())
    );

-- Create functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON public.cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_integrations_updated_at BEFORE UPDATE ON public.calendar_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_generations_updated_at BEFORE UPDATE ON public.ai_generations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();