import { db } from "./db";
import { users, cases, contracts, timelineEvents, documents, applications } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { User, Case, Contract, Document, TimelineEvent, Application } from '@shared/schema';

// Direct database storage using the working PostgreSQL connection
export class DirectStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      return undefined;
    }
  }

  async upsertUser(userData: Partial<User>): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values({
          ...userData,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date()
          }
        })
        .returning();
      return user;
    } catch (error) {
      console.error('Error upserting user:', error);
      throw new Error(`Failed to upsert user: ${error.message}`);
    }
  }

  // Case operations
  async createCase(caseData: any): Promise<Case> {
    try {
      const [newCase] = await db
        .insert(cases)
        .values({
          ...caseData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return newCase;
    } catch (error) {
      console.error('Error creating case:', error);
      throw new Error(`Failed to create case: ${error.message}`);
    }
  }

  async getCase(id: number): Promise<Case | undefined> {
    try {
      const [caseData] = await db.select().from(cases).where(eq(cases.id, id));
      return caseData;
    } catch (error) {
      console.error('Error fetching case:', error);
      return undefined;
    }
  }

  async getUserCases(userId: string): Promise<Case[]> {
    try {
      const userCases = await db
        .select()
        .from(cases)
        .where(eq(cases.userId, userId))
        .orderBy(desc(cases.createdAt));
      return userCases;
    } catch (error) {
      console.error('Error fetching user cases:', error);
      return [];
    }
  }

  async updateCase(id: number, updates: Partial<Case>): Promise<Case> {
    try {
      const [updatedCase] = await db
        .update(cases)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(cases.id, id))
        .returning();
      return updatedCase;
    } catch (error) {
      console.error('Error updating case:', error);
      throw new Error(`Failed to update case: ${error.message}`);
    }
  }

  // Contract operations
  async createContract(contractData: any): Promise<Contract> {
    try {
      const [newContract] = await db
        .insert(contracts)
        .values({
          ...contractData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return newContract;
    } catch (error) {
      console.error('Error creating contract:', error);
      throw new Error(`Failed to create contract: ${error.message}`);
    }
  }

  async getContract(id: number): Promise<Contract | undefined> {
    try {
      const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
      return contract;
    } catch (error) {
      console.error('Error fetching contract:', error);
      return undefined;
    }
  }

  async getUserContracts(userId: string): Promise<Contract[]> {
    try {
      const userContracts = await db
        .select()
        .from(contracts)
        .where(eq(contracts.userId, userId))
        .orderBy(desc(contracts.createdAt));
      return userContracts;
    } catch (error) {
      console.error('Error fetching user contracts:', error);
      return [];
    }
  }

  async updateContract(id: number, updates: Partial<Contract>): Promise<Contract> {
    try {
      const [updatedContract] = await db
        .update(contracts)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(contracts.id, id))
        .returning();
      return updatedContract;
    } catch (error) {
      console.error('Error updating contract:', error);
      throw new Error(`Failed to update contract: ${error.message}`);
    }
  }

  // Timeline operations
  async createTimelineEvent(eventData: any): Promise<TimelineEvent> {
    try {
      const [event] = await db
        .insert(timelineEvents)
        .values({
          ...eventData,
          createdAt: new Date()
        })
        .returning();
      return event;
    } catch (error) {
      console.error('Error creating timeline event:', error);
      throw new Error(`Failed to create timeline event: ${error.message}`);
    }
  }

  async getCaseTimeline(caseId: number): Promise<TimelineEvent[]> {
    try {
      const timeline = await db
        .select()
        .from(timelineEvents)
        .where(eq(timelineEvents.caseId, caseId))
        .orderBy(desc(timelineEvents.createdAt));
      return timeline;
    } catch (error) {
      console.error('Error fetching case timeline:', error);
      return [];
    }
  }

  async getContractTimeline(contractId: number): Promise<TimelineEvent[]> {
    try {
      const timeline = await db
        .select()
        .from(timelineEvents)
        .where(eq(timelineEvents.contractId, contractId))
        .orderBy(desc(timelineEvents.createdAt));
      return timeline;
    } catch (error) {
      console.error('Error fetching contract timeline:', error);
      return [];
    }
  }

  // Document operations
  async createDocument(documentData: any): Promise<Document> {
    try {
      const [document] = await db
        .insert(documents)
        .values({
          ...documentData,
          createdAt: new Date()
        })
        .returning();
      return document;
    } catch (error) {
      console.error('Error creating document:', error);
      throw new Error(`Failed to create document: ${error.message}`);
    }
  }

  async getDocument(id: number): Promise<Document | undefined> {
    try {
      const [document] = await db.select().from(documents).where(eq(documents.id, id));
      return document;
    } catch (error) {
      console.error('Error fetching document:', error);
      return undefined;
    }
  }

  async getCaseDocuments(caseId: number): Promise<Document[]> {
    try {
      const docs = await db
        .select()
        .from(documents)
        .where(eq(documents.caseId, caseId))
        .orderBy(desc(documents.createdAt));
      return docs;
    } catch (error) {
      console.error('Error fetching case documents:', error);
      return [];
    }
  }

  async getContractDocuments(contractId: number): Promise<Document[]> {
    try {
      const docs = await db
        .select()
        .from(documents)
        .where(eq(documents.contractId, contractId))
        .orderBy(desc(documents.createdAt));
      return docs;
    } catch (error) {
      console.error('Error fetching contract documents:', error);
      return [];
    }
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    try {
      const docs = await db
        .select()
        .from(documents)
        .where(eq(documents.userId, userId))
        .orderBy(desc(documents.createdAt));
      return docs;
    } catch (error) {
      console.error('Error fetching user documents:', error);
      return [];
    }
  }

  async deleteDocument(id: number): Promise<void> {
    try {
      await db.delete(documents).where(eq(documents.id, id));
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  // Application operations
  async createApplication(application: any): Promise<Application> {
    try {
      const [app] = await db
        .insert(applications)
        .values({
          ...application,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return app;
    } catch (error) {
      console.error('Error creating application:', error);
      throw new Error(`Failed to create application: ${error.message}`);
    }
  }

  async getApplication(id: number): Promise<Application | undefined> {
    try {
      const [app] = await db.select().from(applications).where(eq(applications.id, id));
      return app;
    } catch (error) {
      console.error('Error fetching application:', error);
      return undefined;
    }
  }

  async getUserApplications(userId: string): Promise<Application[]> {
    try {
      const apps = await db
        .select()
        .from(applications)
        .where(eq(applications.userId, userId))
        .orderBy(desc(applications.createdAt));
      return apps;
    } catch (error) {
      console.error('Error fetching user applications:', error);
      return [];
    }
  }

  async getAllApplications(): Promise<Application[]> {
    try {
      const apps = await db
        .select()
        .from(applications)
        .orderBy(desc(applications.createdAt));
      return apps;
    } catch (error) {
      console.error('Error fetching all applications:', error);
      return [];
    }
  }

  async updateApplicationStatus(id: number, status: string): Promise<Application> {
    try {
      const [app] = await db
        .update(applications)
        .set({
          status,
          updatedAt: new Date()
        })
        .where(eq(applications.id, id))
        .returning();
      return app;
    } catch (error) {
      console.error('Error updating application status:', error);
      throw new Error(`Failed to update application status: ${error.message}`);
    }
  }

  async updateApplicationAnalysis(id: number, analysis: any): Promise<Application> {
    try {
      const [app] = await db
        .update(applications)
        .set({
          aiAnalysis: analysis,
          updatedAt: new Date()
        })
        .where(eq(applications.id, id))
        .returning();
      return app;
    } catch (error) {
      console.error('Error updating application analysis:', error);
      throw new Error(`Failed to update application analysis: ${error.message}`);
    }
  }

  // User subscription operations
  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User> {
    try {
      const updates: any = {
        stripeCustomerId,
        updatedAt: new Date()
      };

      if (stripeSubscriptionId) {
        updates.stripeSubscriptionId = stripeSubscriptionId;
      }

      const [user] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, userId))
        .returning();
      return user;
    } catch (error) {
      console.error('Error updating user stripe info:', error);
      throw new Error(`Failed to update user stripe info: ${error.message}`);
    }
  }

  async updateUserSubscription(userId: string, updates: Partial<User>): Promise<User> {
    try {
      const [user] = await db
        .update(users)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      return user;
    } catch (error) {
      console.error('Error updating user subscription:', error);
      throw new Error(`Failed to update user subscription: ${error.message}`);
    }
  }

  async updateUserProfile(userId: string, profileData: Partial<User>): Promise<User> {
    try {
      const [user] = await db
        .update(users)
        .set({
          ...profileData,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      return user;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error(`Failed to update user profile: ${error.message}`);
    }
  }
}

export const directStorage = new DirectStorage();