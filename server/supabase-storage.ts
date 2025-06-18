import { supabase } from "./db";
import type { User, Case, Contract, Document, TimelineEvent, Application } from '@shared/schema';

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
      // Map camelCase to snake_case for database
      const dbData = {
        case_id: eventData.case_id,
        contract_id: eventData.contract_id,
        user_id: eventData.user_id,
        event_type: eventData.event_type,
        title: eventData.title,
        description: eventData.description,
        event_date: eventData.eventDate?.toISOString() || new Date().toISOString(),
        is_completed: eventData.is_completed || false,
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
        .eq('case_id', caseId)
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
        .eq('contract_id', contractId)
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
        userid: documentData.userid || documentData.userId || documentData.user_id,
        filename: documentData.filename,
        originalName: documentData.originalName || documentData.original_name,
        fileType: documentData.fileType || documentData.file_type,
        mimeType: documentData.mimeType || documentData.mime_type,
        fileSize: documentData.fileSize || documentData.file_size,
        uploadPath: documentData.uploadPath || documentData.upload_path || documentData.filePath,
        thumbnailPath: documentData.thumbnailPath,
        tags: documentData.tags,
        description: documentData.description,
        category: documentData.category || 'general',
        version: documentData.version || 1,
        parentDocument: documentData.parentDocument,
        isLatestVersion: documentData.isLatestVersion !== undefined ? documentData.isLatestVersion : true,
        createdAt: new Date().toISOString()
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
        .order('createdAt', { ascending: false });

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
        .order('createdAt', { ascending: false });

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
        .eq('userid', userId)
        .order('createdAt', { ascending: false });

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
  async createApplication(application: any): Promise<Application> {
    try {
      // Map camelCase to snake_case for database
      const dbData = {
        user_id: application.userId,
        full_name: application.fullName,
        phone: application.phone,
        email: application.email,
        trade: application.trade,
        state: application.state,
        issue_type: application.issueType,
        amount: application.amount,
        start_date: application.startDate,
        description: application.description,
        status: application.status || "pending",
        ai_analysis: application.aiAnalysis,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('applications')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        console.error('Error creating application:', error);
        throw new Error(`Failed to create application: ${error.message}`);
      }

      return data as Application;
    } catch (error) {
      console.error('Error creating application:', error);
      throw new Error(`Failed to create application: ${error.message}`);
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
      throw new Error(`Failed to update user profile: ${error.message}`);
    }
  }
}

export const supabaseStorage = new SupabaseStorage();