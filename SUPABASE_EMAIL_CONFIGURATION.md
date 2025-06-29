# Supabase Email Configuration Guide

## Overview
This guide shows you how to configure email sending in Supabase so that when admins click "Send Notification" in the admin panel, users receive professional Gmail notifications about their ready documents.

## Step 1: Configure SMTP Settings in Supabase

### Option A: Using Gmail SMTP (Recommended for Development)

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/projects
   - Select your project

2. **Configure SMTP Settings**
   - Go to **Settings** → **Auth** → **SMTP Settings**
   - Enable "Enable custom SMTP"
   - Fill in the following details:

   ```
   SMTP Host: smtp.gmail.com
   SMTP Port: 587
   SMTP User: your-gmail@gmail.com
   SMTP Password: [Your Gmail App Password - see below]
   Sender Name: Project Resolve AI
   Sender Email: your-gmail@gmail.com
   ```

3. **Set up Gmail App Password**
   - Go to Google Account settings: https://myaccount.google.com/
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this 16-character password as your SMTP Password

### Option B: Using Professional Email Service (Recommended for Production)

For production, use services like:
- **SendGrid** (Free tier: 100 emails/day)
- **Mailgun** (Free tier: 5,000 emails/month)
- **AWS SES** (Very affordable)

Example with SendGrid:
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Password: [Your SendGrid API Key]
Sender Name: Project Resolve AI
Sender Email: noreply@yourdomain.com
```

## Step 2: Configure Environment Variables

Add these to your Replit project's **Secrets** (Environment Variables):

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password-here
FROM_EMAIL=your-gmail@gmail.com
BASE_URL=https://your-replit-url.replit.app
```

## Step 3: Test Email Functionality

### Testing Process
1. **Login as Admin**
   - Go to: `your-app-url/admin`
   - Email: `hello@projectresolveai.com`
   - Password: `helloresolveaiproject`

2. **Find Approved Document**
   - Navigate to **Documents** tab
   - Look for documents with status "approved"

3. **Send Notification**
   - Click "Send Notification" button
   - Check server logs for email sending confirmation
   - User should receive professional email in their Gmail inbox

### Expected Email Content
Users will receive an email with:
- ✅ **Professional branding** with Project Resolve AI header
- ✅ **Document ready notification** with case details
- ✅ **Login button** linking directly to dashboard
- ✅ **Clear instructions** on what to do next
- ✅ **Responsive design** that works on all devices

## Step 4: Email Template Customization

The email template includes:
- **Header**: Project Resolve AI branding with gradient background
- **Main Content**: Document details, case information, and status
- **Call-to-Action**: Prominent "Login to Dashboard" button
- **Footer**: Professional footer with unsubscribe info

### Current Email Features
- **Case Title**: Personalized with user's case name
- **Document Type**: Shows "Strategy Pack" or specific document type
- **Login Link**: Direct link to dashboard for easy access
- **Professional Design**: Matches Project Resolve AI brand colors
- **Mobile Responsive**: Works perfectly on phones and tablets

## Troubleshooting

### Issue: Emails Not Sending
1. **Check SMTP credentials** in Supabase Dashboard
2. **Verify Gmail App Password** is correct (16 characters, no spaces)
3. **Check server logs** for error messages
4. **Test SMTP connection** manually

### Issue: Emails Going to Spam
1. **Use verified domain** for sender email
2. **Configure SPF/DKIM records** for your domain
3. **Use professional email service** (SendGrid, Mailgun) for production
4. **Add "no-reply@yourdomain.com"** as sender

### Issue: Gmail App Password Not Working
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate new App Password** specifically for this application
3. **Use the 16-character password** exactly as provided
4. **Don't use your regular Gmail password**

## Development vs Production

### Development Mode
- Uses Gmail SMTP with app passwords
- Emails show in console logs if SMTP fails
- Safe for testing with real email addresses

### Production Mode
- Use professional email service (SendGrid, Mailgun, SES)
- Configure custom domain for sender emails
- Set up proper DNS records (SPF, DKIM, DMARC)
- Monitor email delivery rates and bounce handling

## Security Best Practices

1. **Never commit SMTP credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate passwords regularly** for email services
4. **Monitor email sending logs** for unusual activity
5. **Use least-privilege principle** for email service API keys

## Current Status ✅

The email system is now configured to:
- ✅ Send professional Gmail notifications when admin clicks "Send Notification"
- ✅ Include case details, document type, and login link
- ✅ Use responsive HTML design with Project Resolve AI branding
- ✅ Handle both development (console logs) and production (SMTP) modes
- ✅ Provide clear error logging for troubleshooting
- ✅ Update case progress to 70% when document is sent

**Next Steps**: Configure your SMTP credentials in Supabase following the steps above!