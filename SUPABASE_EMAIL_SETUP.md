# Supabase Email Setup Guide

## Overview
The admin panel now includes document sending functionality via Supabase email. When an admin approves and sends a document, an email notification is automatically sent to the client.

## Email Implementation
The system uses Supabase Auth's built-in email functionality to send notifications when documents are approved and sent by admins.

### Current Implementation
- **Send Document Route**: `/api/admin/documents/:id/send`
- **Authentication**: Admin session required
- **Email Method**: Supabase Auth admin invite with custom data
- **Automatic**: Sends when admin clicks "Send to Client" button

### Email Content
When a document is sent, the client receives:
- Document ready notification
- Case title and document type
- Link to access the document in their dashboard

## Setup Steps

### 1. Configure Supabase Email Templates
In your Supabase dashboard:
1. Go to Authentication → Email Templates
2. Customize the "Invite user" template for document notifications
3. Use the following variables in your template:
   - `{{ .Data.type }}` - Will be "document_ready"
   - `{{ .Data.documentId }}` - Document ID
   - `{{ .Data.caseTitle }}` - Case title
   - `{{ .Data.documentType }}` - Document type
   - `{{ .Data.firstName }}` - Client's first name

### 2. Email Template Example
```html
<h2>Your Legal Document is Ready</h2>
<p>Dear {{ .Data.firstName }},</p>
<p>Your legal document for case "{{ .Data.caseTitle }}" has been reviewed and approved.</p>
<p><strong>Document Type:</strong> {{ .Data.documentType }}</p>
<p>You can access your document through your dashboard.</p>
<p>Best regards,<br>Project Resolve AI Team</p>
```

### 3. SMTP Configuration (Optional)
For production use, configure custom SMTP in Supabase:
1. Go to Settings → Auth
2. Configure SMTP settings with your email provider
3. This ensures professional email delivery

## Testing the System

### Admin Workflow
1. Login to admin panel: `hello@projectresolveai.com / helloresolveaiproject`
2. Go to Documents tab
3. Find pending document (ID 3)
4. Click "Approve" button
5. Click "Send to Client" button
6. Client receives email notification

### Features Working
✅ **Review Button** - Opens document content modal
✅ **Edit Button** - Opens document editing interface  
✅ **Approve/Reject** - Updates document status
✅ **Send to Client** - Sends email via Supabase
✅ **Quick Actions** - Navigate between admin sections

## Current Status
- All admin panel buttons are now functional
- Document approval workflow is complete
- Email sending is implemented via Supabase Auth
- Authentication issues resolved (admin session required)

## Next Steps
To fully activate email functionality:
1. Configure Supabase email templates
2. Set up SMTP for production (optional)
3. Test with real email addresses
4. Customize email content and branding