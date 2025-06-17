-- Create timeline_events table in Supabase
CREATE TABLE timeline_events (
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

-- Create indexes for better performance
CREATE INDEX idx_timeline_events_case_id ON timeline_events(case_id);
CREATE INDEX idx_timeline_events_contract_id ON timeline_events(contract_id);
CREATE INDEX idx_timeline_events_user_id ON timeline_events(user_id);