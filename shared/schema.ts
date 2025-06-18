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

// User storage table for Supabase Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
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

// Applications (initial form submissions)
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  fullName: varchar("full_name").notNull(),
  phone: varchar("phone").notNull(),
  email: varchar("email").notNull(),
  trade: varchar("trade").notNull(),
  state: varchar("state").notNull(),
  issueType: varchar("issue_type").notNull(),
  amount: decimal("amount"),
  startDate: timestamp("start_date"),
  description: text("description").notNull(),
  status: varchar("status").default("pending"), // pending, approved, rejected
  aiAnalysis: jsonb("ai_analysis"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cases (after payment and detailed processing)
export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents (supports both documents and photos with versioning)
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  case_id: integer("case_id"),
  contract_id: integer("contract_id"),
  user_id: varchar("user_id").notNull(),
  file_name: varchar("file_name").notNull(),
  original_name: varchar("original_name").notNull(),
  file_type: varchar("file_type").notNull(), // document, photo, image
  mime_type: varchar("mime_type").notNull(),
  file_size: integer("file_size").notNull(),
  file_path: varchar("file_path").notNull(),
  thumbnail_path: varchar("thumbnail_path"), // for images/photos
  tags: jsonb("tags"),
  category: varchar("category"), // evidence, contract, correspondence, generated, photos
  description: text("description"),
  version: integer("version").default(1),
  parent_document_id: integer("parent_document_id"), // for versioned files
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

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applications.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof cases.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertTimelineEvent = z.infer<typeof insertTimelineEventSchema>;
export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;
