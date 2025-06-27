# Supabase Configuration for Subscription Data Storage

## Required Supabase Setup Steps

### 1. Storage Bucket Setup
Go to your Supabase Dashboard → Storage and create:

```
Bucket Name: documents
Public: Yes (for document downloads)
```

Create folder structure:
- `ai-generated/` (for AI-generated PDFs)
- `uploads/` (for user uploaded files)

### 2. Database Security (RLS)
Run the SQL commands in `supabase-setup.sql` in your Supabase SQL Editor to:
- Enable Row Level Security on all tables
- Create policies for user data access
- Set up proper permissions

### 3. Environment Variables
Your current setup already includes subscription fields in the `users` table:
- `stripe_customer_id`
- `stripe_subscription_id` 
- `subscription_status` (none, active, past_due, canceled)
- `plan_type` (none, strategy_pack, monthly_subscription)
- `subscription_expires_at`

### 4. Stripe Webhook Integration
For real-time subscription updates, you'll need:
- Stripe webhook endpoint: `/api/stripe/webhook`
- Handle events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- Update user subscription data in Supabase

### 5. Storage Policies
After creating the bucket, add these policies in Supabase Dashboard → Storage → Policies:

```sql
-- Allow public read access to documents
CREATE POLICY "Public can view documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
```

## Current Database Schema
Your subscription data is already configured in the `users` table. No additional tables needed for basic subscription management.

## File Storage Integration
AI-generated documents will be stored at:
`https://your-project.supabase.co/storage/v1/object/public/documents/ai-generated/{filename}`