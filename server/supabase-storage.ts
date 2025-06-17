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
      const { data, error } = await supabase
        .from('cases')
        .insert({
          ...caseData,
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
      const { data, error } = await supabase
        .from('contracts')
        .insert({
          ...contractData,
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
      const { data, error } = await supabase
        .from('timeline_events')
        .insert({
          ...eventData,
          event_date: eventData.eventDate?.toISOString() || new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating timeline event:', error);
        throw new Error(`Failed to create timeline event: ${error.message}`);
      }

      return data as TimelineEvent;
    } catch (error) {
      console.error('Error creating timeline event:', error);
      throw new Error(`Failed to create timeline event: ${error.message}`);
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
      const { data, error } = await supabase
        .from('documents')
        .insert({
          ...documentData,
          created_at: new Date().toISOString()
        })
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
        .eq('case_id', caseId)
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
        .eq('contract_id', contractId)
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
  async createApplication(application: any): Promise<Application> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .insert({
          ...application,
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