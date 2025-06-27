-- Supabase Setup for Project Resolve AI
-- Run this in your Supabase SQL Editor

-- 1. Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS Policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id);

-- 3. Create RLS Policies for cases table
CREATE POLICY "Users can view own cases" ON cases
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own cases" ON cases
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own cases" ON cases
  FOR UPDATE USING (auth.uid()::text = user_id);

-- 4. Create RLS Policies for ai_generated_documents table
CREATE POLICY "Users can view own documents" ON ai_generated_documents
  FOR SELECT USING (auth.uid()::text = user_id);

-- 5. Create RLS Policies for notifications table
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid()::text = user_id);

-- 6. Create RLS Policies for applications table
CREATE POLICY "Users can view own applications" ON applications
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create applications" ON applications
  FOR INSERT WITH CHECK (true);

-- 7. Create Storage Bucket (Note: This needs to be done via Supabase Dashboard)
-- Go to Storage → Create bucket named 'documents'
-- Set bucket to public for document downloads
-- Create folder structure: ai-generated/, uploads/

-- 8. Storage Policies (run after creating bucket)
-- CREATE POLICY "Public can view documents" ON storage.objects
--   FOR SELECT USING (bucket_id = 'documents');

-- CREATE POLICY "Authenticated users can upload documents" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');