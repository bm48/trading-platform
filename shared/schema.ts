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

// Timeline entries for case tracking
export const timeline_entries = pgTable("timeline_entries", {
  id: serial("id").primaryKey(),
  case_id: integer("case_id"),
  contract_id: integer("contract_id"),
  user_id: varchar("user_id").notNull(),
  type: varchar("type").notNull(), // milestone, deadline, action, note, document, email
  title: varchar("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  status: varchar("status").default("pending"), // pending, completed, overdue
  priority: varchar("priority").default("medium"), // low, medium, high, critical
  metadata: jsonb("metadata"), // Additional data based on type
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Email tracking and logging
export const email_logs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  case_id: integer("case_id"),
  contract_id: integer("contract_id"),
  user_id: varchar("user_id").notNull(),
  direction: varchar("direction").notNull(), // sent, received
  to_email: varchar("to_email"),
  from_email: varchar("from_email"),
  subject: varchar("subject"),
  body: text("body"),
  email_type: varchar("email_type"), // demand_letter, follow_up, notice, correspondence
  status: varchar("status").default("sent"), // sent, delivered, opened, failed
  external_id: varchar("external_id"), // For tracking with email providers
  metadata: jsonb("metadata"),
  sent_at: timestamp("sent_at"),
  created_at: timestamp("created_at").defaultNow(),
});

// Document storage metadata (enhanced)
export const document_storage = pgTable("document_storage", {
  id: serial("id").primaryKey(),
  case_id: integer("case_id"),
  contract_id: integer("contract_id"),
  user_id: varchar("user_id").notNull(),
  filename: varchar("filename").notNull(),
  original_name: varchar("original_name").notNull(),
  file_type: varchar("file_type").notNull(), // pdf, image, word, etc
  file_size: integer("file_size"),
  storage_path: varchar("storage_path").notNull(),
  category: varchar("category"), // evidence, contract, correspondence, photo, invoice
  tags: text("tags").array(), // Searchable tags
  description: text("description"),
  is_sensitive: boolean("is_sensitive").default(false),
  access_level: varchar("access_level").default("user"), // user, admin, public
  metadata: jsonb("metadata"),
  uploaded_at: timestamp("uploaded_at").defaultNow(),
});

// Message assistant conversations
export const assistant_conversations = pgTable("assistant_conversations", {
  id: serial("id").primaryKey(),
  user_id: varchar("user_id").notNull(),
  case_id: integer("case_id"),
  session_id: varchar("session_id").notNull(),
  message_type: varchar("message_type").notNull(), // user, assistant, system
  content: text("content").notNull(),
  context: jsonb("context"), // Related case/contract data
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow(),
});

// Smart notification center with priority-based alerts
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  user_id: varchar("user_id").notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").notNull(), // deadline, case_update, payment, system, legal_tip, action_required
  priority: varchar("priority").notNull(), // low, medium, high, critical
  status: varchar("status").default("unread"), // unread, read, archived
  category: varchar("category"), // payment_disputes, contract_issues, regulatory, general
  related_id: integer("related_id"), // case_id, contract_id, application_id, etc.
  related_type: varchar("related_type"), // case, contract, application, system
  action_url: varchar("action_url"), // URL to take action on notification
  action_label: varchar("action_label"), // Label for action button
  expires_at: timestamp("expires_at"), // When notification expires
  metadata: jsonb("metadata"), // Additional context data
  created_at: timestamp("created_at").defaultNow(),
  read_at: timestamp("read_at"),
  archived_at: timestamp("archived_at"),
}, (table) => ({
  userIdIdx: index("notifications_user_id_idx").on(table.user_id),
  statusIdx: index("notifications_status_idx").on(table.status),
  priorityIdx: index("notifications_priority_idx").on(table.priority),
  typeIdx: index("notifications_type_idx").on(table.type),
  createdAtIdx: index("notifications_created_at_idx").on(table.created_at),
}));

// Document tags system
export const document_tags = pgTable("document_tags", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  category: varchar("category").notNull(), // legal, financial, evidence, communication, administrative
  color: varchar("color").default("#3B82F6"), // Hex color for UI display
  description: text("description"),
  is_system: boolean("is_system").default(false), // AI-generated vs user-created
  usage_count: integer("usage_count").default(0),
  created_by: varchar("created_by"), // user_id who created this tag
  created_at: timestamp("created_at").defaultNow(),
}, (table) => ({
  nameIdx: index("document_tags_name_idx").on(table.name),
  categoryIdx: index("document_tags_category_idx").on(table.category),
}));

// Junction table for document-tag relationships
export const document_tag_assignments = pgTable("document_tag_assignments", {
  id: serial("id").primaryKey(),
  document_id: integer("document_id").notNull(),
  tag_id: integer("tag_id").notNull(),
  assigned_by: varchar("assigned_by"), // user_id or 'ai' for AI-suggested tags
  confidence_score: decimal("confidence_score"), // AI confidence 0.0-1.0
  is_ai_suggested: boolean("is_ai_suggested").default(false),
  created_at: timestamp("created_at").defaultNow(),
}, (table) => ({
  documentTagIdx: index("document_tag_assignments_document_tag_idx").on(table.document_id, table.tag_id),
  documentIdx: index("document_tag_assignments_document_idx").on(table.document_id),
  tagIdx: index("document_tag_assignments_tag_idx").on(table.tag_id),
}));

// AI tagging suggestions and analytics
export const ai_tag_suggestions = pgTable("ai_tag_suggestions", {
  id: serial("id").primaryKey(),
  document_id: integer("document_id").notNull(),
  suggested_tags: jsonb("suggested_tags").notNull(), // Array of {tag: string, confidence: number, reasoning: string}
  document_analysis: text("document_analysis"), // AI analysis of document content
  processing_status: varchar("processing_status").default("pending"), // pending, completed, failed
  user_feedback: jsonb("user_feedback"), // User acceptance/rejection of suggestions
  created_at: timestamp("created_at").defaultNow(),
  processed_at: timestamp("processed_at"),
}, (table) => ({
  documentIdx: index("ai_tag_suggestions_document_idx").on(table.document_id),
  statusIdx: index("ai_tag_suggestions_status_idx").on(table.processing_status),
}));

// Schema validation (moved to end of file to avoid duplicates)

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

export const insertDocumentTagSchema = createInsertSchema(document_tags).omit({
  id: true,
  created_at: true,
  usage_count: true,
});

export const insertDocumentTagAssignmentSchema = createInsertSchema(document_tag_assignments).omit({
  id: true,
  created_at: true,
});

export const insertAiTagSuggestionSchema = createInsertSchema(ai_tag_suggestions).omit({
  id: true,
  created_at: true,
  processed_at: true,
});

// Types
export type InsertUser = typeof users.$inferInsert;
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
export type InsertDocumentTag = z.infer<typeof insertDocumentTagSchema>;
export type DocumentTag = typeof document_tags.$inferSelect;
export type InsertDocumentTagAssignment = z.infer<typeof insertDocumentTagAssignmentSchema>;
export type DocumentTagAssignment = typeof document_tag_assignments.$inferSelect;
export type InsertAiTagSuggestion = z.infer<typeof insertAiTagSuggestionSchema>;
export type AiTagSuggestion = typeof ai_tag_suggestions.$inferSelect;

// Application insert schema with proper validation
export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  user_id: true,
  status: true,
  created_at: true,
  updated_at: true,
}).extend({
  start_date: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});
export type InsertApplicationType = z.infer<typeof insertApplicationSchema>;

// AI-Generated Documents table for admin approval workflow
export const aiGeneratedDocuments = pgTable("ai_generated_documents", {
  id: serial("id").primaryKey(),
  case_id: integer("case_id").notNull(),
  user_id: varchar("user_id").notNull(),
  document_type: varchar("document_type").notNull(), // strategy_pack, demand_letter, payment_claim, etc.
  title: varchar("title").notNull(),
  ai_content: jsonb("ai_content").notNull(), // OpenAI generated content structure
  template_used: varchar("template_used"), // Which template was used
  pdf_file_path: varchar("pdf_file_path"), // Path to generated PDF in Supabase Storage
  pdf_supabase_url: varchar("pdf_supabase_url"), // Public URL for direct access to PDF
  word_file_path: varchar("word_file_path"), // Path to editable Word doc in Supabase Storage
  status: varchar("status").default("pending_review"), // pending_review, approved, rejected, sent
  admin_notes: text("admin_notes"), // Admin feedback/notes
  reviewed_by: varchar("reviewed_by"), // Admin user ID who reviewed
  reviewed_at: timestamp("reviewed_at"),
  sent_at: timestamp("sent_at"), // When document was sent to client
  metadata: jsonb("metadata"), // Additional context from case data
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  caseIdIdx: index("ai_documents_case_id_idx").on(table.case_id),
  userIdIdx: index("ai_documents_user_id_idx").on(table.user_id),
  statusIdx: index("ai_documents_status_idx").on(table.status),
  documentTypeIdx: index("ai_documents_type_idx").on(table.document_type),
}));

// Notification schemas and types
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  created_at: true,
  read_at: true,
  archived_at: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// AI-Generated Documents schemas and types
export const insertAiDocumentSchema = createInsertSchema(aiGeneratedDocuments).omit({
  id: true,
  created_at: true,
  updated_at: true,
  reviewed_at: true,
  sent_at: true,
});
export type InsertAiDocument = z.infer<typeof insertAiDocumentSchema>;
export type AiDocument = typeof aiGeneratedDocuments.$inferSelect;

// Achievement System Tables
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  key: varchar("key").unique().notNull(), // unique identifier like "first_case", "subscriber", etc.
  name: varchar("name").notNull(), // display name like "First Case Created"
  description: text("description").notNull(), // description of what the achievement is for
  icon: varchar("icon").notNull(), // icon name from lucide-react or emoji
  category: varchar("category").notNull(), // getting_started, engagement, progress, milestones
  badge_color: varchar("badge_color").default("blue"), // color theme for the badge
  points: integer("points").default(10), // points awarded for this achievement
  requirement_type: varchar("requirement_type").notNull(), // count, boolean, milestone
  requirement_value: integer("requirement_value").default(1), // target value for count-based achievements
  is_active: boolean("is_active").default(true),
  sort_order: integer("sort_order").default(0),
  created_at: timestamp("created_at").defaultNow(),
}, (table) => ({
  keyIdx: index("achievements_key_idx").on(table.key),
  categoryIdx: index("achievements_category_idx").on(table.category),
}));

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  user_id: varchar("user_id").notNull(), // UUID reference to auth.users.id
  achievement_id: integer("achievement_id").notNull(),
  earned_at: timestamp("earned_at").defaultNow(),
  current_progress: integer("current_progress").default(0), // for count-based achievements
  is_completed: boolean("is_completed").default(false),
  notified: boolean("notified").default(false), // whether user has been notified of this achievement
}, (table) => ({
  userIdIdx: index("user_achievements_user_id_idx").on(table.user_id),
  achievementIdIdx: index("user_achievements_achievement_id_idx").on(table.achievement_id),
  completedIdx: index("user_achievements_completed_idx").on(table.is_completed),
  userAchievementIdx: index("user_achievements_user_achievement_idx").on(table.user_id, table.achievement_id),
}));

export const userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  user_id: varchar("user_id").unique().notNull(), // UUID reference to auth.users.id
  total_points: integer("total_points").default(0),
  level: integer("level").default(1),
  experience_points: integer("experience_points").default(0), // points towards next level
  cases_created: integer("cases_created").default(0),
  contracts_created: integer("contracts_created").default(0),
  documents_uploaded: integer("documents_uploaded").default(0),
  ai_documents_generated: integer("ai_documents_generated").default(0),
  calendar_events_created: integer("calendar_events_created").default(0),
  login_streak: integer("login_streak").default(0),
  last_login_date: timestamp("last_login_date"),
  subscription_days: integer("subscription_days").default(0),
  achievements_earned: integer("achievements_earned").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("user_stats_user_id_idx").on(table.user_id),
  levelIdx: index("user_stats_level_idx").on(table.level),
  pointsIdx: index("user_stats_points_idx").on(table.total_points),
}));

// Achievement schemas and types
export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  created_at: true,
});
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  earned_at: true,
});
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;

export const insertUserStatsSchema = createInsertSchema(userStats).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type UserStats = typeof userStats.$inferSelect;
