import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Client } from '@microsoft/microsoft-graph-client';
import { PublicClientApplication } from '@azure/msal-node';
import { supabaseStorage } from './supabase-storage';
import type { CalendarIntegration, CalendarEvent, InsertCalendarEvent } from '@shared/schema';

// Google Calendar Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://uoffyzwrillwytlgikwc.supabase.co/api/calendar/auth/google/callback';

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
  private googleAuth?: OAuth2Client;
  private msalClient?: PublicClientApplication;

  constructor() {
    // Use Supabase's Google OAuth integration for calendar access
    // No need for separate Google OAuth client since we'll use Supabase auth tokens

    // Initialize Microsoft MSAL client only if credentials are available
    if (MICROSOFT_CLIENT_ID) {
      this.msalClient = new PublicClientApplication({
        auth: {
          clientId: MICROSOFT_CLIENT_ID,
          authority: `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}`,
        },
      });
    }
  }

  // Google Calendar Methods - Using Supabase OAuth
  async getGoogleAuthUrl(): Promise<string> {
    // Use Supabase's built-in Google OAuth with calendar scopes
    // This leverages the existing GOOGLE_REDIRECT_URI configuration
    const supabaseUrl = process.env.SUPABASE_URL || 'https://uoffyzwrillwytlgikwc.supabase.co';
    const redirectTo = process.env.NODE_ENV === 'production' 
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/dashboard`
      : `https://${process.env.REPL_ID}.replit.app/dashboard`;

    const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}&scopes=${encodeURIComponent('https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events')}`;

    return authUrl;
  }

  async handleGoogleCallback(userId: string, accessToken: string): Promise<CalendarIntegration> {
    // This method now handles Supabase OAuth tokens instead of Google OAuth codes
    try {
      // Create OAuth2 client with the access token from Supabase
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });

      // Get user's primary calendar
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const calendarList = await calendar.calendarList.list();
      const primaryCalendar = calendarList.data.items?.find(cal => cal.primary);

      const integration = await supabaseStorage.createCalendarIntegration({
        user_id: userId,
        provider: 'google',
        access_token: accessToken,
        refresh_token: null, // Supabase handles token refresh
        token_expires_at: undefined, // Supabase manages token expiry
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
    if (!this.msalClient) {
      return '';
    }

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
      throw new Error('Failed to create Outlook event');
    }
  }

  // General Calendar Service Methods
  async getUserIntegrations(userId: string): Promise<CalendarIntegration[]> {
    return await supabaseStorage.getUserCalendarIntegrations(userId);
  }

  async createEventForCase(caseId: number, eventData: CalendarEventData): Promise<CalendarEvent[]> {
    try {
      const caseDetails = await supabaseStorage.getCase(caseId);
      if (!caseDetails) throw new Error('Case not found');

      const integrations = await this.getUserIntegrations(caseDetails.userId);
      const activeIntegrations = integrations.filter(i => i.is_active);
      const createdEvents = [];

      for (const integration of activeIntegrations) {
        let event;
        if (integration.provider === 'google') {
          event = await this.createGoogleEvent(integration.id, eventData);
        } else if (integration.provider === 'outlook') {
          event = await this.createOutlookEvent(integration.id, eventData);
        }
        if (event) {
          await supabaseStorage.updateCalendarEvent(event.id, { case_id: caseId });
          createdEvents.push(event);
        }
      }

      return createdEvents;
    } catch (error) {
      console.error(`Error creating event for case ${caseId}:`, error);
      throw error;
    }
  }

  async syncCaseDeadlines(caseId: number): Promise<void> {
    try {
      const caseDetails = await supabaseStorage.getCase(caseId);
      if (!caseDetails || !caseDetails.nextAction) return;

      const eventData = {
        title: `Deadline: ${caseDetails.nextAction || 'Review'} for case ${caseDetails.caseNumber}`,
        description: `Next action due for case: ${caseDetails.title}`,
        startTime: new Date(caseDetails.nextAction),
        endTime: new Date(new Date(caseDetails.nextAction).getTime() + 60 * 60 * 1000), // 1 hour duration
      };

      await this.createEventForCase(caseId, eventData);
    } catch (error) {
      console.error(`Error syncing case deadlines for case ${caseId}:`, error);
      throw error;
    }
  }

  async disconnectIntegration(integrationId: number): Promise<void> {
    try {
      await supabaseStorage.updateCalendarIntegration(integrationId, { is_active: false });
    } catch (error) {
      console.error(`Error disconnecting integration ${integrationId}:`, error);
      throw new Error('Failed to disconnect integration');
    }
  }

  async syncEventsFromCalendar(integrationId: number): Promise<CalendarEvent[]> {
    try {
      const integration = await supabaseStorage.getCalendarIntegration(integrationId);
      if (!integration || !integration.is_active) {
        throw new Error('Integration not found or is inactive');
      }

      let externalEvents = [];
      if (integration.provider === 'google') {
        externalEvents = await this.getGoogleEvents(integration);
      } else if (integration.provider === 'outlook') {
        externalEvents = await this.getOutlookEvents(integration);
      }

      const syncedEvents = [];
      for (const event of externalEvents) {
        // This is a simplified sync - a real implementation would need more complex logic
        // to handle updates, deletions, and prevent duplicates.
        const existingEvent = (await supabaseStorage.getUserCalendarEvents(integration.user_id))
          .find(e => e.external_event_id === event.id);

        if (!existingEvent) {
          const newEvent = await supabaseStorage.createCalendarEvent({
            user_id: integration.user_id,
            integration_id: integration.id,
            external_event_id: event.id,
            title: event.summary || event.subject,
            description: event.description,
            start_time: new Date(event.start.dateTime),
            end_time: new Date(event.end.dateTime),
            location: event.location?.displayName,
            is_synced: true,
            sync_status: 'synced'
          });
          syncedEvents.push(newEvent);
        }
      }

      return syncedEvents;
    } catch (error) {
      console.error(`Error syncing events from calendar for integration ${integrationId}:`, error);
      throw error;
    }
  }

  private async getGoogleEvents(integration: CalendarIntegration): Promise<any[]> {
    try {
      await this.refreshGoogleToken(integration);
      this.googleAuth.setCredentials({ access_token: integration.access_token, refresh_token: integration.refresh_token });
      const calendar = google.calendar({ version: 'v3', auth: this.googleAuth });

      const response = await calendar.events.list({
        calendarId: integration.calendar_id || 'primary',
        timeMin: (new Date()).toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching Google events:', error);
      return [];
    }
  }

  private async getOutlookEvents(integration: CalendarIntegration): Promise<any[]> {
    try {
      const graphClient = Client.init({ authProvider: (done) => done(null, integration.access_token) });
      const response = await graphClient.api('/me/calendarview')
        .query({
          startdatetime: (new Date()).toISOString(),
          enddatetime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Next 30 days
        })
        .select('subject,body,start,end,location')
        .orderby('start/dateTime')
        .get();
      
      return response.value || [];
    } catch (error) {
      console.error('Error fetching Outlook events:', error);
      return [];
    }
  }
  
  async bulkSyncAllCases(userId: string): Promise<{ synced: number, errors: string[] }> {
    const userCases = await supabaseStorage.getUserCases(userId);
    const results = { synced: 0, errors: [] as string[] };
    
    for (const caseItem of userCases) {
      try {
        if (caseItem.nextAction) {
          await this.syncCaseDeadlines(caseItem.id);
          results.synced++;
        }
      } catch (error) {
        results.errors.push(`Failed to sync case ${caseItem.caseNumber}: ${error}`);
      }
    }
    
    return results;
  }

  async syncCalendarUpdates(integrationId: number): Promise<{ updated: number, created: number }> {
    const integration = await supabaseStorage.getCalendarIntegration(integrationId);
    if (!integration) throw new Error("Integration not found");

    let externalEvents: any[] = [];
    if (integration.provider === 'google') {
        externalEvents = await this.getGoogleEvents(integration);
    } else if (integration.provider === 'outlook') {
        externalEvents = await this.getOutlookEvents(integration);
    }

    const dbEvents = await supabaseStorage.getUserCalendarEvents(integration.user_id);
    const externalEventMap = new Map(externalEvents.map(e => [e.id, e]));
    const dbEventMap = new Map(dbEvents.map(e => [e.external_event_id, e]));

    let createdCount = 0;
    let updatedCount = 0;

    // Create new events
    for (const [externalId, externalEvent] of Array.from(externalEventMap.entries())) {
        if (!dbEventMap.has(externalId)) {
            await supabaseStorage.createCalendarEvent({
                user_id: integration.user_id,
                integration_id: integration.id,
                external_event_id: externalId,
                title: externalEvent.summary || externalEvent.subject,
                description: externalEvent.description || externalEvent.body?.content,
                start_time: new Date(externalEvent.start.dateTime),
                end_time: new Date(externalEvent.end.dateTime),
                location: externalEvent.location?.displayName,
                is_synced: true,
                sync_status: 'synced',
            });
            createdCount++;
        }
    }

    // Update existing events
    for (const [externalId, dbEvent] of Array.from(dbEventMap.entries())) {
        if (externalEventMap.has(externalId) && dbEvent.id) {
            const externalEvent = externalEventMap.get(externalId)!;
            const dbTime = dbEvent.updated_at ? new Date(dbEvent.updated_at).getTime() : 0;
            // A real sync would use etags or updated timestamps from the provider
            // This is a simplified check
            if (new Date(externalEvent.updated).getTime() > dbTime) {
                 await supabaseStorage.updateCalendarEvent(dbEvent.id, {
                    title: externalEvent.summary || externalEvent.subject,
                    description: externalEvent.description || externalEvent.body?.content,
                    start_time: new Date(externalEvent.start.dateTime),
                    end_time: new Date(externalEvent.end.dateTime),
                    location: externalEvent.location?.displayName,
                });
                updatedCount++;
            }
        }
    }
    
    return { updated: updatedCount, created: createdCount };
  }

  async createCaseDeadlineEvents(caseId: number): Promise<CalendarEvent[]> {
    try {
        const caseDetails = await supabaseStorage.getCase(caseId);
        if (!caseDetails) throw new Error('Case not found');

        const timelineEvents = await supabaseStorage.getCaseTimeline(caseId);
        const deadlineEvents = timelineEvents.filter(e => e.event_type === 'deadline_set' && !e.is_completed);
        const createdEvents: CalendarEvent[] = [];

        for (const deadline of deadlineEvents) {
            const eventData: CalendarEventData = {
                title: deadline.title,
                description: deadline.description || `Deadline for case: ${caseDetails.caseNumber}`,
                startTime: deadline.event_date,
                endTime: new Date(new Date(deadline.event_date).getTime() + 60 * 60 * 1000), // 1 hour duration
            };
            const events = await this.createEventForCase(caseId, eventData);
            createdEvents.push(...events);
        }

        return createdEvents;
    } catch (error) {
      console.error(`Error creating case deadline events: ${error}`);
      throw new Error('Failed to create case deadline events');
    }
  }

  async getUserCalendarEvents(userId: string): Promise<CalendarEvent[]> {
    try {
      // First, sync events from all active integrations for the user
      const integrations = await this.getUserIntegrations(userId);
      for (const integration of integrations) {
        if (integration.is_active) {
          await this.syncEventsFromCalendar(integration.id);
        }
      }
      // Then, fetch all events for the user from the database
      return await supabaseStorage.getUserCalendarEvents(userId);
    } catch (error) {
      console.error(`Error getting user calendar events: ${error}`);
      throw new Error('Failed to retrieve user calendar events');
    }
  }

  async getCaseCalendarEvents(caseId: number): Promise<CalendarEvent[]> {
    try {
      return await supabaseStorage.getCaseCalendarEvents(caseId);
    } catch (error) {
      console.error(`Error getting case calendar events: ${error}`);
      throw new Error('Failed to retrieve case calendar events');
    }
  }
}

export const calendarService = new CalendarService();