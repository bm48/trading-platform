import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Client } from '@microsoft/microsoft-graph-client';
import { PublicClientApplication } from '@azure/msal-node';
import { supabaseStorage } from './supabase-storage';
import type { CalendarIntegration, CalendarEvent, InsertCalendarEvent } from '@shared/schema';

// Google Calendar Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/calendar/auth/google/callback';

// Microsoft Graph Configuration
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID || 'common';

interface CalendarEventData {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  reminderMinutes?: number;
}

export class CalendarService {
  private googleAuth: OAuth2Client;
  private msalClient: PublicClientApplication;

  constructor() {
    // Initialize Google OAuth client
    this.googleAuth = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    // Initialize Microsoft MSAL client
    this.msalClient = new PublicClientApplication({
      auth: {
        clientId: MICROSOFT_CLIENT_ID!,
        authority: `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}`,
      },
    });
  }

  // Google Calendar Methods
  async getGoogleAuthUrl(): Promise<string> {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.googleAuth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      redirect_uri: GOOGLE_REDIRECT_URI
    });
  }

  async handleGoogleCallback(code: string, userId: string): Promise<CalendarIntegration> {
    try {
      const { tokens } = await this.googleAuth.getToken(code);
      this.googleAuth.setCredentials(tokens);

      // Get user's primary calendar
      const calendar = google.calendar({ version: 'v3', auth: this.googleAuth });
      const calendarList = await calendar.calendarList.list();
      const primaryCalendar = calendarList.data.items?.find(cal => cal.primary);

      const integration = await supabaseStorage.createCalendarIntegration({
        user_id: userId,
        provider: 'google',
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        calendar_id: primaryCalendar?.id,
        is_active: true
      });

      return integration;
    } catch (error) {
      console.error('Error handling Google callback:', error);
      throw new Error('Failed to connect Google Calendar');
    }
  }

  async createGoogleEvent(integrationId: number, eventData: CalendarEventData): Promise<CalendarEvent> {
    try {
      const integration = await supabaseStorage.getCalendarIntegration(integrationId);
      if (!integration || integration.provider !== 'google') {
        throw new Error('Invalid Google Calendar integration');
      }

      // Refresh token if needed
      await this.refreshGoogleToken(integration);

      this.googleAuth.setCredentials({
        access_token: integration.access_token,
        refresh_token: integration.refresh_token
      });

      const calendar = google.calendar({ version: 'v3', auth: this.googleAuth });

      const event = {
        summary: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start: {
          dateTime: eventData.startTime.toISOString(),
          timeZone: 'Australia/Sydney',
        },
        end: {
          dateTime: eventData.endTime.toISOString(),
          timeZone: 'Australia/Sydney',
        },
        attendees: eventData.attendees?.map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: eventData.reminderMinutes || 15 },
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: integration.calendar_id || 'primary',
        requestBody: event,
      });

      // Save event to database
      const calendarEvent = await supabaseStorage.createCalendarEvent({
        user_id: integration.user_id,
        integration_id: integrationId,
        external_event_id: response.data.id,
        title: eventData.title,
        description: eventData.description,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        location: eventData.location,
        attendees: eventData.attendees ? { emails: eventData.attendees } : null,
        reminder_minutes: eventData.reminderMinutes || 15,
        is_synced: true,
        sync_status: 'synced'
      });

      return calendarEvent;
    } catch (error) {
      console.error('Error creating Google event:', error);
      throw new Error('Failed to create Google Calendar event');
    }
  }

  private async refreshGoogleToken(integration: CalendarIntegration): Promise<void> {
    if (!integration.refresh_token) return;

    try {
      this.googleAuth.setCredentials({
        refresh_token: integration.refresh_token
      });

      const { credentials } = await this.googleAuth.refreshAccessToken();
      
      await supabaseStorage.updateCalendarIntegration(integration.id, {
        access_token: credentials.access_token!,
        token_expires_at: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined
      });
    } catch (error) {
      console.error('Error refreshing Google token:', error);
      // Mark integration as inactive if refresh fails
      await supabaseStorage.updateCalendarIntegration(integration.id, { is_active: false });
    }
  }

  // Microsoft Outlook Methods
  async getMicrosoftAuthUrl(): Promise<string> {
    const authCodeUrlParameters = {
      scopes: ['https://graph.microsoft.com/calendars.readwrite'],
      redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:5000/api/auth/microsoft/callback',
    };

    const response = await this.msalClient.getAuthCodeUrl(authCodeUrlParameters);
    return response;
  }

  async handleMicrosoftCallback(code: string, userId: string): Promise<CalendarIntegration> {
    try {
      const tokenRequest = {
        code,
        scopes: ['https://graph.microsoft.com/calendars.readwrite'],
        redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:5000/api/auth/microsoft/callback',
      };

      const response = await this.msalClient.acquireTokenByCode(tokenRequest);
      
      const integration = await supabaseStorage.createCalendarIntegration({
        user_id: userId,
        provider: 'outlook',
        access_token: response.accessToken,
        refresh_token: response.account?.homeAccountId || '',
        token_expires_at: response.expiresOn ? new Date(response.expiresOn) : undefined,
        calendar_id: 'primary',
        is_active: true
      });

      return integration;
    } catch (error) {
      console.error('Error handling Microsoft callback:', error);
      throw new Error('Failed to connect Outlook Calendar');
    }
  }

  async createOutlookEvent(integrationId: number, eventData: CalendarEventData): Promise<CalendarEvent> {
    try {
      const integration = await supabaseStorage.getCalendarIntegration(integrationId);
      if (!integration || integration.provider !== 'outlook') {
        throw new Error('Invalid Outlook Calendar integration');
      }

      const graphClient = Client.init({
        authProvider: async () => integration.access_token
      });

      const event = {
        subject: eventData.title,
        body: {
          contentType: 'HTML',
          content: eventData.description || ''
        },
        start: {
          dateTime: eventData.startTime.toISOString(),
          timeZone: 'Australia/Sydney'
        },
        end: {
          dateTime: eventData.endTime.toISOString(),
          timeZone: 'Australia/Sydney'
        },
        location: {
          displayName: eventData.location || ''
        },
        attendees: eventData.attendees?.map(email => ({
          emailAddress: { address: email, name: email }
        })),
        reminderMinutesBeforeStart: eventData.reminderMinutes || 15
      };

      const response = await graphClient.api('/me/events').post(event);

      // Save event to database
      const calendarEvent = await supabaseStorage.createCalendarEvent({
        user_id: integration.user_id,
        integration_id: integrationId,
        external_event_id: response.id,
        title: eventData.title,
        description: eventData.description,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        location: eventData.location,
        attendees: eventData.attendees ? { emails: eventData.attendees } : null,
        reminder_minutes: eventData.reminderMinutes || 15,
        is_synced: true,
        sync_status: 'synced'
      });

      return calendarEvent;
    } catch (error) {
      console.error('Error creating Outlook event:', error);
      throw new Error('Failed to create Outlook Calendar event');
    }
  }

  // Universal Methods
  async getUserIntegrations(userId: string): Promise<CalendarIntegration[]> {
    return await supabaseStorage.getUserCalendarIntegrations(userId);
  }

  async createEventForCase(caseId: number, eventData: CalendarEventData): Promise<CalendarEvent[]> {
    const caseDetails = await supabaseStorage.getCase(caseId);
    if (!caseDetails) throw new Error('Case not found');

    const integrations = await this.getUserIntegrations(caseDetails.userId);
    const activeIntegrations = integrations.filter(int => int.is_active);

    const events: CalendarEvent[] = [];

    for (const integration of activeIntegrations) {
      try {
        let event: CalendarEvent;
        
        if (integration.provider === 'google') {
          event = await this.createGoogleEvent(integration.id, eventData);
        } else if (integration.provider === 'outlook') {
          event = await this.createOutlookEvent(integration.id, eventData);
        } else {
          continue;
        }

        // Link event to case
        await supabaseStorage.updateCalendarEvent(event.id, { case_id: caseId });
        events.push(event);
      } catch (error) {
        console.error(`Failed to create event for ${integration.provider}:`, error);
      }
    }

    return events;
  }

  async syncCaseDeadlines(caseId: number): Promise<void> {
    const caseDetails = await supabaseStorage.getCase(caseId);
    if (!caseDetails) return;

    // Create calendar events for important case deadlines
    const deadlines = [
      {
        title: `${caseDetails.title} - Next Action Due`,
        description: `Important deadline for case: ${caseDetails.description}`,
        startTime: caseDetails.nextActionDue || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endTime: new Date((caseDetails.nextActionDue || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).getTime() + 60 * 60 * 1000),
        reminderMinutes: 60 // 1 hour reminder
      }
    ];

    for (const deadline of deadlines) {
      if (deadline.startTime > new Date()) {
        await this.createEventForCase(caseId, deadline);
      }
    }
  }

  async disconnectIntegration(integrationId: number): Promise<void> {
    await supabaseStorage.updateCalendarIntegration(integrationId, { is_active: false });
  }
}

export const calendarService = new CalendarService();