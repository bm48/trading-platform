# Email Documentation System Setup Guide

## Overview

The Email Documentation System allows you to send legal documents, strategy packs, and professional communications directly to clients via email using multiple service providers.

## Available Email Services

### 1. **Supabase Email** (Currently Active)
- ✅ **Status**: Already configured and working
- ✅ **Professional templates**: Built-in HTML email templates
- ✅ **No additional setup required**
- ✅ **Best for**: General documentation sending

### 2. **Gmail SMTP** (Backup Option)
- 📧 **Recommended for**: High-volume personal email sending
- 🔑 **Requirements**: Gmail account with App Password

#### Gmail SMTP Setup:
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App Passwords
   - Generate password for "Mail"
3. **Add Environment Variables**:
   ```
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-character-app-password
   ```

### 3. **SendGrid** (Premium Option)
- 🚀 **Best for**: Professional high-volume email
- 📊 **Features**: Advanced analytics, better deliverability
- 💰 **Cost**: Paid service with free tier

#### SendGrid Setup:
1. **Create SendGrid Account**: [sendgrid.com](https://sendgrid.com)
2. **Get API Key**:
   - Dashboard → Settings → API Keys
   - Create API Key with "Full Access"
3. **Add Environment Variable**:
   ```
   SENDGRID_API_KEY=your-sendgrid-api-key
   ```
4. **Verify Domain** (recommended for better deliverability)

## How to Use the Email Documentation System

### Via Admin Panel
1. **Login to Admin Panel**: `/admin`
2. **Navigate to "Email Docs" tab**
3. **Fill out the form**:
   - **Recipient Name**: Client's full name
   - **Recipient Email**: Client's email address
   - **Document Title**: e.g., "Legal Strategy Pack", "Demand Letter"
   - **Document URL**: Link to PDF document (optional)
   - **Custom Message**: Personal message to client (optional)
   - **Case Selection**: Auto-fill from existing cases
4. **Click "Send Documentation Email"**

### Quick Fill from Cases
- Select any existing case from dropdown
- Form automatically fills client details
- Document title suggests "Legal Strategy Pack - [Case Title]"

## Email Template Features

### Professional HTML Template Includes:
- **Resolve AI branding** with professional header
- **Client personalization** with name and case details
- **Document download button** (if URL provided)
- **Custom message section** for personalized communication
- **Next steps guidance** for clients
- **Professional footer** with contact information
- **Case reference** for tracking

### Email Content Structure:
```
Subject: Your [Document Title] - Resolve AI

Header: Resolve AI branding
Greeting: Hello [Client Name]
Main Content: Document ready notification
Custom Message: Your personal message
Download Button: Direct link to document
Next Steps: Guidance for client
Footer: Contact info and case reference
```

## API Endpoints

### Send Single Documentation Email
```
POST /api/admin/send-documentation
Authorization: Admin token required

Body:
{
  "recipientEmail": "client@example.com",
  "recipientName": "John Smith",
  "documentTitle": "Legal Strategy Pack",
  "documentUrl": "https://example.com/document.pdf",
  "customMessage": "Please review this carefully",
  "caseId": 123
}
```

### Send Bulk Documentation Emails
```
POST /api/admin/send-bulk-documentation
Authorization: Admin token required

Body:
{
  "emails": [
    {
      "recipientEmail": "client1@example.com",
      "recipientName": "John Smith",
      "documentTitle": "Strategy Pack"
    },
    {
      "recipientEmail": "client2@example.com", 
      "recipientName": "Jane Doe",
      "documentTitle": "Demand Letter"
    }
  ]
}
```

## Service Selection Priority

The system automatically selects email services in this order:
1. **Supabase Email** (primary, always available)
2. **Gmail SMTP** (if GMAIL_USER and GMAIL_APP_PASSWORD are set)
3. **SendGrid** (if SENDGRID_API_KEY is set)

## Troubleshooting

### Common Issues:

**Email not sending:**
- Check admin authentication
- Verify recipient email format
- Ensure document URL is accessible

**Gmail SMTP errors:**
- Verify App Password (not regular password)
- Check 2-Factor Authentication is enabled
- Ensure "Less secure app access" is OFF (use App Password instead)

**SendGrid errors:**
- Verify API key has full access permissions
- Check SendGrid account status
- Verify sender email domain

**Supabase Email issues:**
- Check Supabase project status
- Verify admin authentication
- Review server logs for detailed errors

## Best Practices

### For Professional Communication:
1. **Always include custom message** for personal touch
2. **Use clear document titles** (e.g., "Legal Strategy Pack for Payment Dispute")
3. **Provide document URLs** when possible for direct download
4. **Reference case numbers** for client tracking
5. **Test with internal emails** before sending to clients

### For Bulk Sending:
1. **Verify all email addresses** before bulk send
2. **Use descriptive document titles** for each recipient
3. **Monitor delivery status** in admin panel
4. **Space out bulk sends** to avoid rate limits

## Integration with Existing Systems

### With Case Management:
- Email system integrates with existing case data
- Auto-fills client information from cases
- Links emails to specific case IDs
- Tracks email history per case

### With Document Generation:
- Works with AI-generated strategy packs
- Supports PDF and Word document attachments
- Integrates with Supabase file storage
- Maintains document version history

## Security Considerations

- **Admin-only access**: Only authenticated admins can send emails
- **Secure API keys**: All email service credentials stored as environment variables
- **Audit trail**: All email sends logged with admin user and timestamp
- **Recipient verification**: Email format validation before sending
- **Rate limiting**: Built-in protection against spam/abuse

## Future Enhancements

Planned features:
- Email delivery tracking and read receipts
- Email template customization
- Scheduled email sending
- Email campaign management
- Client email preferences
- Automated follow-up sequences