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

  // Bidirectional sync methods for full calendar integration
  async syncEventsFromCalendar(integrationId: number): Promise<CalendarEvent[]> {
    try {
      const integration = await supabaseStorage.getCalendarIntegration(integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      let externalEvents: any[] = [];

      if (integration.provider === 'google') {
        externalEvents = await this.getGoogleEvents(integration);
      } else if (integration.provider === 'microsoft') {
        externalEvents = await this.getOutlookEvents(integration);
      }

      // Sync external events to our database
      const syncedEvents: CalendarEvent[] = [];
      for (const event of externalEvents) {
        const existingEvent = await supabaseStorage.getCalendarEventByExternalId(event.id);
        
        if (!existingEvent) {
          const calendarEvent = await supabaseStorage.createCalendarEvent({
            user_id: integration.user_id,
            integration_id: integrationId,
            external_event_id: event.id,
            title: event.summary || event.subject || 'Untitled Event',
            description: event.description || event.bodyPreview,
            start_time: new Date(event.start?.dateTime || event.start?.date),
            end_time: new Date(event.end?.dateTime || event.end?.date),
            location: event.location?.displayName || event.location,
            is_synced: true,
            sync_status: 'synced'
          });
          syncedEvents.push(calendarEvent);
        }
      }

      return syncedEvents;
    } catch (error) {
      console.error('Error syncing events from calendar:', error);
      throw error;
    }
  }

  private async getGoogleEvents(integration: CalendarIntegration): Promise<any[]> {
    await this.refreshGoogleToken(integration);
    
    this.googleAuth.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token
    });

    const calendar = google.calendar({ version: 'v3', auth: this.googleAuth });
    
    const response = await calendar.events.list({
      calendarId: integration.calendar_id || 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  }

  private async getOutlookEvents(integration: CalendarIntegration): Promise<any[]> {
    const graphClient = Client.init({
      authProvider: {
        getAccessToken: async () => integration.access_token
      }
    });

    const events = await graphClient
      .api('/me/events')
      .select('id,subject,bodyPreview,start,end,location')
      .filter(`start/dateTime ge '${new Date().toISOString()}'`)
      .top(50)
      .get();

    return events.value || [];
  }

  async bulkSyncAllCases(userId: string): Promise<{ synced: number; errors: string[] }> {
    try {
      const cases = await supabaseStorage.getCasesByUserId(userId);
      const integrations = await this.getUserIntegrations(userId);

      if (integrations.length === 0) {
        throw new Error('No calendar integrations found');
      }

      let synced = 0;
      const errors: string[] = [];

      for (const caseData of cases) {
        try {
          await this.syncCaseDeadlines(caseData.id);
          synced++;
        } catch (error) {
          errors.push(`Failed to sync case ${caseData.title}: ${error}`);
        }
      }

      return { synced, errors };
    } catch (error) {
      console.error('Error in bulk sync:', error);
      throw error;
    }
  }

  async syncCalendarUpdates(integrationId: number): Promise<{ updated: number; created: number }> {
    try {
      const integration = await supabaseStorage.getCalendarIntegration(integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      let externalEvents: any[] = [];
      if (integration.provider === 'google') {
        externalEvents = await this.getGoogleEvents(integration);
      } else if (integration.provider === 'microsoft') {
        externalEvents = await this.getOutlookEvents(integration);
      }

      let updated = 0;
      let created = 0;

      for (const event of externalEvents) {
        const existingEvent = await supabaseStorage.getCalendarEventByExternalId(event.id);
        
        if (existingEvent) {
          // Update existing event if modified
          const eventData = {
            title: event.summary || event.subject || 'Untitled Event',
            description: event.description || event.bodyPreview,
            start_time: new Date(event.start?.dateTime || event.start?.date),
            end_time: new Date(event.end?.dateTime || event.end?.date),
            location: event.location?.displayName || event.location,
            sync_status: 'synced'
          };
          
          await supabaseStorage.updateCalendarEvent(existingEvent.id, eventData);
          updated++;
        } else {
          // Create new event
          await supabaseStorage.createCalendarEvent({
            user_id: integration.user_id,
            integration_id: integrationId,
            external_event_id: event.id,
            title: event.summary || event.subject || 'Untitled Event',
            description: event.description || event.bodyPreview,
            start_time: new Date(event.start?.dateTime || event.start?.date),
            end_time: new Date(event.end?.dateTime || event.end?.date),
            location: event.location?.displayName || event.location,
            is_synced: true,
            sync_status: 'synced'
          });
          created++;
        }
      }

      return { updated, created };
    } catch (error) {
      console.error('Error syncing calendar updates:', error);
      throw error;
    }
  }

  async createCaseDeadlineEvents(caseId: number): Promise<CalendarEvent[]> {
    try {
      const caseData = await supabaseStorage.getCase(caseId);
      if (!caseData) {
        throw new Error('Case not found');
      }

      const integrations = await this.getUserIntegrations(caseData.userId);
      const events: CalendarEvent[] = [];

      // Enhanced deadline events with comprehensive timeline
      const deadlineEvents = [];
      
      if (caseData.deadline_date) {
        // Main payment deadline
        deadlineEvents.push({
          title: `⚖️ Payment Due: ${caseData.title}`,
          description: `Payment deadline for case: ${caseData.description}\nAmount: ${caseData.amount || 'TBD'}\nStatus: ${caseData.status}\n\nAction Required: Contact client for payment`,
          startTime: new Date(caseData.deadline_date),
          endTime: new Date(new Date(caseData.deadline_date).getTime() + 60 * 60 * 1000),
          reminderMinutes: 24 * 60, // 24 hours
        });
        
        // 7-day warning
        const warningDate = new Date(new Date(caseData.deadline_date).getTime() - 7 * 24 * 60 * 60 * 1000);
        if (warningDate > new Date()) {
          deadlineEvents.push({
            title: `⚠️ Payment Warning: ${caseData.title}`,
            description: `7-day payment deadline warning\nDeadline: ${new Date(caseData.deadline_date).toLocaleDateString()}\nPrepare follow-up communication`,
            startTime: warningDate,
            endTime: new Date(warningDate.getTime() + 30 * 60 * 1000),
            reminderMinutes: 60,
          });
        }

        // 24-hour final notice
        const finalNoticeDate = new Date(new Date(caseData.deadline_date).getTime() - 24 * 60 * 60 * 1000);
        if (finalNoticeDate > new Date()) {
          deadlineEvents.push({
            title: `🚨 Final Notice: ${caseData.title}`,
            description: `24-hour final payment notice\nSend formal demand letter if payment not received`,
            startTime: finalNoticeDate,
            endTime: new Date(finalNoticeDate.getTime() + 30 * 60 * 1000),
            reminderMinutes: 30,
          });
        }
      }

      // Case review milestones
      if (caseData.created_at) {
        const reviewDate = new Date(new Date(caseData.created_at).getTime() + 14 * 24 * 60 * 60 * 1000);
        if (reviewDate > new Date()) {
          deadlineEvents.push({
            title: `🔍 Case Review: ${caseData.title}`,
            description: `14-day case review checkpoint\nReview progress, update client, plan next steps`,
            startTime: reviewDate,
            endTime: new Date(reviewDate.getTime() + 60 * 60 * 1000),
            reminderMinutes: 120,
          });
        }

        // 30-day escalation review
        const escalationDate = new Date(new Date(caseData.created_at).getTime() + 30 * 24 * 60 * 60 * 1000);
        if (escalationDate > new Date()) {
          deadlineEvents.push({
            title: `📈 Escalation Review: ${caseData.title}`,
            description: `30-day escalation review\nConsider adjudication or alternative dispute resolution`,
            startTime: escalationDate,
            endTime: new Date(escalationDate.getTime() + 60 * 60 * 1000),
            reminderMinutes: 180,
          });
        }
      }

      // Create events in all active integrations
      for (const integration of integrations.filter(i => i.is_active)) {
        for (const eventData of deadlineEvents) {
          try {
            let event: CalendarEvent;
            
            if (integration.provider === 'google') {
              event = await this.createGoogleEvent(integration.id, eventData);
            } else if (integration.provider === 'microsoft') {
              event = await this.createOutlookEvent(integration.id, eventData);
            } else {
              continue;
            }

            // Link event to case
            await supabaseStorage.updateCalendarEvent(event.id, { 
              case_id: caseId,
              sync_status: 'synced'
            });
            
            events.push(event);
          } catch (error) {
            console.error(`Failed to create event in ${integration.provider}:`, error);
          }
        }
      }

      return events;
    } catch (error) {
      console.error('Error creating case deadline events:', error);
      throw error;
    }
  }
}

export const calendarService = new CalendarService();