# Google Calendar Integration Setup

## Required Google Cloud Console Configuration

To enable Google Calendar integration, you need to set up OAuth 2.0 credentials in Google Cloud Console:

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API

### Step 2: Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in required fields:
   - App name: "Project Resolve AI"
   - User support email: Your email
   - Developer contact information: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`

### Step 3: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:5000/api/calendar/auth/google/callback` (development)
   - `https://your-domain.com/api/calendar/auth/google/callback` (production)

### Step 4: Add Environment Variables
Add these to your Replit secrets:
```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/auth/google/callback
```

## Current Implementation Status

✅ OAuth flow fixed with proper redirect_uri parameter
✅ Popup-based authentication with postMessage communication
✅ Secure token exchange endpoint with authentication
✅ Database schema ready (pending table creation)
✅ Frontend integration component updated

❌ Google OAuth credentials not configured
❌ Calendar tables not created in Supabase database

## Next Steps

1. Create calendar tables in Supabase using `supabase-calendar-tables.sql`
2. Configure Google Cloud Console OAuth as described above
3. Add Google OAuth credentials to environment variables
4. Test the complete integration workflow