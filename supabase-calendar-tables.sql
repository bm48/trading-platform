-- Calendar Integration Tables for Supabase
-- Run this SQL in your Supabase SQL Editor to create the missing calendar tables

-- Calendar integrations table
CREATE TABLE IF NOT EXISTS public.calendar_integrations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_id ON public.calendar_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_provider ON public.calendar_integrations(provider);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_case_id ON public.calendar_events(case_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_contract_id ON public.calendar_events(contract_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Calendar integrations: Users can only access their own integrations
CREATE POLICY "Users can manage own calendar integrations" ON public.calendar_integrations
    FOR ALL USING (auth.uid() = user_id);

-- Calendar events: Users can only access their own events
CREATE POLICY "Users can manage own calendar events" ON public.calendar_events
    FOR ALL USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_calendar_integrations_updated_at 
    BEFORE UPDATE ON public.calendar_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at 
    BEFORE UPDATE ON public.calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();