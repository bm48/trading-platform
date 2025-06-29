# Supabase Email Setup Guide

## Overview
The admin panel now sends document notifications via Supabase Auth's native email system. When an admin clicks "Send Notification", an email is automatically sent to the client using Supabase's built-in email provider.

## Email Implementation
The system uses Supabase Auth's `generateLink` API with magic link functionality to send professional email notifications.

### Current Implementation
- **Send Document Route**: `/api/admin/documents/:id/send`
- **Authentication**: Admin session required
- **Email Method**: Supabase Auth magic link with custom data
- **Automatic**: Sends when admin clicks "Send Notification" button

### Email Content
When a document is sent, the client receives:
- Professional email with case title and document type
- Login link that redirects to dashboard
- Personalized greeting with client's name
- Message that document is ready for review

## Required Supabase Configuration

### Step 1: Configure Email Templates
In your Supabase dashboard:

1. **Go to Authentication → Email Templates**
2. **Select "Magic Link" template**
3. **Update the template with this HTML:**

```html
<h2>Your Legal Document is Ready</h2>

<p>Dear {{ .Data.firstName }},</p>

<p>{{ .Data.message }}</p>

<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="color: #1565C0; margin-top: 0;">Document Details:</h3>
  <ul style="color: #37474F; padding-left: 20px;">
    <li><strong>Case:</strong> {{ .Data.caseTitle }}</li>
    <li><strong>Document Type:</strong> {{ .Data.documentType }}</li>
    <li><strong>Status:</strong> Reviewed and Approved</li>
  </ul>
</div>

<p>This document contains important legal analysis and recommendations for your case. Please review it carefully and follow the suggested next steps.</p>

<div style="text-align: center; margin: 30px 0;">
  <a href="{{ .ConfirmationURL }}" style="background: #1565C0; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
    Access Your Document
  </a>
</div>

<p>If you have any questions about your document, please don't hesitate to contact our support team.</p>

<p style="color: #666; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
  Best regards,<br>
  Project Resolve AI Team<br>
  Legal Support for Australian Tradespeople
</p>
```

### Step 2: Configure Site URL
1. **Go to Authentication → URL Configuration**
2. **Set Site URL**: `http://localhost:5000` (for development) or your production domain
3. **Add Redirect URLs**: 
   - `http://localhost:5000/dashboard`
   - `https://yourdomain.com/dashboard` (for production)

### Step 3: Configure SMTP (Optional for Custom Emails)
For custom branded emails, you can configure SMTP:

1. **Go to Authentication → Settings**
2. **Enable Custom SMTP**
3. **Configure your email provider:**
   - **Gmail**: smtp.gmail.com, port 587
   - **Outlook**: smtp-mail.outlook.com, port 587
   - **SendGrid**: smtp.sendgrid.net, port 587

### Step 4: Test Email Configuration
1. **Login to admin panel**: `hello@projectresolveai.com / helloresolveaiproject`
2. **Go to Documents tab**
3. **Find approved document**
4. **Click "Send Notification" button**
5. **Check recipient's email inbox**

## Email Variables Available
The system passes these variables to the email template:
- `{{ .Data.firstName }}` - Client's first name
- `{{ .Data.caseTitle }}` - Case title
- `{{ .Data.documentType }}` - Document type (e.g., "Strategy Pack")
- `{{ .Data.message }}` - Notification message
- `{{ .ConfirmationURL }}` - Login link to dashboard

## Production Considerations

### Domain Authentication
For production deployment:
1. **Verify your domain** in Supabase Auth settings
2. **Configure SPF/DKIM records** for email deliverability
3. **Update Site URL** to your production domain

### Email Deliverability
To ensure emails reach users:
1. **Use custom SMTP** provider (SendGrid, Mailgun, etc.)
2. **Configure domain authentication**
3. **Monitor email bounce rates**
4. **Test with different email providers**

## Current Status
✅ **Email Integration**: Supabase Auth magic link system
✅ **Professional Templates**: Custom HTML with branding
✅ **Automatic Sending**: Admin "Send Notification" button
✅ **Dashboard Redirect**: Direct link to user dashboard
✅ **Error Handling**: Graceful fallback if email fails

## Troubleshooting

### Email Not Received
1. **Check spam folder**
2. **Verify email address** in user profile
3. **Check Supabase logs** for delivery errors
4. **Confirm SMTP configuration**

### Template Not Working
1. **Check variable syntax**: Use `{{ .Data.variableName }}`
2. **Verify template selection**: Must be "Magic Link" template
3. **Test with simple template** firstme

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