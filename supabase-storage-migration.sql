-- Migration to add Supabase Storage support to documents table
-- Run this in your Supabase SQL editor

-- Add new columns for Supabase Storage
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS supabase_url varchar,
ADD COLUMN IF NOT EXISTS supabase_path varchar,
ADD COLUMN IF NOT EXISTS file_path varchar;

-- Make upload_path nullable for new Supabase files
ALTER TABLE documents 
ALTER COLUMN upload_path DROP NOT NULL;

-- Create storage bucket policies for document access
-- This creates a private bucket that requires authentication

-- Enable Row Level Security on documents table if not already enabled
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own documents
CREATE POLICY IF NOT EXISTS "Users can view their own documents" ON documents
FOR SELECT USING (auth.uid()::text = user_id);

-- Policy for users to insert their own documents
CREATE POLICY IF NOT EXISTS "Users can insert their own documents" ON documents
FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy for users to update their own documents
CREATE POLICY IF NOT EXISTS "Users can update their own documents" ON documents
FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy for users to delete their own documents
CREATE POLICY IF NOT EXISTS "Users can delete their own documents" ON documents
FOR DELETE USING (auth.uid()::text = user_id);

-- Create storage bucket for documents (run this if bucket doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,  -- Private bucket
  10485760,  -- 10MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'application/vnd.ms-outlook',
    'message/rfc822'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents bucket
CREATE POLICY IF NOT EXISTS "Users can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Users can view their documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Users can delete their documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Index for better performance on Supabase path lookups
CREATE INDEX IF NOT EXISTS idx_documents_supabase_path ON documents(supabase_path);
CREATE INDEX IF NOT EXISTS idx_documents_user_id_case_id ON documents(user_id, caseid);
CREATE INDEX IF NOT EXISTS idx_documents_user_id_contract_id ON documents(user_id, contractid);