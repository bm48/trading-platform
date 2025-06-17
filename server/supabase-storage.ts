import { createClient } from '@supabase/supabase-js';
import type { User, Case, Contract, Document, TimelineEvent, Application } from '@shared/schema';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Storage interface using Supabase directly
export class SupabaseStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return undefined;
    }

    return data as User;
  }

  async upsertUser(userData: Partial<User>): Promise<User> {
    const { data, error } = await supabaseAdmin
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
  }

  // Case operations
  async createCase(caseData: any): Promise<Case> {
    const { data, error } = await supabaseAdmin
      .from('cases')
      .insert({
        ...caseData,
        user_id: caseData.userId,
        case_number: caseData.caseNumber,
        issue_type: caseData.issueType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating case:', error);
      throw new Error(`Failed to create case: ${error.message}`);
    }

    return data as Case;
  }

  async getCase(id: number): Promise<Case | undefined> {
    const { data, error } = await supabaseAdmin
      .from('cases')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching case:', error);
      return undefined;
    }

    return data as Case;
  }

  async getUserCases(userId: string): Promise<Case[]> {
    const { data, error } = await supabaseAdmin
      .from('cases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user cases:', error);
      return [];
    }

    return (data as Case[]) || [];
  }

  async updateCase(id: number, updates: Partial<Case>): Promise<Case> {
    const { data, error } = await supabaseAdmin
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
  }

  // Contract operations
  async createContract(contractData: any): Promise<Contract> {
    const { data, error } = await supabaseAdmin
      .from('contracts')
      .insert({
        ...contractData,
        user_id: contractData.userId,
        contract_number: contractData.contractNumber,
        client_name: contractData.clientName,
        project_description: contractData.projectDescription,
        project_type: contractData.projectType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating contract:', error);
      throw new Error(`Failed to create contract: ${error.message}`);
    }

    return data as Contract;
  }

  async getContract(id: number): Promise<Contract | undefined> {
    const { data, error } = await supabaseAdmin
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching contract:', error);
      return undefined;
    }

    return data as Contract;
  }

  async getUserContracts(userId: string): Promise<Contract[]> {
    const { data, error } = await supabaseAdmin
      .from('contracts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user contracts:', error);
      return [];
    }

    return (data as Contract[]) || [];
  }

  async updateContract(id: number, updates: Partial<Contract>): Promise<Contract> {
    const { data, error } = await supabaseAdmin
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
  }

  // Timeline operations
  async createTimelineEvent(eventData: any): Promise<TimelineEvent> {
    const { data, error } = await supabaseAdmin
      .from('timeline_events')
      .insert({
        ...eventData,
        case_id: eventData.caseId,
        contract_id: eventData.contractId,
        user_id: eventData.userId,
        event_type: eventData.eventType,
        event_date: eventData.eventDate || new Date().toISOString(),
        is_completed: eventData.isCompleted || false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating timeline event:', error);
      throw new Error(`Failed to create timeline event: ${error.message}`);
    }

    return data as TimelineEvent;
  }

  async getCaseTimeline(caseId: number): Promise<TimelineEvent[]> {
    const { data, error } = await supabaseAdmin
      .from('timeline_events')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching case timeline:', error);
      return [];
    }

    return (data as TimelineEvent[]) || [];
  }

  async getContractTimeline(contractId: number): Promise<TimelineEvent[]> {
    const { data, error } = await supabaseAdmin
      .from('timeline_events')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contract timeline:', error);
      return [];
    }

    return (data as TimelineEvent[]) || [];
  }

  // Subscription operations
  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User> {
    const updates: any = {
      stripe_customer_id: stripeCustomerId,
      updated_at: new Date().toISOString()
    };

    if (stripeSubscriptionId) {
      updates.stripe_subscription_id = stripeSubscriptionId;
    }

    const { data, error } = await supabaseAdmin
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
  }

  async updateUserSubscription(userId: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabaseAdmin
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
  }

  async updateUserProfile(userId: string, profileData: Partial<User>): Promise<User> {
    const { data, error } = await supabaseAdmin
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
  }

  // Document operations
  async createDocument(documentData: any): Promise<Document> {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .insert({
        ...documentData,
        case_id: documentData.caseId,
        contract_id: documentData.contractId,
        user_id: documentData.userId,
        original_name: documentData.originalName,
        file_type: documentData.fileType,
        mime_type: documentData.mimeType,
        file_size: documentData.fileSize,
        upload_path: documentData.uploadPath,
        thumbnail_path: documentData.thumbnailPath,
        is_latest_version: documentData.isLatestVersion !== false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating document:', error);
      throw new Error(`Failed to create document: ${error.message}`);
    }

    return data as Document;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching document:', error);
      return undefined;
    }

    return data as Document;
  }

  async getCaseDocuments(caseId: number): Promise<Document[]> {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching case documents:', error);
      return [];
    }

    return (data as Document[]) || [];
  }

  async getContractDocuments(contractId: number): Promise<Document[]> {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contract documents:', error);
      return [];
    }

    return (data as Document[]) || [];
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user documents:', error);
      return [];
    }

    return (data as Document[]) || [];
  }

  async deleteDocument(id: number): Promise<void> {
    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting document:', error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  // Application operations
  async createApplication(application: any): Promise<Application> {
    const { data, error } = await supabaseAdmin
      .from('applications')
      .insert({
        ...application,
        full_name: application.fullName,
        client_email: application.clientEmail,
        client_phone: application.clientPhone,
        issue_type: application.issueType,
        amount_disputed: application.amountDisputed,
        start_date: application.startDate,
        ai_analysis: application.aiAnalysis,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating application:', error);
      throw new Error(`Failed to create application: ${error.message}`);
    }

    return data as Application;
  }

  async getApplication(id: number): Promise<Application | undefined> {
    const { data, error } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching application:', error);
      return undefined;
    }

    return data as Application;
  }

  async getUserApplications(userId: string): Promise<Application[]> {
    const { data, error } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user applications:', error);
      return [];
    }

    return (data as Application[]) || [];
  }

  async getAllApplications(): Promise<Application[]> {
    const { data, error } = await supabaseAdmin
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all applications:', error);
      return [];
    }

    return (data as Application[]) || [];
  }

  async updateApplicationStatus(id: number, status: string): Promise<Application> {
    const { data, error } = await supabaseAdmin
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
  }

  async updateApplicationAnalysis(id: number, analysis: any): Promise<Application> {
    const { data, error } = await supabaseAdmin
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
  }
}

export const supabaseStorage = new SupabaseStorage();