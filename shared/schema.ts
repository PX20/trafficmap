import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean, index, integer, real, doublePrecision, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// UNIFIED INCIDENT SCHEMA - Single source of truth for all incident types
// ============================================================================

// Unified incident storage - replaces complex separate flows
export const unifiedIncidents = pgTable("unified_incidents", {
  id: varchar("id").primaryKey(), // Composite ID: source:sourceId (generated in app layer)
  
  // Source identification
  source: varchar("source", { enum: ["tmr", "emergency", "user"] }).notNull(),
  sourceId: varchar("source_id").notNull(), // Original ID from source system
  
  // Core incident data
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"), // Human-readable location
  category: varchar("category").notNull(), // traffic, fire, medical, crime, etc.
  subcategory: varchar("subcategory"), // congestion, accident, structure-fire, etc.
  severity: varchar("severity", { enum: ["low", "medium", "high", "critical"] }).default("medium"),
  status: varchar("status", { enum: ["active", "resolved", "monitoring", "closed"] }).default("active"),
  
  // Spatial data
  geometry: jsonb("geometry").notNull(), // Original GeoJSON geometry
  centroidLat: doublePrecision("centroid_lat").notNull(), // Computed centroid for fast lookups
  centroidLng: doublePrecision("centroid_lng").notNull(),
  regionIds: text("region_ids").array().default([]), // Pre-computed region assignments
  geocell: varchar("geocell"), // Spatial grid cell for fast regional queries
  
  // Temporal data
  incidentTime: timestamp("incident_time"), // When incident actually occurred
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"), // For auto-cleanup of old incidents
  
  // Source-specific data
  properties: jsonb("properties").notNull().default('{}'), // Original properties from source
  
  // User-reported specific fields
  userId: varchar("user_id"), // Only for user reports
  photoUrl: text("photo_url"), // Only for user reports
  verificationStatus: varchar("verification_status", { enum: ["unverified", "community_verified", "official_verified"] }),
  
  // System fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  version: integer("version").default(1), // For optimistic concurrency
}, (table) => [
  // Uniqueness constraint to prevent ID collisions
  unique("unique_source_sourceid").on(table.source, table.sourceId),
  
  // Performance indexes
  index("idx_unified_source").on(table.source),
  index("idx_unified_category").on(table.category),
  index("idx_unified_severity").on(table.severity),
  index("idx_unified_status").on(table.status),
  index("idx_unified_centroid").on(table.centroidLat, table.centroidLng),
  index("idx_unified_geocell").on(table.geocell),
  index("idx_unified_region").using("gin", table.regionIds), // GIN index for array queries
  index("idx_unified_time").on(table.incidentTime),
  index("idx_unified_updated").on(table.lastUpdated),
]);

// Unified Incidents Zod Schemas
export const insertUnifiedIncidentSchema = createInsertSchema(unifiedIncidents).omit({
  id: true, // Auto-generated from source + sourceId
  createdAt: true,
  updatedAt: true,
  version: true,
}).extend({
  // Custom validation rules
  source: z.enum(["tmr", "emergency", "user"]),
  sourceId: z.string().min(1, "Source ID is required"),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["active", "resolved", "monitoring", "closed"]).default("active"),
  category: z.string().min(1, "Category is required"),
  title: z.string().min(1, "Title is required"),
  centroidLat: z.number().min(-90).max(90),
  centroidLng: z.number().min(-180).max(180),
  regionIds: z.array(z.string()).default([]),
});

// Select schema is just the table inference - no need for separate schema
// export const selectUnifiedIncidentSchema = createInsertSchema(unifiedIncidents);

export type InsertUnifiedIncident = z.infer<typeof insertUnifiedIncidentSchema>;
export type SelectUnifiedIncident = typeof unifiedIncidents.$inferSelect;

// Helper function to generate composite IDs for unified incidents
export function generateUnifiedIncidentId(source: "tmr" | "emergency" | "user", sourceId: string): string {
  return `${source}:${sourceId}`;
}

// Helper function to validate unified incident data before insert
export function prepareUnifiedIncidentForInsert(data: InsertUnifiedIncident): InsertUnifiedIncident & { id: string } {
  const id = generateUnifiedIncidentId(data.source, data.sourceId);
  return {
    ...data,
    id,
  };
}

// GeoJSON Feature type for API responses
export interface UnifiedFeature {
  type: "Feature";
  id: string;
  properties: {
    id: string;
    source: "tmr" | "emergency" | "user";
    title: string;
    description?: string;
    category: string;
    subcategory?: string;
    severity: "low" | "medium" | "high" | "critical";
    status: "active" | "resolved" | "monitoring" | "closed";
    location?: string;
    incidentTime?: string;
    lastUpdated: string;
    publishedAt: string;
    regionIds: string[];
    userId?: string;
    photoUrl?: string;
    verificationStatus?: "unverified" | "community_verified" | "official_verified";
    originalProperties: any; // Original source properties
  };
  geometry: {
    type: "Point" | "Polygon" | "LineString";
    coordinates: number[] | number[][] | number[][][];
  };
}

// API Response type
export interface UnifiedIncidentsResponse {
  type: "FeatureCollection";
  features: UnifiedFeature[];
  metadata: {
    total: number;
    updated: string;
    version: number;
    sources: {
      tmr: number;
      emergency: number;  
      user: number;
    };
    regions: Record<string, number>; // Region ID -> count
  };
}

// Current Terms Version - Update this when terms change to prompt re-acceptance
export const CURRENT_TERMS_VERSION = "1.1";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  password: varchar("password"),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  displayName: varchar("display_name"),
  profileImageUrl: varchar("profile_image_url"),
  bio: text("bio"),
  homeSuburb: varchar("home_suburb"),
  primarySuburb: varchar("primary_suburb"),
  verifiedResident: boolean("verified_resident").default(false),
  phoneNumber: varchar("phone_number"),
  reputationScore: integer("reputation_score").default(0),
  locationSharingLevel: varchar("location_sharing_level").default('suburb'), // 'exact' | 'suburb' | 'private'
  profileVisibility: varchar("profile_visibility").default('community'), // 'public' | 'community' | 'private'
  allowDirectMessages: boolean("allow_direct_messages").default(true),
  termsAccepted: boolean("terms_accepted").default(false),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  // Business account fields
  accountType: varchar("account_type", { enum: ["regular", "business"] }).default("regular"),
  businessName: varchar("business_name"),
  businessDescription: varchar("business_description", { length: 500 }),
  businessWebsite: varchar("business_website"),
  businessPhone: varchar("business_phone"),
  businessAddress: varchar("business_address"),
  businessCategory: varchar("business_category"),
  role: varchar("role").default("user"), // 'user' | 'admin'
  isOfficialAgency: boolean("is_official_agency").default(false), // Mark agency accounts
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const trafficEvents = pgTable("traffic_events", {
  id: varchar("id").primaryKey(),
  eventType: text("event_type").notNull(),
  eventSubtype: text("event_subtype"),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  impact: text("impact"),
  priority: text("priority"),
  status: text("status").notNull(),
  advice: text("advice"),
  information: text("information"),
  geometry: jsonb("geometry"),
  properties: jsonb("properties"),
  lastUpdated: timestamp("last_updated").notNull(),
  nextInspection: timestamp("next_inspection"),
  webLink: text("web_link"),
  areaAlert: boolean("area_alert").default(false),
  alertMessage: text("alert_message"),
});


export const incidents = pgTable("incidents", {
  id: varchar("id").primaryKey(),
  incidentType: text("incident_type").notNull(),
  categoryId: varchar("category_id"), // New hierarchical category
  subcategoryId: varchar("subcategory_id"), // New hierarchical subcategory
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  status: text("status").notNull(),
  priority: text("priority"),
  agency: text("agency"),
  photoUrl: text("photo_url"), // Photo uploaded with incident
  geometry: jsonb("geometry"),
  properties: jsonb("properties"),
  lastUpdated: timestamp("last_updated").notNull(),
  publishedDate: timestamp("published_date"),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: varchar("incident_id").notNull(),
  userId: varchar("user_id").notNull(),
  parentCommentId: varchar("parent_comment_id"),
  content: text("content").notNull(),
  helpfulScore: integer("helpful_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Neighborhood Groups for suburb-based discussions
export const neighborhoodGroups = pgTable("neighborhood_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  suburb: varchar("suburb").notNull(),
  description: text("description"),
  memberCount: integer("member_count").default(0),
  isPrivate: boolean("is_private").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Junction table for user group memberships
export const userNeighborhoodGroups = pgTable("user_neighborhood_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  groupId: varchar("group_id").notNull(),
  role: varchar("role").default('member'), // 'member' | 'moderator' | 'admin'
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Emergency contacts system
export const emergencyContacts = pgTable("emergency_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  contactUserId: varchar("contact_user_id"), // If contact is also a user
  contactName: varchar("contact_name").notNull(),
  contactPhone: varchar("contact_phone"),
  relationship: varchar("relationship"), // 'family' | 'friend' | 'neighbor' | 'colleague'
  createdAt: timestamp("created_at").defaultNow(),
});

// Incident follow-ups for status updates from original reporters
export const incidentFollowUps = pgTable("incident_follow_ups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: varchar("incident_id").notNull(),
  userId: varchar("user_id").notNull(), // Must be original reporter
  status: varchar("status").notNull(), // 'in_progress' | 'resolved' | 'escalated' | 'closed'
  description: text("description").notNull(),
  photoUrl: text("photo_url"), // Optional follow-up photo
  createdAt: timestamp("created_at").defaultNow(),
});

// Hierarchical category system for incident reporting
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  icon: varchar("icon"), // Icon name for UI
  color: varchar("color"), // Color for UI markers
  order: integer("order").default(0), // Display order
  isActive: boolean("is_active").default(true),
  requiresApproval: boolean("requires_approval").default(false), // For new categories
  createdAt: timestamp("created_at").defaultNow(),
});

export const subcategories = pgTable("subcategories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  icon: varchar("icon"),
  reportCount: integer("report_count").default(0), // For threshold-based display
  isActive: boolean("is_active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Comment voting for reputation system
export const commentVotes = pgTable("comment_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commentId: varchar("comment_id").notNull(),
  userId: varchar("user_id").notNull(),
  voteType: varchar("vote_type").notNull(), // 'helpful' | 'not_helpful'
  createdAt: timestamp("created_at").defaultNow(),
});

// Safety check-ins during emergencies
export const safetyCheckIns = pgTable("safety_check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  incidentId: varchar("incident_id"),
  status: varchar("status").notNull(), // 'safe' | 'needs_help' | 'evacuated'
  location: varchar("location"),
  message: text("message"),
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversations between users
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user1Id: varchar("user1_id").notNull(),
  user2Id: varchar("user2_id").notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages within conversations
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications system for tracking user activities
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // Who receives the notification
  type: varchar("type").notNull(), // 'comment_reply' | 'new_comment' | 'mention' | 'message'
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  entityId: varchar("entity_id"), // ID of the related item (comment, incident, message, etc.)
  entityType: varchar("entity_type"), // 'comment' | 'incident' | 'message'
  fromUserId: varchar("from_user_id"), // Who triggered the notification
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reports system for user-generated content moderation
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull(), // User who submitted the report
  entityType: varchar("entity_type").notNull(), // 'incident' | 'comment'
  entityId: varchar("entity_id").notNull(), // ID of the reported content
  reason: varchar("reason").notNull(), // 'spam' | 'inappropriate' | 'harassment' | 'false_information' | 'other'
  description: text("description"), // Optional additional details
  status: varchar("status").notNull().default('pending'), // 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  moderatorId: varchar("moderator_id"), // Admin who handled the report
  moderatorNotes: text("moderator_notes"), // Admin notes
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Incident comments for unified incident system - social media style commenting
export const incidentComments = pgTable("incident_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: varchar("incident_id").notNull(), // References unified_incidents.id
  userId: varchar("user_id").notNull(), // References users.id
  parentCommentId: varchar("parent_comment_id"), // References incident_comments.id for nested replies
  content: text("content").notNull(), // Content validation in Zod schema
  photoUrl: text("photo_url"), // Optional photo attachment (legacy single photo)
  photoUrls: text("photo_urls").array().default([]), // Multiple photo attachments (up to 3)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Performance indexes for comment queries
  index("idx_incident_comments_incident_time").on(table.incidentId, table.createdAt.desc()),
  index("idx_incident_comments_user").on(table.userId, table.incidentId),
  index("idx_incident_comments_parent").on(table.parentCommentId),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  comments: many(comments),
  neighborhoodGroups: many(userNeighborhoodGroups),
  emergencyContacts: many(emergencyContacts),
  commentVotes: many(commentVotes),
  safetyCheckIns: many(safetyCheckIns),
  sentMessages: many(messages),
  conversations1: many(conversations, { relationName: 'user1' }),
  conversations2: many(conversations, { relationName: 'user2' }),
  notifications: many(notifications),
  incidentFollowUps: many(incidentFollowUps),
  submittedReports: many(reports, { relationName: 'reporter' }),
  moderatedReports: many(reports, { relationName: 'moderator' }),
}));

export const incidentsRelations = relations(incidents, ({ one, many }) => ({
  comments: many(comments),
  safetyCheckIns: many(safetyCheckIns),
  followUps: many(incidentFollowUps),
  category: one(categories, {
    fields: [incidents.categoryId],
    references: [categories.id],
  }),
  subcategory: one(subcategories, {
    fields: [incidents.subcategoryId],
    references: [subcategories.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  subcategories: many(subcategories),
  incidents: many(incidents),
}));

export const subcategoriesRelations = relations(subcategories, ({ one, many }) => ({
  category: one(categories, {
    fields: [subcategories.categoryId],
    references: [categories.id],
  }),
  incidents: many(incidents),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  incident: one(incidents, {
    fields: [comments.incidentId],
    references: [incidents.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  parentComment: one(comments, {
    fields: [comments.parentCommentId],
    references: [comments.id],
  }),
  replies: many(comments),
  votes: many(commentVotes),
}));

export const incidentFollowUpsRelations = relations(incidentFollowUps, ({ one }) => ({
  incident: one(incidents, {
    fields: [incidentFollowUps.incidentId],
    references: [incidents.id],
  }),
  user: one(users, {
    fields: [incidentFollowUps.userId],
    references: [users.id],
  }),
}));

export const neighborhoodGroupsRelations = relations(neighborhoodGroups, ({ many }) => ({
  members: many(userNeighborhoodGroups),
}));

export const userNeighborhoodGroupsRelations = relations(userNeighborhoodGroups, ({ one }) => ({
  user: one(users, {
    fields: [userNeighborhoodGroups.userId],
    references: [users.id],
  }),
  group: one(neighborhoodGroups, {
    fields: [userNeighborhoodGroups.groupId],
    references: [neighborhoodGroups.id],
  }),
}));

export const emergencyContactsRelations = relations(emergencyContacts, ({ one }) => ({
  user: one(users, {
    fields: [emergencyContacts.userId],
    references: [users.id],
  }),
  contactUser: one(users, {
    fields: [emergencyContacts.contactUserId],
    references: [users.id],
  }),
}));

export const commentVotesRelations = relations(commentVotes, ({ one }) => ({
  comment: one(comments, {
    fields: [commentVotes.commentId],
    references: [comments.id],
  }),
  user: one(users, {
    fields: [commentVotes.userId],
    references: [users.id],
  }),
}));

export const safetyCheckInsRelations = relations(safetyCheckIns, ({ one }) => ({
  user: one(users, {
    fields: [safetyCheckIns.userId],
    references: [users.id],
  }),
  incident: one(incidents, {
    fields: [safetyCheckIns.incidentId],
    references: [incidents.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user1: one(users, {
    fields: [conversations.user1Id],
    references: [users.id],
    relationName: 'user1',
  }),
  user2: one(users, {
    fields: [conversations.user2Id],
    references: [users.id],
    relationName: 'user2',
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  fromUser: one(users, {
    fields: [notifications.fromUserId],
    references: [users.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, {
    fields: [reports.reporterId],
    references: [users.id],
    relationName: 'reporter',
  }),
  moderator: one(users, {
    fields: [reports.moderatorId],
    references: [users.id],
    relationName: 'moderator',
  }),
}));


export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertTrafficEventSchema = createInsertSchema(trafficEvents).omit({
  id: true,
  lastUpdated: true,
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  lastUpdated: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIncidentCommentSchema = createInsertSchema(incidentComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  content: z.string().min(1, "Comment cannot be empty").max(1000, "Comment too long"),
  photoUrls: z.array(z.string().url()).max(3, "Maximum 3 photos per comment").optional(),
});

export type IncidentComment = typeof incidentComments.$inferSelect;
export type InsertIncidentComment = z.infer<typeof insertIncidentCommentSchema>;

export const insertNeighborhoodGroupSchema = createInsertSchema(neighborhoodGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserNeighborhoodGroupSchema = createInsertSchema(userNeighborhoodGroups).omit({
  id: true,
  joinedAt: true,
});

export const insertEmergencyContactSchema = createInsertSchema(emergencyContacts).omit({
  id: true,
  createdAt: true,
});

export const insertCommentVoteSchema = createInsertSchema(commentVotes).omit({
  id: true,
  createdAt: true,
});

export const insertSafetyCheckInSchema = createInsertSchema(safetyCheckIns).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertSubcategorySchema = createInsertSchema(subcategories).omit({
  id: true,
  createdAt: true,
});

export const insertIncidentFollowUpSchema = createInsertSchema(incidentFollowUps).omit({
  id: true,
  createdAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Safe user type for batch lookups - only includes public fields
export type SafeUser = {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  accountType: "regular" | "business" | null;
  isOfficialAgency: boolean;
};
export type TrafficEvent = typeof trafficEvents.$inferSelect;
export type InsertTrafficEvent = z.infer<typeof insertTrafficEventSchema>;
export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type NeighborhoodGroup = typeof neighborhoodGroups.$inferSelect;
export type InsertNeighborhoodGroup = z.infer<typeof insertNeighborhoodGroupSchema>;
export type UserNeighborhoodGroup = typeof userNeighborhoodGroups.$inferSelect;
export type InsertUserNeighborhoodGroup = z.infer<typeof insertUserNeighborhoodGroupSchema>;
export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type InsertEmergencyContact = z.infer<typeof insertEmergencyContactSchema>;
export type CommentVote = typeof commentVotes.$inferSelect;
export type InsertCommentVote = z.infer<typeof insertCommentVoteSchema>;
export type SafetyCheckIn = typeof safetyCheckIns.$inferSelect;
export type InsertSafetyCheckIn = z.infer<typeof insertSafetyCheckInSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Subcategory = typeof subcategories.$inferSelect;
export type InsertSubcategory = z.infer<typeof insertSubcategorySchema>;
export type IncidentFollowUp = typeof incidentFollowUps.$inferSelect;
export type InsertIncidentFollowUp = z.infer<typeof insertIncidentFollowUpSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

// Ad Campaigns table
export const adCampaigns = pgTable("ad_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessName: varchar("business_name").notNull(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  websiteUrl: text("website_url"),
  address: text("address"),
  suburb: varchar("suburb", { length: 100 }).notNull(),
  cta: varchar("cta", { length: 100 }).default("Learn More"),
  targetSuburbs: text("target_suburbs").array(),
  dailyBudget: text("daily_budget"),
  totalBudget: text("total_budget"),
  cpmRate: text("cpm_rate").default("2.00"),
  status: varchar("status", { length: 50 }).default("active"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ad Views table
export const adViews = pgTable("ad_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adCampaignId: varchar("ad_campaign_id").references(() => adCampaigns.id),
  userId: varchar("user_id").references(() => users.id),
  durationMs: integer("duration_ms").notNull(),
  userSuburb: varchar("user_suburb", { length: 100 }),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  viewedAt: timestamp("viewed_at").notNull(),
  date: varchar("date").notNull(),
}, (table) => ({
  campaignDateIdx: index("idx_ad_campaign_date").on(table.adCampaignId, table.date),
  userDateIdx: index("idx_ad_user_date").on(table.userId, table.date),
}));

// Ad Clicks table
export const adClicks = pgTable("ad_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adCampaignId: varchar("ad_campaign_id").references(() => adCampaigns.id),
  userId: varchar("user_id").references(() => users.id),
  ipAddress: varchar("ip_address"),
  clickedAt: timestamp("clicked_at").notNull(),
});

// Ad table type exports
// Billing and payment tracking tables
export const billingPlans = pgTable("billing_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // "Basic Daily", "Premium Daily"
  description: text("description"),
  pricePerDay: text("price_per_day").notNull(), // $8.00, stored as string for precision
  minimumDays: integer("minimum_days").default(7), // 7-day minimum
  features: jsonb("features"), // Array of features included
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const billingCycles = pgTable("billing_cycles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull(),
  planId: varchar("plan_id").notNull(),
  businessId: varchar("business_id").notNull(), // User ID for business account
  status: varchar("status").notNull().default("active"), // 'active' | 'paused' | 'cancelled' | 'expired'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  dailyRate: text("daily_rate").notNull(), // Current daily rate (allows for historical pricing)
  totalDays: integer("total_days"),
  totalAmount: text("total_amount"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  businessDateIdx: index("idx_billing_business_date").on(table.businessId, table.startDate),
  campaignIdx: index("idx_billing_campaign").on(table.campaignId),
}));

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  billingCycleId: varchar("billing_cycle_id").notNull(),
  businessId: varchar("business_id").notNull(),
  amount: text("amount").notNull(), // Payment amount in dollars
  currency: varchar("currency", { length: 3 }).default("AUD"),
  status: varchar("status").notNull(), // 'pending' | 'completed' | 'failed' | 'refunded'
  paymentMethod: varchar("payment_method").notNull(), // 'stripe'
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  stripeInvoiceId: varchar("stripe_invoice_id"),
  failureReason: text("failure_reason"),
  paidAt: timestamp("paid_at"),
  daysCharged: integer("days_charged"), // Number of days this payment covers
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  businessDateIdx: index("idx_payments_business_date").on(table.businessId, table.paidAt),
  statusIdx: index("idx_payments_status").on(table.status),
}));

export const campaignAnalytics = pgTable("campaign_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull(),
  date: varchar("date").notNull(), // YYYY-MM-DD format
  totalViews: integer("total_views").default(0),
  uniqueViews: integer("unique_views").default(0),
  totalClicks: integer("total_clicks").default(0),
  uniqueClicks: integer("unique_clicks").default(0),
  ctr: text("ctr").default("0"), // Click-through rate as percentage
  impressionDuration: integer("impression_duration").default(0), // Average view duration in ms
  costPerView: text("cost_per_view").default("0"),
  costPerClick: text("cost_per_click").default("0"),
  totalSpent: text("total_spent").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  campaignDateIdx: index("idx_campaign_analytics_date").on(table.campaignId, table.date),
}));


export type AdCampaign = typeof adCampaigns.$inferSelect;
export type InsertAdCampaign = typeof adCampaigns.$inferInsert;
export type AdView = typeof adViews.$inferSelect;
export type InsertAdView = typeof adViews.$inferInsert;
export type AdClick = typeof adClicks.$inferSelect;
export type InsertAdClick = typeof adClicks.$inferInsert;

// Billing types
export type BillingPlan = typeof billingPlans.$inferSelect;
export type InsertBillingPlan = typeof billingPlans.$inferInsert;
export type BillingCycle = typeof billingCycles.$inferSelect;
export type InsertBillingCycle = typeof billingCycles.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
export type CampaignAnalytics = typeof campaignAnalytics.$inferSelect;
export type InsertCampaignAnalytics = typeof campaignAnalytics.$inferInsert;

// Analytics types
export interface AdStats {
  campaignId: string;
  totalViews: number;
  uniqueUsers: number;
  totalClicks: number;
  totalViewTime: number;
  ctr: number;
  costOwed: number;
}

export interface DailyAdStats {
  date: string;
  views: number;
  clicks: number;
  cost: number;
}

export interface BusinessAdPerformance {
  businessName: string;
  totalCampaigns: number;
  totalViews: number;
  totalClicks: number;
  totalSpent: number;
  averageCTR: number;
}

// ============================================================================
// USER ATTRIBUTION SYSTEM - Centralized attribution for all incident sources
// ============================================================================

// System user IDs for all incident attribution
export const SYSTEM_USER_IDS = {
  // Agency accounts for official sources
  TMR: 'tmr-agency-account-001',
  QFES: 'qfes-agency-account-001', 
  QAS: 'qas-agency-account-001',
  QPS: 'qps-agency-account-001',
  
  // Legacy system account for historical incidents without attribution
  LEGACY_SYSTEM: 'legacy-system-account-001'
} as const;

// Valid system user ID type
export type SystemUserId = typeof SYSTEM_USER_IDS[keyof typeof SYSTEM_USER_IDS];

// Attribution resolver result
export interface AttributionResult {
  userId: string;
  reporterId: string;
  isSystemAccount: boolean;
}

/**
 * Centralized attribution resolver for all incident sources
 * Ensures every incident has valid user attribution - no null values allowed
 * 
 * @param source - Incident source ('tmr', 'emergency', 'user', 'legacy')
 * @param userHint - Optional user ID hint from source data
 * @param sourceMetadata - Additional metadata for attribution resolution
 * @returns AttributionResult with guaranteed non-null userId
 * @throws Error if attribution cannot be resolved
 */
export function resolveAttribution(
  source: string, 
  userHint?: string | null,
  sourceMetadata?: any
): AttributionResult {
  // Handle user-submitted incidents
  if (source === 'user' && userHint) {
    return {
      userId: userHint,
      reporterId: userHint,
      isSystemAccount: false
    };
  }
  
  // Handle TMR incidents
  if (source === 'tmr') {
    return {
      userId: SYSTEM_USER_IDS.TMR,
      reporterId: SYSTEM_USER_IDS.TMR,
      isSystemAccount: true
    };
  }
  
  // Handle emergency incidents - determine specific agency
  if (source === 'emergency') {
    const agencyUserId = resolveEmergencyAgency(sourceMetadata);
    return {
      userId: agencyUserId,
      reporterId: agencyUserId,
      isSystemAccount: true
    };
  }
  
  // Handle legacy incidents without original attribution
  if (source === 'legacy') {
    return {
      userId: SYSTEM_USER_IDS.LEGACY_SYSTEM,
      reporterId: SYSTEM_USER_IDS.LEGACY_SYSTEM,
      isSystemAccount: true
    };
  }
  
  // Fallback for unknown sources or user incidents without userHint
  if (source === 'user' && !userHint) {
    throw new Error(`User incident missing required userHint for attribution`);
  }
  
  throw new Error(`Unable to resolve attribution for source: ${source}, userHint: ${userHint}`);
}

/**
 * Resolve emergency agency for incident attribution
 * All emergency incidents come from the QFES API data source
 * @param metadata - Incident properties from emergency services API (unused)
 * @returns QFES agency user ID
 */
function resolveEmergencyAgency(metadata: any = {}): SystemUserId {
  // All incidents from the emergency API feed are QFES data
  return SYSTEM_USER_IDS.QFES;
}
