import { supabase } from "./db";
import type { User, Case, Contract, Document, TimelineEvent, Application, CalendarIntegration, CalendarEvent } from '@shared/schema';

// Supabase-based storage implementation
export class SupabaseStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching user:', error);
        return undefined;
      }
      
      return data as User;
    } catch (error) {
      console.error('Error fetching user:', error);
      return undefined;
    }
  }

  async upsertUser(userData: Partial<User>): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .upsert({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error upserting user:', error);
        throw new Error(`Failed to upsert user: ${error.message}`);
      }

      return data as User;
    } catch (error) {
      console.error('Error upserting user:', error);
      throw new Error(`Failed to upsert user: ${error.message}`);
    }
  }

  // Case operations
  async createCase(caseData: any): Promise<Case> {
    try {
      // Map camelCase to snake_case for database
      const dbData = {
        user_id: caseData.user_id,
        application_id: caseData.applicationId,
        title: caseData.title,
        case_number: caseData.case_number,
        status: caseData.status || "active",
        issue_type: caseData.issueType || caseData.category, // Handle both field names
        amount: caseData.amount,
        description: caseData.description,
        priority: caseData.priority || "medium",
        ai_analysis: caseData.aiAnalysis,
        strategy_pack: caseData.strategyPack,
        next_action: caseData.nextAction,
        next_action_due: caseData.nextActionDue,
        progress: caseData.progress || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('cases')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        console.error('Error creating case:', error);
        throw new Error(`Failed to create case: ${error.message}`);
      }

      return data as Case;
    } catch (error) {
      console.error('Error creating case:', error);
      throw new Error(`Failed to create case: ${error.message}`);
    }
  }

  async getCase(id: number): Promise<Case | undefined> {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching case:', error);
        return undefined;
      }
      
      return data as Case;
    } catch (error) {
      console.error('Error fetching case:', error);
      return undefined;
    }
  }

  async getUserCases(userId: string): Promise<Case[]> {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user cases:', error);
        return [];
      }

      return data as Case[];
    } catch (error) {
      console.error('Error fetching user cases:', error);
      return [];
    }
  }

  async updateCase(id: number, updates: Partial<Case>): Promise<Case> {
    try {
      const { data, error } = await supabase
        .from('cases')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating case:', error);
        throw new Error(`Failed to update case: ${error.message}`);
      }

      return data as Case;
    } catch (error) {
      console.error('Error updating case:', error);
      throw new Error(`Failed to update case: ${error.message}`);
    }
  }

  // Contract operations
  async createContract(contractData: any): Promise<Contract> {
    try {
      // Map to exact database column names from screenshots
      const dbData = {
        user_id: contractData.user_id,
        title: contractData.title,
        contract_num: contractData.contract_num, // Database uses contract_num
        status: contractData.status || "draft",
        client_name: contractData.client_name,
        project_description: contractData.project_descri, // Database uses project_descr
        value: contractData.value,
        start_date: contractData.start_date,
        end_date: contractData.end_date,
        terms: contractData.terms,
        version: contractData.version || 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('contracts')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        console.error('Error creating contract:', error);
        throw new Error(`Failed to create contract: ${error.message}`);
      }

      return data as Contract;
    } catch (error) {
      console.error('Error creating contract:', error);
      throw new Error(`Failed to create contract: ${error.message}`);
    }
  }

  async getContract(id: number): Promise<Contract | undefined> {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching contract:', error);
        return undefined;
      }
      
      return data as Contract;
    } catch (error) {
      console.error('Error fetching contract:', error);
      return undefined;
    }
  }

  async getUserContracts(userId: string): Promise<Contract[]> {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user contracts:', error);
        return [];
      }

      return data as Contract[];
    } catch (error) {
      console.error('Error fetching user contracts:', error);
      return [];
    }
  }

  async updateContract(id: number, updates: Partial<Contract>): Promise<Contract> {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating contract:', error);
        throw new Error(`Failed to update contract: ${error.message}`);
      }

      return data as Contract;
    } catch (error) {
      console.error('Error updating contract:', error);
      throw new Error(`Failed to update contract: ${error.message}`);
    }
  }

  // Timeline operations
  async createTimelineEvent(eventData: any): Promise<TimelineEvent> {
    try {
      // Map frontend field names to actual database column names from Supabase
      const dbData = {
        caseid: eventData.caseid || eventData.caseId || eventData.case_id,
        contractid: eventData.contractid || eventData.contractId || eventData.contract_id,
        user_id: eventData.userid || eventData.userId || eventData.user_id,
        event_type: eventData.eventType || eventData.event_type || 'general',
        title: eventData.title,
        description: eventData.description,
        event_date: eventData.eventDate?.toISOString() || new Date().toISOString(),
        is_completed: eventData.isCompleted || eventData.is_completed || false,
        created_at: new Date().toISOString()
      };

      // Remove undefined/null fields to avoid issues
      Object.keys(dbData).forEach(key => {
        if ((dbData as any)[key] === undefined || (dbData as any)[key] === null) {
          delete (dbData as any)[key];
        }
      });

      const { data, error } = await supabase
        .from('timeline_events')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        console.error('Error creating timeline event:', error);
        throw new Error(`Failed to create timeline event: ${error.message || 'Unknown error'}`);
      }

      return data as TimelineEvent;
    } catch (error) {
      console.error('Error creating timeline event:', error);
      throw new Error(`Failed to create timeline event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCaseTimeline(caseId: number): Promise<TimelineEvent[]> {
    try {
      const { data, error } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('caseid', caseId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching case timeline:', error);
        return [];
      }

      return data as TimelineEvent[];
    } catch (error) {
      console.error('Error fetching case timeline:', error);
      return [];
    }
  }

  async getContractTimeline(contractId: number): Promise<TimelineEvent[]> {
    try {
      const { data, error } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('contractid', contractId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contract timeline:', error);
        return [];
      }

      return data as TimelineEvent[];
    } catch (error) {
      console.error('Error fetching contract timeline:', error);
      return [];
    }
  }

  // Document operations
  async createDocument(documentData: any): Promise<Document> {
    try {
      // Map frontend field names to exact database column names from Supabase
      const dbData = {
        caseid: documentData.caseid || documentData.caseId || documentData.case_id,
        contractid: documentData.contractid || documentData.contractId || documentData.contract_id,
        user_id: documentData.userid || documentData.userId || documentData.user_id,
        filename: documentData.filename,
        original_name: documentData.originalName || documentData.original_name,
        file_type: documentData.fileType || documentData.file_type,
        mime_type: documentData.mimeType || documentData.mime_type,
        file_size: documentData.fileSize || documentData.file_size,
        upload_path: documentData.uploadPath || documentData.upload_path || documentData.filePath,
        thumbnail_path: documentData.thumbnailPath,
        tags: documentData.tags,
        description: documentData.description,
        category: documentData.category || 'general',
        version: documentData.version || 1,
        parent_document: documentData.parentDocument,
        is_latest_version: documentData.isLatestVersion !== undefined ? documentData.isLatestVersion : true,
        created_at: new Date().toISOString()
      };

      // Remove undefined/null fields
      Object.keys(dbData).forEach(key => {
        if ((dbData as any)[key] === undefined || (dbData as any)[key] === null) {
          delete (dbData as any)[key];
        }
      });

      const { data, error } = await supabase
        .from('documents')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        console.error('Error creating document:', error);
        throw new Error(`Failed to create document: ${error.message}`);
      }

      return data as Document;
    } catch (error) {
      console.error('Error creating document:', error);
      throw new Error(`Failed to create document: ${error.message}`);
    }
  }

  async getDocument(id: number): Promise<Document | undefined> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching document:', error);
        return undefined;
      }
      
      return data as Document;
    } catch (error) {
      console.error('Error fetching document:', error);
      return undefined;
    }
  }

  async getCaseDocuments(caseId: number): Promise<Document[]> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('caseid', caseId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching case documents:', error);
        return [];
      }

      return data as Document[];
    } catch (error) {
      console.error('Error fetching case documents:', error);
      return [];
    }
  }

  async getContractDocuments(contractId: number): Promise<Document[]> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('contractid', contractId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contract documents:', error);
        return [];
      }

      return data as Document[];
    } catch (error) {
      console.error('Error fetching contract documents:', error);
      return [];
    }
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user documents:', error);
        return [];
      }

      return data as Document[];
    } catch (error) {
      console.error('Error fetching user documents:', error);
      return [];
    }
  }

  async deleteDocument(id: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting document:', error);
        throw new Error(`Failed to delete document: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  // Application operations
  // Application operations - fully integrated with Supabase
  async createApplication(applicationData: any): Promise<Application> {
    try {
      console.log('Creating application with Supabase:', applicationData);
      
      const { data, error } = await supabase
        .from('applications')
        .insert(applicationData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating application:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('Application created successfully in Supabase:', data);
      return data as Application;
    } catch (error) {
      console.error('Error creating application:', error);
      throw error;
    }
  }

  async getApplication(id: number): Promise<Application | undefined> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching application:', error);
        return undefined;
      }
      
      return data as Application;
    } catch (error) {
      console.error('Error fetching application:', error);
      return undefined;
    }
  }

  async getUserApplications(userId: string): Promise<Application[]> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching user applications:', error);
        return [];
      }
      
      return data as Application[];
    } catch (error) {
      console.error('Error fetching user applications:', error);
      return [];
    }
  }

  async getApplication(id: number): Promise<Application | undefined> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching application:', error);
        return undefined;
      }
      
      return data as Application;
    } catch (error) {
      console.error('Error fetching application:', error);
      return undefined;
    }
  }

  async getUserApplications(userId: string): Promise<Application[]> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user applications:', error);
        return [];
      }

      return data as Application[];
    } catch (error) {
      console.error('Error fetching user applications:', error);
      return [];
    }
  }

  async getAllApplications(): Promise<Application[]> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all applications:', error);
        return [];
      }

      return data as Application[];
    } catch (error) {
      console.error('Error fetching all applications:', error);
      return [];
    }
  }

  async updateApplicationStatus(id: number, status: string): Promise<Application> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating application status:', error);
        throw new Error(`Failed to update application status: ${error.message}`);
      }

      return data as Application;
    } catch (error) {
      console.error('Error updating application status:', error);
      throw new Error(`Failed to update application status: ${error.message}`);
    }
  }

  async updateApplicationAnalysis(id: number, analysis: any): Promise<Application> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .update({
          ai_analysis: analysis,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating application analysis:', error);
        throw new Error(`Failed to update application analysis: ${error.message}`);
      }

      return data as Application;
    } catch (error) {
      console.error('Error updating application analysis:', error);
      throw new Error(`Failed to update application analysis: ${error.message}`);
    }
  }

  // User subscription operations
  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User> {
    try {
      const updates: any = {
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString()
      };

      if (stripeSubscriptionId) {
        updates.stripe_subscription_id = stripeSubscriptionId;
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user stripe info:', error);
        throw new Error(`Failed to update user stripe info: ${error.message}`);
      }

      return data as User;
    } catch (error) {
      console.error('Error updating user stripe info:', error);
      throw new Error(`Failed to update user stripe info: ${error.message}`);
    }
  }

  async updateUserSubscription(userId: string, updates: Partial<User>): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user subscription:', error);
        throw new Error(`Failed to update user subscription: ${error.message}`);
      }

      return data as User;
    } catch (error) {
      console.error('Error updating user subscription:', error);
      throw new Error(`Failed to update user subscription: ${error.message}`);
    }
  }

  async updateUserProfile(userId: string, profileData: Partial<User>): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user profile:', error);
        throw new Error(`Failed to update user profile: ${error.message}`);
      }

      return data as User;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error(`Failed to update user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Calendar Integration operations
  async createCalendarIntegration(integrationData: any): Promise<CalendarIntegration> {
    try {
      const { data, error } = await supabase
        .from('calendar_integrations')
        .insert(integrationData)
        .select()
        .single();

      if (error) {
        console.error('Error creating calendar integration:', error);
        throw new Error(`Failed to create calendar integration: ${error.message}`);
      }

      return data as CalendarIntegration;
    } catch (error) {
      console.error('Error creating calendar integration:', error);
      throw new Error(`Failed to create calendar integration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCalendarIntegration(id: number): Promise<CalendarIntegration | undefined> {
    try {
      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching calendar integration:', error);
        return undefined;
      }

      return data as CalendarIntegration;
    } catch (error) {
      console.error('Error fetching calendar integration:', error);
      return undefined;
    }
  }

  async getUserCalendarIntegrations(userId: string): Promise<CalendarIntegration[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user calendar integrations:', error);
        return [];
      }

      return data as CalendarIntegration[];
    } catch (error) {
      console.error('Error fetching user calendar integrations:', error);
      return [];
    }
  }

  async updateCalendarIntegration(id: number, updates: Partial<CalendarIntegration>): Promise<CalendarIntegration> {
    try {
      const { data, error } = await supabase
        .from('calendar_integrations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating calendar integration:', error);
        throw new Error(`Failed to update calendar integration: ${error.message}`);
      }

      return data as CalendarIntegration;
    } catch (error) {
      console.error('Error updating calendar integration:', error);
      throw new Error(`Failed to update calendar integration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Calendar Event operations
  async createCalendarEvent(eventData: any): Promise<CalendarEvent> {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert(eventData)
        .select()
        .single();

      if (error) {
        console.error('Error creating calendar event:', error);
        throw new Error(`Failed to create calendar event: ${error.message}`);
      }

      return data as CalendarEvent;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error(`Failed to create calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserCalendarEvents(userId: string): Promise<CalendarEvent[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching user calendar events:', error);
        return [];
      }

      return data as CalendarEvent[];
    } catch (error) {
      console.error('Error fetching user calendar events:', error);
      return [];
    }
  }

  async getCaseCalendarEvents(caseId: number): Promise<CalendarEvent[]> {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('case_id', caseId)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching case calendar events:', error);
        return [];
      }

      return data as CalendarEvent[];
    } catch (error) {
      console.error('Error fetching case calendar events:', error);
      return [];
    }
  }

  async updateCalendarEvent(id: number, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating calendar event:', error);
        throw new Error(`Failed to update calendar event: ${error.message}`);
      }

      return data as CalendarEvent;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw new Error(`Failed to update calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const supabaseStorage = new SupabaseStorage();