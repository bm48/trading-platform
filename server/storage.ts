import {
  users,
  applications,
  cases,
  documents,
  timelineEvents,
  contracts,
  type User,
  type UpsertUser,
  type InsertApplication,
  type Application,
  type InsertCase,
  type Case,
  type InsertDocument,
  type Document,
  type InsertTimelineEvent,
  type TimelineEvent,
  type InsertContract,
  type Contract,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User>;

  // Application operations
  createApplication(application: InsertApplication): Promise<Application>;
  getApplication(id: number): Promise<Application | undefined>;
  getUserApplications(userId: string): Promise<Application[]>;
  updateApplicationStatus(id: number, status: string): Promise<Application>;

  // Case operations
  createCase(caseData: InsertCase): Promise<Case>;
  getCase(id: number): Promise<Case | undefined>;
  getUserCases(userId: string): Promise<Case[]>;
  updateCase(id: number, updates: Partial<Case>): Promise<Case>;

  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  getCaseDocuments(caseId: number): Promise<Document[]>;
  getContractDocuments(contractId: number): Promise<Document[]>;
  getUserDocuments(userId: string): Promise<Document[]>;

  // Timeline operations
  createTimelineEvent(event: InsertTimelineEvent): Promise<TimelineEvent>;
  getCaseTimeline(caseId: number): Promise<TimelineEvent[]>;
  getContractTimeline(contractId: number): Promise<TimelineEvent[]>;

  // Contract operations
  createContract(contract: InsertContract): Promise<Contract>;
  getContract(id: number): Promise<Contract | undefined>;
  getUserContracts(userId: string): Promise<Contract[]>;
  updateContract(id: number, updates: Partial<Contract>): Promise<Contract>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId,
        stripeSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Application operations
  async createApplication(application: InsertApplication): Promise<Application> {
    const [app] = await db.insert(applications).values(application).returning();
    return app;
  }

  async getApplication(id: number): Promise<Application | undefined> {
    const [app] = await db.select().from(applications).where(eq(applications.id, id));
    return app;
  }

  async getUserApplications(userId: string): Promise<Application[]> {
    return await db
      .select()
      .from(applications)
      .where(eq(applications.userId, userId))
      .orderBy(desc(applications.createdAt));
  }

  async updateApplicationStatus(id: number, status: string): Promise<Application> {
    const [app] = await db
      .update(applications)
      .set({ status, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    return app;
  }

  // Case operations
  async createCase(caseData: InsertCase): Promise<Case> {
    const [caseRecord] = await db.insert(cases).values(caseData).returning();
    return caseRecord;
  }

  async getCase(id: number): Promise<Case | undefined> {
    const [caseRecord] = await db.select().from(cases).where(eq(cases.id, id));
    return caseRecord;
  }

  async getUserCases(userId: string): Promise<Case[]> {
    return await db
      .select()
      .from(cases)
      .where(eq(cases.userId, userId))
      .orderBy(desc(cases.createdAt));
  }

  async updateCase(id: number, updates: Partial<Case>): Promise<Case> {
    const [caseRecord] = await db
      .update(cases)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cases.id, id))
      .returning();
    return caseRecord;
  }

  // Document operations
  async createDocument(document: InsertDocument): Promise<Document> {
    const [doc] = await db.insert(documents).values(document).returning();
    return doc;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async getCaseDocuments(caseId: number): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.caseId, caseId))
      .orderBy(desc(documents.createdAt));
  }

  async getContractDocuments(contractId: number): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.contractId, contractId))
      .orderBy(desc(documents.createdAt));
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt));
  }

  // Timeline operations
  async createTimelineEvent(event: InsertTimelineEvent): Promise<TimelineEvent> {
    const [timelineEvent] = await db.insert(timelineEvents).values(event).returning();
    return timelineEvent;
  }

  async getCaseTimeline(caseId: number): Promise<TimelineEvent[]> {
    return await db
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.caseId, caseId))
      .orderBy(desc(timelineEvents.eventDate));
  }

  async getContractTimeline(contractId: number): Promise<TimelineEvent[]> {
    return await db
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.contractId, contractId))
      .orderBy(desc(timelineEvents.eventDate));
  }

  // Contract operations
  async createContract(contract: InsertContract): Promise<Contract> {
    const [contractRecord] = await db.insert(contracts).values(contract).returning();
    return contractRecord;
  }

  async getContract(id: number): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract;
  }

  async getUserContracts(userId: string): Promise<Contract[]> {
    return await db
      .select()
      .from(contracts)
      .where(eq(contracts.userId, userId))
      .orderBy(desc(contracts.createdAt));
  }

  async updateContract(id: number, updates: Partial<Contract>): Promise<Contract> {
    const [contract] = await db
      .update(contracts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return contract;
  }
}

export const storage = new DatabaseStorage();
