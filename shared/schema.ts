import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Note: Sessions are handled by Supabase Auth, no need for a sessions table

// User storage table extending Supabase Auth (UUID primary key)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(), // UUID from auth.users
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"), // user, moderator, admin
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status").default("none"), // none, active, past_due, canceled
  planType: varchar("plan_type").default("none"), // none, strategy_pack, monthly_subscription
  strategyPacksRemaining: integer("strategy_packs_remaining").default(0),
  hasInitialStrategyPack: boolean("has_initial_strategy_pack").default(false),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Applications (initial form submissions) - Supabase table structure with workflow stages
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  user_id: varchar("user_id"), // UUID reference to auth.users.id, nullable for anonymous submissions
  full_name: varchar("full_name").notNull(),
  phone: varchar("phone").notNull(),
  email: varchar("email").notNull(),
  trade: varchar("trade").notNull(),
  state: varchar("state").notNull(),
  issue_type: varchar("issue_type").notNull(),
  amount: decimal("amount"),
  start_date: timestamp("start_date"),
  description: text("description").notNull(),
  status: varchar("status").default("pending"), // pending, approved, rejected
  workflow_stage: varchar("workflow_stage").default("submitted"), // submitted, ai_reviewed, payment_pending, intake_pending, pdf_generation, dashboard_access
  payment_status: varchar("payment_status").default("pending"), // pending, completed, failed
  payment_amount: decimal("payment_amount").default("299.00"),
  intake_completed: boolean("intake_completed").default(false),
  pdf_generated: boolean("pdf_generated").default(false),
  dashboard_access_granted: boolean("dashboard_access_granted").default(false),
  monthly_subscription_offered: boolean("monthly_subscription_offered").default(false),
  ai_analysis: jsonb("ai_analysis"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Cases (after payment and detailed processing)
export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // UUID reference to users.id
  applicationId: integer("application_id"),
  title: varchar("title").notNull(),
  caseNumber: varchar("case_number").unique().notNull(),
  status: varchar("status").default("active"), // active, resolved, on_hold
  issueType: varchar("issue_type").notNull(),
  amount: varchar("amount"),
  description: text("description"),
  priority: varchar("priority").default("medium"),
  aiAnalysis: jsonb("ai_analysis"),
  strategyPack: jsonb("strategy_pack"),
  nextAction: varchar("next_action"),
  nextActionDue: timestamp("next_action_due"),
  progress: integer("progress").default(0), // 0-100
  moodScore: integer("mood_score").default(5), // 1-10 scale (1=very negative, 10=very positive)
  stressLevel: varchar("stress_level").default("medium"), // low, medium, high, critical
  urgencyFeeling: varchar("urgency_feeling").default("moderate"), // calm, moderate, urgent, panic
  confidenceLevel: integer("confidence_level").default(5), // 1-10 scale
  clientSatisfaction: integer("client_satisfaction").default(5), // 1-10 scale
  moodNotes: text("mood_notes"),
  lastMoodUpdate: timestamp("last_mood_update"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents (supports both documents and photos with versioning) - Updated for Supabase Storage
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  caseid: integer("caseid"),
  contractid: integer("contractid"),
  user_id: varchar("user_id").notNull(), // UUID reference to users.id
  filename: varchar("filename").notNull(),
  original_name: varchar("original_name").notNull(),
  file_type: varchar("file_type").notNull(), // document, photo, image
  mime_type: varchar("mime_type").notNull(),
  file_size: integer("file_size").notNull(),
  upload_path: varchar("upload_path"), // Legacy local path - nullable for Supabase files
  file_path: varchar("file_path"), // Legacy field - nullable for Supabase files
  supabase_url: varchar("supabase_url"), // Signed URL for file access
  supabase_path: varchar("supabase_path"), // Internal Supabase Storage path
  thumbnail_path: varchar("thumbnail_path"),
  tags: jsonb("tags"),
  category: varchar("category"), // evidence, contract, correspondence, generated, photos
  description: text("description"),
  version: integer("version").default(1),
  parent_document: integer("parent_document"),
  is_latest_version: boolean("is_latest_version").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

// Timeline events
export const timelineEvents = pgTable("timeline_events", {
  id: serial("id").primaryKey(),
  case_id: integer("case_id"),
  contract_id: integer("contract_id"),
  user_id: varchar("user_id").notNull(),
  event_type: varchar("event_type").notNull(), // action_completed, document_uploaded, deadline_set
  title: varchar("title").notNull(),
  description: text("description"),
  event_date: timestamp("event_date").notNull(),
  is_completed: boolean("is_completed").default(false),
  created_at: timestamp("created_at").defaultNow(),
});

// Calendar integrations
export const calendarIntegrations = pgTable("calendar_integrations", {
  id: serial("id").primaryKey(),
  user_id: varchar("user_id").notNull(),
  provider: varchar("provider").notNull(), // 'google' or 'outlook'
  access_token: text("access_token").notNull(),
  refresh_token: text("refresh_token"),
  token_expires_at: timestamp("token_expires_at"),
  calendar_id: varchar("calendar_id"),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Calendar events
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  user_id: varchar("user_id").notNull(),
  case_id: integer("case_id"),
  contract_id: integer("contract_id"),
  integration_id: integer("integration_id"),
  external_event_id: varchar("external_event_id"),
  title: varchar("title").notNull(),
  description: text("description"),
  start_time: timestamp("start_time").notNull(),
  end_time: timestamp("end_time").notNull(),
  location: varchar("location"),
  attendees: jsonb("attendees"),
  reminder_minutes: integer("reminder_minutes").default(15),
  is_synced: boolean("is_synced").default(false),
  sync_status: varchar("sync_status").default("pending"), // pending, synced, failed
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Contracts (for future work prevention)
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: varchar("title").notNull(),
  contractNumber: varchar("contract_num").unique().notNull(), // Updated to match DB
  status: varchar("status").default("draft"), // draft, final, signed
  clientName: varchar("client_name").notNull(),
  projectDescription: text("project_descr").notNull(), // Updated to match DB
  value: decimal("value"), // Updated to numeric type to match DB
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  terms: jsonb("terms"),
  version: integer("version").default(1),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Schema validation
export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  userId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

export const insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
  userId: true,
  caseNumber: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  issueType: z.string().min(1, "Issue type is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  amount: z.string().optional().transform((val) => val ? val : undefined),
  nextActionDue: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  created_at: true,
});

export const insertTimelineEventSchema = createInsertSchema(timelineEvents).omit({
  id: true,
  created_at: true,
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  userId: true,
  contractNumber: true,
  created_at: true,
  updated_at: true,
}).extend({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  clientName: z.string().min(1, "Client name is required").max(100, "Client name must be less than 100 characters"),
  projectDescription: z.string().min(10, "Project description must be at least 10 characters"),
  value: z.string().optional().transform((val) => val ? val : undefined),
  startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

export const insertCalendarIntegrationSchema = createInsertSchema(calendarIntegrations).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  start_time: z.string().transform((val) => new Date(val)),
  end_time: z.string().transform((val) => new Date(val)),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Application types for Supabase integration
export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof cases.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertTimelineEvent = z.infer<typeof insertTimelineEventSchema>;
export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;
export type InsertCalendarIntegration = z.infer<typeof insertCalendarIntegrationSchema>;
export type CalendarIntegration = typeof calendarIntegrations.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;

// Create insert schema for applications
export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertApplicationType = z.infer<typeof insertApplicationSchema>;
