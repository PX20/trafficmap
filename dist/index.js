var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  CURRENT_TERMS_VERSION: () => CURRENT_TERMS_VERSION,
  SYSTEM_USER_IDS: () => SYSTEM_USER_IDS,
  adCampaigns: () => adCampaigns,
  adClicks: () => adClicks,
  adViews: () => adViews,
  billingCycles: () => billingCycles,
  billingPlans: () => billingPlans,
  campaignAnalytics: () => campaignAnalytics,
  categories: () => categories,
  categoriesRelations: () => categoriesRelations,
  commentVotes: () => commentVotes,
  commentVotesRelations: () => commentVotesRelations,
  comments: () => comments,
  commentsRelations: () => commentsRelations,
  conversations: () => conversations,
  conversationsRelations: () => conversationsRelations,
  emergencyContacts: () => emergencyContacts,
  emergencyContactsRelations: () => emergencyContactsRelations,
  generateUnifiedIncidentId: () => generateUnifiedIncidentId,
  incidentComments: () => incidentComments,
  incidentFollowUps: () => incidentFollowUps,
  incidentFollowUpsRelations: () => incidentFollowUpsRelations,
  incidents: () => incidents,
  incidentsRelations: () => incidentsRelations,
  insertCategorySchema: () => insertCategorySchema,
  insertCommentSchema: () => insertCommentSchema,
  insertCommentVoteSchema: () => insertCommentVoteSchema,
  insertConversationSchema: () => insertConversationSchema,
  insertEmergencyContactSchema: () => insertEmergencyContactSchema,
  insertIncidentCommentSchema: () => insertIncidentCommentSchema,
  insertIncidentFollowUpSchema: () => insertIncidentFollowUpSchema,
  insertIncidentSchema: () => insertIncidentSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertNeighborhoodGroupSchema: () => insertNeighborhoodGroupSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertReportSchema: () => insertReportSchema,
  insertSafetyCheckInSchema: () => insertSafetyCheckInSchema,
  insertSubcategorySchema: () => insertSubcategorySchema,
  insertTrafficEventSchema: () => insertTrafficEventSchema,
  insertUnifiedIncidentSchema: () => insertUnifiedIncidentSchema,
  insertUserNeighborhoodGroupSchema: () => insertUserNeighborhoodGroupSchema,
  insertUserSchema: () => insertUserSchema,
  messages: () => messages,
  messagesRelations: () => messagesRelations,
  neighborhoodGroups: () => neighborhoodGroups,
  neighborhoodGroupsRelations: () => neighborhoodGroupsRelations,
  notifications: () => notifications,
  notificationsRelations: () => notificationsRelations,
  payments: () => payments,
  prepareUnifiedIncidentForInsert: () => prepareUnifiedIncidentForInsert,
  reports: () => reports,
  reportsRelations: () => reportsRelations,
  resolveAttribution: () => resolveAttribution,
  safetyCheckIns: () => safetyCheckIns,
  safetyCheckInsRelations: () => safetyCheckInsRelations,
  sessions: () => sessions,
  subcategories: () => subcategories,
  subcategoriesRelations: () => subcategoriesRelations,
  trafficEvents: () => trafficEvents,
  unifiedIncidents: () => unifiedIncidents,
  userNeighborhoodGroups: () => userNeighborhoodGroups,
  userNeighborhoodGroupsRelations: () => userNeighborhoodGroupsRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean, index, integer, doublePrecision, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
function generateUnifiedIncidentId(source, sourceId) {
  return `${source}:${sourceId}`;
}
function prepareUnifiedIncidentForInsert(data) {
  const id = generateUnifiedIncidentId(data.source, data.sourceId);
  return {
    ...data,
    id
  };
}
function resolveAttribution(source, userHint, sourceMetadata) {
  if (source === "user" && userHint) {
    return {
      userId: userHint,
      reporterId: userHint,
      isSystemAccount: false
    };
  }
  if (source === "tmr") {
    return {
      userId: SYSTEM_USER_IDS.TMR,
      reporterId: SYSTEM_USER_IDS.TMR,
      isSystemAccount: true
    };
  }
  if (source === "emergency") {
    const agencyUserId = resolveEmergencyAgency(sourceMetadata);
    return {
      userId: agencyUserId,
      reporterId: agencyUserId,
      isSystemAccount: true
    };
  }
  if (source === "legacy") {
    return {
      userId: SYSTEM_USER_IDS.LEGACY_SYSTEM,
      reporterId: SYSTEM_USER_IDS.LEGACY_SYSTEM,
      isSystemAccount: true
    };
  }
  if (source === "user" && !userHint) {
    throw new Error(`User incident missing required userHint for attribution`);
  }
  throw new Error(`Unable to resolve attribution for source: ${source}, userHint: ${userHint}`);
}
function resolveEmergencyAgency(metadata = {}) {
  return SYSTEM_USER_IDS.QFES;
}
var unifiedIncidents, insertUnifiedIncidentSchema, CURRENT_TERMS_VERSION, sessions, users, trafficEvents, incidents, comments, neighborhoodGroups, userNeighborhoodGroups, emergencyContacts, incidentFollowUps, categories, subcategories, commentVotes, safetyCheckIns, conversations, messages, notifications, reports, incidentComments, usersRelations, incidentsRelations, categoriesRelations, subcategoriesRelations, commentsRelations, incidentFollowUpsRelations, neighborhoodGroupsRelations, userNeighborhoodGroupsRelations, emergencyContactsRelations, commentVotesRelations, safetyCheckInsRelations, conversationsRelations, messagesRelations, notificationsRelations, reportsRelations, insertUserSchema, insertTrafficEventSchema, insertIncidentSchema, insertCommentSchema, insertIncidentCommentSchema, insertNeighborhoodGroupSchema, insertUserNeighborhoodGroupSchema, insertEmergencyContactSchema, insertCommentVoteSchema, insertSafetyCheckInSchema, insertConversationSchema, insertMessageSchema, insertNotificationSchema, insertCategorySchema, insertSubcategorySchema, insertIncidentFollowUpSchema, insertReportSchema, adCampaigns, adViews, adClicks, billingPlans, billingCycles, payments, campaignAnalytics, SYSTEM_USER_IDS;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    unifiedIncidents = pgTable("unified_incidents", {
      id: varchar("id").primaryKey(),
      // Composite ID: source:sourceId (generated in app layer)
      // Source identification
      source: varchar("source", { enum: ["tmr", "emergency", "user"] }).notNull(),
      sourceId: varchar("source_id").notNull(),
      // Original ID from source system
      // Core incident data
      title: text("title").notNull(),
      description: text("description"),
      location: text("location"),
      // Human-readable location
      category: varchar("category").notNull(),
      // traffic, fire, medical, crime, etc.
      subcategory: varchar("subcategory"),
      // congestion, accident, structure-fire, etc.
      severity: varchar("severity", { enum: ["low", "medium", "high", "critical"] }).default("medium"),
      status: varchar("status", { enum: ["active", "resolved", "monitoring", "closed"] }).default("active"),
      // Spatial data
      geometry: jsonb("geometry").notNull(),
      // Original GeoJSON geometry
      centroidLat: doublePrecision("centroid_lat").notNull(),
      // Computed centroid for fast lookups
      centroidLng: doublePrecision("centroid_lng").notNull(),
      regionIds: text("region_ids").array().default([]),
      // Pre-computed region assignments
      geocell: varchar("geocell"),
      // Spatial grid cell for fast regional queries
      // Temporal data
      incidentTime: timestamp("incident_time"),
      // When incident actually occurred
      lastUpdated: timestamp("last_updated").notNull().defaultNow(),
      publishedAt: timestamp("published_at").notNull().defaultNow(),
      expiresAt: timestamp("expires_at"),
      // For auto-cleanup of old incidents
      // Source-specific data
      properties: jsonb("properties").notNull().default("{}"),
      // Original properties from source
      // User-reported specific fields
      userId: varchar("user_id"),
      // Only for user reports
      photoUrl: text("photo_url"),
      // Only for user reports
      verificationStatus: varchar("verification_status", { enum: ["unverified", "community_verified", "official_verified"] }),
      // System fields
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      version: integer("version").default(1)
      // For optimistic concurrency
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
      index("idx_unified_region").using("gin", table.regionIds),
      // GIN index for array queries
      index("idx_unified_time").on(table.incidentTime),
      index("idx_unified_updated").on(table.lastUpdated)
    ]);
    insertUnifiedIncidentSchema = createInsertSchema(unifiedIncidents).omit({
      id: true,
      // Auto-generated from source + sourceId
      createdAt: true,
      updatedAt: true,
      version: true
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
      regionIds: z.array(z.string()).default([])
    });
    CURRENT_TERMS_VERSION = "1.1";
    sessions = pgTable(
      "sessions",
      {
        sid: varchar("sid").primaryKey(),
        sess: jsonb("sess").notNull(),
        expire: timestamp("expire").notNull()
      },
      (table) => [index("IDX_session_expire").on(table.expire)]
    );
    users = pgTable("users", {
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
      locationSharingLevel: varchar("location_sharing_level").default("suburb"),
      // 'exact' | 'suburb' | 'private'
      profileVisibility: varchar("profile_visibility").default("community"),
      // 'public' | 'community' | 'private'
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
      role: varchar("role").default("user"),
      // 'user' | 'admin'
      isOfficialAgency: boolean("is_official_agency").default(false),
      // Mark agency accounts
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    trafficEvents = pgTable("traffic_events", {
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
      alertMessage: text("alert_message")
    });
    incidents = pgTable("incidents", {
      id: varchar("id").primaryKey(),
      incidentType: text("incident_type").notNull(),
      categoryId: varchar("category_id"),
      // New hierarchical category
      subcategoryId: varchar("subcategory_id"),
      // New hierarchical subcategory
      title: text("title").notNull(),
      description: text("description"),
      location: text("location"),
      status: text("status").notNull(),
      priority: text("priority"),
      agency: text("agency"),
      photoUrl: text("photo_url"),
      // Photo uploaded with incident
      geometry: jsonb("geometry"),
      properties: jsonb("properties"),
      lastUpdated: timestamp("last_updated").notNull(),
      publishedDate: timestamp("published_date")
    });
    comments = pgTable("comments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      incidentId: varchar("incident_id").notNull(),
      userId: varchar("user_id").notNull(),
      parentCommentId: varchar("parent_comment_id"),
      content: text("content").notNull(),
      helpfulScore: integer("helpful_score").default(0),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    neighborhoodGroups = pgTable("neighborhood_groups", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: varchar("name").notNull(),
      suburb: varchar("suburb").notNull(),
      description: text("description"),
      memberCount: integer("member_count").default(0),
      isPrivate: boolean("is_private").default(false),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    userNeighborhoodGroups = pgTable("user_neighborhood_groups", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull(),
      groupId: varchar("group_id").notNull(),
      role: varchar("role").default("member"),
      // 'member' | 'moderator' | 'admin'
      joinedAt: timestamp("joined_at").defaultNow()
    });
    emergencyContacts = pgTable("emergency_contacts", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull(),
      contactUserId: varchar("contact_user_id"),
      // If contact is also a user
      contactName: varchar("contact_name").notNull(),
      contactPhone: varchar("contact_phone"),
      relationship: varchar("relationship"),
      // 'family' | 'friend' | 'neighbor' | 'colleague'
      createdAt: timestamp("created_at").defaultNow()
    });
    incidentFollowUps = pgTable("incident_follow_ups", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      incidentId: varchar("incident_id").notNull(),
      userId: varchar("user_id").notNull(),
      // Must be original reporter
      status: varchar("status").notNull(),
      // 'in_progress' | 'resolved' | 'escalated' | 'closed'
      description: text("description").notNull(),
      photoUrl: text("photo_url"),
      // Optional follow-up photo
      createdAt: timestamp("created_at").defaultNow()
    });
    categories = pgTable("categories", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: varchar("name").notNull(),
      description: text("description"),
      icon: varchar("icon"),
      // Icon name for UI
      color: varchar("color"),
      // Color for UI markers
      order: integer("order").default(0),
      // Display order
      isActive: boolean("is_active").default(true),
      requiresApproval: boolean("requires_approval").default(false),
      // For new categories
      createdAt: timestamp("created_at").defaultNow()
    });
    subcategories = pgTable("subcategories", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      categoryId: varchar("category_id").notNull(),
      name: varchar("name").notNull(),
      description: text("description"),
      icon: varchar("icon"),
      reportCount: integer("report_count").default(0),
      // For threshold-based display
      isActive: boolean("is_active").default(true),
      order: integer("order").default(0),
      createdAt: timestamp("created_at").defaultNow()
    });
    commentVotes = pgTable("comment_votes", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      commentId: varchar("comment_id").notNull(),
      userId: varchar("user_id").notNull(),
      voteType: varchar("vote_type").notNull(),
      // 'helpful' | 'not_helpful'
      createdAt: timestamp("created_at").defaultNow()
    });
    safetyCheckIns = pgTable("safety_check_ins", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull(),
      incidentId: varchar("incident_id"),
      status: varchar("status").notNull(),
      // 'safe' | 'needs_help' | 'evacuated'
      location: varchar("location"),
      message: text("message"),
      isVisible: boolean("is_visible").default(true),
      createdAt: timestamp("created_at").defaultNow()
    });
    conversations = pgTable("conversations", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      user1Id: varchar("user1_id").notNull(),
      user2Id: varchar("user2_id").notNull(),
      lastMessageAt: timestamp("last_message_at").defaultNow(),
      createdAt: timestamp("created_at").defaultNow()
    });
    messages = pgTable("messages", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      conversationId: varchar("conversation_id").notNull(),
      senderId: varchar("sender_id").notNull(),
      content: text("content").notNull(),
      isRead: boolean("is_read").default(false),
      createdAt: timestamp("created_at").defaultNow()
    });
    notifications = pgTable("notifications", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull(),
      // Who receives the notification
      type: varchar("type").notNull(),
      // 'comment_reply' | 'new_comment' | 'mention' | 'message'
      title: varchar("title").notNull(),
      message: text("message").notNull(),
      entityId: varchar("entity_id"),
      // ID of the related item (comment, incident, message, etc.)
      entityType: varchar("entity_type"),
      // 'comment' | 'incident' | 'message'
      fromUserId: varchar("from_user_id"),
      // Who triggered the notification
      isRead: boolean("is_read").default(false),
      createdAt: timestamp("created_at").defaultNow()
    });
    reports = pgTable("reports", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      reporterId: varchar("reporter_id").notNull(),
      // User who submitted the report
      entityType: varchar("entity_type").notNull(),
      // 'incident' | 'comment'
      entityId: varchar("entity_id").notNull(),
      // ID of the reported content
      reason: varchar("reason").notNull(),
      // 'spam' | 'inappropriate' | 'harassment' | 'false_information' | 'other'
      description: text("description"),
      // Optional additional details
      status: varchar("status").notNull().default("pending"),
      // 'pending' | 'reviewed' | 'resolved' | 'dismissed'
      moderatorId: varchar("moderator_id"),
      // Admin who handled the report
      moderatorNotes: text("moderator_notes"),
      // Admin notes
      resolvedAt: timestamp("resolved_at"),
      createdAt: timestamp("created_at").defaultNow()
    });
    incidentComments = pgTable("incident_comments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      incidentId: varchar("incident_id").notNull(),
      // References unified_incidents.id
      userId: varchar("user_id").notNull(),
      // References users.id
      parentCommentId: varchar("parent_comment_id"),
      // References incident_comments.id for nested replies
      content: text("content").notNull(),
      // Content validation in Zod schema
      photoUrl: text("photo_url"),
      // Optional photo attachment (legacy single photo)
      photoUrls: text("photo_urls").array().default([]),
      // Multiple photo attachments (up to 3)
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => [
      // Performance indexes for comment queries
      index("idx_incident_comments_incident_time").on(table.incidentId, table.createdAt.desc()),
      index("idx_incident_comments_user").on(table.userId, table.incidentId),
      index("idx_incident_comments_parent").on(table.parentCommentId)
    ]);
    usersRelations = relations(users, ({ many }) => ({
      comments: many(comments),
      neighborhoodGroups: many(userNeighborhoodGroups),
      emergencyContacts: many(emergencyContacts),
      commentVotes: many(commentVotes),
      safetyCheckIns: many(safetyCheckIns),
      sentMessages: many(messages),
      conversations1: many(conversations, { relationName: "user1" }),
      conversations2: many(conversations, { relationName: "user2" }),
      notifications: many(notifications),
      incidentFollowUps: many(incidentFollowUps),
      submittedReports: many(reports, { relationName: "reporter" }),
      moderatedReports: many(reports, { relationName: "moderator" })
    }));
    incidentsRelations = relations(incidents, ({ one, many }) => ({
      comments: many(comments),
      safetyCheckIns: many(safetyCheckIns),
      followUps: many(incidentFollowUps),
      category: one(categories, {
        fields: [incidents.categoryId],
        references: [categories.id]
      }),
      subcategory: one(subcategories, {
        fields: [incidents.subcategoryId],
        references: [subcategories.id]
      })
    }));
    categoriesRelations = relations(categories, ({ many }) => ({
      subcategories: many(subcategories),
      incidents: many(incidents)
    }));
    subcategoriesRelations = relations(subcategories, ({ one, many }) => ({
      category: one(categories, {
        fields: [subcategories.categoryId],
        references: [categories.id]
      }),
      incidents: many(incidents)
    }));
    commentsRelations = relations(comments, ({ one, many }) => ({
      incident: one(incidents, {
        fields: [comments.incidentId],
        references: [incidents.id]
      }),
      user: one(users, {
        fields: [comments.userId],
        references: [users.id]
      }),
      parentComment: one(comments, {
        fields: [comments.parentCommentId],
        references: [comments.id]
      }),
      replies: many(comments),
      votes: many(commentVotes)
    }));
    incidentFollowUpsRelations = relations(incidentFollowUps, ({ one }) => ({
      incident: one(incidents, {
        fields: [incidentFollowUps.incidentId],
        references: [incidents.id]
      }),
      user: one(users, {
        fields: [incidentFollowUps.userId],
        references: [users.id]
      })
    }));
    neighborhoodGroupsRelations = relations(neighborhoodGroups, ({ many }) => ({
      members: many(userNeighborhoodGroups)
    }));
    userNeighborhoodGroupsRelations = relations(userNeighborhoodGroups, ({ one }) => ({
      user: one(users, {
        fields: [userNeighborhoodGroups.userId],
        references: [users.id]
      }),
      group: one(neighborhoodGroups, {
        fields: [userNeighborhoodGroups.groupId],
        references: [neighborhoodGroups.id]
      })
    }));
    emergencyContactsRelations = relations(emergencyContacts, ({ one }) => ({
      user: one(users, {
        fields: [emergencyContacts.userId],
        references: [users.id]
      }),
      contactUser: one(users, {
        fields: [emergencyContacts.contactUserId],
        references: [users.id]
      })
    }));
    commentVotesRelations = relations(commentVotes, ({ one }) => ({
      comment: one(comments, {
        fields: [commentVotes.commentId],
        references: [comments.id]
      }),
      user: one(users, {
        fields: [commentVotes.userId],
        references: [users.id]
      })
    }));
    safetyCheckInsRelations = relations(safetyCheckIns, ({ one }) => ({
      user: one(users, {
        fields: [safetyCheckIns.userId],
        references: [users.id]
      }),
      incident: one(incidents, {
        fields: [safetyCheckIns.incidentId],
        references: [incidents.id]
      })
    }));
    conversationsRelations = relations(conversations, ({ one, many }) => ({
      user1: one(users, {
        fields: [conversations.user1Id],
        references: [users.id],
        relationName: "user1"
      }),
      user2: one(users, {
        fields: [conversations.user2Id],
        references: [users.id],
        relationName: "user2"
      }),
      messages: many(messages)
    }));
    messagesRelations = relations(messages, ({ one }) => ({
      conversation: one(conversations, {
        fields: [messages.conversationId],
        references: [conversations.id]
      }),
      sender: one(users, {
        fields: [messages.senderId],
        references: [users.id]
      })
    }));
    notificationsRelations = relations(notifications, ({ one }) => ({
      user: one(users, {
        fields: [notifications.userId],
        references: [users.id]
      }),
      fromUser: one(users, {
        fields: [notifications.fromUserId],
        references: [users.id]
      })
    }));
    reportsRelations = relations(reports, ({ one }) => ({
      reporter: one(users, {
        fields: [reports.reporterId],
        references: [users.id],
        relationName: "reporter"
      }),
      moderator: one(users, {
        fields: [reports.moderatorId],
        references: [users.id],
        relationName: "moderator"
      })
    }));
    insertUserSchema = createInsertSchema(users).omit({
      createdAt: true,
      updatedAt: true
    });
    insertTrafficEventSchema = createInsertSchema(trafficEvents).omit({
      id: true,
      lastUpdated: true
    });
    insertIncidentSchema = createInsertSchema(incidents).omit({
      id: true,
      lastUpdated: true
    });
    insertCommentSchema = createInsertSchema(comments).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertIncidentCommentSchema = createInsertSchema(incidentComments).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    }).extend({
      content: z.string().min(1, "Comment cannot be empty").max(1e3, "Comment too long"),
      photoUrls: z.array(z.string().url()).max(3, "Maximum 3 photos per comment").optional()
    });
    insertNeighborhoodGroupSchema = createInsertSchema(neighborhoodGroups).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertUserNeighborhoodGroupSchema = createInsertSchema(userNeighborhoodGroups).omit({
      id: true,
      joinedAt: true
    });
    insertEmergencyContactSchema = createInsertSchema(emergencyContacts).omit({
      id: true,
      createdAt: true
    });
    insertCommentVoteSchema = createInsertSchema(commentVotes).omit({
      id: true,
      createdAt: true
    });
    insertSafetyCheckInSchema = createInsertSchema(safetyCheckIns).omit({
      id: true,
      createdAt: true
    });
    insertConversationSchema = createInsertSchema(conversations).omit({
      id: true,
      createdAt: true,
      lastMessageAt: true
    });
    insertMessageSchema = createInsertSchema(messages).omit({
      id: true,
      createdAt: true
    });
    insertNotificationSchema = createInsertSchema(notifications).omit({
      id: true,
      createdAt: true
    });
    insertCategorySchema = createInsertSchema(categories).omit({
      id: true,
      createdAt: true
    });
    insertSubcategorySchema = createInsertSchema(subcategories).omit({
      id: true,
      createdAt: true
    });
    insertIncidentFollowUpSchema = createInsertSchema(incidentFollowUps).omit({
      id: true,
      createdAt: true
    });
    insertReportSchema = createInsertSchema(reports).omit({
      id: true,
      createdAt: true,
      resolvedAt: true
    });
    adCampaigns = pgTable("ad_campaigns", {
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
      updatedAt: timestamp("updated_at").defaultNow()
    });
    adViews = pgTable("ad_views", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      adCampaignId: varchar("ad_campaign_id").references(() => adCampaigns.id),
      userId: varchar("user_id").references(() => users.id),
      durationMs: integer("duration_ms").notNull(),
      userSuburb: varchar("user_suburb", { length: 100 }),
      ipAddress: varchar("ip_address"),
      userAgent: text("user_agent"),
      viewedAt: timestamp("viewed_at").notNull(),
      date: varchar("date").notNull()
    }, (table) => ({
      campaignDateIdx: index("idx_ad_campaign_date").on(table.adCampaignId, table.date),
      userDateIdx: index("idx_ad_user_date").on(table.userId, table.date)
    }));
    adClicks = pgTable("ad_clicks", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      adCampaignId: varchar("ad_campaign_id").references(() => adCampaigns.id),
      userId: varchar("user_id").references(() => users.id),
      ipAddress: varchar("ip_address"),
      clickedAt: timestamp("clicked_at").notNull()
    });
    billingPlans = pgTable("billing_plans", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: varchar("name").notNull(),
      // "Basic Daily", "Premium Daily"
      description: text("description"),
      pricePerDay: text("price_per_day").notNull(),
      // $8.00, stored as string for precision
      minimumDays: integer("minimum_days").default(7),
      // 7-day minimum
      features: jsonb("features"),
      // Array of features included
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow()
    });
    billingCycles = pgTable("billing_cycles", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      campaignId: varchar("campaign_id").notNull(),
      planId: varchar("plan_id").notNull(),
      businessId: varchar("business_id").notNull(),
      // User ID for business account
      status: varchar("status").notNull().default("active"),
      // 'active' | 'paused' | 'cancelled' | 'expired'
      startDate: timestamp("start_date").notNull(),
      endDate: timestamp("end_date"),
      dailyRate: text("daily_rate").notNull(),
      // Current daily rate (allows for historical pricing)
      totalDays: integer("total_days"),
      totalAmount: text("total_amount"),
      stripeCustomerId: varchar("stripe_customer_id"),
      stripeSubscriptionId: varchar("stripe_subscription_id"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => ({
      businessDateIdx: index("idx_billing_business_date").on(table.businessId, table.startDate),
      campaignIdx: index("idx_billing_campaign").on(table.campaignId)
    }));
    payments = pgTable("payments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      billingCycleId: varchar("billing_cycle_id").notNull(),
      businessId: varchar("business_id").notNull(),
      amount: text("amount").notNull(),
      // Payment amount in dollars
      currency: varchar("currency", { length: 3 }).default("AUD"),
      status: varchar("status").notNull(),
      // 'pending' | 'completed' | 'failed' | 'refunded'
      paymentMethod: varchar("payment_method").notNull(),
      // 'stripe'
      stripePaymentIntentId: varchar("stripe_payment_intent_id"),
      stripeInvoiceId: varchar("stripe_invoice_id"),
      failureReason: text("failure_reason"),
      paidAt: timestamp("paid_at"),
      daysCharged: integer("days_charged"),
      // Number of days this payment covers
      periodStart: timestamp("period_start"),
      periodEnd: timestamp("period_end"),
      createdAt: timestamp("created_at").defaultNow()
    }, (table) => ({
      businessDateIdx: index("idx_payments_business_date").on(table.businessId, table.paidAt),
      statusIdx: index("idx_payments_status").on(table.status)
    }));
    campaignAnalytics = pgTable("campaign_analytics", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      campaignId: varchar("campaign_id").notNull(),
      date: varchar("date").notNull(),
      // YYYY-MM-DD format
      totalViews: integer("total_views").default(0),
      uniqueViews: integer("unique_views").default(0),
      totalClicks: integer("total_clicks").default(0),
      uniqueClicks: integer("unique_clicks").default(0),
      ctr: text("ctr").default("0"),
      // Click-through rate as percentage
      impressionDuration: integer("impression_duration").default(0),
      // Average view duration in ms
      costPerView: text("cost_per_view").default("0"),
      costPerClick: text("cost_per_click").default("0"),
      totalSpent: text("total_spent").default("0"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => ({
      campaignDateIdx: index("idx_campaign_analytics_date").on(table.campaignId, table.date)
    }));
    SYSTEM_USER_IDS = {
      // Agency accounts for official sources
      TMR: "tmr-agency-account-001",
      QFES: "qfes-agency-account-001",
      QAS: "qas-agency-account-001",
      QPS: "qps-agency-account-001",
      // Legacy system account for historical incidents without attribution
      LEGACY_SYSTEM: "legacy-system-account-001"
    };
  }
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    neonConfig.webSocketConstructor = ws;
    neonConfig.useSecureWebSocket = true;
    neonConfig.pipelineConnect = false;
    neonConfig.pipelineTLS = false;
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      // Maximum number of connections in pool
      min: 2,
      // Minimum number of connections to maintain
      idleTimeoutMillis: 3e4,
      // Close idle connections after 30 seconds
      connectionTimeoutMillis: 1e4,
      // Timeout connection attempts after 10 seconds
      maxUses: 7500,
      // Connection maximum reuse count before refresh
      allowExitOnIdle: true
      // Allow process to exit when all connections idle
    });
    db = drizzle({ client: pool, schema: schema_exports });
    pool.on("connect", (client2) => {
      console.log("\u{1F517} Database connection established");
    });
    pool.on("error", (err) => {
      console.error("\u{1F4A5} Database pool error:", err);
    });
    pool.on("remove", () => {
      console.log("\u{1F50C} Database connection removed from pool");
    });
    process.on("SIGTERM", () => {
      console.log("\u{1F6D1} SIGTERM received, closing database pool...");
      pool.end().then(() => {
        console.log("\u2705 Database pool closed");
        process.exit(0);
      });
    });
    process.on("SIGINT", () => {
      console.log("\u{1F6D1} SIGINT received, closing database pool...");
      pool.end().then(() => {
        console.log("\u2705 Database pool closed");
        process.exit(0);
      });
    });
  }
});

// server/spatial-lookup.ts
function generateGeocell(lat, lng, precision = 3) {
  const latStep = Math.pow(10, -precision);
  const lngStep = Math.pow(10, -precision);
  const quantizedLat = Math.floor(lat / latStep) * latStep;
  const quantizedLng = Math.floor(lng / lngStep) * lngStep;
  return `${precision}_${quantizedLat.toFixed(precision)}_${quantizedLng.toFixed(precision)}`;
}
function getGeoceellsInBoundingBox(southWest, northEast, precision = 3) {
  const [swLat, swLng] = southWest;
  const [neLat, neLng] = northEast;
  const latStep = Math.pow(10, -precision);
  const lngStep = Math.pow(10, -precision);
  const geocells = [];
  for (let lat = Math.floor(swLat / latStep) * latStep; lat <= neLat; lat += latStep) {
    for (let lng = Math.floor(swLng / lngStep) * lngStep; lng <= neLng; lng += lngStep) {
      geocells.push(generateGeocell(lat, lng, precision));
    }
  }
  return geocells;
}
function computeGeocellForIncident(incident) {
  return generateGeocell(incident.centroidLat, incident.centroidLng);
}
var LRUCache, SpatialLookupEngine, spatialLookup;
var init_spatial_lookup = __esm({
  "server/spatial-lookup.ts"() {
    "use strict";
    LRUCache = class {
      cache = /* @__PURE__ */ new Map();
      maxSize;
      maxAge;
      // in milliseconds
      hits = 0;
      misses = 0;
      constructor(maxSize = 100, maxAgeMinutes = 5) {
        this.maxSize = maxSize;
        this.maxAge = maxAgeMinutes * 60 * 1e3;
      }
      set(key, value) {
        this.cleanup();
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
          const oldestKey = this.getOldestKey();
          if (oldestKey) {
            this.cache.delete(oldestKey);
          }
        }
        this.cache.set(key, {
          data: value,
          timestamp: Date.now(),
          accessCount: 1
        });
      }
      get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
          this.misses++;
          return void 0;
        }
        if (Date.now() - entry.timestamp > this.maxAge) {
          this.cache.delete(key);
          this.misses++;
          return void 0;
        }
        this.hits++;
        entry.accessCount++;
        entry.timestamp = Date.now();
        return entry.data;
      }
      cleanup() {
        const now = Date.now();
        Array.from(this.cache.entries()).forEach(([key, entry]) => {
          if (now - entry.timestamp > this.maxAge) {
            this.cache.delete(key);
          }
        });
      }
      getOldestKey() {
        let oldestKey;
        let oldestTime = Date.now();
        Array.from(this.cache.entries()).forEach(([key, entry]) => {
          if (entry.timestamp < oldestTime) {
            oldestTime = entry.timestamp;
            oldestKey = key;
          }
        });
        return oldestKey;
      }
      clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
      }
      getStats() {
        const totalRequests = this.hits + this.misses;
        return {
          size: this.cache.size,
          maxSize: this.maxSize,
          hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
          hits: this.hits,
          misses: this.misses,
          totalRequests
        };
      }
    };
    SpatialLookupEngine = class {
      cache = new LRUCache(50, 2);
      // 50 entries, 2 min TTL
      incidents = [];
      lastDataHash = "";
      /**
       * Load incidents into the spatial engine
       * Only clears cache when data actually changes
       */
      loadIncidents(incidents2) {
        const dataHash = this.createDataHash(incidents2);
        if (dataHash !== this.lastDataHash) {
          this.incidents = incidents2;
          this.lastDataHash = dataHash;
          this.cache.clear();
          this.ensureGeoceells();
        }
      }
      /**
       * Create a simple hash of incident data for change detection
       */
      createDataHash(incidents2) {
        const timestamps = incidents2.map((i) => i.lastUpdated.getTime()).sort();
        return `${incidents2.length}_${timestamps[0] || 0}_${timestamps[timestamps.length - 1] || 0}`;
      }
      /**
       * Execute 3-stage spatial lookup with caching
       */
      query(query) {
        const startTime = Date.now();
        const cacheKey = this.generateCacheKey(query);
        const cached = this.cache.get(cacheKey);
        if (cached) {
          return {
            ...cached,
            stats: {
              ...cached.stats,
              cacheHit: true,
              queryTimeMs: Date.now() - startTime
            }
          };
        }
        const result = this.executeQuery(query);
        result.stats.queryTimeMs = Date.now() - startTime;
        result.stats.cacheHit = false;
        this.cache.set(cacheKey, result);
        return result;
      }
      executeQuery(query) {
        let candidates = this.incidents;
        let stage1Count = candidates.length;
        let stage2Count = candidates.length;
        let stage3Count = candidates.length;
        if (query.boundingBox) {
          const geocells = getGeoceellsInBoundingBox(
            query.boundingBox.southWest,
            query.boundingBox.northEast,
            3
            // precision
          );
          candidates = candidates.filter(
            (incident) => !incident.geocell || geocells.includes(incident.geocell)
          );
          stage1Count = candidates.length;
        }
        if (query.boundingBox) {
          const [swLat, swLng] = query.boundingBox.southWest;
          const [neLat, neLng] = query.boundingBox.northEast;
          candidates = candidates.filter(
            (incident) => incident.centroidLat >= swLat && incident.centroidLat <= neLat && incident.centroidLng >= swLng && incident.centroidLng <= neLng
          );
          stage2Count = candidates.length;
        }
        if (query.regionId) {
          candidates = candidates.filter(
            (incident) => incident.regionIds && incident.regionIds.includes(query.regionId)
          );
          stage3Count = candidates.length;
        }
        if (query.category) {
          candidates = candidates.filter((incident) => incident.category === query.category);
        }
        if (query.source) {
          candidates = candidates.filter((incident) => incident.source === query.source);
        }
        if (query.since) {
          candidates = candidates.filter(
            (incident) => incident.lastUpdated && new Date(incident.lastUpdated) >= query.since
          );
        }
        if (query.activeOnly) {
          candidates = candidates.filter(
            (incident) => incident.status === "active" || incident.status === "monitoring"
          );
        }
        return {
          incidents: candidates,
          stats: {
            totalFound: candidates.length,
            stage1Filtered: stage1Count,
            stage2Filtered: stage2Count,
            stage3Filtered: stage3Count,
            cacheHit: false,
            queryTimeMs: 0
            // Set by caller
          }
        };
      }
      generateCacheKey(query) {
        const parts = [
          query.boundingBox ? `bbox:${query.boundingBox.southWest.join(",")}-${query.boundingBox.northEast.join(",")}` : "",
          query.regionId ? `region:${query.regionId}` : "",
          query.category ? `cat:${query.category}` : "",
          query.source ? `src:${query.source}` : "",
          query.since ? `since:${query.since.getTime()}` : "",
          query.activeOnly ? "active" : ""
        ].filter(Boolean);
        return parts.join("|");
      }
      /**
       * Get cache statistics
       */
      getCacheStats() {
        return this.cache.getStats();
      }
      /**
       * Update geocells for incidents missing them
       */
      ensureGeoceells() {
        for (const incident of this.incidents) {
          if (!incident.geocell && incident.centroidLat && incident.centroidLng) {
            incident.geocell = generateGeocell(incident.centroidLat, incident.centroidLng);
          }
        }
      }
      /**
       * Check if spatial index has data loaded
       */
      hasData() {
        return this.incidents.length > 0;
      }
      /**
       * Get current data statistics
       */
      getDataStats() {
        const withGeocells = this.incidents.filter((i) => i.geocell).length;
        return {
          incidentCount: this.incidents.length,
          withGeocells,
          dataHash: this.lastDataHash
        };
      }
    };
    spatialLookup = new SpatialLookupEngine();
  }
});

// server/storage.ts
import { eq, desc, and, or, ne, sql as sql2, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
var DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    init_db();
    init_spatial_lookup();
    DatabaseStorage = class {
      async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
      }
      async getUserByEmail(email) {
        const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
        return user;
      }
      async createUser(userData) {
        const [user] = await db.insert(users).values(userData).returning();
        return user;
      }
      async createTestBusinessUser() {
        const hashedPassword = await bcrypt.hash("Coffee123!", 10);
        const testBusinessData = {
          id: "test-business-001",
          email: "sarah.mitchell@sunshinecoastcoffee.com.au",
          password: hashedPassword,
          firstName: "Sarah",
          lastName: "Mitchell",
          profileImageUrl: null,
          homeSuburb: "Caloundra",
          primarySuburb: "Caloundra",
          accountType: "business",
          businessName: "Sunshine Coast Coffee Co.",
          businessCategory: "Restaurant & Food",
          businessDescription: "Locally roasted coffee beans and specialty drinks serving the Sunshine Coast community",
          businessWebsite: "https://sunshinecoastcoffee.com.au",
          businessPhone: "(07) 5491 2345",
          businessAddress: "123 Bulcock Street, Caloundra QLD 4551",
          termsAccepted: true
        };
        const existingUser = await this.getUser(testBusinessData.id);
        if (existingUser) {
          return existingUser;
        }
        const [user] = await db.insert(users).values(testBusinessData).returning();
        return user;
      }
      async createAdminUser() {
        const hashedPassword = await bcrypt.hash("Admin123!", 10);
        const adminUserData = {
          id: "admin-001",
          email: "admin@qldsafety.com.au",
          password: hashedPassword,
          firstName: "Admin",
          lastName: "User",
          profileImageUrl: null,
          homeSuburb: "Brisbane",
          primarySuburb: "Brisbane",
          accountType: "regular",
          role: "admin",
          termsAccepted: true
        };
        const existingAdmin = await this.getUser(adminUserData.id);
        if (existingAdmin) {
          return existingAdmin;
        }
        const [adminUser] = await db.insert(users).values(adminUserData).returning();
        return adminUser;
      }
      // Password authentication methods implementation
      async createUserWithPassword(email, password, userData) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const userInsert = {
          email: email.toLowerCase(),
          password: hashedPassword,
          ...userData
        };
        const [user] = await db.insert(users).values(userInsert).returning();
        return user;
      }
      async authenticateUser(email, password) {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user || !user.password) {
          return null;
        }
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return null;
        }
        return user;
      }
      async upsertUser(userData) {
        const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: /* @__PURE__ */ new Date()
          }
        }).returning();
        return user;
      }
      async updateUserSuburb(id, homeSuburb) {
        const [updated] = await db.update(users).set({ homeSuburb, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
        return updated;
      }
      async acceptUserTerms(id) {
        const [updated] = await db.update(users).set({ termsAccepted: true, termsAcceptedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
        return updated;
      }
      async getTrafficEvents() {
        return await db.select().from(trafficEvents);
      }
      async createTrafficEvent(event) {
        const id = randomUUID();
        const [trafficEvent] = await db.insert(trafficEvents).values({
          ...event,
          id,
          lastUpdated: /* @__PURE__ */ new Date()
        }).returning();
        return trafficEvent;
      }
      async updateTrafficEvent(id, event) {
        const [updated] = await db.update(trafficEvents).set({ ...event, lastUpdated: /* @__PURE__ */ new Date() }).where(eq(trafficEvents.id, id)).returning();
        return updated;
      }
      async deleteTrafficEvent(id) {
        const result = await db.delete(trafficEvents).where(eq(trafficEvents.id, id));
        return (result.rowCount ?? 0) > 0;
      }
      async getIncidents() {
        return await db.select().from(incidents);
      }
      async getIncident(id) {
        const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
        return incident;
      }
      async getRecentIncidents(limit) {
        return await db.select().from(incidents).orderBy(desc(incidents.lastUpdated)).limit(limit);
      }
      async createIncident(incident) {
        const id = randomUUID();
        const [newIncident] = await db.insert(incidents).values({
          ...incident,
          id,
          lastUpdated: /* @__PURE__ */ new Date()
        }).returning();
        return newIncident;
      }
      async updateIncident(id, incident) {
        const [updated] = await db.update(incidents).set({ ...incident, lastUpdated: /* @__PURE__ */ new Date() }).where(eq(incidents.id, id)).returning();
        return updated;
      }
      async updateIncidentStatus(id, status) {
        const [updated] = await db.update(incidents).set({ status, lastUpdated: /* @__PURE__ */ new Date() }).where(eq(incidents.id, id)).returning();
        return updated;
      }
      async deleteIncident(id) {
        const result = await db.delete(incidents).where(eq(incidents.id, id));
        return (result.rowCount ?? 0) > 0;
      }
      // ============================================================================
      // UNIFIED INCIDENT OPERATIONS - Single source for all incident types
      // ============================================================================
      async getAllUnifiedIncidents() {
        return await db.select().from(unifiedIncidents).orderBy(desc(unifiedIncidents.lastUpdated));
      }
      async getUnifiedIncident(id) {
        const [incident] = await db.select().from(unifiedIncidents).where(eq(unifiedIncidents.id, id));
        return incident;
      }
      async getUnifiedIncidentsByRegion(regionId) {
        return await db.select().from(unifiedIncidents).where(sql2`${unifiedIncidents.regionIds} @> ARRAY[${regionId}]`).orderBy(desc(unifiedIncidents.lastUpdated));
      }
      async getUnifiedIncidentsBySource(source) {
        return await db.select().from(unifiedIncidents).where(eq(unifiedIncidents.source, source)).orderBy(desc(unifiedIncidents.lastUpdated));
      }
      async getUnifiedIncidentsByCategory(category) {
        return await db.select().from(unifiedIncidents).where(eq(unifiedIncidents.category, category)).orderBy(desc(unifiedIncidents.lastUpdated));
      }
      async createUnifiedIncident(incident) {
        const props = incident.properties || {};
        const attribution = resolveAttribution(
          incident.source,
          incident.userId,
          {
            title: incident.title,
            GroupedType: props.GroupedType,
            Jurisdiction: props.Jurisdiction,
            Master_Incident_Number: props.Master_Incident_Number
          }
        );
        const id = generateUnifiedIncidentId(incident.source, incident.sourceId);
        const [newIncident] = await db.insert(unifiedIncidents).values({
          source: incident.source,
          sourceId: incident.sourceId,
          title: incident.title,
          description: incident.description,
          location: incident.location,
          category: incident.category,
          subcategory: incident.subcategory,
          severity: incident.severity,
          status: incident.status,
          geometry: incident.geometry,
          centroidLat: incident.centroidLat,
          centroidLng: incident.centroidLng,
          regionIds: incident.regionIds,
          geocell: incident.geocell,
          incidentTime: incident.incidentTime,
          photoUrl: incident.photoUrl,
          verificationStatus: incident.verificationStatus,
          id,
          userId: attribution.userId,
          // Override with resolved attribution
          properties: {
            ...incident.properties || {},
            reporterId: attribution.reporterId,
            // Ensure reporterId in properties
            source: incident.source,
            userReported: !attribution.isSystemAccount
          },
          lastUpdated: /* @__PURE__ */ new Date(),
          publishedAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).returning();
        return newIncident;
      }
      async updateUnifiedIncident(id, incident) {
        const [updated] = await db.update(unifiedIncidents).set({
          ...incident,
          lastUpdated: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date(),
          version: sql2`${unifiedIncidents.version} + 1`
        }).where(eq(unifiedIncidents.id, id)).returning();
        return updated;
      }
      async upsertUnifiedIncident(source, sourceId, incident) {
        const props = incident.properties || {};
        const attribution = resolveAttribution(
          source,
          incident.userId,
          {
            title: incident.title,
            GroupedType: props.GroupedType,
            Jurisdiction: props.Jurisdiction,
            Master_Incident_Number: props.Master_Incident_Number
          }
        );
        const id = generateUnifiedIncidentId(source, sourceId);
        try {
          const [existing] = await db.select().from(unifiedIncidents).where(eq(unifiedIncidents.id, id)).limit(1);
          if (existing && existing.source !== "user" && source === "user") {
            console.log(`\u{1F6AB} DEDUP: Skipping user report ${id} - emergency/tmr incident already exists`);
            return existing;
          }
          const [upserted] = await db.insert(unifiedIncidents).values({
            title: incident.title,
            description: incident.description,
            location: incident.location,
            category: incident.category,
            subcategory: incident.subcategory,
            severity: incident.severity,
            status: incident.status,
            geometry: incident.geometry,
            centroidLat: incident.centroidLat,
            centroidLng: incident.centroidLng,
            regionIds: incident.regionIds,
            geocell: incident.geocell,
            incidentTime: incident.incidentTime,
            photoUrl: incident.photoUrl,
            verificationStatus: incident.verificationStatus,
            id,
            source,
            sourceId,
            userId: attribution.userId,
            // Override with resolved attribution
            properties: {
              ...incident.properties || {},
              reporterId: attribution.reporterId,
              // Ensure reporterId in properties
              source,
              userReported: !attribution.isSystemAccount
            },
            lastUpdated: /* @__PURE__ */ new Date(),
            publishedAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).onConflictDoUpdate({
            target: unifiedIncidents.id,
            // Use primary key instead of (source, sourceId)
            set: {
              title: incident.title,
              description: incident.description,
              location: incident.location,
              category: incident.category,
              subcategory: incident.subcategory,
              severity: incident.severity,
              status: incident.status,
              geometry: incident.geometry,
              centroidLat: incident.centroidLat,
              centroidLng: incident.centroidLng,
              regionIds: incident.regionIds,
              geocell: incident.geocell,
              incidentTime: incident.incidentTime,
              photoUrl: incident.photoUrl,
              verificationStatus: incident.verificationStatus,
              userId: attribution.userId,
              // Override with resolved attribution
              properties: {
                ...incident.properties || {},
                reporterId: attribution.reporterId,
                // Ensure reporterId in properties
                source,
                userReported: !attribution.isSystemAccount
              },
              lastUpdated: /* @__PURE__ */ new Date(),
              updatedAt: /* @__PURE__ */ new Date(),
              version: sql2`${unifiedIncidents.version} + 1`
            }
          }).returning();
          return upserted;
        } catch (error) {
          console.error(`\u274C Failed to upsert unified incident [${source}:${sourceId}] with id [${id}]:`, {
            error: error.message,
            code: error.code,
            detail: error.detail,
            sourceId,
            id
          });
          throw error;
        }
      }
      async deleteUnifiedIncident(id) {
        const result = await db.delete(unifiedIncidents).where(eq(unifiedIncidents.id, id));
        return (result.rowCount ?? 0) > 0;
      }
      async getUnifiedIncidentsInArea(southWest, northEast) {
        const [swLat, swLng] = southWest;
        const [neLat, neLng] = northEast;
        return await db.select().from(unifiedIncidents).where(
          and(
            sql2`${unifiedIncidents.centroidLat} >= ${swLat}`,
            sql2`${unifiedIncidents.centroidLat} <= ${neLat}`,
            sql2`${unifiedIncidents.centroidLng} >= ${swLng}`,
            sql2`${unifiedIncidents.centroidLng} <= ${neLng}`
          )
        ).orderBy(desc(unifiedIncidents.lastUpdated));
      }
      async getUnifiedIncidentsSince(timestamp2) {
        return await db.select().from(unifiedIncidents).where(sql2`${unifiedIncidents.lastUpdated} >= ${timestamp2}`).orderBy(desc(unifiedIncidents.lastUpdated));
      }
      async getActiveUnifiedIncidents() {
        return await db.select().from(unifiedIncidents).where(eq(unifiedIncidents.status, "active")).orderBy(desc(unifiedIncidents.lastUpdated));
      }
      async getUnifiedIncidentsAsGeoJSON() {
        const incidents2 = await this.getAllUnifiedIncidents();
        return this.convertIncidentsToGeoJSON(incidents2);
      }
      async getUnifiedIncidentsByRegionAsGeoJSON(regionId) {
        const incidents2 = await this.getUnifiedIncidentsByRegion(regionId);
        return this.convertIncidentsToGeoJSON(incidents2);
      }
      // Helper method to map category names to UUIDs for frontend icon matching
      getCategoryUuid(categoryName) {
        const categoryMap = {
          "Safety & Crime": "792759f4-1b98-4665-b14c-44a54e9969e9",
          "Infrastructure & Hazards": "9b1d58d9-cfd1-4c31-93e9-754276a5f265",
          "Emergency Situations": "54d31da5-fc10-4ad2-8eca-04bac680e668",
          "Wildlife & Nature": "d03f47a9-10fb-4656-ae73-92e959d7566a",
          "Community Issues": "deaca906-3561-4f80-b79f-ed99561c3b04",
          "Pets": "4ea3a6f0-c49e-4baf-9ca5-f074ca2811b0",
          "Lost & Found": "d1dfcd4e-48e9-4e58-9476-4782a2a132f3"
        };
        return categoryMap[categoryName];
      }
      // Helper method for GeoJSON conversion
      convertIncidentsToGeoJSON(incidents2) {
        const features = incidents2.map((incident) => {
          const categoryUuid = this.getCategoryUuid(incident.category);
          return {
            type: "Feature",
            id: incident.id,
            source: incident.source,
            // CRITICAL: Expose source at top level for isUserReport() function
            userId: incident.userId,
            // CRITICAL: Expose userId at top level for getReporterUserId() function
            photoUrl: incident.photoUrl,
            // CRITICAL: Expose photoUrl at top level for display in modals
            subcategory: incident.subcategory,
            // CRITICAL: Expose subcategory at top level for icon mapping
            properties: {
              id: incident.id,
              source: incident.source,
              title: incident.title,
              description: incident.description || void 0,
              category: incident.category,
              categoryUuid: categoryUuid || incident.category,
              // CRITICAL: Include UUID for frontend icon matching
              subcategory: incident.subcategory || void 0,
              severity: incident.severity || "medium",
              status: incident.status || "active",
              location: incident.location || void 0,
              incidentTime: incident.incidentTime?.toISOString(),
              lastUpdated: incident.lastUpdated.toISOString(),
              publishedAt: incident.publishedAt.toISOString(),
              regionIds: incident.regionIds || [],
              userId: incident.userId || void 0,
              photoUrl: incident.photoUrl || void 0,
              verificationStatus: incident.verificationStatus || void 0,
              // CRITICAL: Extract reporterId from JSONB properties for user attribution - fixed to use userId directly
              reporterId: incident.userId || incident.properties?.reporterId || void 0,
              // CRITICAL: Extract userReported flag from JSONB properties for proper classification
              userReported: incident.properties?.userReported || void 0,
              // CRITICAL: Extract categoryId and subcategoryId from properties for icon mapping
              categoryId: categoryUuid || incident.properties?.categoryId || incident.properties?.category || void 0,
              subcategoryId: incident.properties?.subcategoryId || incident.properties?.subcategory || void 0,
              // CRITICAL: Extract QFES-specific fields for proper categorization display
              GroupedType: incident.properties?.GroupedType || void 0,
              Incident_Type: incident.properties?.Incident_Type || void 0,
              Jurisdiction: incident.properties?.Jurisdiction || void 0,
              Master_Incident_Number: incident.properties?.Master_Incident_Number || void 0,
              originalProperties: incident.properties
            },
            geometry: incident.geometry
          };
        });
        const sourceCounts = incidents2.reduce((acc, incident) => {
          acc[incident.source] = (acc[incident.source] || 0) + 1;
          return acc;
        }, { tmr: 0, emergency: 0, user: 0 });
        const regionCounts = incidents2.reduce((acc, incident) => {
          incident.regionIds?.forEach((regionId) => {
            acc[regionId] = (acc[regionId] || 0) + 1;
          });
          return acc;
        }, {});
        return {
          type: "FeatureCollection",
          features,
          metadata: {
            total: incidents2.length,
            updated: (/* @__PURE__ */ new Date()).toISOString(),
            version: 1,
            sources: sourceCounts,
            regions: regionCounts
          }
        };
      }
      async getCommentsByIncidentId(incidentId) {
        return await db.select().from(comments).where(eq(comments.incidentId, incidentId)).orderBy(comments.createdAt);
      }
      async createComment(comment) {
        const id = randomUUID();
        const [newComment] = await db.insert(comments).values({
          ...comment,
          id,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).returning();
        return newComment;
      }
      async updateComment(id, comment) {
        const [updated] = await db.update(comments).set({ ...comment, updatedAt: /* @__PURE__ */ new Date() }).where(eq(comments.id, id)).returning();
        return updated;
      }
      async deleteComment(id) {
        const result = await db.delete(comments).where(eq(comments.id, id));
        return (result.rowCount ?? 0) > 0;
      }
      async getCommentById(id) {
        const [comment] = await db.select().from(comments).where(eq(comments.id, id));
        return comment;
      }
      // Enhanced user profile operations
      async updateUserProfile(id, profile) {
        const [updated] = await db.update(users).set({ ...profile, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
        return updated;
      }
      async upgradeToBusinessAccount(id, businessData) {
        const [updated] = await db.update(users).set({
          accountType: "business",
          businessName: businessData.businessName,
          businessCategory: businessData.businessCategory,
          businessDescription: businessData.businessDescription || null,
          businessWebsite: businessData.businessWebsite || null,
          businessPhone: businessData.businessPhone || null,
          businessAddress: businessData.businessAddress || null,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(users.id, id)).returning();
        return updated;
      }
      async completeUserSetup(userId, setupData) {
        const updateData = {
          accountType: setupData.accountType,
          updatedAt: /* @__PURE__ */ new Date()
        };
        if (setupData.accountType === "business") {
          updateData.businessName = setupData.businessName;
          updateData.businessCategory = setupData.businessCategory;
          updateData.businessDescription = setupData.businessDescription || null;
          updateData.businessWebsite = setupData.businessWebsite || null;
          updateData.businessPhone = setupData.businessPhone || null;
          updateData.businessAddress = setupData.businessAddress || null;
        }
        const [user] = await db.update(users).set(updateData).where(eq(users.id, userId)).returning();
        return user;
      }
      async getUsersBySuburb(suburb) {
        return await db.select().from(users).where(eq(users.primarySuburb, suburb));
      }
      async getUsersByIds(userIds) {
        if (!userIds.length) return [];
        const limitedIds = userIds.slice(0, 1e3);
        return await db.select().from(users).where(inArray(users.id, limitedIds));
      }
      // Comment voting operations
      async voteOnComment(vote) {
        const existingVote = await this.getUserVoteOnComment(vote.userId, vote.commentId);
        if (existingVote) {
          const [updated] = await db.update(commentVotes).set({ voteType: vote.voteType }).where(eq(commentVotes.id, existingVote.id)).returning();
          await this.updateCommentHelpfulScore(vote.commentId);
          return updated;
        } else {
          const [newVote] = await db.insert(commentVotes).values(vote).returning();
          await this.updateCommentHelpfulScore(vote.commentId);
          return newVote;
        }
      }
      async getUserVoteOnComment(userId, commentId) {
        const [vote] = await db.select().from(commentVotes).where(and(eq(commentVotes.userId, userId), eq(commentVotes.commentId, commentId)));
        return vote;
      }
      async updateCommentHelpfulScore(commentId) {
        const votes = await db.select().from(commentVotes).where(eq(commentVotes.commentId, commentId));
        const helpfulVotes = votes.filter((v) => v.voteType === "helpful").length;
        const notHelpfulVotes = votes.filter((v) => v.voteType === "not_helpful").length;
        const helpfulScore = helpfulVotes - notHelpfulVotes;
        await db.update(comments).set({ helpfulScore }).where(eq(comments.id, commentId));
      }
      // Neighborhood group operations
      async getNeighborhoodGroups() {
        return await db.select().from(neighborhoodGroups);
      }
      async getGroupsBySuburb(suburb) {
        return await db.select().from(neighborhoodGroups).where(eq(neighborhoodGroups.suburb, suburb));
      }
      async createNeighborhoodGroup(group) {
        const [newGroup] = await db.insert(neighborhoodGroups).values(group).returning();
        return newGroup;
      }
      async joinNeighborhoodGroup(membership) {
        const [newMembership] = await db.insert(userNeighborhoodGroups).values(membership).returning();
        return newMembership;
      }
      async leaveNeighborhoodGroup(userId, groupId) {
        const deleted = await db.delete(userNeighborhoodGroups).where(and(eq(userNeighborhoodGroups.userId, userId), eq(userNeighborhoodGroups.groupId, groupId)));
        return deleted.rowCount ? deleted.rowCount > 0 : false;
      }
      // Emergency contact operations
      async getEmergencyContacts(userId) {
        return await db.select().from(emergencyContacts).where(eq(emergencyContacts.userId, userId));
      }
      async createEmergencyContact(contact) {
        const [newContact] = await db.insert(emergencyContacts).values(contact).returning();
        return newContact;
      }
      async deleteEmergencyContact(id) {
        const deleted = await db.delete(emergencyContacts).where(eq(emergencyContacts.id, id));
        return deleted.rowCount ? deleted.rowCount > 0 : false;
      }
      // Safety check-in operations
      async createSafetyCheckIn(checkIn) {
        const [newCheckIn] = await db.insert(safetyCheckIns).values(checkIn).returning();
        return newCheckIn;
      }
      async getSafetyCheckIns(incidentId) {
        return await db.select().from(safetyCheckIns).where(and(eq(safetyCheckIns.incidentId, incidentId), eq(safetyCheckIns.isVisible, true))).orderBy(desc(safetyCheckIns.createdAt));
      }
      async getUserSafetyCheckIns(userId) {
        return await db.select().from(safetyCheckIns).where(eq(safetyCheckIns.userId, userId)).orderBy(desc(safetyCheckIns.createdAt));
      }
      // Messaging operations
      async getConversationsByUserId(userId) {
        return await db.select().from(conversations).where(
          or(
            eq(conversations.user1Id, userId),
            eq(conversations.user2Id, userId)
          )
        ).orderBy(desc(conversations.lastMessageAt));
      }
      async createConversation(conversation) {
        const [newConversation] = await db.insert(conversations).values({
          ...conversation,
          id: randomUUID(),
          createdAt: /* @__PURE__ */ new Date(),
          lastMessageAt: /* @__PURE__ */ new Date()
        }).returning();
        return newConversation;
      }
      async getConversationBetweenUsers(user1Id, user2Id) {
        const [conversation] = await db.select().from(conversations).where(
          and(
            eq(conversations.user1Id, user1Id),
            eq(conversations.user2Id, user2Id)
          )
        );
        if (conversation) {
          return conversation;
        }
        const [reverseConversation] = await db.select().from(conversations).where(
          and(
            eq(conversations.user1Id, user2Id),
            eq(conversations.user2Id, user1Id)
          )
        );
        return reverseConversation;
      }
      async getMessagesByConversationId(conversationId) {
        return await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(desc(messages.createdAt));
      }
      async createMessage(message) {
        const [newMessage] = await db.insert(messages).values({
          ...message,
          id: randomUUID(),
          createdAt: /* @__PURE__ */ new Date()
        }).returning();
        await db.update(conversations).set({ lastMessageAt: /* @__PURE__ */ new Date() }).where(eq(conversations.id, message.conversationId));
        return newMessage;
      }
      async markMessagesAsRead(conversationId, userId) {
        await db.update(messages).set({ isRead: true }).where(
          and(
            eq(messages.conversationId, conversationId),
            ne(messages.senderId, userId)
            // Only mark as read for messages NOT sent by the current user (i.e., received messages)
          )
        );
      }
      async getUnreadMessageCount(userId) {
        const conversations2 = await this.getConversationsByUserId(userId);
        let unreadCount = 0;
        for (const conversation of conversations2) {
          const unreadMessages = await db.select().from(messages).where(
            and(
              eq(messages.conversationId, conversation.id),
              eq(messages.isRead, false),
              ne(messages.senderId, userId)
            )
          );
          unreadCount += unreadMessages.length;
        }
        return unreadCount;
      }
      // Notification operations
      async getNotifications(userId, limit = 50) {
        return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
      }
      async getUnreadNotificationCount(userId) {
        const result = await db.select().from(notifications).where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );
        return result.length;
      }
      async createNotification(notification) {
        const [newNotification] = await db.insert(notifications).values({
          ...notification,
          id: randomUUID(),
          createdAt: /* @__PURE__ */ new Date()
        }).returning();
        return newNotification;
      }
      async markNotificationAsRead(notificationId, userId) {
        await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
      }
      async markAllNotificationsAsRead(userId) {
        await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
      }
      // Category operations
      async getCategories() {
        return await db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.order);
      }
      async createCategory(category) {
        const [created] = await db.insert(categories).values(category).returning();
        return created;
      }
      async getSubcategories(categoryId) {
        if (categoryId) {
          return await db.select().from(subcategories).where(and(
            eq(subcategories.isActive, true),
            eq(subcategories.categoryId, categoryId)
          )).orderBy(subcategories.order);
        } else {
          return await db.select().from(subcategories).where(eq(subcategories.isActive, true)).orderBy(subcategories.order);
        }
      }
      async createSubcategory(subcategory) {
        const [created] = await db.insert(subcategories).values(subcategory).returning();
        return created;
      }
      async incrementSubcategoryReportCount(subcategoryId) {
        try {
          await db.update(subcategories).set({
            reportCount: sql2`${subcategories.reportCount} + 1`
          }).where(eq(subcategories.id, subcategoryId));
        } catch (error) {
          console.log(`Failed to increment report count for subcategory ${subcategoryId}:`, error);
        }
      }
      async getIncidentFollowUps(incidentId) {
        return await db.select().from(incidentFollowUps).where(eq(incidentFollowUps.incidentId, incidentId)).orderBy(desc(incidentFollowUps.createdAt));
      }
      async createIncidentFollowUp(followUp) {
        const [created] = await db.insert(incidentFollowUps).values(followUp).returning();
        return created;
      }
      async createReport(report) {
        const [created] = await db.insert(reports).values(report).returning();
        return created;
      }
      async getReports(status) {
        if (status) {
          return await db.select().from(reports).where(eq(reports.status, status)).orderBy(desc(reports.createdAt));
        } else {
          return await db.select().from(reports).orderBy(desc(reports.createdAt));
        }
      }
      async updateReportStatus(reportId, status, moderatorId, moderatorNotes) {
        const updateData = {
          status,
          ...moderatorId && { moderatorId },
          ...moderatorNotes && { moderatorNotes }
        };
        if (status === "resolved" || status === "dismissed") {
          updateData.resolvedAt = /* @__PURE__ */ new Date();
        }
        const [updated] = await db.update(reports).set(updateData).where(eq(reports.id, reportId)).returning();
        return updated;
      }
      async getReportsByEntity(entityType, entityId) {
        return await db.select().from(reports).where(and(
          eq(reports.entityType, entityType),
          eq(reports.entityId, entityId)
        )).orderBy(desc(reports.createdAt));
      }
      // Ad Campaign Operations
      async getActiveAdsForSuburb(suburb, limit) {
        const campaigns = await db.select().from(adCampaigns).where(
          and(
            eq(adCampaigns.status, "active"),
            or(
              eq(adCampaigns.suburb, suburb),
              sql2`${suburb} = ANY(${adCampaigns.targetSuburbs})`
            )
          )
        ).limit(limit).orderBy(sql2`RANDOM()`);
        return campaigns;
      }
      async getAdCampaign(id) {
        const [campaign] = await db.select().from(adCampaigns).where(eq(adCampaigns.id, id));
        return campaign;
      }
      async getUserCampaigns(userId) {
        const user = await this.getUser(userId);
        if (!user || !user.businessName) {
          return [];
        }
        return await db.select().from(adCampaigns).where(eq(adCampaigns.businessName, user.businessName)).orderBy(desc(adCampaigns.createdAt));
      }
      async getUserCampaignAnalytics(userId) {
        const userCampaigns = await this.getUserCampaigns(userId);
        const analytics = [];
        for (const campaign of userCampaigns) {
          const views = await db.select().from(adViews).where(eq(adViews.adCampaignId, campaign.id));
          const clicks = await db.select().from(adClicks).where(eq(adClicks.adCampaignId, campaign.id));
          const viewCount = views.length;
          const clickCount = clicks.length;
          const ctr = viewCount > 0 ? clickCount / viewCount * 100 : 0;
          const spend = parseFloat(campaign.dailyBudget || "0") * 30;
          const cpm = parseFloat(campaign.cpmRate || "3.50");
          analytics.push({
            campaignId: campaign.id,
            views: viewCount,
            clicks: clickCount,
            spend,
            ctr,
            cpm
          });
        }
        return analytics;
      }
      async createAdCampaign(campaignData) {
        const [campaign] = await db.insert(adCampaigns).values({
          ...campaignData,
          updatedAt: /* @__PURE__ */ new Date()
        }).returning();
        return campaign;
      }
      async updateAdCampaign(id, updates) {
        const [updated] = await db.update(adCampaigns).set({
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(adCampaigns.id, id)).returning();
        return updated;
      }
      async getPendingAds() {
        const pending = await db.select().from(adCampaigns).where(eq(adCampaigns.status, "pending")).orderBy(adCampaigns.createdAt);
        return pending;
      }
      // Ad Tracking Operations
      async recordAdView(viewData) {
        try {
          const [view] = await db.insert(adViews).values({
            ...viewData,
            date: viewData.viewedAt.toISOString().split("T")[0]
            // YYYY-MM-DD
          }).returning();
          return view;
        } catch (error) {
          if (error.code === "23505") {
            throw new Error("View already recorded for this user today");
          }
          throw error;
        }
      }
      async recordAdClick(clickData) {
        const [click] = await db.insert(adClicks).values(clickData).returning();
        return click;
      }
      async getAdViewsToday(userId, adId, date) {
        const result = await db.select({ count: sql2`count(*)` }).from(adViews).where(
          and(
            eq(adViews.userId, userId),
            eq(adViews.adCampaignId, adId),
            eq(adViews.date, date)
          )
        );
        return result[0]?.count || 0;
      }
      // Billing operations
      async getBillingPlans() {
        return await db.select().from(billingPlans).where(eq(billingPlans.isActive, true)).orderBy(billingPlans.createdAt);
      }
      async createBillingPlan(plan) {
        const id = randomUUID();
        const [newPlan] = await db.insert(billingPlans).values({
          ...plan,
          id
        }).returning();
        return newPlan;
      }
      async createBillingCycle(cycle) {
        const id = randomUUID();
        const [newCycle] = await db.insert(billingCycles).values({
          ...cycle,
          id
        }).returning();
        return newCycle;
      }
      async getBillingCycle(cycleId) {
        const [cycle] = await db.select().from(billingCycles).where(eq(billingCycles.id, cycleId));
        return cycle;
      }
      async updateBillingCycleStatus(cycleId, status) {
        const [updated] = await db.update(billingCycles).set({
          status,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(billingCycles.id, cycleId)).returning();
        return updated;
      }
      async createPayment(payment) {
        const id = randomUUID();
        const [newPayment] = await db.insert(payments).values({
          ...payment,
          id
        }).returning();
        return newPayment;
      }
      async updatePaymentStatus(paymentId, status, paidAt) {
        const updateData = { status };
        if (paidAt) {
          updateData.paidAt = paidAt;
        }
        const [updated] = await db.update(payments).set(updateData).where(eq(payments.id, paymentId)).returning();
        return updated;
      }
      async getBusinessPayments(businessId) {
        return await db.select().from(payments).where(eq(payments.businessId, businessId)).orderBy(desc(payments.createdAt));
      }
      async getCampaignAnalytics(campaignId, startDate, endDate) {
        return await db.select().from(campaignAnalytics).where(
          and(
            eq(campaignAnalytics.campaignId, campaignId),
            sql2`${campaignAnalytics.date} >= ${startDate}`,
            sql2`${campaignAnalytics.date} <= ${endDate}`
          )
        ).orderBy(campaignAnalytics.date);
      }
      async upsertCampaignAnalytics(analytics) {
        const id = randomUUID();
        const [upserted] = await db.insert(campaignAnalytics).values({
          ...analytics,
          id
        }).onConflictDoUpdate({
          target: [campaignAnalytics.campaignId, campaignAnalytics.date],
          set: {
            ...analytics,
            updatedAt: /* @__PURE__ */ new Date()
          }
        }).returning();
        return upserted;
      }
      // ============================================================================
      // 3-STAGE SPATIAL LOOKUP IMPLEMENTATIONS
      // ============================================================================
      async spatialQuery(query) {
        if (!spatialLookup.hasData()) {
          const incidents2 = await this.getAllUnifiedIncidents();
          spatialLookup.loadIncidents(incidents2);
        }
        return spatialLookup.query(query);
      }
      async spatialQueryInViewport(southWest, northEast, filters) {
        const query = {
          boundingBox: { southWest, northEast },
          ...filters?.category && { category: filters.category },
          ...filters?.source && { source: filters.source },
          ...filters?.activeOnly && { activeOnly: filters.activeOnly }
        };
        return this.spatialQuery(query);
      }
      async spatialQueryNearLocation(lat, lng, radiusKm, filters) {
        const latOffset = radiusKm / 111;
        const lngOffset = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
        const southWest = [lat - latOffset, lng - lngOffset];
        const northEast = [lat + latOffset, lng + lngOffset];
        return this.spatialQueryInViewport(southWest, northEast, filters);
      }
      async refreshSpatialIndex() {
        const incidents2 = await this.getAllUnifiedIncidents();
        const incidentsWithGeocells = incidents2.map((incident) => ({
          ...incident,
          geocell: incident.geocell || computeGeocellForIncident(incident)
        }));
        for (const incident of incidentsWithGeocells) {
          if (!incident.geocell) continue;
          await db.update(unifiedIncidents).set({ geocell: incident.geocell }).where(eq(unifiedIncidents.id, incident.id));
        }
        spatialLookup.loadIncidents(incidentsWithGeocells);
      }
      getSpatialCacheStats() {
        return spatialLookup.getCacheStats();
      }
      // ============================================================================
      // INCIDENT SOCIAL INTERACTION METHODS - Comments and Likes
      // ============================================================================
      async getIncidentComments(incidentId, userId) {
        const result = await db.select({
          id: incidentComments.id,
          content: incidentComments.content,
          createdAt: incidentComments.createdAt,
          updatedAt: incidentComments.updatedAt,
          userId: incidentComments.userId,
          incidentId: incidentComments.incidentId,
          parentCommentId: incidentComments.parentCommentId,
          photoUrl: incidentComments.photoUrl,
          user: {
            id: users.id,
            displayName: users.displayName,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl
          }
        }).from(incidentComments).leftJoin(users, eq(incidentComments.userId, users.id)).where(eq(incidentComments.incidentId, incidentId)).orderBy(desc(incidentComments.createdAt));
        return result;
      }
      async getIncidentCommentsCount(incidentId) {
        const result = await db.select({ count: sql2`count(*)` }).from(incidentComments).where(eq(incidentComments.incidentId, incidentId));
        return result[0]?.count || 0;
      }
      async getIncidentCommentById(id) {
        const [comment] = await db.select().from(incidentComments).where(eq(incidentComments.id, id));
        return comment;
      }
      async createIncidentComment(comment) {
        const [newComment] = await db.insert(incidentComments).values(comment).returning();
        return newComment;
      }
      async deleteIncidentComment(id, userId) {
        const result = await db.delete(incidentComments).where(and(eq(incidentComments.id, id), eq(incidentComments.userId, userId)));
        return (result.rowCount ?? 0) > 0;
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/region-utils.ts
function isPointInPolygon(point, polygon) {
  const [lng, lat] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > lat !== yj > lat && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
function findRegionBySuburb(suburb) {
  const normalizedSuburb = suburb.toLowerCase().trim();
  for (const region of QLD_REGIONS) {
    if (region.name.toLowerCase().includes(normalizedSuburb) || normalizedSuburb.includes(region.name.toLowerCase())) {
      return region;
    }
    const matchingSuburb = region.suburbs.find(
      (s) => s.toLowerCase().includes(normalizedSuburb) || normalizedSuburb.includes(s.toLowerCase())
    );
    if (matchingSuburb) {
      return region;
    }
  }
  return null;
}
function getRegionFromCoordinates(lat, lng, textFallback) {
  for (const region of QLD_REGIONS) {
    if (region.boundary && isPointInPolygon([lng, lat], region.boundary)) {
      return region;
    }
  }
  if (textFallback) {
    return findRegionBySuburb(textFallback);
  }
  return null;
}
function extractCoordinatesFromGeometry(geometry) {
  if (!geometry) return null;
  try {
    if (geometry.type === "Point" && geometry.coordinates) {
      const [lng, lat] = geometry.coordinates;
      return [lat, lng];
    }
    if (geometry.type === "MultiPoint" && geometry.coordinates?.[0]) {
      const [lng, lat] = geometry.coordinates[0];
      return [lat, lng];
    }
    if (geometry.type === "GeometryCollection" && geometry.geometries) {
      const pointGeometry = geometry.geometries.find((g) => g.type === "Point");
      if (pointGeometry?.coordinates) {
        const [lng, lat] = pointGeometry.coordinates;
        return [lat, lng];
      }
    }
    if (geometry.geometries?.[0]?.coordinates) {
      const coords = geometry.geometries[0].coordinates;
      if (coords.length === 2) {
        const [lng, lat] = coords;
        return [lat, lng];
      }
    }
  } catch (error) {
    console.warn("Error extracting coordinates from geometry:", error);
  }
  return null;
}
var QLD_REGIONS;
var init_region_utils = __esm({
  "server/region-utils.ts"() {
    "use strict";
    QLD_REGIONS = [
      {
        id: "sunshine-coast",
        name: "Sunshine Coast",
        suburbs: [
          "Caloundra",
          "Caloundra West",
          "Golden Beach",
          "Pelican Waters",
          "Maroochydore",
          "Mooloolaba",
          "Alexandra Headland",
          "Mooloolah Valley",
          "Noosa",
          "Noosa Heads",
          "Noosaville",
          "Tewantin",
          "Sunrise Beach",
          "Nambour",
          "Palmwoods",
          "Maleny",
          "Montville",
          "Yandina",
          "Cooroy",
          "Pomona",
          "Eumundi",
          "Peregian Beach",
          "Coolum Beach",
          "Buderim",
          "Sippy Downs",
          "Chancellor Park",
          "Birtinya",
          "Kawana",
          "Currimundi",
          "Dicky Beach",
          "Kings Beach",
          "Bulcock Beach",
          "Bells Creek"
        ],
        boundary: [
          [152.7, -26.9],
          // North-west (inland near Cooroy)
          [153.1, -26.4],
          // North-east (Noosa Heads coastal)
          [153.15, -26.65],
          // East (Coolum Beach area)
          [153.16, -26.8],
          // South-east (Caloundra coastal - extended to include coastline)
          [152.9, -26.85],
          // South-west (inland Caloundra)
          [152.75, -26.82],
          // West (Nambour-Maleny area)
          [152.7, -26.9]
          // Close polygon
        ]
      },
      {
        id: "gold-coast",
        name: "Gold Coast",
        suburbs: [
          "Surfers Paradise",
          "Broadbeach",
          "Main Beach",
          "Southport",
          "Nerang",
          "Robina",
          "Varsity Lakes",
          "Burleigh Heads",
          "Currumbin",
          "Tugun",
          "Coolangatta",
          "Tweed Heads",
          "Miami",
          "Mermaid Beach",
          "Nobby Beach",
          "Palm Beach",
          "Elanora",
          "Tallebudgera",
          "West Burleigh",
          "Burleigh Waters",
          "Mudgeeraba",
          "Springbrook",
          "Advancetown",
          "Coomera",
          "Upper Coomera",
          "Oxenford",
          "Hope Island",
          "Sanctuary Cove"
        ],
        boundary: [
          [153.05, -27.75],
          // North-west (Hope Island area)
          [153.45, -27.8],
          // North-east (coastal Southport)
          [153.55, -28.17],
          // South-east (Coolangatta)
          [153.25, -28.25],
          // South-west (inland Currumbin)
          [153, -28.1],
          // West (Springbrook area)
          [152.9, -27.9],
          // West (Nerang inland)
          [153.05, -27.75]
          // Close polygon
        ]
      },
      {
        id: "brisbane",
        name: "Greater Brisbane",
        suburbs: [
          "Brisbane",
          "Brisbane City",
          "South Brisbane",
          "West End",
          "Fortitude Valley",
          "New Farm",
          "Paddington",
          "Red Hill",
          "Spring Hill",
          "Petrie Terrace",
          "Toowong",
          "St Lucia",
          "Indooroopilly",
          "Taringa",
          "Chapel Hill",
          "Kenmore",
          "Fig Tree Pocket",
          "Brookfield",
          "Pullenvale",
          "Ashgrove",
          "The Gap",
          "Enoggera",
          "Kelvin Grove",
          "Herston",
          "Woolloongabba",
          "Annerley",
          "Fairfield",
          "Yeronga",
          "Yeerongpilly",
          "Moorooka",
          "Rocklea",
          "Acacia Ridge",
          "Sunnybank",
          "Sunnybank Hills",
          "Calamvale",
          "Stretton",
          "Karawatha",
          "Algester",
          "Parkinson",
          "Forest Lake",
          "Inala",
          "Richlands",
          "Darra",
          "Oxley",
          "Corinda",
          "Sherwood",
          "Graceville",
          "Chelmer",
          "Jindalee",
          "Mount Ommaney",
          "Jamboree Heights",
          "Westlake",
          "Riverhills",
          "Chermside",
          "Aspley",
          "Carseldine",
          "Bridgeman Downs",
          "Bald Hills",
          "Strathpine",
          "Lawnton",
          "Petrie",
          "Kallangur",
          "Murrumba Downs",
          "Griffin",
          "North Lakes",
          "Mango Hill",
          "Rothwell",
          "Redcliffe",
          "Clontarf",
          "Margate",
          "Woody Point",
          "Scarborough",
          "Newport",
          "Deception Bay",
          "Narangba",
          "Burpengary",
          "Caboolture",
          "Morayfield",
          "Ipswich",
          "Springfield",
          "Springfield Central",
          "Augustine Heights",
          "Redbank",
          "Goodna",
          "Bellbird Park",
          "Collingwood Park",
          "Redbank Plains",
          "Logan",
          "Logan Central",
          "Springwood",
          "Daisy Hill",
          "Shailer Park",
          "Beenleigh",
          "Eagleby",
          "Waterford",
          "Holmview",
          "Bahrs Scrub"
        ],
        boundary: [
          [152.5, -27],
          // North-west (Caboolture area)
          [153.2, -27.1],
          // North-east (Redcliffe Peninsula)
          [153.25, -27.65],
          // South-east (Logan area)
          [152.8, -27.75],
          // South-west (Ipswich area)
          [152.6, -27.5],
          // West (Springfield area)
          [152.5, -27]
          // Close polygon
        ]
      }
    ];
  }
});

// server/unified-ingestion.ts
var unified_ingestion_exports = {};
__export(unified_ingestion_exports, {
  getUnifiedIngestionEngine: () => getUnifiedIngestionEngine,
  unifiedIngestion: () => unifiedIngestion
});
function getUnifiedIngestionEngine() {
  if (!globalUnifiedEngine) {
    globalUnifiedEngine = new UnifiedIngestionEngine();
    console.log("\u{1F3D7}\uFE0F Created new UnifiedIngestionEngine singleton instance");
  }
  return globalUnifiedEngine;
}
var fetchWithRetry, QLD_TRAFFIC_BASE_URL, QLD_TRAFFIC_API_KEY, EMERGENCY_API_URL, POLLING_INTERVALS, globalUnifiedEngine, UnifiedIngestionEngine, unifiedIngestion;
var init_unified_ingestion = __esm({
  "server/unified-ingestion.ts"() {
    "use strict";
    init_storage();
    init_spatial_lookup();
    init_schema();
    init_region_utils();
    fetchWithRetry = async (url, options) => {
      for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
        try {
          const response = await fetch(url);
          if (response.ok || response.status < 500) {
            return response;
          }
          throw new Error(`HTTP ${response.status}`);
        } catch (error) {
          if (attempt === options.maxRetries) throw error;
          const delay = Math.min(options.baseDelay * Math.pow(2, attempt - 1), options.maxDelay);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      throw new Error("Max retries exceeded");
    };
    QLD_TRAFFIC_BASE_URL = "https://api.qldtraffic.qld.gov.au/v2";
    QLD_TRAFFIC_API_KEY = process.env.QLD_TRAFFIC_API_KEY || "3e83add325cbb69ac4d8e5bf433d770b";
    EMERGENCY_API_URL = "https://services1.arcgis.com/vkTwD8kHw2woKBqV/arcgis/rest/services/ESCAD_Current_Incidents_Public/FeatureServer/0/query?f=geojson&where=1%3D1&outFields=*&outSR=4326";
    POLLING_INTERVALS = {
      fast: 1 * 60 * 1e3,
      // 1 minute for active periods
      normal: 1.5 * 60 * 1e3,
      // 1.5 minutes for normal periods
      slow: 5 * 60 * 1e3,
      // 5 minutes for quiet periods
      circuit: 15 * 60 * 1e3,
      // 15 minutes when circuit breaker is open
      error: 10 * 60 * 1e3
      // 10 minutes after errors
    };
    globalUnifiedEngine = null;
    UnifiedIngestionEngine = class {
      sources = /* @__PURE__ */ new Map();
      pollingTimers = /* @__PURE__ */ new Map();
      isInitialized = false;
      constructor() {
        this.registerSources();
      }
      registerSources() {
        this.sources.set("tmr-traffic", {
          name: "TMR Traffic Events",
          type: "tmr",
          fetcher: this.fetchTMRTrafficEvents.bind(this),
          normalizer: this.normalizeTMREvents.bind(this),
          lastFetch: 0,
          lastSuccess: 0,
          errorCount: 0,
          circuitOpen: false
        });
        this.sources.set("emergency-incidents", {
          name: "Emergency Services",
          type: "emergency",
          fetcher: this.fetchEmergencyIncidents.bind(this),
          normalizer: this.normalizeEmergencyIncidents.bind(this),
          lastFetch: 0,
          lastSuccess: 0,
          errorCount: 0,
          circuitOpen: false
        });
        this.sources.set("user-reports", {
          name: "User Reports",
          type: "user",
          fetcher: this.fetchUserReports.bind(this),
          normalizer: this.passThrough.bind(this),
          // User reports are already normalized, don't re-process
          lastFetch: 0,
          lastSuccess: 0,
          errorCount: 0,
          circuitOpen: false
        });
      }
      // ============================================================================
      // INITIALIZATION
      // ============================================================================
      async initialize() {
        if (this.isInitialized) {
          console.log("\u23ED\uFE0F Unified Ingestion Pipeline already initialized, skipping duplicate");
          return;
        }
        console.log("\u{1F680} Initializing Unified Ingestion Pipeline...");
        this.scheduleSourceIngestion("tmr-traffic", 5e3);
        this.scheduleSourceIngestion("emergency-incidents", 15e3);
        this.scheduleSourceIngestion("user-reports", 3e4);
        this.isInitialized = true;
        console.log("\u2705 Unified Ingestion Pipeline initialized");
        this.refreshSpatialIndex().catch((error) => {
          console.error("Background spatial index refresh failed:", error);
        });
      }
      // ============================================================================
      // DATA FETCHERS
      // ============================================================================
      async fetchTMRTrafficEvents() {
        const publicApiKey = "3e83add325cbb69ac4d8e5bf433d770b";
        const url = `${QLD_TRAFFIC_BASE_URL}/events?apikey=${publicApiKey}&f=geojson`;
        const response = await fetchWithRetry(url, {
          maxRetries: 3,
          baseDelay: 2e3,
          maxDelay: 3e4
        });
        if (!response.ok) {
          throw new Error(`TMR API HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log(`\u{1F4CA} TMR API Response structure:`, Object.keys(data));
        if (data.features) {
          console.log(`\u{1F4CA} TMR GeoJSON: ${data.features.length} features`);
        } else if (data.events) {
          console.log(`\u{1F4CA} TMR Events: ${data.events.length} events`);
        }
        return data;
      }
      async fetchEmergencyIncidents() {
        const response = await fetchWithRetry(EMERGENCY_API_URL, {
          maxRetries: 2,
          baseDelay: 1e3,
          maxDelay: 15e3
        });
        if (!response.ok) {
          throw new Error(`Emergency API HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      }
      async fetchUserReports() {
        const unifiedIncidents2 = await storage.getAllUnifiedIncidents();
        const userReports = unifiedIncidents2.filter((incident) => {
          if (incident.source !== "user") return false;
          if (incident.userId?.startsWith("agency:")) return false;
          const props = incident.properties || {};
          const hasEmergencyFingerprints = props?.Jurisdiction || props?.jurisdiction || props?.Master_Incident_Number || props?.master_incident_number || props?.OBJECTID || props?.objectid || props?.CurrentStatus || props?.current_status || props?.VehiclesOnScene || props?.vehicles_on_scene || props?.GroupedType || props?.grouped_type;
          if (hasEmergencyFingerprints) return false;
          const isUserReported = props?.userReported === true;
          const hasValidUserId = incident.userId && !incident.userId.startsWith("agency:");
          return isUserReported || hasValidUserId;
        });
        const sevenDaysAgo = /* @__PURE__ */ new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const allLegacyIncidents = await storage.getIncidents();
        const legacyIncidents = allLegacyIncidents.filter((incident) => {
          if (!incident.publishedDate) return false;
          const incidentDate = new Date(incident.publishedDate);
          return incidentDate >= sevenDaysAgo;
        });
        const legacyIncidentsForNormalization = legacyIncidents.filter((incident) => {
          if (!incident.geometry) return false;
          const alreadyInUnifiedStore = userReports.find(
            (unified) => unified.sourceId === incident.id && unified.source === "user" && unified.userId && unified.userId !== "legacy-system-account-001"
          );
          if (alreadyInUnifiedStore) {
            return false;
          }
          return true;
        }).map((incident) => {
          const props = incident.properties || {};
          const title = incident.title || "";
          const description = incident.description || "";
          const content = `${title} ${description}`.toLowerCase();
          let smartCategory = incident.categoryId;
          if (!smartCategory) {
            if (content.includes("power") || content.includes("electrical") || content.includes("utility") || content.includes("gas") || content.includes("water leak") || content.includes("outage")) {
              smartCategory = "Infrastructure & Hazards";
            } else {
              smartCategory = "Community Issues";
            }
          }
          return {
            source: "user",
            sourceId: incident.id,
            title: incident.title,
            description: incident.description || "",
            location: incident.location,
            category: smartCategory,
            subcategory: incident.subcategoryId || "",
            severity: "medium",
            status: incident.status === "Reported" ? "active" : incident.status || "active",
            geometry: incident.geometry,
            centroidLat: incident.geometry?.coordinates?.[1] || 0,
            centroidLng: incident.geometry?.coordinates?.[0] || 0,
            regionIds: [],
            geocell: "",
            incidentTime: incident.publishedDate || /* @__PURE__ */ new Date(),
            lastUpdated: incident.publishedDate || /* @__PURE__ */ new Date(),
            publishedAt: /* @__PURE__ */ new Date(),
            properties: {
              ...props,
              id: incident.id,
              title: incident.title,
              description: incident.description || "",
              location: incident.location,
              category: smartCategory,
              source: "legacy",
              userReported: false,
              reporterId: "legacy-system-account-001"
              // Legacy incidents use system account
            },
            userId: "legacy-system-account-001",
            photoUrl: incident.photoUrl || null,
            verificationStatus: "unverified"
          };
        });
        const transformedUserReports = userReports.map((incident) => {
          const userId = incident.userId || incident.user_id || null;
          return {
            ...incident,
            userId,
            // Set userId field
            properties: {
              ...incident.properties || {},
              // CRITICAL: Set reporterId in properties for user attribution
              reporterId: userId,
              source: "user",
              userReported: true
            }
          };
        });
        const allAlreadyNormalized = [...transformedUserReports, ...legacyIncidentsForNormalization];
        console.log(`\u{1F4CA} User Reports Fetch: ${userReports.length} unified + ${legacyIncidentsForNormalization.length} legacy = ${allAlreadyNormalized.length} total user incidents (emergency incidents excluded from user pipeline)`);
        return {
          alreadyNormalized: allAlreadyNormalized
        };
      }
      // ============================================================================
      // DATA NORMALIZERS
      // ============================================================================
      normalizeTMREvents(data) {
        let events = [];
        if (data.type === "FeatureCollection" && Array.isArray(data.features)) {
          events = data.features;
        } else if (Array.isArray(data.events)) {
          events = data.events.map((event) => ({
            type: "Feature",
            id: event.id,
            geometry: event.geometry || null,
            properties: event
          }));
        }
        if (events.length === 0) {
          console.log(`\u26A0\uFE0F TMR normalizer: No events found. Data keys:`, Object.keys(data));
          return [];
        }
        console.log(`\u{1F4CA} TMR normalizer: Processing ${events.length} events`);
        return events.filter(this.filterRecentEvents).map((feature) => {
          const props = feature.properties || {};
          const geometry = feature.geometry;
          const centroid = this.computeCentroid(geometry);
          if (!centroid) return null;
          const regionIds = this.computeRegionIds(centroid.lat, centroid.lng, props);
          const title = `${props.event_type || "Traffic"} - ${props.event_subtype || "Event"}`;
          const incident = {
            source: "tmr",
            sourceId: feature.id?.toString() || props.id || `tmr-${Date.now()}`,
            title,
            description: [props.description, props.advice, props.information].filter(Boolean).join(". "),
            location: props.road_summary ? `${props.road_summary.road_name}, ${props.road_summary.locality}` : "Queensland",
            category: "traffic",
            subcategory: this.getTMRSubcategory(props),
            severity: this.getTMRSeverity(props),
            status: props.status === "Published" ? "active" : "resolved",
            geometry,
            centroidLat: centroid.lat,
            centroidLng: centroid.lng,
            regionIds,
            geocell: computeGeocellForIncident({ centroidLat: centroid.lat, centroidLng: centroid.lng }),
            incidentTime: props.published ? new Date(props.published) : /* @__PURE__ */ new Date(),
            lastUpdated: props.last_updated ? new Date(props.last_updated) : /* @__PURE__ */ new Date(),
            publishedAt: /* @__PURE__ */ new Date(),
            userId: void 0,
            // Will be resolved by storage layer attribution system
            properties: props
          };
          return prepareUnifiedIncidentForInsert(incident);
        }).filter((incident) => incident !== null);
      }
      normalizeEmergencyIncidents(data) {
        if (!data.features || !Array.isArray(data.features)) return [];
        return data.features.filter(this.filterRecentEvents).map((feature) => {
          const props = feature.properties || {};
          const geometry = feature.geometry;
          const centroid = this.computeCentroid(geometry);
          if (!centroid) return null;
          const regionIds = this.computeRegionIds(centroid.lat, centroid.lng, props);
          const title = props.Master_Incident_Number || props.Incident_Number || "Emergency Incident";
          const description = `${props.GroupedType || "Emergency incident"} in ${props.Locality || props.Location || "Queensland"}. Status: ${props.CurrentStatus || "Active"}. Vehicles: ${props.VehiclesOnScene || 0} on scene, ${props.VehiclesOnRoute || 0} en route.`;
          const incident = {
            source: "emergency",
            sourceId: feature.id?.toString() || props.OBJECTID?.toString() || `emg-${Date.now()}`,
            title,
            description,
            location: props.Locality ? `${props.Location}, ${props.Locality}` : props.Location || "Queensland",
            category: "54d31da5-fc10-4ad2-8eca-04bac680e668",
            // Emergency Situations UUID from database
            subcategory: this.getEmergencyCategory({ ...props, description }),
            // Pass description for categorization
            severity: this.getEmergencySeverity(props),
            status: props.CurrentStatus === "Closed" || props.CurrentStatus === "Resolved" ? "resolved" : "active",
            geometry,
            centroidLat: centroid.lat,
            centroidLng: centroid.lng,
            regionIds,
            geocell: computeGeocellForIncident({ centroidLat: centroid.lat, centroidLng: centroid.lng }),
            incidentTime: props.Response_Date ? new Date(props.Response_Date) : /* @__PURE__ */ new Date(),
            lastUpdated: props.LastUpdate ? new Date(props.LastUpdate) : /* @__PURE__ */ new Date(),
            publishedAt: /* @__PURE__ */ new Date(),
            userId: void 0,
            // Will be resolved by storage layer attribution system
            properties: {
              ...props,
              // CRITICAL: Ensure emergency incidents are never marked as user reports
              source: "emergency",
              userReported: false
            }
          };
          return prepareUnifiedIncidentForInsert(incident);
        }).filter((incident) => incident !== null);
      }
      // Pass-through normalizer for already-processed user reports
      passThrough(data) {
        if (!data.alreadyNormalized || !Array.isArray(data.alreadyNormalized)) return [];
        console.log(`\u{1F4CA} User Reports Pass-through: ${data.alreadyNormalized.length} already normalized incidents`);
        return data.alreadyNormalized;
      }
      normalizeUserReports(data) {
        if (!data.features || !Array.isArray(data.features)) return [];
        let total = 0;
        let filtered = 0;
        let processed = 0;
        let failed = 0;
        const results = data.features.filter(this.filterRecentEvents).map((feature) => {
          total++;
          const props = feature.properties || {};
          const geometry = feature.geometry;
          let sourceId = props.id?.toString() || feature.id?.toString() || `user-${Date.now()}-${Math.random()}`;
          if (!sourceId) {
            filtered++;
            return null;
          }
          if (sourceId.startsWith("user:user:")) {
            sourceId = sourceId.replace(/^(user:)+/, "user:");
          }
          let cleanReporterId = null;
          let cleanUserId = null;
          if (props.reporterId) {
            cleanReporterId = props.reporterId.toString();
            if (cleanReporterId && cleanReporterId.startsWith("user:user:")) {
              cleanReporterId = cleanReporterId.replace(/^(user:)+/, "user:");
            }
          }
          if (props.userId) {
            cleanUserId = props.userId.toString();
            if (cleanUserId && cleanUserId.startsWith("user:user:")) {
              cleanUserId = cleanUserId.replace(/^(user:)+/, "user:");
            }
          }
          let centroid = this.computeCentroid(geometry);
          if (!centroid && (props.lat || props.latitude) && (props.lng || props.longitude)) {
            centroid = {
              lat: props.lat || props.latitude,
              lng: props.lng || props.longitude
            };
          }
          if (!centroid) {
            filtered++;
            return null;
          }
          try {
            const regionIds = this.computeRegionIds(centroid.lat, centroid.lng, props);
            const incident = {
              source: "user",
              // ALWAYS set to user
              sourceId,
              title: props.title || "Community Report",
              description: props.description || "",
              location: props.location || "",
              category: props.category || "other",
              subcategory: props.subcategory || "",
              severity: props.severity || "medium",
              status: props.status || "active",
              geometry,
              centroidLat: centroid.lat,
              centroidLng: centroid.lng,
              regionIds,
              geocell: computeGeocellForIncident({ centroidLat: centroid.lat, centroidLng: centroid.lng }),
              incidentTime: props.createdAt ? new Date(props.createdAt) : /* @__PURE__ */ new Date(),
              lastUpdated: props.updatedAt ? new Date(props.updatedAt) : /* @__PURE__ */ new Date(),
              publishedAt: /* @__PURE__ */ new Date(),
              properties: {
                ...props,
                // CRITICAL: Always ensure proper classification
                source: "user",
                userReported: true,
                categoryId: this.getCategoryId(props.category),
                // CRITICAL: Ensure reporterId is set from cleaned userId for user attribution
                reporterId: cleanReporterId || cleanUserId
              },
              userId: cleanUserId,
              photoUrl: props.photoUrl,
              verificationStatus: props.verificationStatus || "unverified"
            };
            const preparedIncident = prepareUnifiedIncidentForInsert(incident);
            processed++;
            return preparedIncident;
          } catch (error) {
            console.error(`\u274C Failed to normalize user report ${sourceId}:`, error);
            failed++;
            return null;
          }
        }).filter((incident) => incident !== null);
        console.log(`\u{1F4CA} User Reports Processing: ${total} total, ${processed} processed, ${filtered} filtered (no geometry/ID), ${failed} failed`);
        return results;
      }
      // Helper method to map category names to UUIDs for frontend filtering
      getCategoryId(categoryName) {
        const categoryMap = {
          "Safety & Crime": "792759f4-1b98-4665-b14c-44a54e9969e9",
          "Infrastructure & Hazards": "9b1d58d9-cfd1-4c31-93e9-754276a5f265",
          "Emergency Situations": "54d31da5-fc10-4ad2-8eca-04bac680e668",
          "Wildlife & Nature": "d03f47a9-10fb-4656-ae73-92e959d7566a",
          "Community Issues": "deaca906-3561-4f80-b79f-ed99561c3b04",
          "Pets": "4ea3a6f0-c49e-4baf-9ca5-f074ca2811b0",
          "Lost & Found": "d1dfcd4e-48e9-4e58-9476-4782a2a132f3"
        };
        return categoryMap[categoryName] || "deaca906-3561-4f80-b79f-ed99561c3b04";
      }
      // ============================================================================
      // INGESTION ORCHESTRATION
      // ============================================================================
      async ingestSource(sourceId) {
        const source = this.sources.get(sourceId);
        if (!source) return;
        if (source.circuitOpen) {
          console.log(`\u26A1 Circuit breaker open for ${source.name}, skipping`);
          this.scheduleSourceIngestion(sourceId, POLLING_INTERVALS.circuit);
          return;
        }
        try {
          console.log(`\u{1F504} UNIFIED PIPELINE: Starting ${source.name} ingestion cycle...`);
          console.log(`\u{1F4E1} API Request: ${sourceId === "tmr-traffic" ? "TMR Traffic API v2" : sourceId === "emergency-incidents" ? "QLD Emergency Services" : "Database Query"}`);
          source.lastFetch = Date.now();
          const rawData = await source.fetcher();
          const unifiedIncidents2 = source.normalizer(rawData);
          const results = await Promise.allSettled(
            unifiedIncidents2.map(
              (incident) => storage.upsertUnifiedIncident(incident.source, incident.sourceId, incident)
            )
          );
          const successful = results.filter((r) => r.status === "fulfilled").length;
          const failed = results.filter((r) => r.status === "rejected").length;
          if (sourceId === "tmr-traffic") {
            console.log(`\u2705 UNIFIED TMR INGESTION: ${successful} traffic incidents processed successfully, ${failed} failed`);
            console.log(`\u{1F4CA} TMR Data: ${unifiedIncidents2.length} incidents normalized from raw TMR API response`);
          } else if (sourceId === "emergency-incidents") {
            console.log(`\u2705 UNIFIED EMERGENCY INGESTION: ${successful} emergency incidents processed successfully, ${failed} failed`);
            console.log(`\u{1F4CA} Emergency Data: ${unifiedIncidents2.length} incidents normalized from emergency services`);
          } else if (sourceId === "user-reports") {
            console.log(`\u2705 UNIFIED USER REPORTS: ${successful} user reports processed successfully, ${failed} failed`);
            console.log(`\u{1F4CA} User Data: ${unifiedIncidents2.length} reports normalized from database`);
          } else {
            console.log(`\u2705 ${source.name} ingestion: ${successful} incidents processed, ${failed} failed`);
          }
          console.log(`\u{1F504} Unified Store: Updated with ${successful} new/updated incidents from ${source.name}`);
          source.lastSuccess = Date.now();
          source.errorCount = 0;
          source.circuitOpen = false;
          await this.refreshSpatialIndex();
          const interval = this.getAdaptiveInterval(sourceId, successful);
          this.scheduleSourceIngestion(sourceId, interval);
        } catch (error) {
          console.error(`\u274C UNIFIED PIPELINE ERROR for ${source.name}:`, error);
          if (error instanceof Error) {
            if (error.message.includes("403")) {
              console.error(`\u{1F6A8} TMR API 403 Error: Check API URL (should be /v2) and API key`);
            } else if (error.message.includes("429")) {
              console.error(`\u23F3 Rate limited by ${source.name} - implementing backoff`);
            } else if (error.message.includes("500")) {
              console.error(`\u{1F527} Server error from ${source.name} - will retry`);
            }
          }
          source.errorCount++;
          console.log(`\u{1F4CA} ${source.name} error count: ${source.errorCount}/3 before circuit breaker`);
          if (source.errorCount >= 3) {
            source.circuitOpen = true;
            console.log(`\u26A1 Circuit breaker OPENED for ${source.name} - cooling down`);
          }
          const retryInterval = Math.min(
            POLLING_INTERVALS.error * Math.pow(2, source.errorCount - 1),
            POLLING_INTERVALS.circuit
          );
          this.scheduleSourceIngestion(sourceId, retryInterval);
        }
      }
      scheduleSourceIngestion(sourceId, interval) {
        const existingTimer = this.pollingTimers.get(sourceId);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }
        const timer = setTimeout(() => this.ingestSource(sourceId), interval);
        this.pollingTimers.set(sourceId, timer);
        const source = this.sources.get(sourceId);
        console.log(`\u23F0 Next ${source?.name} ingestion scheduled in ${(interval / 6e4).toFixed(1)} minutes`);
      }
      getAdaptiveInterval(sourceId, itemsProcessed) {
        if (itemsProcessed > 50) return POLLING_INTERVALS.fast;
        if (itemsProcessed > 10) return POLLING_INTERVALS.normal;
        return POLLING_INTERVALS.slow;
      }
      // ============================================================================
      // UTILITY FUNCTIONS
      // ============================================================================
      filterRecentEvents = (feature) => {
        const props = feature.properties || {};
        const publishedDate = props.published || props.CreateDate || props.reportedAt;
        if (!publishedDate) return true;
        const eventDate = new Date(publishedDate);
        if (isNaN(eventDate.getTime())) return true;
        const daysSince = (Date.now() - eventDate.getTime()) / (1e3 * 60 * 60 * 24);
        return daysSince <= 7;
      };
      computeCentroid(geometry) {
        if (!geometry || !geometry.coordinates) return null;
        try {
          switch (geometry.type) {
            case "Point":
              return { lng: geometry.coordinates[0], lat: geometry.coordinates[1] };
            case "LineString":
              const coords = geometry.coordinates;
              const midIndex = Math.floor(coords.length / 2);
              return { lng: coords[midIndex][0], lat: coords[midIndex][1] };
            case "Polygon":
              const ring = geometry.coordinates[0];
              const sumLat = ring.reduce((sum, coord) => sum + coord[1], 0);
              const sumLng = ring.reduce((sum, coord) => sum + coord[0], 0);
              return { lng: sumLng / ring.length, lat: sumLat / ring.length };
            case "MultiPoint":
              const points = geometry.coordinates;
              const multiPointSumLat = points.reduce((sum, coord) => sum + coord[1], 0);
              const multiPointSumLng = points.reduce((sum, coord) => sum + coord[0], 0);
              return { lng: multiPointSumLng / points.length, lat: multiPointSumLat / points.length };
            case "MultiLineString":
              const firstLine = geometry.coordinates[0];
              const multiLineMidIndex = Math.floor(firstLine.length / 2);
              return { lng: firstLine[multiLineMidIndex][0], lat: firstLine[multiLineMidIndex][1] };
            case "MultiPolygon":
              const firstPolygon = geometry.coordinates[0][0];
              const multiPolygonSumLat = firstPolygon.reduce((sum, coord) => sum + coord[1], 0);
              const multiPolygonSumLng = firstPolygon.reduce((sum, coord) => sum + coord[0], 0);
              return { lng: multiPolygonSumLng / firstPolygon.length, lat: multiPolygonSumLat / firstPolygon.length };
            case "GeometryCollection":
              for (const subGeom of geometry.geometries) {
                const centroid = this.computeCentroid(subGeom);
                if (centroid) return centroid;
              }
              return null;
            default:
              console.warn(`Unsupported geometry type: ${geometry.type}`);
              return null;
          }
        } catch (error) {
          console.warn("Error computing centroid:", error);
          return null;
        }
      }
      computeRegionIds(lat, lng, props) {
        try {
          const region = getRegionFromCoordinates(lat, lng);
          return region ? [region.id] : [];
        } catch (error) {
          console.warn("Error computing basic regionIds:", error);
          return [];
        }
      }
      getTMRSubcategory(props) {
        const type = String(props.event_type || "").toLowerCase().replace(/['"]/g, "");
        const impactObj = props.impact || {};
        const impactType = String(impactObj.impact_type || "").toLowerCase();
        const impactSubtype = String(impactObj.impact_subtype || "").toLowerCase();
        const delay = String(impactObj.delay || "").toLowerCase();
        if (impactType.includes("blocked") || impactType.includes("closed") || impactSubtype.includes("blocked") || impactSubtype.includes("closed")) {
          return "road-closure";
        }
        if (type.includes("congestion") || impactType.includes("congestion") || delay.includes("delays") || delay.includes("congestion")) {
          return "congestion";
        }
        if (type.includes("accident") || type.includes("crash")) {
          return "accident";
        }
        if (type.includes("roadwork") || type.includes("construction")) {
          return "roadwork";
        }
        return "other";
      }
      getTMRSeverity(props) {
        const impact = String(props.impact || "").toLowerCase();
        if (impact.includes("blocked") || impact.includes("closed")) return "critical";
        if (impact.includes("major") || impact.includes("severe")) return "high";
        if (impact.includes("minor") || impact.includes("light")) return "low";
        return "medium";
      }
      // Note: Agency user ID resolution has been moved to the centralized attribution system
      // in shared/schema.ts resolveAttribution function. The storage layer now automatically
      // handles attribution for all incident sources during create/upsert operations.
      getEmergencyCategory(props) {
        const jurisdiction = props.Jurisdiction?.toLowerCase() || "";
        const incidentNumber = props.Master_Incident_Number?.toLowerCase() || "";
        const groupedType = props.GroupedType?.toLowerCase() || "";
        const incidentType = props.Incident_Type?.toLowerCase() || "";
        const description = props.description?.toLowerCase() || "";
        if (groupedType.includes("rescue") || incidentType.includes("rescue") || description.includes("rescue") || groupedType.includes("crash") || incidentType.includes("crash") || description.includes("crash") || description.includes("road crash") || description.includes("road accident") || groupedType.includes("road") && (groupedType.includes("accident") || groupedType.includes("incident"))) {
          return "Rescue Operation";
        }
        if (groupedType.includes("power") || groupedType.includes("gas") || groupedType.includes("electric")) {
          return "Power/Gas Emergency";
        }
        if (groupedType.includes("storm") || groupedType.includes("flood") || groupedType.includes("weather")) {
          return "Storm/SES";
        }
        if (groupedType.includes("medical") && !groupedType.includes("rescue") && !groupedType.includes("crash")) {
          return "Medical Emergencies";
        }
        if (groupedType.includes("hazmat") || groupedType.includes("chemical")) {
          return "Chemical/Hazmat";
        }
        if (groupedType.includes("fire")) {
          return "Fire & Smoke";
        }
        if ((jurisdiction.includes("ambulance") || incidentNumber.includes("qa")) && !groupedType.includes("rescue") && !groupedType.includes("crash")) {
          return "Medical Emergencies";
        }
        if (jurisdiction.includes("police") || incidentNumber.includes("qp") || groupedType.includes("police") || incidentType.includes("police")) {
          return "Public Safety";
        }
        if (jurisdiction.includes("fire") || incidentNumber.includes("qf")) {
          return "Fire & Smoke";
        }
        if (jurisdiction.includes("ses")) {
          return "Storm/SES";
        }
        return "Emergency Response";
      }
      getEmergencySeverity(props) {
        const status = props.CurrentStatus?.toLowerCase() || "";
        const jurisdiction = props.Jurisdiction?.toLowerCase() || "";
        const vehiclesOnScene = parseInt(props.VehiclesOnScene) || 0;
        const vehiclesOnRoute = parseInt(props.VehiclesOnRoute) || 0;
        if (vehiclesOnScene >= 3 || vehiclesOnRoute >= 3) return "critical";
        if (vehiclesOnScene >= 2 || vehiclesOnRoute >= 2) return "high";
        if (status.includes("going") || status.includes("responding")) return "high";
        if (status.includes("arrived") || status.includes("onscene")) return "critical";
        if (status.includes("returning") || status.includes("finished")) return "low";
        if (jurisdiction.includes("fire")) return "high";
        return "medium";
      }
      indexRebuildInProgress = false;
      async refreshSpatialIndex() {
        if (this.indexRebuildInProgress) {
          console.log("\u{1F5FA}\uFE0F Spatial index rebuild already in progress, skipping");
          return;
        }
        this.indexRebuildInProgress = true;
        try {
          console.log("\u{1F5FA}\uFE0F Spatial index rebuild started");
          await storage.refreshSpatialIndex();
          console.log("\u{1F5FA}\uFE0F Spatial index refreshed");
        } catch (error) {
          console.error("Failed to refresh spatial index:", error);
        } finally {
          this.indexRebuildInProgress = false;
        }
      }
      // ============================================================================
      // PUBLIC API
      // ============================================================================
      getIngestionStats() {
        const stats = {};
        for (const [id, source] of Array.from(this.sources.entries())) {
          stats[id] = {
            name: source.name,
            type: source.type,
            lastFetch: source.lastFetch,
            lastSuccess: source.lastSuccess,
            errorCount: source.errorCount,
            circuitOpen: source.circuitOpen,
            uptimeMs: source.lastSuccess ? Date.now() - source.lastSuccess : 0
          };
        }
        return stats;
      }
      async forceIngestion(sourceId) {
        if (sourceId) {
          await this.ingestSource(sourceId);
        } else {
          for (const id of Array.from(this.sources.keys())) {
            await this.ingestSource(id);
          }
        }
      }
      shutdown() {
        for (const timer of Array.from(this.pollingTimers.values())) {
          clearTimeout(timer);
        }
        this.pollingTimers.clear();
        console.log("\u{1F6D1} Unified Ingestion Pipeline shutdown");
      }
    };
    unifiedIngestion = getUnifiedIngestionEngine();
    process.on("SIGTERM", () => {
      if (globalUnifiedEngine) {
        globalUnifiedEngine.shutdown();
      }
    });
  }
});

// server/index.ts
import express3 from "express";

// server/routes.ts
init_storage();
import { createServer } from "http";

// server/auth.ts
init_storage();
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import MemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import bcrypt2 from "bcryptjs";
async function hashPassword(password) {
  return await bcrypt2.hash(password, 10);
}
async function comparePasswords(supplied, stored) {
  return await bcrypt2.compare(supplied, stored);
}
function setupAuth(app2) {
  let store;
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    if (!process.env.DATABASE_URL) {
      console.error("\u274C CRITICAL: DATABASE_URL environment variable must be set in production!");
      console.error("   PostgreSQL session store required for production session persistence");
      process.exit(1);
    }
    const PgSession = connectPgSimple(session);
    store = new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: "sessions",
      // Use existing table name (plural)
      createTableIfMissing: false,
      // Don't try to create - table already exists
      pruneSessionInterval: 60 * 15,
      // Cleanup every 15 minutes
      errorLog: (error) => {
        console.error("Session store error:", error);
      }
    });
    console.log("\u2705 Using PostgreSQL session store for production");
  } else {
    const memoryStore = MemoryStore(session);
    store = new memoryStore({
      checkPeriod: 864e5
      // prune expired entries every 24h
    });
    console.log("\u{1F527} Using memory session store for development");
  }
  const sessionSecret = process.env.SESSION_SECRET;
  if (isProduction && (!sessionSecret || sessionSecret === "dev-secret-key-replace-in-prod")) {
    console.error("\u274C CRITICAL: SESSION_SECRET environment variable must be set in production!");
    console.error("   Generate a secure secret and set SESSION_SECRET in your production environment");
    process.exit(1);
  }
  const sessionSettings = {
    secret: sessionSecret || "dev-secret-key-replace-in-prod",
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      // true in production for HTTPS, false in development
      maxAge: 7 * 24 * 60 * 60 * 1e3,
      // 1 week
      sameSite: "lax"
      // Compatible with OAuth flows while maintaining security
    }
  };
  console.log(`\u{1F510} Session configuration: secure=${sessionSettings.cookie.secure}, sameSite=${sessionSettings.cookie.sameSite}`);
  app2.set("trust proxy", 1);
  app2.use(session(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  app2.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = req.user;
    if (user && user.password) {
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      res.json(user);
    }
  });
  passport.use(
    new LocalStrategy({
      usernameField: "email"
      // Use email instead of username
    }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user || !user.password || !await comparePasswords(password, user.password)) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    })
  );
  const userCache = /* @__PURE__ */ new Map();
  const CACHE_TTL = 5 * 60 * 1e3;
  const MAX_CACHE_SIZE = 1e3;
  const cleanupCache = () => {
    const now = Date.now();
    userCache.forEach((value, key) => {
      if (now - value.timestamp > CACHE_TTL) {
        userCache.delete(key);
      }
    });
    if (userCache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(userCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE);
      toDelete.forEach(([key]) => userCache.delete(key));
    }
  };
  setInterval(cleanupCache, 10 * 60 * 1e3);
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const cachedEntry = userCache.get(id);
      const now = Date.now();
      if (cachedEntry && now - cachedEntry.timestamp < CACHE_TTL) {
        console.log(`\u{1F504} Using cached user data for ${id}`);
        return done(null, cachedEntry.user);
      }
      console.log(`\u{1F4E1} Fetching user ${id} from database`);
      const user = await storage.getUser(id);
      if (user) {
        userCache.set(id, { user, timestamp: now });
        console.log(`\u2705 Cached user ${id} (cache size: ${userCache.size})`);
      }
      done(null, user);
    } catch (error) {
      console.error(`\u274C Error deserializing user ${id}:`, error);
      done(error);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      const {
        password,
        email,
        firstName,
        lastName,
        homeSuburb,
        accountType,
        businessName,
        businessDescription,
        businessWebsite,
        businessPhone,
        businessAddress,
        businessCategory
      } = req.body;
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }
      const userData = {
        password: await hashPassword(password),
        email: email.toLowerCase(),
        firstName,
        lastName,
        homeSuburb,
        accountType: accountType || "regular"
      };
      if (accountType === "business") {
        userData.businessName = businessName;
        userData.businessDescription = businessDescription;
        userData.businessWebsite = businessWebsite;
        userData.businessPhone = businessPhone;
        userData.businessAddress = businessAddress;
        userData.businessCategory = businessCategory;
      }
      const user = await storage.createUser(userData);
      req.login(user, (err) => {
        if (err) return next(err);
        const { password: password2, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      req.login(user, (err2) => {
        if (err2) {
          console.error("Login session error:", err2);
          return res.status(500).json({ error: "Session error" });
        }
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user;
    if (user && user.password) {
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      res.json(user);
    }
  });
}

// server/replitAuth.ts
init_storage();
import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport2 from "passport";
import session2 from "express-session";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";

// server/secure-logger.ts
var isDevelopment = process.env.NODE_ENV === "development";
var SENSITIVE_FIELDS = [
  "sessionID",
  "session",
  "email",
  "sub",
  "access_token",
  "refresh_token",
  "id_token",
  "password",
  "secret",
  "key",
  "token",
  "authorization",
  "cookie",
  "first_name",
  "last_name",
  "profile_image_url"
];
function sanitizeObject(obj, depth = 0) {
  if (depth > 3) return "[Max Depth Reached]";
  if (obj === null || obj === void 0) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(
      (item, index2) => index2 < 10 ? sanitizeObject(item, depth + 1) : "[...more items]"
    );
  }
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some((field) => keyLower.includes(field));
    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
function sanitizeUser(user) {
  if (!user) return user;
  return {
    authenticated: !!user,
    hasId: !!user.id,
    hasClaims: !!user.claims,
    hasSub: !!(user.claims && user.claims.sub),
    hasEmail: !!(user.claims && user.claims.email),
    userType: user.claims ? "oauth" : user.id ? "local" : "unknown",
    expiresAt: user.expires_at ? "[TOKEN_EXPIRY]" : "no expiry",
    isExpired: user.expires_at ? Math.floor(Date.now() / 1e3) > user.expires_at : false,
    keys: Object.keys(user || {})
  };
}
var secureLogger = {
  /**
   * Logs authentication debugging information safely
   */
  authDebug: (message, data) => {
    if (isDevelopment) {
      console.log(`\u{1F510} [AUTH DEBUG] ${message}`);
      if (data) {
        if (data.user) {
          console.log("User:", sanitizeUser(data.user));
          delete data.user;
        }
        if (data.sessionID) {
          console.log("Session ID:", "[REDACTED_IN_LOGS]");
          delete data.sessionID;
        }
        if (Object.keys(data).length > 0) {
          console.log("Data:", sanitizeObject(data));
        }
      }
    }
  },
  /**
   * Logs authentication errors (visible in production but sanitized)
   */
  authError: (message, data) => {
    console.error(`\u{1F6A8} [AUTH ERROR] ${message}`);
    if (data && isDevelopment) {
      console.error("Error details:", sanitizeObject(data));
    } else if (data) {
      const safeData = {
        hasUser: !!data.user,
        errorType: data.error?.constructor?.name || "Unknown",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      console.error("Error context:", safeData);
    }
  },
  /**
   * Logs general debug information (development only)
   */
  debug: (message, data) => {
    if (isDevelopment) {
      console.log(`\u{1F41B} [DEBUG] ${message}`);
      if (data) {
        console.log("Data:", sanitizeObject(data));
      }
    }
  },
  /**
   * Logs informational messages (production safe)
   */
  info: (message) => {
    console.log(`\u2139\uFE0F ${message}`);
  },
  /**
   * Logs warnings (production safe)
   */
  warn: (message, context) => {
    console.warn(`\u26A0\uFE0F ${message}${context ? ` [Context: ${context}]` : ""}`);
  },
  /**
   * Logs errors (production safe)
   */
  error: (message, error) => {
    console.error(`\u274C ${message}`);
    if (error && isDevelopment) {
      console.error("Stack trace:", error.stack || error);
    } else if (error) {
      console.error("Error type:", error?.constructor?.name || "Unknown");
    }
  }
};
function createSafeRequestInfo(req) {
  return {
    method: req.method,
    url: req.url ? req.url.split("?")[0] : "unknown",
    // Remove query params
    hostname: req.hostname,
    userAgent: req.headers?.["user-agent"] ? "[USER_AGENT]" : "none",
    hasSession: !!req.session,
    isAuthenticated: typeof req.isAuthenticated === "function" ? req.isAuthenticated() : !!req.user,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// server/replitAuth.ts
if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}
var getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID
    );
  },
  { maxAge: 3600 * 1e3 }
);
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1e3;
  const pgStore = connectPg(session2);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions"
  });
  return session2({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl
    }
  });
}
function updateUserSession(user, tokens) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}
async function upsertUser(claims) {
  await storage.upsertUser({
    id: String(claims["sub"]),
    // Ensure ID is a string
    password: null,
    // OAuth users don't need passwords
    email: claims["email"] ? claims["email"].toLowerCase() : null,
    firstName: claims["first_name"] || null,
    lastName: claims["last_name"] || null,
    profileImageUrl: claims["profile_image_url"] || null
  });
}
async function setupAuth2(app2) {
  app2.set("trust proxy", 1);
  app2.use(getSession());
  app2.use(passport2.initialize());
  app2.use(passport2.session());
  const config = await getOidcConfig();
  const verify = async (tokens, verified) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    secureLogger.authDebug("OAuth user created with claims", {
      hasUser: !!user,
      hasClaims: !!user.claims,
      hasValidStructure: !!(user.claims && user.claims.sub)
    });
    verified(null, user);
  };
  const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
  const allDomains = [...domains, "localhost", "7c2800e2-dc85-4b8d-b4f0-349225d230ba.janeway.prod.repl.run", "07484835-201d-4254-8d4d-d43ff0f457fe.janeway.prod.repl.run"];
  for (const domain of allDomains) {
    const isLocalhost = domain === "localhost";
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `${isLocalhost ? "http://localhost:5000" : `https://${domain}`}/api/callback`
      },
      verify
    );
    passport2.use(strategy);
  }
  passport2.serializeUser((user, cb) => {
    secureLogger.authDebug("Serializing OAuth user", {
      hasUser: !!user,
      hasClaims: !!user.claims,
      hasValidStructure: !!(user.claims && user.claims.sub)
    });
    cb(null, user);
  });
  passport2.deserializeUser((user, cb) => {
    secureLogger.authDebug("Deserializing OAuth user", {
      hasUser: !!user,
      hasClaims: !!user.claims,
      hasValidStructure: !!(user.claims && user.claims.sub)
    });
    cb(null, user);
  });
  app2.get("/api/login", (req, res, next) => {
    passport2.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"]
    })(req, res, next);
  });
  app2.get("/api/callback", (req, res, next) => {
    secureLogger.authDebug("OAuth callback received", {
      hostname: req.hostname,
      hasQuery: !!req.query,
      queryKeys: req.query ? Object.keys(req.query) : []
    });
    passport2.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login"
    })(req, res, (err) => {
      if (err) {
        secureLogger.authError("OAuth callback error", { error: err });
        return res.redirect("/api/login");
      }
      next();
    });
  });
  app2.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`
        }).href
      );
    });
  });
}
var isAuthenticated = async (req, res, next) => {
  const user = req.user;
  secureLogger.authDebug("Authentication check started", {
    requestInfo: createSafeRequestInfo(req),
    hasAuthFunction: typeof req.isAuthenticated === "function",
    isAuthenticated: typeof req.isAuthenticated === "function" ? req.isAuthenticated() : !!user,
    hasUser: !!user,
    userStructure: user ? {
      hasId: !!user.id,
      hasClaims: !!user.claims,
      hasValidOAuth: !!(user.claims && user.claims.sub),
      hasEmail: !!(user.claims && user.claims.email),
      hasExpiry: !!user.expires_at,
      isExpired: user.expires_at ? Math.floor(Date.now() / 1e3) > user.expires_at : false
    } : null,
    hasSession: !!req.session
  });
  const isAuth = typeof req.isAuthenticated === "function" ? req.isAuthenticated() : !!user;
  if (!isAuth || !user) {
    secureLogger.authError("Basic authentication failed", {
      hasUser: !!user,
      hasAuthFunction: typeof req.isAuthenticated === "function",
      isAuthenticated: isAuth
    });
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (user.claims && user.claims.sub) {
    if (!user.expires_at) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const now = Math.floor(Date.now() / 1e3);
    if (now <= user.expires_at) {
      return next();
    }
    const refreshToken = user.refresh_token;
    if (!refreshToken) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
      return next();
    } catch (error) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
  }
  if (user.id) {
    return next();
  }
  secureLogger.authError("Authentication failed: Invalid user structure", {
    hasUser: !!user,
    hasClaims: !!(user && user.claims),
    hasValidOAuth: !!(user && user.claims && user.claims.sub),
    hasLocalId: !!(user && user.id),
    userType: user ? user.claims ? "oauth" : user.id ? "local" : "unknown" : "none"
  });
  return res.status(401).json({ message: "Unauthorized - Invalid session" });
};

// server/init-agency-accounts.ts
init_schema();
async function initializeAgencyAccounts(storage2) {
  console.log("[Agency Init] Checking system agency accounts...");
  const agencyAccounts = [
    {
      id: SYSTEM_USER_IDS.TMR,
      displayName: "Transport and Main Roads",
      firstName: "TMR",
      lastName: "Queensland",
      accountType: "business",
      isOfficialAgency: true,
      businessName: "Transport and Main Roads Queensland",
      businessDescription: "Official Queensland Government transport and road safety authority",
      termsAccepted: true,
      termsAcceptedAt: /* @__PURE__ */ new Date()
    },
    {
      id: SYSTEM_USER_IDS.QFES,
      displayName: "Queensland Fire and Emergency Services",
      firstName: "QFES",
      lastName: "Queensland",
      accountType: "business",
      isOfficialAgency: true,
      businessName: "Queensland Fire and Emergency Services",
      businessDescription: "Official Queensland Government emergency services authority",
      termsAccepted: true,
      termsAcceptedAt: /* @__PURE__ */ new Date()
    },
    {
      id: SYSTEM_USER_IDS.QAS,
      displayName: "Queensland Ambulance Service",
      firstName: "QAS",
      lastName: "Queensland",
      accountType: "business",
      isOfficialAgency: true,
      businessName: "Queensland Ambulance Service",
      businessDescription: "Official Queensland Government ambulance and emergency medical services",
      termsAccepted: true,
      termsAcceptedAt: /* @__PURE__ */ new Date()
    },
    {
      id: SYSTEM_USER_IDS.QPS,
      displayName: "Queensland Police Service",
      firstName: "QPS",
      lastName: "Queensland",
      accountType: "business",
      isOfficialAgency: true,
      businessName: "Queensland Police Service",
      businessDescription: "Official Queensland Government police service",
      termsAccepted: true,
      termsAcceptedAt: /* @__PURE__ */ new Date()
    },
    {
      id: SYSTEM_USER_IDS.LEGACY_SYSTEM,
      displayName: "Legacy System Archive",
      firstName: "System",
      lastName: "Archive",
      accountType: "regular",
      isOfficialAgency: false,
      termsAccepted: true,
      termsAcceptedAt: /* @__PURE__ */ new Date()
    }
  ];
  let createdCount = 0;
  let existingCount = 0;
  for (const account of agencyAccounts) {
    try {
      const existing = await storage2.getUser(account.id);
      if (existing) {
        existingCount++;
        console.log(`[Agency Init] \u2713 ${account.displayName} account already exists`);
      } else {
        await storage2.createUser(account);
        createdCount++;
        console.log(`[Agency Init] \u2713 Created ${account.displayName} account (${account.id})`);
      }
    } catch (error) {
      console.error(`[Agency Init] \u2717 Failed to initialize ${account.displayName}:`, error);
    }
  }
  console.log(`[Agency Init] Complete: ${existingCount} existing, ${createdCount} created`);
}

// server/routes.ts
init_schema();
init_db();
import webpush from "web-push";
import Stripe from "stripe";
import { eq as eq2 } from "drizzle-orm";
import { z as z2 } from "zod";

// server/objectStorage.ts
import { Storage } from "@google-cloud/storage";
import { randomUUID as randomUUID2 } from "crypto";

// server/objectAcl.ts
var ACL_POLICY_METADATA_KEY = "custom:aclPolicy";
function isPermissionAllowed(requested, granted) {
  if (requested === "read" /* READ */) {
    return ["read" /* READ */, "write" /* WRITE */].includes(granted);
  }
  return granted === "write" /* WRITE */;
}
function createObjectAccessGroup(group) {
  switch (group.type) {
    // Implement the case for each type of access group to instantiate.
    //
    // For example:
    // case "USER_LIST":
    //   return new UserListAccessGroup(group.id);
    // case "EMAIL_DOMAIN":
    //   return new EmailDomainAccessGroup(group.id);
    // case "GROUP_MEMBER":
    //   return new GroupMemberAccessGroup(group.id);
    // case "SUBSCRIBER":
    //   return new SubscriberAccessGroup(group.id);
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}
async function setObjectAclPolicy(objectFile, aclPolicy) {
  const [exists] = await objectFile.exists();
  if (!exists) {
    throw new Error(`Object not found: ${objectFile.name}`);
  }
  await objectFile.setMetadata({
    metadata: {
      [ACL_POLICY_METADATA_KEY]: JSON.stringify(aclPolicy)
    }
  });
}
async function getObjectAclPolicy(objectFile) {
  const [metadata] = await objectFile.getMetadata();
  const aclPolicy = metadata?.metadata?.[ACL_POLICY_METADATA_KEY];
  if (!aclPolicy) {
    return null;
  }
  return JSON.parse(aclPolicy);
}
async function canAccessObject({
  userId,
  objectFile,
  requestedPermission
}) {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy) {
    return false;
  }
  if (aclPolicy.visibility === "public" && requestedPermission === "read" /* READ */) {
    return true;
  }
  if (!userId) {
    return false;
  }
  if (aclPolicy.owner === userId) {
    return true;
  }
  for (const rule of aclPolicy.aclRules || []) {
    const accessGroup = createObjectAccessGroup(rule.group);
    if (await accessGroup.hasMember(userId) && isPermissionAllowed(requestedPermission, rule.permission)) {
      return true;
    }
  }
  return false;
}

// server/objectStorage.ts
var REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
var objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token"
      }
    },
    universe_domain: "googleapis.com"
  },
  projectId: ""
});
var ObjectNotFoundError = class _ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, _ObjectNotFoundError.prototype);
  }
};
var ObjectStorageService = class {
  constructor() {
  }
  // Gets the public object search paths.
  getPublicObjectSearchPaths() {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr.split(",").map((path4) => path4.trim()).filter((path4) => path4.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }
  // Gets the private object directory.
  getPrivateObjectDir() {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }
  // Search for a public object from the search paths.
  async searchPublicObject(filePath) {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }
    return null;
  }
  // Downloads an object to the response.
  async downloadObject(file, res, cacheTtlSec = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`
      });
      const stream = file.createReadStream();
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }
  // Gets the upload URL for an object entity.
  async getObjectEntityUploadURL() {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    const objectId = randomUUID2();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900
    });
  }
  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath) {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }
    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }
  normalizeObjectEntityPath(rawPath) {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }
  // Tries to set the ACL policy for the object entity and return the normalized path.
  async trySetObjectEntityAclPolicy(rawPath, aclPolicy) {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }
    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }
  // Checks if the user can access the object entity.
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission
  }) {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? "read" /* READ */
    });
  }
};
function parseObjectPath(path4) {
  if (!path4.startsWith("/")) {
    path4 = `/${path4}`;
  }
  const pathParts = path4.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return {
    bucketName,
    objectName
  };
}
async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec
}) {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1e3).toISOString()
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, make sure you're running on Replit`
    );
  }
  const { signed_url: signedURL } = await response.json();
  return signedURL;
}

// server/routes.ts
import express from "express";
import path from "path";
import sharp from "sharp";
import fs from "fs";
import multer from "multer";
import { randomUUID as randomUUID3 } from "node:crypto";
init_region_utils();
init_spatial_lookup();
import { fileTypeFromBuffer } from "file-type";
if (!process.env.STRIPE_SECRET_KEY) {
  console.log("Stripe integration disabled - STRIPE_SECRET_KEY not found");
}
var stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
try {
  const publicKey = process.env.VAPID_PUBLIC_KEY || "BNXnNJlwtD-_OLQ_8YE3WRe3dXHO_-ZI2sGE7zJyR5eKjsEMAp0diFzOl1ZUgQzfOjm4Cf8PSQ7c1-oIqY2GsHw";
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (privateKey && privateKey.length > 20) {
    webpush.setVapidDetails(
      "mailto:support@example.com",
      publicKey,
      privateKey
    );
    console.log("Web push configured with VAPID keys");
  } else {
    console.log("Web push: VAPID keys not configured - push notifications disabled");
  }
} catch (error) {
  console.log("Web push configuration skipped:", error instanceof Error ? error.message : "Unknown error");
}
async function seedCategoriesIfNeeded() {
  try {
    console.log("\u{1F331} Checking categories and subcategories...");
    const existingCategories = await db.select().from(categories);
    const existingSubcategories = await storage.getSubcategories();
    console.log(`\u{1F4CA} Found ${existingCategories.length} categories (including inactive) and ${existingSubcategories.length} subcategories`);
    const categoryData = [
      {
        name: "Safety & Crime",
        description: "Crime, violence, theft, and public safety concerns",
        icon: "shield",
        color: "#7c3aed",
        // purple
        order: 1,
        isActive: true,
        subcategories: [
          { name: "Violence & Threats", description: "Physical violence, threats, intimidation", order: 1 },
          { name: "Theft & Property Crime", description: "Theft, burglary, property damage", order: 2 },
          { name: "Suspicious Activity", description: "Unusual behavior or activities", order: 3 },
          { name: "Public Disturbances", description: "Noise, disruptions, antisocial behavior", order: 4 }
        ]
      },
      {
        name: "Infrastructure & Hazards",
        description: "Road hazards, utilities, and structural problems",
        icon: "construction",
        color: "#ea580c",
        // orange
        order: 2,
        isActive: true,
        subcategories: [
          { name: "Road Hazards", description: "Fallen trees, debris, potholes, dangerous conditions", order: 1 },
          { name: "Utility Issues", description: "Power lines, water leaks, gas problems", order: 2 },
          { name: "Building Problems", description: "Structural damage, unsafe buildings", order: 3 },
          { name: "Environmental Hazards", description: "Chemical spills, pollution, toxic materials", order: 4 }
        ]
      },
      {
        name: "Emergency Situations",
        description: "Active emergencies requiring immediate attention",
        icon: "siren",
        color: "#dc2626",
        // red
        order: 3,
        isActive: true,
        subcategories: [
          { name: "Fire & Smoke", description: "Fires, smoke, burning structures or vegetation", order: 1 },
          { name: "Medical Emergencies", description: "Medical incidents in public spaces", order: 2 },
          { name: "Natural Disasters", description: "Floods, storms, weather emergencies", order: 3 },
          { name: "Chemical/Hazmat", description: "Chemical spills, gas leaks, hazardous materials", order: 4 }
        ]
      },
      {
        name: "Wildlife & Nature",
        description: "Animal-related incidents and environmental concerns",
        icon: "leaf",
        color: "#16a34a",
        // green
        order: 4,
        isActive: true,
        subcategories: [
          { name: "Dangerous Animals", description: "Snakes, aggressive animals, pest control", order: 1 },
          { name: "Animal Welfare", description: "Injured or distressed animals", order: 2 },
          { name: "Environmental Issues", description: "Pollution, illegal dumping, habitat damage", order: 3 },
          { name: "Pest Problems", description: "Insect infestations, rodent problems", order: 4 }
        ]
      },
      {
        name: "Community Issues",
        description: "Local community concerns and quality of life issues",
        icon: "users",
        color: "#2563eb",
        // blue
        order: 5,
        isActive: true,
        subcategories: [
          { name: "Noise Complaints", description: "Excessive noise, loud parties, construction", order: 1 },
          { name: "Traffic Issues", description: "Dangerous driving, parking problems", order: 2 },
          { name: "Public Space Problems", description: "Park issues, playground damage", order: 3 },
          { name: "Events & Gatherings", description: "Large gatherings, street events", order: 4 }
        ]
      },
      {
        name: "Pets",
        description: "Pet-related incidents and concerns",
        icon: "heart",
        color: "#ec4899",
        // pink
        order: 6,
        isActive: true,
        subcategories: [
          { name: "Missing Pets", description: "Lost or missing cats, dogs, and other pets", order: 1 },
          { name: "Found Pets", description: "Found animals looking for their owners", order: 2 }
        ]
      },
      {
        name: "Lost & Found",
        description: "Lost and found personal items and belongings",
        icon: "search",
        color: "#f59e0b",
        // amber
        order: 7,
        isActive: true,
        subcategories: [
          { name: "Lost Items", description: "Lost keys, phones, wallets, jewelry, documents", order: 1 },
          { name: "Found Items", description: "Found personal belongings that need to be returned", order: 2 }
        ]
      }
    ];
    let createdCategories = 0;
    let createdSubcategories = 0;
    let skippedCategories = 0;
    let skippedSubcategories = 0;
    for (const catData of categoryData) {
      const { subcategories: subcategories3, ...categoryInfo } = catData;
      const existingCategory = existingCategories.find((cat) => cat.name === categoryInfo.name);
      let categoryToUse;
      if (existingCategory) {
        categoryToUse = existingCategory;
        skippedCategories++;
        console.log(`\u2713 Category "${categoryInfo.name}" already exists`);
        if (existingCategory.isActive !== true) {
          await db.update(categories).set({ isActive: true }).where(eq2(categories.id, existingCategory.id));
          console.log(`  \u26A1 Updated "${categoryInfo.name}" to set isActive=true`);
        }
      } else {
        categoryToUse = await storage.createCategory(categoryInfo);
        createdCategories++;
        console.log(`+ Created category "${categoryInfo.name}"`);
      }
      for (const subData of subcategories3) {
        const existingSubcategory = existingSubcategories.find(
          (sub) => sub.categoryId === categoryToUse.id && sub.name === subData.name
        );
        if (existingSubcategory) {
          skippedSubcategories++;
          console.log(`\u2713 Subcategory "${subData.name}" already exists under "${categoryInfo.name}"`);
        } else {
          await storage.createSubcategory({
            ...subData,
            categoryId: categoryToUse.id
          });
          createdSubcategories++;
          console.log(`+ Created subcategory "${subData.name}" under "${categoryInfo.name}"`);
        }
      }
    }
    const totalCategories = createdCategories + skippedCategories;
    const totalSubcategories = createdSubcategories + skippedSubcategories;
    console.log(`\u2705 Seeding complete: ${createdCategories} new categories, ${createdSubcategories} new subcategories (${skippedCategories} categories and ${skippedSubcategories} subcategories already existed)`);
    return {
      success: true,
      message: `Seeding complete: ${createdCategories} new categories, ${createdSubcategories} new subcategories created`,
      created: { categories: createdCategories, subcategories: createdSubcategories },
      skipped: { categories: skippedCategories, subcategories: skippedSubcategories },
      total: { categories: totalCategories, subcategories: totalSubcategories }
    };
  } catch (error) {
    console.error("\u274C Error seeding categories:", error);
    return {
      success: false,
      error: "Failed to seed categories",
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
var photoUploadRateLimit = /* @__PURE__ */ new Map();
var ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
var MAX_FILE_SIZE = 5 * 1024 * 1024;
var MAX_IMAGE_DIMENSION = 1600;
var UPLOADS_PER_HOUR = 10;
async function validateSecureImage(buffer, filename) {
  try {
    const detectedType = await fileTypeFromBuffer(buffer);
    if (!detectedType) {
      return { isValid: false, error: "Unable to detect file type from content" };
    }
    if (detectedType.mime === "image/svg+xml") {
      return { isValid: false, error: "SVG files are not allowed for security reasons" };
    }
    if (!ALLOWED_IMAGE_TYPES.includes(detectedType.mime)) {
      return { isValid: false, error: `File type ${detectedType.mime} is not allowed. Only JPEG, PNG, and WebP are supported.` };
    }
    const ext = filename.toLowerCase().split(".").pop();
    const expectedExts = {
      "image/jpeg": ["jpg", "jpeg"],
      "image/png": ["png"],
      "image/webp": ["webp"]
    };
    if (!expectedExts[detectedType.mime]?.includes(ext || "")) {
      return { isValid: false, error: "File extension does not match detected file type" };
    }
    return { isValid: true, detectedType: detectedType.mime };
  } catch (error) {
    return { isValid: false, error: "File validation failed: " + (error instanceof Error ? error.message : "Unknown error") };
  }
}
function checkPhotoUploadRateLimit(userId) {
  const now = Date.now();
  const oneHour = 60 * 60 * 1e3;
  const userKey = `upload_${userId}`;
  if (!photoUploadRateLimit.has(userKey)) {
    photoUploadRateLimit.set(userKey, { count: 1, resetTime: now + oneHour });
    return { allowed: true };
  }
  const userData = photoUploadRateLimit.get(userKey);
  if (now >= userData.resetTime) {
    photoUploadRateLimit.set(userKey, { count: 1, resetTime: now + oneHour });
    return { allowed: true };
  }
  if (userData.count >= UPLOADS_PER_HOUR) {
    return { allowed: false, resetTime: userData.resetTime };
  }
  userData.count++;
  photoUploadRateLimit.set(userKey, userData);
  return { allowed: true };
}
async function processSecureImage(buffer, options = {}) {
  const {
    quality = 85,
    format = "jpeg",
    maxDimension = MAX_IMAGE_DIMENSION
  } = options;
  try {
    let processor = sharp(buffer).rotate().resize(maxDimension, maxDimension, {
      fit: "inside",
      withoutEnlargement: true
    });
    if (format === "jpeg") {
      processor = processor.jpeg({
        quality,
        progressive: true,
        mozjpeg: true
      });
    } else if (format === "webp") {
      processor = processor.webp({
        quality,
        effort: 4
      });
    } else if (format === "png") {
      processor = processor.png({
        quality,
        compressionLevel: 6
      });
    }
    return await processor.toBuffer();
  } catch (error) {
    throw new Error(`Image processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
async function generateImageVariants(buffer, baseFilename) {
  const variants = {
    thumbnail: await processSecureImage(buffer, { maxDimension: 200, quality: 60 }),
    medium: await processSecureImage(buffer, { maxDimension: 600, quality: 75 }),
    full: await processSecureImage(buffer, { maxDimension: MAX_IMAGE_DIMENSION, quality: 85 })
  };
  const paths = {
    thumbnail: `${baseFilename}_thumb.jpg`,
    medium: `${baseFilename}_med.jpg`,
    full: `${baseFilename}.jpg`
  };
  return { variants, paths };
}
var storage_multer = multer.memoryStorage();
var secureUpload = multer({
  storage: storage_multer,
  limits: {
    fileSize: MAX_FILE_SIZE,
    // 5MB file size limit
    files: 1,
    // Only allow 1 file per request
    fieldSize: 1024 * 1024,
    // 1MB field size limit
    fields: 10
    // Max 10 form fields
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    if (!file.originalname || file.originalname.length > 255) {
      return cb(new Error("Invalid filename"), false);
    }
    cb(null, true);
  }
});
async function registerRoutes(app2) {
  await initializeAgencyAccounts(storage);
  const assetsPath = path.resolve(process.cwd(), "attached_assets");
  console.log("Serving static assets from:", assetsPath);
  console.log("Directory exists:", fs.existsSync(assetsPath));
  app2.use("/attached_assets", express.static(assetsPath));
  app2.post("/api/upload/photo", isAuthenticated, secureUpload.single("photo"), async (req, res) => {
    try {
      secureLogger.authDebug("Photo upload started", {
        requestInfo: createSafeRequestInfo(req),
        hasFile: !!req.file,
        fileInfo: req.file ? {
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        } : null,
        user: req.user
      });
      const userId = req.user?.claims?.sub || req.user?.id;
      secureLogger.authDebug("User ID extracted", { userId: userId ? "[USER_ID]" : "none" });
      if (!userId) {
        secureLogger.authError("No userId found in photo upload", { user: req.user });
        return res.status(401).json({
          error: "Authentication required",
          code: "AUTH_REQUIRED",
          loginUrl: "/api/login",
          message: "Please log in to upload photos. Click here to login.",
          debug: process.env.NODE_ENV === "development" ? {
            userExists: !!req.user,
            isAuthenticated: req.isAuthenticated(),
            hasSession: !!req.session
          } : void 0
        });
      }
      const rateLimitCheck = checkPhotoUploadRateLimit(userId);
      if (!rateLimitCheck.allowed) {
        const resetDate = new Date(rateLimitCheck.resetTime);
        return res.status(429).json({
          error: "Upload rate limit exceeded",
          resetTime: resetDate.toISOString(),
          message: `Maximum ${UPLOADS_PER_HOUR} uploads per hour. Try again after ${resetDate.toLocaleTimeString()}.`
        });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No photo file provided" });
      }
      if (req.file.size > MAX_FILE_SIZE) {
        return res.status(413).json({
          error: `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
        });
      }
      const validation = await validateSecureImage(req.file.buffer, req.file.originalname);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
      }
      try {
        const fileId = randomUUID3();
        const baseFilename = `photo_${fileId}`;
        const { variants, paths } = await generateImageVariants(req.file.buffer, baseFilename);
        console.log("Initializing object storage service...");
        const objectStorageService = new ObjectStorageService();
        console.log("Getting private object directory...");
        const privateObjectDir = objectStorageService.getPrivateObjectDir();
        console.log("Private object dir:", privateObjectDir);
        if (!privateObjectDir) {
          console.error("Object storage not configured - privateObjectDir is null/undefined");
          throw new Error("Object storage not configured");
        }
        const uploadPromises = Object.entries(variants).map(async ([size, buffer]) => {
          const fullPath = `${privateObjectDir}/photos/${paths[size]}`;
          const { bucketName, objectName } = (() => {
            if (!fullPath.startsWith("/")) {
              const path4 = `/${fullPath}`;
              const pathParts2 = path4.split("/");
              return {
                bucketName: pathParts2[1],
                objectName: pathParts2.slice(2).join("/")
              };
            }
            const pathParts = fullPath.split("/");
            return {
              bucketName: pathParts[1],
              objectName: pathParts.slice(2).join("/")
            };
          })();
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);
          await file.save(buffer, {
            metadata: {
              contentType: "image/jpeg",
              metadata: {
                uploadedBy: userId,
                uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
                processed: "true",
                variant: size,
                securityValidated: "true"
              }
            }
          });
          return {
            size,
            path: fullPath,
            url: `/objects${fullPath}`
          };
        });
        const uploadedVariants = await Promise.all(uploadPromises);
        const response = {
          success: true,
          fileId,
          variants: uploadedVariants.reduce((acc, variant) => {
            acc[variant.size] = {
              url: variant.url,
              path: variant.path
            };
            return acc;
          }, {}),
          originalFilename: req.file.originalname,
          detectedType: validation.detectedType,
          processed: true
        };
        secureLogger.authDebug("Photo upload completed successfully", {
          fileId,
          variantCount: Object.keys(response.variants).length,
          originalFilename: req.file.originalname
        });
        res.json(response);
      } catch (processingError) {
        console.error("=== IMAGE PROCESSING ERROR ===");
        console.error("Error type:", processingError instanceof Error ? processingError.constructor.name : "Unknown");
        console.error("Error message:", processingError instanceof Error ? processingError.message : "Unknown processing error");
        console.error("Error stack:", processingError instanceof Error ? processingError.stack : "No stack trace");
        console.error("=== END PROCESSING ERROR ===");
        res.status(500).json({
          error: "Image processing failed",
          message: processingError instanceof Error ? processingError.message : "Unknown processing error"
        });
      }
    } catch (error) {
      console.error("=== PHOTO UPLOAD ERROR ===");
      console.error("Error type:", error instanceof Error ? error.constructor.name : "Unknown");
      console.error("Error message:", error instanceof Error ? error.message : "Unknown error");
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      console.error("File info:", req.file ? {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : "No file");
      secureLogger.authError("Photo upload failed", {
        user: req.user,
        error,
        fileInfo: req.file
      });
      console.error("=== END PHOTO UPLOAD ERROR ===");
      let statusCode = 500;
      let errorCode = "UPLOAD_FAILED";
      let userMessage = "Photo upload failed";
      if (error instanceof Error && error.message.includes("Object storage not configured")) {
        statusCode = 503;
        errorCode = "STORAGE_UNAVAILABLE";
        userMessage = "File storage temporarily unavailable. Please try again later.";
      } else if (error instanceof Error && error.message.includes("rate limit")) {
        statusCode = 429;
        errorCode = "RATE_LIMITED";
        userMessage = "Too many uploads. Please wait before uploading again.";
      } else if (error instanceof Error && error.message.includes("file too large")) {
        statusCode = 413;
        errorCode = "FILE_TOO_LARGE";
        userMessage = "File is too large. Please choose a smaller image.";
      } else if (error instanceof Error && error.message.includes("Invalid filename")) {
        statusCode = 400;
        errorCode = "INVALID_FILE";
        userMessage = "Invalid file type. Please upload a valid image file.";
      }
      res.status(statusCode).json({
        error: userMessage,
        code: errorCode,
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        debug: process.env.NODE_ENV === "development" ? {
          stack: error instanceof Error ? error.stack : void 0,
          errorType: error instanceof Error ? error.constructor.name : "Unknown",
          hasFile: !!req.file,
          hasUser: !!req.user
        } : void 0
      });
    }
  });
  const commentPhotoUpload = multer({
    storage: storage_multer,
    limits: {
      fileSize: MAX_FILE_SIZE,
      // 5MB per file
      files: 3,
      // Max 3 photos per comment
      fieldSize: 1024 * 1024,
      fields: 10
    },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("Only image files are allowed"), false);
      }
      if (!file.originalname || file.originalname.length > 255) {
        return cb(new Error("Invalid filename"), false);
      }
      cb(null, true);
    }
  });
  app2.post("/api/upload/comment-photos", isAuthenticated, commentPhotoUpload.array("photos", 3), async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: "No photos provided" });
      }
      if (req.files.length > 3) {
        return res.status(400).json({ error: "Maximum 3 photos allowed per comment" });
      }
      const uploadedUrls = [];
      const objectStorageService = new ObjectStorageService();
      const privateObjectDir = objectStorageService.getPrivateObjectDir();
      for (const file of req.files) {
        if (file.size > MAX_FILE_SIZE) {
          return res.status(413).json({
            error: `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
          });
        }
        const validation = await validateSecureImage(file.buffer, file.originalname);
        if (!validation.isValid) {
          return res.status(400).json({ error: validation.error });
        }
        const processedBuffer = await sharp(file.buffer).resize(1200, 1200, {
          fit: "inside",
          withoutEnlargement: true
        }).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
        const fileId = randomUUID3();
        const filename = `comment_photo_${fileId}.jpg`;
        const fullPath = `${privateObjectDir}/comments/${filename}`;
        const { bucketName, objectName } = (() => {
          const pathParts = fullPath.startsWith("/") ? fullPath.split("/") : `/${fullPath}`.split("/");
          return {
            bucketName: pathParts[1],
            objectName: pathParts.slice(2).join("/")
          };
        })();
        const bucket = objectStorageClient.bucket(bucketName);
        const fileObj = bucket.file(objectName);
        await fileObj.save(processedBuffer, {
          metadata: {
            contentType: "image/jpeg",
            metadata: {
              uploadedBy: userId,
              uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
              processed: "true",
              type: "comment_photo"
            }
          }
        });
        uploadedUrls.push(`/objects${fullPath}`);
      }
      res.json({
        success: true,
        urls: uploadedUrls,
        count: uploadedUrls.length
      });
    } catch (error) {
      console.error("Comment photo upload error:", error);
      res.status(500).json({
        error: "Photo upload failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/compress-image", async (req, res) => {
    const imagePath = req.query.path;
    const size = req.query.size || "medium";
    const format = req.query.format || "auto";
    if (!imagePath) {
      return res.status(400).json({ error: "Path parameter required" });
    }
    const filePath = path.join(process.cwd(), imagePath);
    try {
      if (!fs.existsSync(filePath) || !imagePath.startsWith("/attached_assets/")) {
        return res.status(404).json({ error: "Image not found" });
      }
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const sizeConfigs = {
        thumbnail: { width: 200, height: 200, quality: 60 },
        medium: { width: 600, height: 400, quality: 70 },
        full: { width: 1200, height: 800, quality: 80 }
      };
      const config = sizeConfigs[size] || sizeConfigs.medium;
      const supportsWebP = req.headers.accept?.includes("image/webp") || format === "webp";
      const outputFormat = supportsWebP && format !== "jpeg" ? "webp" : "jpeg";
      if (fileSize < 50 * 1024 && size === "thumbnail") {
        return res.sendFile(filePath);
      }
      let imageProcessor = sharp(filePath).resize(config.width, config.height, {
        fit: "inside",
        withoutEnlargement: true
      });
      let compressed;
      let contentType;
      if (outputFormat === "webp") {
        compressed = await imageProcessor.webp({
          quality: config.quality,
          effort: 4
          // Balance between compression and speed
        }).toBuffer();
        contentType = "image/webp";
      } else {
        compressed = await imageProcessor.jpeg({
          quality: config.quality,
          progressive: true,
          mozjpeg: true
          // Better compression
        }).toBuffer();
        contentType = "image/jpeg";
      }
      const compressionRatio = Math.round((fileSize - compressed.length) / fileSize * 100);
      res.set({
        "Content-Type": contentType,
        "Content-Length": compressed.length.toString(),
        "Cache-Control": "public, max-age=2592000, immutable",
        // 30 days cache with immutable
        "ETag": `"${imagePath}-${size}-${outputFormat}"`,
        "X-Original-Size": fileSize.toString(),
        "X-Compressed-Size": compressed.length.toString(),
        "X-Compression-Ratio": `${compressionRatio}%`,
        "X-Image-Size": size,
        "X-Image-Format": outputFormat
      });
      res.send(compressed);
    } catch (error) {
      console.error("Image compression error:", error);
      res.status(500).json({ error: "Compression failed" });
    }
  });
  app2.get("/api/batch-users", async (req, res) => {
    try {
      const { ids } = req.query;
      if (!ids || typeof ids !== "string") {
        return res.status(400).json({
          error: "Missing or invalid ids parameter. Expected comma-separated user IDs."
        });
      }
      const userIds = ids.split(",").map((id) => id.trim()).filter((id) => id.length > 0);
      if (userIds.length === 0) {
        return res.status(400).json({
          error: "No valid user IDs provided"
        });
      }
      if (userIds.length > 100) {
        return res.status(400).json({
          error: "Too many user IDs requested. Maximum 100 IDs per request."
        });
      }
      const users2 = await storage.getUsersByIds(userIds);
      const safeUsers = users2.map((user) => ({
        id: user.id,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.profileImageUrl,
        // Map profileImageUrl to avatarUrl
        accountType: user.accountType,
        isOfficialAgency: user.isOfficialAgency || false
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching batch users:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });
  await setupAuth(app2);
  await setupAuth2(app2);
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);
      if (user && user.password) {
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      } else {
        res.json(user);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.post("/api/user/accept-terms", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.acceptUserTerms(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "Terms accepted successfully", user });
    } catch (error) {
      console.error("Error accepting terms:", error);
      res.status(500).json({ message: "Failed to accept terms" });
    }
  });
  app2.patch("/api/user/suburb", isAuthenticated, async (req, res) => {
    try {
      const { homeSuburb } = z2.object({
        homeSuburb: z2.string().min(1)
      }).parse(req.body);
      const userId = req.user.claims.sub;
      const updatedUser = await storage.updateUserSuburb(userId, homeSuburb);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user suburb:", error);
      res.status(500).json({ message: "Failed to update suburb" });
    }
  });
  app2.get("/api/ads", async (req, res) => {
    try {
      const testSuburb = req.query.suburb || "Sunshine Coast";
      const limit = parseInt(req.query.limit) || 3;
      const ads = await storage.getActiveAdsForSuburb(testSuburb, limit);
      console.log(`Serving ${ads.length} ads for suburb: ${testSuburb}`);
      res.json(ads);
    } catch (error) {
      console.error("Error fetching ads:", error);
      res.status(500).json({ message: "Failed to fetch ads" });
    }
  });
  app2.post("/api/ads/create", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user || user.accountType !== "business") {
        return res.status(403).json({
          message: "Only business accounts can create advertisements. Please upgrade to a business account."
        });
      }
      const adData = z2.object({
        businessName: z2.string().min(1).max(100),
        title: z2.string().min(1).max(100),
        content: z2.string().min(1).max(500),
        websiteUrl: z2.string().optional().transform((val) => {
          if (!val || val.trim() === "") return "";
          if (!val.match(/^https?:\/\//)) {
            return `https://${val}`;
          }
          return val;
        }).pipe(z2.string().url().optional().or(z2.literal(""))),
        address: z2.string().max(200).optional().or(z2.literal("")),
        suburb: z2.string().min(1).max(100),
        cta: z2.string().min(1).max(50),
        targetSuburbs: z2.array(z2.string()).optional(),
        dailyBudget: z2.string(),
        totalBudget: z2.string().optional(),
        template: z2.string().optional(),
        logoUrl: z2.string().optional(),
        backgroundUrl: z2.string().optional(),
        status: z2.enum(["pending", "active", "paused", "rejected"]).default("pending")
      }).parse(req.body);
      if (!adData.targetSuburbs || adData.targetSuburbs.length === 0) {
        adData.targetSuburbs = [adData.suburb];
      }
      if (!adData.totalBudget) {
        const dailyAmount = parseFloat(adData.dailyBudget);
        adData.totalBudget = (dailyAmount * 30).toString();
      }
      const cpmRate = "3.50";
      const newAd = await storage.createAdCampaign({
        businessName: adData.businessName,
        title: adData.title,
        content: adData.content,
        imageUrl: adData.logoUrl || null,
        // Use logo as the main image
        websiteUrl: adData.websiteUrl || null,
        address: adData.address || null,
        suburb: adData.suburb,
        cta: adData.cta,
        targetSuburbs: adData.targetSuburbs,
        dailyBudget: adData.dailyBudget,
        totalBudget: adData.totalBudget,
        cpmRate,
        status: adData.status
      });
      console.log(`New ad created: ${newAd.businessName} - ${newAd.title}`);
      res.json({
        success: true,
        id: newAd.id,
        message: "Ad submitted successfully and is pending review"
      });
    } catch (error) {
      console.error("Error creating ad:", error);
      if (error instanceof z2.ZodError) {
        res.status(400).json({
          message: "Invalid ad data",
          errors: error.errors
        });
      } else {
        res.status(500).json({ message: "Failed to create ad" });
      }
    }
  });
  app2.post("/api/ads/track-view", async (req, res) => {
    try {
      const { adId, duration, userSuburb, timestamp: timestamp2 } = req.body;
      if (!adId || !duration || !userSuburb || !timestamp2) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const userId = req.user?.claims?.sub || "anonymous";
      const viewedAt = new Date(timestamp2);
      const today = viewedAt.toISOString().split("T")[0];
      const existingViews = await storage.getAdViewsToday(userId, adId, today);
      if (existingViews >= 3) {
        return res.json({ message: "View limit reached" });
      }
      await storage.recordAdView({
        adCampaignId: adId,
        userId,
        viewedAt,
        durationMs: duration,
        userSuburb,
        date: today
      });
      res.json({ message: "View recorded" });
    } catch (error) {
      console.error("Error tracking ad view:", error);
      res.status(500).json({ message: "Failed to track view" });
    }
  });
  app2.post("/api/ads/track-click", async (req, res) => {
    try {
      const { adId, timestamp: timestamp2 } = req.body;
      if (!adId || !timestamp2) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const userId = req.user?.claims?.sub || "anonymous";
      const clickedAt = new Date(timestamp2);
      await storage.recordAdClick({
        adCampaignId: adId,
        userId,
        clickedAt
      });
      res.json({ message: "Click recorded" });
    } catch (error) {
      console.error("Error tracking ad click:", error);
      res.status(500).json({ message: "Failed to track click" });
    }
  });
  app2.get("/api/traffic/events", (req, res) => {
    res.status(410).json({
      error: "This endpoint is deprecated. Please use /api/unified instead.",
      migration: {
        old: "/api/traffic/events",
        new: "/api/unified",
        note: "The unified API provides all traffic and incident data in a single response"
      }
    });
  });
  app2.get("/api/location/search", async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Query parameter q is required" });
    }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ", Queensland, Australia")}&format=json&addressdetails=1&limit=5&countrycodes=au&bounded=1&viewbox=138.0,-29.0,154.0,-9.0`,
        // Queensland bounding box
        {
          headers: {
            "User-Agent": "QLD Safety Monitor (contact: support@example.com)"
          }
        }
      );
      if (!response.ok) {
        throw new Error("Geocoding request failed");
      }
      const data = await response.json();
      const locationSuggestions = data.filter(
        (item) => item.address && (item.address.suburb || item.address.city || item.address.town || item.address.village) && item.address.state && (item.address.state.includes("Queensland") || item.address.state.includes("QLD"))
      ).map((item) => {
        const parts = item.display_name.split(",").map((p) => p.trim());
        let suburb = parts[1] || parts[0];
        if (!suburb || suburb.length < 2) {
          suburb = item.address.suburb || item.address.town || item.address.village || item.address.city;
        }
        const postcode = item.address.postcode;
        return {
          display_name: item.display_name,
          // Keep original for debugging
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          address: {
            suburb,
            city: item.address.city,
            state: item.address.state,
            postcode,
            country: item.address.country
          },
          boundingbox: item.boundingbox ? [
            item.boundingbox[0],
            // min_lat
            item.boundingbox[1],
            // max_lat
            item.boundingbox[2],
            // min_lon
            item.boundingbox[3]
            // max_lon
          ] : void 0
        };
      });
      const uniqueLocations = locationSuggestions.filter((location, index2, arr) => {
        const key = `${location.address.suburb}-${location.address.postcode}`;
        return arr.findIndex((l) => `${l.address.suburb}-${l.address.postcode}` === key) === index2;
      });
      res.json(uniqueLocations);
    } catch (error) {
      console.error("Location search error:", error);
      res.status(500).json({ error: "Location search failed" });
    }
  });
  app2.get("/api/location/reverse", async (req, res) => {
    const lat = req.query.lat;
    const lon = req.query.lon;
    if (!lat || !lon) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&extratags=1&namedetails=1`,
        {
          headers: {
            "User-Agent": "QLD Safety Monitor/1.0"
          }
        }
      );
      if (!response.ok) {
        throw new Error("Reverse geocoding request failed");
      }
      const data = await response.json();
      if (!data.address) {
        return res.status(404).json({ error: "No address found for coordinates" });
      }
      const road = data.address.road || data.address.street || // Get from display_name if it's not infrastructure
      (() => {
        const parts = data.display_name?.split(",") || [];
        const firstPart = parts[0]?.trim();
        if (firstPart && !/\d|Access|Way$|Path$|Bridge|Link|Cycleway|Pathway/.test(firstPart)) {
          return firstPart;
        }
        return null;
      })();
      const suburb = data.address.suburb || data.address.residential || // Local area name like "Kawana Forest"
      data.address.town || data.address.village || data.address.city_district || // More specific than city
      data.address.city || // If no address suburb, try to get actual suburb from display_name (usually 2nd part)
      (() => {
        const parts = data.display_name?.split(",") || [];
        if (parts.length > 1 && parts[0] && /\d|Access|Way|Path|Bridge|Link|Cycleway|Pathway/.test(parts[0])) {
          return parts[1]?.trim();
        }
        return parts[0]?.trim();
      })();
      const postcode = data.address.postcode;
      const state = data.address.state;
      if (!state || !state.includes("Queensland")) {
        return res.status(400).json({ error: "Location must be in Queensland" });
      }
      res.json({
        road,
        suburb,
        postcode,
        state,
        display_name: data.display_name
      });
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      res.status(500).json({ error: "Reverse geocoding failed" });
    }
  });
  app2.post("/api/incidents/refresh", async (req, res) => {
    try {
      console.log("Refreshing incidents from external API...");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15e3);
      const response = await fetch(
        "https://services1.arcgis.com/vkTwD8kHw2woKBqV/arcgis/rest/services/ESCAD_Current_Incidents_Public/FeatureServer/0/query?f=geojson&where=1%3D1&outFields=*",
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      let data;
      if (!response.ok) {
        console.warn(`ArcGIS API error: ${response.status} ${response.statusText}`);
        return res.json({ success: false, message: "External API temporarily unavailable" });
      }
      data = await response.json();
      const existingIncidents = await storage.getIncidents();
      const userIncidents = existingIncidents.filter((inc) => inc.properties?.userReported);
      let storedCount = 0;
      let ageFilteredCount = 0;
      if (data.features) {
        for (const feature of data.features) {
          const props = feature.properties;
          const responseDate = props.Response_Date ? new Date(props.Response_Date) : null;
          if (responseDate) {
            const daysSinceResponse = (Date.now() - responseDate.getTime()) / (1e3 * 60 * 60 * 24);
            if (daysSinceResponse > 7) {
              ageFilteredCount++;
              continue;
            }
          }
          const incidentType = props.GroupedType || "Emergency Incident";
          const locality = props.Locality || "Queensland";
          const location = props.Location;
          const title = location ? `${incidentType} - ${location}, ${locality}` : `${incidentType} - ${locality}`;
          const descriptionParts = [];
          if (props.Master_Incident_Number) {
            descriptionParts.push(`Incident #${props.Master_Incident_Number}`);
          }
          if (props.Jurisdiction) {
            descriptionParts.push(`Jurisdiction: ${props.Jurisdiction}`);
          }
          const totalVehicles = (props.VehiclesAssigned || 0) + (props.VehiclesOnRoute || 0) + (props.VehiclesOnScene || 0);
          if (totalVehicles > 0) {
            const vehicleInfo = [];
            if (props.VehiclesOnScene > 0) vehicleInfo.push(`${props.VehiclesOnScene} on scene`);
            if (props.VehiclesOnRoute > 0) vehicleInfo.push(`${props.VehiclesOnRoute} en route`);
            if (props.VehiclesAssigned > 0) vehicleInfo.push(`${props.VehiclesAssigned} assigned`);
            if (vehicleInfo.length > 0) {
              descriptionParts.push(`Vehicles: ${vehicleInfo.join(", ")}`);
            }
          }
          const incident = {
            id: props.OBJECTID?.toString() || randomUUID3(),
            incidentType,
            title,
            description: descriptionParts.length > 0 ? descriptionParts.join(" \u2022 ") : null,
            location: location || locality,
            status: props.CurrentStatus || "Active",
            priority: totalVehicles > 5 ? "high" : totalVehicles > 2 ? "medium" : "low",
            agency: props.Jurisdiction || "Emergency Services Queensland",
            geometry: feature.geometry,
            properties: feature.properties,
            publishedDate: props.Response_Date ? new Date(props.Response_Date) : null
          };
          try {
            await storage.updateIncident(incident.id, incident) || await storage.createIncident(incident);
            storedCount++;
          } catch (error) {
            console.warn("Failed to store incident:", incident.id, error);
          }
        }
      }
      res.json({
        success: true,
        message: `Successfully refreshed ${storedCount} emergency incidents (filtered out ${ageFilteredCount} incidents older than 7 days)`,
        count: storedCount,
        filtered: ageFilteredCount
      });
    } catch (error) {
      console.error("Error refreshing incidents:", error);
      res.status(500).json({
        success: false,
        error: "Failed to refresh incidents",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/cached/incidents", async (req, res) => {
    try {
      const incidents2 = await storage.getIncidents();
      res.json(incidents2);
    } catch (error) {
      console.error("Error fetching cached incidents:", error);
      res.status(500).json({ error: "Failed to fetch incidents" });
    }
  });
  app2.get("/api/auth/status", async (req, res) => {
    try {
      const isAuth = req.isAuthenticated();
      const user = req.user;
      res.json({
        isAuthenticated: isAuth,
        user: user ? {
          id: user.claims?.sub || user.id,
          email: user.claims?.email || user.email,
          name: user.claims?.first_name || user.firstName
        } : null,
        loginUrl: "/api/login",
        message: isAuth ? "Authenticated" : "Please log in to upload photos and submit reports"
      });
    } catch (error) {
      console.error("Auth status check error:", error);
      res.status(500).json({ error: "Failed to check authentication status" });
    }
  });
  if (process.env.NODE_ENV === "development") {
    app2.post("/api/auth/dev-login", async (req, res) => {
      try {
        console.log("Development login requested");
        const testUser = await storage.upsertUser({
          id: "dev-test-user-123",
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          password: null
        });
        const sessionUser = {
          claims: {
            sub: testUser.id,
            email: testUser.email,
            first_name: testUser.firstName,
            last_name: testUser.lastName
          },
          access_token: "dev-token",
          expires_at: Math.floor(Date.now() / 1e3) + 3600
          // 1 hour from now
        };
        req.login(sessionUser, (err) => {
          if (err) {
            console.error("Dev login error:", err);
            return res.status(500).json({ error: "Failed to create dev session" });
          }
          secureLogger.authDebug("Development user session created successfully");
          res.json({
            success: true,
            message: "Development user logged in",
            user: {
              id: testUser.id,
              email: testUser.email,
              name: testUser.firstName
            }
          });
        });
      } catch (error) {
        console.error("Dev login setup error:", error);
        res.status(500).json({ error: "Failed to setup dev login" });
      }
    });
  }
  app2.post("/api/incidents/report", isAuthenticated, async (req, res) => {
    try {
      secureLogger.authDebug("Incident submission started", {
        requestInfo: createSafeRequestInfo(req),
        hasBody: !!req.body,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        user: req.user
      });
      const reportData = z2.object({
        categoryId: z2.string().min(1, "Category is required"),
        subcategoryId: z2.string().min(1, "Subcategory is required"),
        title: z2.string().min(1),
        description: z2.string().optional(),
        location: z2.string().min(1),
        policeNotified: z2.enum(["yes", "no", "not_needed", "unsure"]).optional(),
        photoUrl: z2.string().optional()
      }).parse(req.body);
      secureLogger.authDebug("Report data parsed successfully", {
        hasTitle: !!reportData.title,
        hasLocation: !!reportData.location,
        hasCategoryId: !!reportData.categoryId,
        hasPhoto: !!reportData.photoUrl
      });
      const userId = req.user?.claims?.sub || req.user?.id;
      secureLogger.authDebug("User ID extracted for incident", { hasUserId: !!userId });
      if (!userId) {
        secureLogger.authError("No userId found in incident submission", { user: req.user });
        return res.status(401).json({
          error: "Authentication required - no user ID found",
          code: "AUTH_REQUIRED",
          loginUrl: "/api/login",
          message: "Please log in to submit incident reports. Click here to login.",
          debug: process.env.NODE_ENV === "development" ? {
            userExists: !!req.user,
            isAuthenticated: req.isAuthenticated(),
            sessionId: req.sessionID
          } : void 0
        });
      }
      const user = await storage.getUser(userId);
      secureLogger.authDebug("User retrieved for incident", { hasUser: !!user });
      if (reportData.subcategoryId) {
        await storage.incrementSubcategoryReportCount(reportData.subcategoryId);
      }
      let geometry = null;
      try {
        const geocodeResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(reportData.location + ", Queensland, Australia")}&format=json&limit=1&addressdetails=1`,
          {
            headers: {
              "User-Agent": "QLD Safety Monitor (contact: support@example.com)"
            },
            signal: AbortSignal.timeout(3e3)
            // 3 second timeout
          }
        );
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json();
          if (geocodeData.length > 0) {
            const result = geocodeData[0];
            geometry = {
              type: "Point",
              coordinates: [parseFloat(result.lon), parseFloat(result.lat)]
            };
          }
        }
      } catch (error) {
        console.error("Error geocoding user incident location:", error);
      }
      const incident = {
        incidentType: "User Report",
        // Keep for backward compatibility
        categoryId: reportData.categoryId,
        subcategoryId: reportData.subcategoryId,
        title: reportData.title,
        description: reportData.description || null,
        location: reportData.location,
        status: "Reported",
        policeNotified: reportData.policeNotified || null,
        agency: "User Report",
        publishedDate: /* @__PURE__ */ new Date(),
        photoUrl: reportData.photoUrl || null,
        // User-uploaded photo
        geometry,
        properties: {
          reportedBy: user?.email || "Anonymous",
          userReported: true,
          // Store user details for proper attribution
          reporterId: user?.id,
          reporterName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName || user?.email?.split("@")[0] || "Anonymous User",
          photoUrl: reportData.photoUrl || null,
          timeReported: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
      console.log("Creating incident with data:", JSON.stringify(incident, null, 2));
      const newIncident = await storage.createIncident(incident);
      console.log("Successfully created incident:", newIncident.id);
      try {
        const coordinates = extractCoordinatesFromGeometry(newIncident.geometry);
        if (!coordinates) {
          console.error("\u26A0\uFE0F Cannot add incident to unified store: missing valid coordinates");
          res.json(newIncident);
          return;
        }
        const [lat, lng] = coordinates;
        const reporterUserId = userId;
        const unifiedIncident = {
          source: "user",
          sourceId: newIncident.id,
          title: newIncident.title,
          description: newIncident.description || "",
          location: newIncident.location || "",
          category: newIncident.categoryId || "",
          subcategory: newIncident.subcategoryId || "",
          severity: "medium",
          status: "active",
          geometry: newIncident.geometry,
          centroidLat: lat,
          centroidLng: lng,
          regionIds: getRegionFromCoordinates(lat, lng) ? [getRegionFromCoordinates(lat, lng).id] : [],
          geocell: "",
          // Will be computed after full incident creation
          incidentTime: newIncident.publishedDate || /* @__PURE__ */ new Date(),
          lastUpdated: /* @__PURE__ */ new Date(),
          publishedAt: /* @__PURE__ */ new Date(),
          userId: reporterUserId,
          properties: {
            ...newIncident.properties || {},
            id: newIncident.id,
            title: newIncident.title,
            description: newIncident.description || "",
            location: newIncident.location,
            category: newIncident.categoryId,
            source: "user",
            userReported: true,
            reporterId: reporterUserId
          },
          photoUrl: newIncident.photoUrl,
          verificationStatus: "unverified",
          // Add default values for fields that may be expected downstream
          tags: [],
          impact: "local",
          confidence: 0.8
        };
        unifiedIncident.geocell = computeGeocellForIncident(unifiedIncident);
        await storage.upsertUnifiedIncident("user", newIncident.id, unifiedIncident);
        console.log("\u2705 Incident immediately added to unified store for instant frontend display");
        res.json({
          success: true,
          incident: newIncident,
          unifiedIncident,
          message: "Incident reported successfully"
        });
      } catch (unifiedError) {
        console.error("\u26A0\uFE0F Failed to add incident to unified store, but regular incident was created:", unifiedError);
        res.json(newIncident);
      }
      console.log("=== INCIDENT SUBMISSION DEBUG END ===");
    } catch (error) {
      console.error("=== INCIDENT SUBMISSION ERROR ===");
      console.error("Error type:", error instanceof Error ? error.constructor.name : "Unknown");
      console.error("Error message:", error instanceof Error ? error.message : "Unknown error");
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      console.error("Request body that caused error:", JSON.stringify(req.body, null, 2));
      secureLogger.authError("Incident submission error", { user: req.user, error });
      console.error("=== END ERROR DEBUG ===");
      let statusCode = 500;
      let errorCode = "INCIDENT_SUBMISSION_FAILED";
      let userMessage = "Failed to submit incident report";
      if (error instanceof z2.ZodError) {
        statusCode = 400;
        errorCode = "VALIDATION_ERROR";
        userMessage = "Please check your form data and try again";
      } else if (error instanceof Error && error.message.includes("geocod")) {
        statusCode = 503;
        errorCode = "GEOCODING_FAILED";
        userMessage = "Unable to process location. Your report was saved but may not appear on the map.";
      } else if (error instanceof Error && error.message.includes("database")) {
        statusCode = 503;
        errorCode = "DATABASE_ERROR";
        userMessage = "Database temporarily unavailable. Please try again in a moment.";
      }
      res.status(statusCode).json({
        error: userMessage,
        code: errorCode,
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        debug: process.env.NODE_ENV === "development" ? {
          stack: error instanceof Error ? error.stack : void 0,
          errorType: error instanceof Error ? error.constructor.name : "Unknown",
          requestBody: req.body,
          userId: req.user?.claims?.sub || req.user?.id
        } : void 0
      });
    }
  });
  app2.patch("/api/incidents/:id/status", isAuthenticated, async (req, res) => {
    try {
      const incidentId = req.params.id;
      const { status } = req.body;
      const userId = req.user.claims.sub;
      if (!status || !["active", "completed"].includes(status)) {
        return res.status(400).json({ error: "Status must be 'active' or 'completed'" });
      }
      const incident = await storage.getIncident(incidentId);
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      const reporterId = incident.properties?.reporterId;
      if (reporterId !== userId) {
        return res.status(403).json({ error: "Only the incident creator can update status" });
      }
      await storage.updateIncidentStatus(incidentId, status);
      res.json({ success: true, message: "Incident status updated successfully" });
    } catch (error) {
      console.error("Error updating incident status:", error);
      res.status(500).json({ error: "Failed to update incident status" });
    }
  });
  app2.get("/api/incidents/:incidentId/comments", async (req, res) => {
    try {
      const { incidentId } = req.params;
      const comments2 = await storage.getCommentsByIncidentId(incidentId);
      res.json(comments2);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });
  app2.post("/api/incidents/:incidentId/comments", isAuthenticated, async (req, res) => {
    try {
      const { incidentId } = req.params;
      if (!req.user || !req.user.id) {
        secureLogger.authError("User object missing or malformed for comment", { user: req.user });
        return res.status(401).json({ message: "User authentication failed" });
      }
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        incidentId,
        userId
      });
      const comment = await storage.createComment(validatedData);
      if (comment.parentCommentId) {
        const parentComment = await storage.getCommentById(comment.parentCommentId);
        if (parentComment && parentComment.userId !== userId) {
          const displayName = user?.displayName || user?.firstName || "Someone";
          await storage.createNotification({
            userId: parentComment.userId,
            type: "comment_reply",
            title: "New Reply",
            message: `${displayName} replied to your comment`,
            entityId: comment.id,
            entityType: "comment",
            fromUserId: userId
          });
        }
      }
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create comment" });
    }
  });
  app2.patch("/api/comments/:commentId", isAuthenticated, async (req, res) => {
    try {
      const { commentId } = req.params;
      const userId = req.user.claims.sub;
      const existingComments = await storage.getCommentsByIncidentId("");
      const validatedData = z2.object({
        content: z2.string().min(1)
      }).parse(req.body);
      const comment = await storage.updateComment(commentId, validatedData);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      res.json(comment);
    } catch (error) {
      console.error("Error updating comment:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update comment" });
    }
  });
  app2.delete("/api/incidents/:incidentId/social/comments/:commentId", isAuthenticated, async (req, res) => {
    try {
      const { commentId } = req.params;
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        secureLogger.authError("Delete comment: No user ID found", { user: req.user });
        return res.status(401).json({ message: "Authentication required" });
      }
      const comment = await storage.getIncidentCommentById(commentId);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      if (comment.userId !== userId) {
        return res.status(403).json({ message: "You can only delete your own comments" });
      }
      const success = await storage.deleteIncidentComment(commentId, userId);
      if (!success) {
        return res.status(404).json({ message: "Comment not found or not authorized" });
      }
      if (comment.photoUrl) {
        try {
          console.log("Note: Comment had photo, but photo deletion not implemented yet:", comment.photoUrl);
        } catch (photoError) {
          console.log("Note: Could not delete associated photo:", photoError.message);
        }
      }
      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });
  app2.delete("/api/comments/:commentId", isAuthenticated, async (req, res) => {
    try {
      const { commentId } = req.params;
      const userId = req.user.claims.sub;
      const comment = await storage.getCommentById(commentId);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      if (comment.userId !== userId) {
        return res.status(403).json({ message: "You can only delete your own comments" });
      }
      const success = await storage.deleteComment(commentId);
      if (!success) {
        return res.status(404).json({ message: "Comment not found" });
      }
      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });
  app2.get("/api/incidents/:incidentId/social/comments", async (req, res) => {
    try {
      const { incidentId } = req.params;
      const userId = req.user?.claims?.sub;
      const comments2 = await storage.getIncidentComments(incidentId, userId);
      const count = await storage.getIncidentCommentsCount(incidentId);
      res.json({ comments: comments2, count });
    } catch (error) {
      console.error("Error fetching incident comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });
  app2.post("/api/incidents/:incidentId/social/comments", isAuthenticated, async (req, res) => {
    try {
      const { incidentId } = req.params;
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const validatedData = {
        incidentId,
        userId,
        parentCommentId: req.body.parentCommentId || null,
        // Support nested replies
        username: user.displayName || user.firstName || `User${userId.slice(0, 4)}`,
        content: req.body.content,
        photoUrls: req.body.photoUrls || []
        // Array of photo URLs from separate upload endpoint
      };
      if (!validatedData.content || validatedData.content.trim().length === 0) {
        return res.status(400).json({ message: "Comment content is required" });
      }
      if (validatedData.content.length > 1e3) {
        return res.status(400).json({ message: "Comment too long" });
      }
      if (validatedData.photoUrls && validatedData.photoUrls.length > 3) {
        return res.status(400).json({ message: "Maximum 3 photos allowed per comment" });
      }
      const comment = await storage.createIncidentComment(validatedData);
      const count = await storage.getIncidentCommentsCount(incidentId);
      res.status(201).json({ comment, count });
    } catch (error) {
      console.error("Error creating incident comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });
  app2.post("/api/incidents/:incidentId/social/comments/with-photo", isAuthenticated, secureUpload.single("photo"), async (req, res) => {
    try {
      const { incidentId } = req.params;
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (req.file) {
        const rateLimitCheck = checkPhotoUploadRateLimit(userId);
        if (!rateLimitCheck.allowed) {
          const resetDate = new Date(rateLimitCheck.resetTime);
          return res.status(429).json({
            error: "Upload rate limit exceeded",
            resetTime: resetDate.toISOString(),
            message: `Maximum ${UPLOADS_PER_HOUR} uploads per hour. Try again after ${resetDate.toLocaleTimeString()}.`
          });
        }
      }
      const formData = {
        content: req.body.content,
        parentCommentId: req.body.parentCommentId || null,
        photoAlt: req.body.photoAlt || null
      };
      const validatedCommentData = insertIncidentCommentSchema.parse({
        incidentId,
        userId,
        username: user.displayName || user.firstName || `User${userId.slice(0, 4)}`,
        ...formData
      });
      let photoUrl = null;
      let photoSize = null;
      let photoVariants = null;
      if (req.file) {
        try {
          if (req.file.size > MAX_FILE_SIZE) {
            return res.status(413).json({
              error: `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
            });
          }
          const validation = await validateSecureImage(req.file.buffer, req.file.originalname);
          if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
          }
          const objectStorageService = new ObjectStorageService();
          const privateObjectDir = objectStorageService.getPrivateObjectDir();
          if (!privateObjectDir) {
            throw new Error("Object storage not configured");
          }
          const fileId = randomUUID3();
          const baseFilename = `comment-${fileId}`;
          const { variants, paths } = await generateImageVariants(req.file.buffer, baseFilename);
          const parseObjectPath2 = (path4) => {
            if (!path4.startsWith("/")) {
              path4 = `/${path4}`;
            }
            const pathParts = path4.split("/");
            if (pathParts.length < 3) {
              throw new Error("Invalid path: must contain at least a bucket name");
            }
            const bucketName = pathParts[1];
            const objectName = pathParts.slice(2).join("/");
            return { bucketName, objectName };
          };
          const uploadPromises = Object.entries(variants).map(async ([size, buffer]) => {
            const fullPath = `${privateObjectDir}/comment-photos/${paths[size]}`;
            const { bucketName, objectName } = parseObjectPath2(fullPath);
            const bucket = objectStorageClient.bucket(bucketName);
            const file = bucket.file(objectName);
            await file.save(buffer, {
              metadata: {
                contentType: "image/jpeg",
                metadata: {
                  uploadedBy: userId,
                  uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
                  processed: "true",
                  variant: size,
                  securityValidated: "true",
                  originalFilename: req.file.originalname,
                  detectedType: validation.detectedType
                }
              },
              public: false
              // Keep photos private initially
            });
            const relativePath = `comment-photos/${paths[size]}`;
            return {
              size,
              url: `/objects/${relativePath}`,
              path: fullPath
            };
          });
          const uploadedVariants = await Promise.all(uploadPromises);
          const mediumVariant = uploadedVariants.find((v) => v.size === "medium");
          photoUrl = mediumVariant?.url || uploadedVariants[0]?.url;
          photoSize = variants.medium.length;
          photoVariants = uploadedVariants.reduce((acc, variant) => {
            acc[variant.size] = {
              url: variant.url,
              path: variant.path
            };
            return acc;
          }, {});
          console.log(`Secure photo upload completed for comment: ${photoUrl}, size: ${photoSize} bytes, variants: ${Object.keys(photoVariants).join(", ")}`);
        } catch (uploadError) {
          console.error("Error uploading photo:", uploadError);
          return res.status(500).json({
            message: "Failed to upload photo",
            error: uploadError instanceof Error ? uploadError.message : "Unknown error"
          });
        }
      }
      const commentData = {
        ...validatedCommentData,
        photoUrl,
        photoSize
      };
      const comment = await storage.createIncidentComment(commentData);
      const count = await storage.getIncidentCommentsCount(incidentId);
      res.status(201).json({
        comment,
        count,
        photoVariants,
        // Include variant information in response
        message: req.file ? "Comment with secure photo created successfully" : "Comment created successfully"
      });
    } catch (error) {
      console.error("Error creating incident comment with photo:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({
          message: "Invalid comment data",
          errors: error.errors
        });
      }
      res.status(500).json({ message: "Failed to create comment" });
    }
  });
  app2.delete("/api/incidents/:incidentId/social/comments/:commentId", isAuthenticated, async (req, res) => {
    try {
      const { incidentId, commentId } = req.params;
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user.id;
      const success = await storage.deleteIncidentComment(commentId, userId);
      if (!success) {
        return res.status(404).json({ message: "Comment not found or not authorized" });
      }
      const count = await storage.getIncidentCommentsCount(incidentId);
      res.json({ message: "Comment deleted", count });
    } catch (error) {
      console.error("Error deleting incident comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });
  app2.get("/api/users/batch", async (req, res) => {
    try {
      const { ids } = req.query;
      if (!ids || typeof ids !== "string") {
        return res.status(400).json({
          error: "Missing or invalid ids parameter. Expected comma-separated user IDs."
        });
      }
      const userIds = ids.split(",").map((id) => id.trim()).filter((id) => id.length > 0);
      if (userIds.length === 0) {
        return res.status(400).json({
          error: "No valid user IDs provided"
        });
      }
      if (userIds.length > 100) {
        return res.status(400).json({
          error: "Too many user IDs requested. Maximum 100 IDs per request."
        });
      }
      const users2 = await storage.getUsersByIds(userIds);
      const safeUsers = users2.map((user) => ({
        id: user.id,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.profileImageUrl,
        // Map profileImageUrl to avatarUrl
        accountType: user.accountType,
        isOfficialAgency: user.isOfficialAgency || false
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching batch users:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });
  app2.get("/api/users/:userId", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const currentUserId = req.user.id;
      if (currentUserId !== userId && user.profileVisibility === "private") {
        return res.status(403).json({ message: "This profile is private" });
      }
      if (currentUserId !== userId) {
        const { phoneNumber, ...publicUser } = user;
        return res.json(user.profileVisibility === "public" ? user : publicUser);
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });
  app2.get("/api/conversations", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.user.id;
      const conversations2 = await storage.getConversationsByUserId(userId);
      res.json(conversations2);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });
  app2.post("/api/conversations", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { otherUserId } = z2.object({
        otherUserId: z2.string().min(1)
      }).parse(req.body);
      const currentUserId = req.user.id;
      let conversation = await storage.getConversationBetweenUsers(currentUserId, otherUserId);
      if (!conversation) {
        conversation = await storage.createConversation({
          user1Id: currentUserId,
          user2Id: otherUserId
        });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });
  app2.get("/api/conversations/:conversationId/messages", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { conversationId } = req.params;
      const userId = req.user.id;
      const conversation = await storage.getConversationBetweenUsers(userId, "dummy");
      const conversations2 = await storage.getConversationsByUserId(userId);
      const hasAccess = conversations2.some((c) => c.id === conversationId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this conversation" });
      }
      const messages2 = await storage.getMessagesByConversationId(conversationId);
      res.json(messages2);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  app2.post("/api/conversations/:conversationId/messages", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { conversationId } = req.params;
      const { content } = z2.object({
        content: z2.string().min(1).max(1e3)
      }).parse(req.body);
      const userId = req.user.id;
      const conversations2 = await storage.getConversationsByUserId(userId);
      const hasAccess = conversations2.some((c) => c.id === conversationId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this conversation" });
      }
      const message = await storage.createMessage({
        conversationId,
        senderId: userId,
        content
      });
      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });
  app2.patch("/api/conversations/:conversationId/read", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { conversationId } = req.params;
      const userId = req.user.id;
      const conversations2 = await storage.getConversationsByUserId(userId);
      const hasAccess = conversations2.some((c) => c.id === conversationId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this conversation" });
      }
      await storage.markMessagesAsRead(conversationId, userId);
      res.json({ message: "Messages marked as read" });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });
  app2.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User authentication failed" });
      }
      const limit = parseInt(req.query.limit) || 50;
      const notifications2 = await storage.getNotifications(userId, limit);
      res.json(notifications2);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });
  app2.get("/api/notifications/unread-count", isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        return res.status(401).json({ message: "User authentication failed" });
      }
      const userId = req.user.claims.sub;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json(count);
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      res.status(500).json({ message: "Failed to fetch unread notification count" });
    }
  });
  app2.patch("/api/notifications/:notificationId/read", isAuthenticated, async (req, res) => {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.claims?.sub || req.user?.id;
      await storage.markNotificationAsRead(notificationId, userId);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });
  app2.patch("/api/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });
  app2.get("/api/messages/unread-count", isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        return res.status(401).json({ message: "User authentication failed" });
      }
      const userId = req.user.claims.sub;
      const count = await storage.getUnreadMessageCount(userId);
      res.json(count);
    } catch (error) {
      console.error("Error fetching unread message count:", error);
      res.status(500).json({ message: "Failed to fetch unread message count" });
    }
  });
  app2.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });
  app2.put("/api/user/profile-photo", isAuthenticated, async (req, res) => {
    if (!req.body.photoURL) {
      return res.status(400).json({ error: "photoURL is required" });
    }
    try {
      const userId = req.user?.claims?.sub;
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.photoURL
      );
      await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.photoURL,
        {
          owner: userId,
          visibility: "public"
        }
      );
      const updatedUser = await storage.updateUserProfile(userId, {
        profileImageUrl: objectPath
      });
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        objectPath,
        user: updatedUser
      });
    } catch (error) {
      console.error("Error setting profile photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.put("/api/user/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const profileData = req.body;
      const updatedUser = await storage.updateUserProfile(userId, profileData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  app2.post("/api/users/upgrade-to-business", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const businessData = z2.object({
        businessName: z2.string().min(1, "Business name is required"),
        businessCategory: z2.string().min(1, "Business category is required"),
        businessDescription: z2.string().optional(),
        businessWebsite: z2.string().optional(),
        businessPhone: z2.string().optional(),
        businessAddress: z2.string().optional()
      }).parse(req.body);
      const updatedUser = await storage.upgradeToBusinessAccount(userId, businessData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error upgrading to business account:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid business data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to upgrade to business account" });
    }
  });
  app2.get("/api/ads/my-campaigns", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      secureLogger.authDebug("Campaigns request", {
        hasUserId: !!userId,
        user: req.user
      });
      const user = await storage.getUser(userId);
      secureLogger.authDebug("Campaign user lookup", {
        hasUser: !!user,
        hasBusinessAccount: user?.accountType === "business"
      });
      if (!user || user.accountType !== "business") {
        secureLogger.authDebug("Business account check failed", {
          hasUser: !!user,
          accountType: user?.accountType
        });
        return res.status(403).json({ message: "Business account required" });
      }
      const campaigns = await storage.getUserCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching user campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });
  app2.get("/api/ads/analytics", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      if (!user || user.accountType !== "business") {
        return res.status(403).json({ message: "Business account required" });
      }
      const analytics = await storage.getUserCampaignAnalytics(userId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching campaign analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });
  app2.get("/api/ads/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      const ad = await storage.getAdCampaign(id);
      if (!ad) {
        return res.status(404).json({ message: "Ad not found" });
      }
      const user = await storage.getUser(userId);
      if (user?.accountType === "business") {
        const userCampaigns = await storage.getUserCampaigns(userId);
        const userOwnsAd = userCampaigns.some((campaign) => campaign.id === id);
        if (!userOwnsAd) {
          return res.status(403).json({ message: "You can only edit your own ads" });
        }
      }
      res.json(ad);
    } catch (error) {
      console.error("Error fetching ad:", error);
      res.status(500).json({ message: "Failed to fetch ad" });
    }
  });
  app2.put("/api/ads/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (user?.accountType !== "business") {
        return res.status(403).json({ message: "Business account required" });
      }
      const userCampaigns = await storage.getUserCampaigns(userId);
      const userOwnsAd = userCampaigns.some((campaign) => campaign.id === id);
      if (!userOwnsAd) {
        return res.status(403).json({ message: "You can only edit your own ads" });
      }
      const adData = z2.object({
        businessName: z2.string().min(1, "Business name is required"),
        title: z2.string().min(1, "Title is required"),
        content: z2.string().min(1, "Content is required"),
        websiteUrl: z2.string().optional(),
        address: z2.string().optional(),
        suburb: z2.string().min(1, "Suburb is required"),
        cta: z2.string().min(1, "Call-to-action is required"),
        targetSuburbs: z2.array(z2.string()).optional(),
        dailyBudget: z2.string(),
        totalBudget: z2.string(),
        logoUrl: z2.string().optional(),
        backgroundUrl: z2.string().optional(),
        template: z2.string().optional(),
        status: z2.enum(["pending", "active", "paused", "rejected"]).optional()
      }).parse(req.body);
      if (!adData.targetSuburbs || adData.targetSuburbs.length === 0) {
        adData.targetSuburbs = [adData.suburb];
      }
      if (!adData.totalBudget) {
        const dailyAmount = parseFloat(adData.dailyBudget);
        adData.totalBudget = (dailyAmount * 30).toString();
      }
      const updatedAd = await storage.updateAdCampaign(id, {
        businessName: adData.businessName,
        title: adData.title,
        content: adData.content,
        imageUrl: adData.logoUrl || null,
        websiteUrl: adData.websiteUrl || null,
        address: adData.address || null,
        suburb: adData.suburb,
        cta: adData.cta,
        targetSuburbs: adData.targetSuburbs,
        dailyBudget: adData.dailyBudget,
        totalBudget: adData.totalBudget,
        status: adData.status || "pending",
        // Default to pending for resubmission
        rejectionReason: null,
        // Clear rejection reason when updating
        updatedAt: /* @__PURE__ */ new Date()
      });
      if (!updatedAd) {
        return res.status(404).json({ message: "Ad not found" });
      }
      console.log(`Ad updated and resubmitted: ${updatedAd.businessName} - ${updatedAd.title}`);
      res.json({
        success: true,
        ad: updatedAd,
        message: "Ad updated and resubmitted for review"
      });
    } catch (error) {
      console.error("Error updating ad:", error);
      if (error instanceof z2.ZodError) {
        res.status(400).json({
          message: "Invalid ad data",
          errors: error.errors
        });
      } else {
        res.status(500).json({ message: "Failed to update ad" });
      }
    }
  });
  app2.post("/api/users/complete-setup", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const setupData = z2.object({
        accountType: z2.enum(["regular", "business"]),
        businessName: z2.string().optional(),
        businessCategory: z2.string().optional(),
        businessDescription: z2.string().optional(),
        businessWebsite: z2.string().optional(),
        businessPhone: z2.string().optional(),
        businessAddress: z2.string().optional()
      }).parse(req.body);
      if (setupData.accountType === "business") {
        if (!setupData.businessName?.trim()) {
          return res.status(400).json({ message: "Business name is required for business accounts" });
        }
        if (!setupData.businessCategory) {
          return res.status(400).json({ message: "Business category is required for business accounts" });
        }
      }
      const updatedUser = await storage.completeUserSetup(userId, setupData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error completing account setup:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid setup data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to complete account setup" });
    }
  });
  app2.get("/api/users/suburb/:suburb", async (req, res) => {
    try {
      const { suburb } = req.params;
      const users2 = await storage.getUsersBySuburb(suburb);
      res.json(users2);
    } catch (error) {
      console.error("Error fetching users by suburb:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  app2.post("/api/test/create-business-user", async (req, res) => {
    try {
      const user = await storage.createTestBusinessUser();
      res.json({ success: true, user });
    } catch (error) {
      console.error("Error creating test business user:", error);
      res.status(500).json({ message: "Failed to create test business user" });
    }
  });
  try {
    await storage.createAdminUser();
    console.log("Admin user created/verified");
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
  try {
    const seedResult = await seedCategoriesIfNeeded();
    if (seedResult.success) {
      console.log("Categories seeding completed:", seedResult.message);
    } else {
      console.error("Categories seeding failed:", seedResult.error);
    }
  } catch (error) {
    console.error("Error during automatic category seeding:", error);
  }
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const user = await storage.authenticateUser(email, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      req.session.userId = user.id;
      req.session.authenticated = true;
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          accountType: user.accountType,
          businessName: user.businessName
        }
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ success: true });
    });
  });
  app2.get("/api/auth/user", async (req, res) => {
    if (!req.session.authenticated || !req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accountType: user.accountType,
        businessName: user.businessName,
        homeSuburb: user.homeSuburb,
        primarySuburb: user.primarySuburb
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.post("/api/comments/:commentId/vote", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { commentId } = req.params;
      const { voteType } = req.body;
      if (!["helpful", "not_helpful"].includes(voteType)) {
        return res.status(400).json({ message: "Invalid vote type" });
      }
      const vote = await storage.voteOnComment({
        userId,
        commentId,
        voteType
      });
      res.json(vote);
    } catch (error) {
      console.error("Error voting on comment:", error);
      res.status(500).json({ message: "Failed to vote on comment" });
    }
  });
  app2.get("/api/comments/:commentId/user-vote", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { commentId } = req.params;
      const vote = await storage.getUserVoteOnComment(userId, commentId);
      res.json(vote || null);
    } catch (error) {
      console.error("Error fetching user vote:", error);
      res.status(500).json({ message: "Failed to fetch vote" });
    }
  });
  app2.get("/api/neighborhood-groups", async (req, res) => {
    try {
      const { suburb } = req.query;
      let groups;
      if (suburb) {
        groups = await storage.getGroupsBySuburb(suburb);
      } else {
        groups = await storage.getNeighborhoodGroups();
      }
      res.json(groups);
    } catch (error) {
      console.error("Error fetching neighborhood groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });
  app2.post("/api/neighborhood-groups", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const groupData = {
        ...req.body,
        createdBy: userId
      };
      const group = await storage.createNeighborhoodGroup(groupData);
      await storage.joinNeighborhoodGroup({
        userId,
        groupId: group.id,
        role: "admin"
      });
      res.json(group);
    } catch (error) {
      console.error("Error creating neighborhood group:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });
  app2.post("/api/neighborhood-groups/:groupId/join", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { groupId } = req.params;
      const membership = await storage.joinNeighborhoodGroup({
        userId,
        groupId,
        role: "member"
      });
      res.json(membership);
    } catch (error) {
      console.error("Error joining neighborhood group:", error);
      res.status(500).json({ message: "Failed to join group" });
    }
  });
  app2.delete("/api/neighborhood-groups/:groupId/leave", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { groupId } = req.params;
      const success = await storage.leaveNeighborhoodGroup(userId, groupId);
      if (!success) {
        return res.status(404).json({ message: "Membership not found" });
      }
      res.json({ success });
    } catch (error) {
      console.error("Error leaving neighborhood group:", error);
      res.status(500).json({ message: "Failed to leave group" });
    }
  });
  app2.get("/api/emergency-contacts", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const contacts = await storage.getEmergencyContacts(userId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching emergency contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });
  app2.post("/api/emergency-contacts", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const contactData = {
        ...req.body,
        userId
      };
      const contact = await storage.createEmergencyContact(contactData);
      res.json(contact);
    } catch (error) {
      console.error("Error creating emergency contact:", error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  });
  app2.delete("/api/emergency-contacts/:contactId", isAuthenticated, async (req, res) => {
    try {
      const { contactId } = req.params;
      const success = await storage.deleteEmergencyContact(contactId);
      if (!success) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json({ success });
    } catch (error) {
      console.error("Error deleting emergency contact:", error);
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });
  app2.post("/api/safety-checkins", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const checkInData = {
        ...req.body,
        userId
      };
      const checkIn = await storage.createSafetyCheckIn(checkInData);
      res.json(checkIn);
    } catch (error) {
      console.error("Error creating safety check-in:", error);
      res.status(500).json({ message: "Failed to create check-in" });
    }
  });
  app2.get("/api/safety-checkins/incident/:incidentId", async (req, res) => {
    try {
      const { incidentId } = req.params;
      const checkIns = await storage.getSafetyCheckIns(incidentId);
      res.json(checkIns);
    } catch (error) {
      console.error("Error fetching safety check-ins:", error);
      res.status(500).json({ message: "Failed to fetch check-ins" });
    }
  });
  app2.get("/api/safety-checkins/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const checkIns = await storage.getUserSafetyCheckIns(userId);
      res.json(checkIns);
    } catch (error) {
      console.error("Error fetching user safety check-ins:", error);
      res.status(500).json({ message: "Failed to fetch check-ins" });
    }
  });
  app2.post("/api/categories/seed", async (req, res) => {
    try {
      const result = await seedCategoriesIfNeeded();
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error("Error seeding categories:", error);
      res.status(500).json({
        success: false,
        error: "Failed to seed categories",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/categories", async (req, res) => {
    try {
      const categories2 = await storage.getCategories();
      res.json(categories2);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });
  app2.get("/api/subcategories", async (req, res) => {
    try {
      const categoryId = req.query.categoryId;
      const subcategories3 = await storage.getSubcategories(categoryId);
      res.json(subcategories3);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      res.status(500).json({ error: "Failed to fetch subcategories" });
    }
  });
  app2.post("/api/categories", async (req, res) => {
    try {
      const categoryData = req.body;
      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });
  app2.post("/api/subcategories", async (req, res) => {
    try {
      const subcategoryData = req.body;
      const subcategory = await storage.createSubcategory(subcategoryData);
      res.json(subcategory);
    } catch (error) {
      console.error("Error creating subcategory:", error);
      res.status(500).json({ error: "Failed to create subcategory" });
    }
  });
  app2.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });
  app2.post("/api/objects/process-upload", isAuthenticated, async (req, res) => {
    try {
      const { uploadURL, type } = req.body;
      if (!uploadURL) {
        return res.status(400).json({ error: "Upload URL is required" });
      }
      const url = new URL(uploadURL);
      const pathMatch = url.pathname.match(/^\/([^\/]+)\/(.+)$/);
      if (!pathMatch) {
        return res.status(400).json({ error: "Invalid upload URL format" });
      }
      const bucketName = pathMatch[1];
      const fullObjectPath = pathMatch[2];
      const privatePathMatch = fullObjectPath.match(/^\.private\/(.+)$/);
      if (!privatePathMatch) {
        return res.status(400).json({ error: "Object not in private directory" });
      }
      const relativePath = privatePathMatch[1];
      const viewURL = `/objects/${relativePath}`;
      console.log(`Processed ${type} upload: ${uploadURL} -> ${viewURL}`);
      console.log(`Full object path: ${fullObjectPath}, Relative path: ${relativePath}`);
      res.json({ viewURL });
    } catch (error) {
      console.error("Error processing upload:", error);
      res.status(500).json({ error: "Failed to process upload" });
    }
  });
  app2.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Photo not found" });
      }
      return res.status(500).json({ error: "Failed to serve photo" });
    }
  });
  app2.post("/api/push/subscribe", isAuthenticated, async (req, res) => {
    try {
      const { subscription } = req.body;
      const userId = req.user?.claims?.sub;
      if (!subscription || !userId) {
        return res.status(400).json({ error: "Invalid subscription data" });
      }
      secureLogger.authDebug("Push subscription registered", {
        hasUserId: !!userId,
        hasSubscription: !!subscription
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving push subscription:", error);
      res.status(500).json({ error: "Failed to save subscription" });
    }
  });
  app2.post("/api/push/unsubscribe", isAuthenticated, async (req, res) => {
    try {
      const { endpoint } = req.body;
      const userId = req.user?.claims?.sub;
      if (!endpoint || !userId) {
        return res.status(400).json({ error: "Invalid unsubscribe data" });
      }
      secureLogger.authDebug("Push subscription removed", {
        hasUserId: !!userId,
        hasEndpoint: !!endpoint
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing push subscription:", error);
      res.status(500).json({ error: "Failed to remove subscription" });
    }
  });
  app2.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const notifications2 = await storage.getNotifications(userId);
      res.json(notifications2);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });
  app2.put("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub || req.user?.id;
      await storage.markNotificationAsRead(id, userId);
      res.json({ success: true, message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });
  app2.post("/api/push/test", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      secureLogger.authDebug("Test push notification requested", {
        hasUserId: !!userId
      });
      res.json({
        success: true,
        message: "Push notification system is ready. Subscription management needed for actual sending."
      });
    } catch (error) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ error: "Failed to send test notification" });
    }
  });
  app2.get("/api/incidents/:incidentId/follow-ups", async (req, res) => {
    try {
      const { incidentId } = req.params;
      const followUps = await storage.getIncidentFollowUps(incidentId);
      res.json(followUps);
    } catch (error) {
      console.error("Error fetching incident follow-ups:", error);
      res.status(500).json({ message: "Failed to fetch incident follow-ups" });
    }
  });
  app2.post("/api/incidents/:incidentId/follow-ups", isAuthenticated, async (req, res) => {
    try {
      const { incidentId } = req.params;
      const { status, description, photoUrl } = req.body;
      const userId = req.user.claims.sub;
      if (!status || !description) {
        return res.status(400).json({ message: "Status and description are required" });
      }
      const followUp = await storage.createIncidentFollowUp({
        incidentId,
        userId,
        status,
        description,
        photoUrl: photoUrl || null
      });
      res.json(followUp);
    } catch (error) {
      console.error("Error creating incident follow-up:", error);
      res.status(500).json({ message: "Failed to create incident follow-up" });
    }
  });
  const isAdmin = async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      next();
    } catch (error) {
      console.error("Admin auth error:", error);
      res.status(500).json({ message: "Admin authentication failed" });
    }
  };
  app2.get("/api/admin/ads/pending", isAdmin, async (req, res) => {
    try {
      const pendingAds = await storage.getPendingAds();
      res.json(pendingAds);
    } catch (error) {
      console.error("Error fetching pending ads:", error);
      res.status(500).json({ message: "Failed to fetch pending ads" });
    }
  });
  app2.put("/api/admin/ads/:id/approve", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub || req.user?.id;
      const updatedAd = await storage.updateAdCampaign(id, { status: "active" });
      if (!updatedAd) {
        return res.status(404).json({ message: "Ad not found" });
      }
      console.log(`Admin approved ad: ${updatedAd.businessName} - ${updatedAd.title}`);
      res.json({ success: true, ad: updatedAd });
    } catch (error) {
      console.error("Error approving ad:", error);
      res.status(500).json({ message: "Failed to approve ad" });
    }
  });
  app2.put("/api/admin/ads/:id/reject", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const updatedAd = await storage.updateAdCampaign(id, {
        status: "rejected",
        rejectionReason: reason || "Does not meet guidelines"
      });
      if (!updatedAd) {
        return res.status(404).json({ message: "Ad not found" });
      }
      console.log(`Admin rejected ad: ${updatedAd.businessName} - ${updatedAd.title}`);
      res.json({ success: true, ad: updatedAd });
    } catch (error) {
      console.error("Error rejecting ad:", error);
      res.status(500).json({ message: "Failed to reject ad" });
    }
  });
  async function initializeBillingPlans() {
    try {
      const existingPlans = await storage.getBillingPlans();
      if (existingPlans.length === 0) {
        await storage.createBillingPlan({
          name: "Basic Daily",
          description: "Standard daily advertising rate with 7-day minimum",
          pricePerDay: "8.00",
          minimumDays: 7,
          features: ["Standard placement", "Analytics dashboard", "Campaign management"],
          isActive: true
        });
        console.log("\u2705 Default billing plan created");
      }
    } catch (error) {
      console.error("Error initializing billing plans:", error);
    }
  }
  initializeBillingPlans();
  app2.get("/api/billing/plans", async (req, res) => {
    try {
      const plans = await storage.getBillingPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching billing plans:", error);
      res.status(500).json({ message: "Failed to fetch billing plans" });
    }
  });
  app2.post("/api/billing/quote", isAuthenticated, async (req, res) => {
    try {
      const { campaignId, days } = req.body;
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!campaignId || !days || days < 7) {
        return res.status(400).json({ message: "Campaign ID and minimum 7 days required" });
      }
      const plans = await storage.getBillingPlans();
      const plan = plans.find((p) => p.isActive) || plans[0];
      if (!plan) {
        return res.status(404).json({ message: "No billing plans available" });
      }
      const dailyRate = parseFloat(plan.pricePerDay);
      const totalAmount = dailyRate * days;
      const amountCents = Math.round(totalAmount * 100);
      const startDate = /* @__PURE__ */ new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days);
      res.json({
        campaignId,
        days,
        dailyRate: plan.pricePerDay,
        totalAmount: totalAmount.toFixed(2),
        amountCents,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        planId: plan.id,
        minDaysEnforced: Math.max(days, plan.minimumDays || 7)
      });
    } catch (error) {
      console.error("Error creating billing quote:", error);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });
  app2.post("/api/billing/create-payment-intent", isAuthenticated, async (req, res) => {
    try {
      const paymentIntentSchema = z2.object({
        campaignId: z2.string().min(1, "Campaign ID is required"),
        days: z2.number().int().min(7, "Minimum 7 days required").max(365, "Maximum 365 days allowed"),
        planId: z2.string().optional()
      });
      const validatedData = paymentIntentSchema.parse(req.body);
      const { campaignId, days, planId } = validatedData;
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User authentication failed" });
      }
      if (!stripe) {
        return res.status(503).json({ message: "Payment processing unavailable" });
      }
      const plans = await storage.getBillingPlans();
      const plan = plans.find((p) => p.id === planId) || plans.find((p) => p.isActive) || plans[0];
      if (!plan) {
        return res.status(404).json({ message: "Billing plan not found" });
      }
      const dailyRate = parseFloat(plan.pricePerDay);
      const enforcedDays = Math.max(days, plan.minimumDays || 7);
      const totalAmount = dailyRate * enforcedDays;
      const amountCents = Math.round(totalAmount * 100);
      const startDate = /* @__PURE__ */ new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + enforcedDays);
      const billingCycle = await storage.createBillingCycle({
        campaignId,
        planId: plan.id,
        businessId: userId,
        status: "pending",
        startDate,
        endDate,
        dailyRate: plan.pricePerDay,
        totalDays: enforcedDays,
        totalAmount: totalAmount.toFixed(2)
      });
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "aud",
        metadata: {
          billing_cycle_id: billingCycle.id,
          campaign_id: campaignId,
          business_id: userId,
          days: enforcedDays.toString()
        }
      });
      await storage.createPayment({
        billingCycleId: billingCycle.id,
        businessId: userId,
        amount: totalAmount.toFixed(2),
        currency: "AUD",
        status: "pending",
        paymentMethod: "stripe",
        stripePaymentIntentId: paymentIntent.id,
        daysCharged: enforcedDays,
        periodStart: startDate,
        periodEnd: endDate
      });
      res.json({
        clientSecret: paymentIntent.client_secret,
        billingCycleId: billingCycle.id,
        amount: totalAmount.toFixed(2),
        days: enforcedDays
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message
          }))
        });
      }
      res.status(500).json({ message: "Failed to create payment intent" });
    }
  });
  app2.get("/api/billing/history", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const payments2 = await storage.getBusinessPayments(userId);
      res.json(payments2);
    } catch (error) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({ message: "Failed to fetch payment history" });
    }
  });
  app2.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe not configured" });
    }
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!sig || !webhookSecret) {
      console.error("Missing Stripe webhook signature or secret");
      return res.status(400).json({ error: "Missing webhook signature or secret" });
    }
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return res.status(400).json({ error: "Invalid signature" });
    }
    try {
      if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        const { billing_cycle_id, business_id } = paymentIntent.metadata || {};
        if (!billing_cycle_id || !business_id) {
          console.error("Missing metadata in payment intent:", paymentIntent.id);
          return res.status(400).json({ error: "Missing payment metadata" });
        }
        console.log(`Processing payment completion for billing cycle: ${billing_cycle_id}`);
        const existingPayments = await storage.getBusinessPayments(business_id);
        const payment = existingPayments.find((p) => p.stripePaymentIntentId === paymentIntent.id);
        if (!payment) {
          console.error("Payment record not found for payment intent:", paymentIntent.id);
          return res.status(404).json({ error: "Payment record not found" });
        }
        if (payment.status === "completed") {
          console.log("Payment already processed, skipping:", payment.id);
          return res.json({ received: true, status: "already_processed" });
        }
        await storage.updatePaymentStatus(payment.id, "completed", /* @__PURE__ */ new Date());
        await storage.updateBillingCycleStatus(billing_cycle_id, "active");
        console.log(`Payment completed successfully: ${payment.id}, Billing cycle activated: ${billing_cycle_id}`);
        return res.json({
          received: true,
          status: "processed",
          payment_id: payment.id,
          billing_cycle_id
        });
      }
      if (event.type === "payment_intent.payment_failed") {
        const paymentIntent = event.data.object;
        const { billing_cycle_id } = paymentIntent.metadata || {};
        console.log("Payment failed for payment intent:", paymentIntent.id);
        const { business_id } = paymentIntent.metadata || {};
        if (!business_id) {
          console.error("Missing business_id in payment intent metadata:", paymentIntent.id);
          return res.json({ received: true, status: "missing_business_id" });
        }
        const existingPayments = await storage.getBusinessPayments(business_id);
        const payment = existingPayments.find((p) => p.stripePaymentIntentId === paymentIntent.id);
        if (payment) {
          await storage.updatePaymentStatus(payment.id, "failed");
          if (billing_cycle_id) {
            await storage.updateBillingCycleStatus(billing_cycle_id, "failed");
          }
        }
        return res.json({ received: true, status: "payment_failed" });
      }
      console.log("Unhandled webhook event type:", event.type);
      return res.json({ received: true, status: "unhandled_event" });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return res.status(500).json({ error: "Webhook processing failed" });
    }
  });
  app2.get("/api/traffic/status", (req, res) => {
    res.status(410).json({
      error: "This endpoint is deprecated. Legacy background ingestion has been removed.",
      migration: {
        old: "/api/traffic/status",
        new: "/api/unified",
        note: "Use the unified API endpoint for current data. Status monitoring is now handled by the unified pipeline."
      }
    });
  });
  app2.get("/api/unified", async (req, res) => {
    console.log("\u{1F50D} Unified API endpoint called with query:", req.query);
    try {
      const {
        region,
        category,
        source,
        status: statusFilter,
        southwest,
        northeast,
        since
      } = req.query;
      let result;
      console.log("\u{1F4CA} Getting unified incidents...");
      if (southwest && northeast) {
        console.log("\u{1F5FA}\uFE0F Applying spatial filtering");
        const [swLat, swLng] = southwest.split(",").map(Number);
        const [neLat, neLng] = northeast.split(",").map(Number);
        result = await storage.getUnifiedIncidentsAsGeoJSON();
        result.features = result.features.filter((feature) => {
          if (!feature.geometry || feature.geometry.type !== "Point") return false;
          const [lng, lat] = feature.geometry.coordinates;
          return lat >= Math.min(swLat, neLat) && lat <= Math.max(swLat, neLat) && lng >= Math.min(swLng, neLng) && lng <= Math.max(swLng, neLng);
        });
      } else if (region) {
        console.log("\u{1F30D} Applying regional filtering for:", region);
        result = await storage.getUnifiedIncidentsByRegionAsGeoJSON(region);
      } else {
        console.log("\u{1F4CB} Getting all unified incidents");
        result = await storage.getUnifiedIncidentsAsGeoJSON();
      }
      console.log("\u2705 Successfully retrieved incidents, features count:", result?.features?.length || 0);
      if (category || source || statusFilter || since) {
        const sinceDate = since ? new Date(since) : null;
        result.features = result.features.filter((feature) => {
          const props = feature.properties;
          if (category && props.category !== category) return false;
          if (source && props.source !== source) return false;
          if (statusFilter && props.status !== statusFilter) return false;
          if (sinceDate && new Date(props.lastUpdated) < sinceDate) return false;
          return true;
        });
      }
      const response = {
        ...result,
        metadata: {
          totalFeatures: result.features.length,
          sources: ["tmr", "emergency", "user"],
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
          cached: true,
          filters: {
            region: region || null,
            category: category || null,
            source: source || null,
            status: statusFilter || null,
            spatialBounds: southwest && northeast ? { southwest, northeast } : null,
            since: since || null
          }
        }
      };
      res.json(response);
    } catch (error) {
      console.error("\u274C Unified API error:", error);
      res.status(500).json({
        error: "Failed to fetch unified incidents",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.delete("/api/unified-incidents/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const incident = await storage.getUnifiedIncident(id);
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      if (incident.source !== "user") {
        return res.status(403).json({ error: "Cannot delete official incidents" });
      }
      if (incident.userId !== userId) {
        return res.status(403).json({ error: "You can only delete your own incidents" });
      }
      const success = await storage.deleteUnifiedIncident(id);
      if (!success) {
        return res.status(500).json({ error: "Failed to delete incident" });
      }
      res.json({ success: true, message: "Incident deleted successfully" });
    } catch (error) {
      console.error("Error deleting unified incident:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.put("/api/unified-incidents/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const incident = await storage.getUnifiedIncident(id);
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      if (incident.source !== "user") {
        return res.status(403).json({ error: "Cannot edit official incidents" });
      }
      const incidentUserId = incident.userId;
      const reporterId = incident.properties?.reporterId;
      const isOwner = incidentUserId === userId || reporterId === userId;
      if (!isOwner) {
        if (!incidentUserId && !reporterId) {
          return res.status(403).json({
            error: "This incident has corrupted ownership data and cannot be edited"
          });
        }
        return res.status(403).json({ error: "You can only edit your own incidents" });
      }
      const updateIncidentSchema = z2.object({
        title: z2.string().min(1, "Title is required").optional(),
        description: z2.string().optional(),
        location: z2.string().min(1, "Location is required").optional(),
        categoryId: z2.string().optional(),
        subcategoryId: z2.string().optional(),
        photoUrl: z2.string().optional(),
        policeNotified: z2.enum(["yes", "no", "not_needed", "unsure"]).optional()
      });
      let cleanedData;
      try {
        const validatedData = updateIncidentSchema.parse(req.body);
        cleanedData = Object.fromEntries(
          Object.entries(validatedData).filter(([_, value]) => value !== void 0)
        );
        if (Object.keys(cleanedData).length === 0) {
          return res.status(400).json({ error: "No valid fields to update" });
        }
      } catch (validationError) {
        return res.status(400).json({
          error: "Invalid request data",
          details: validationError instanceof z2.ZodError ? validationError.errors : "Validation failed"
        });
      }
      const updatedIncident = await storage.updateUnifiedIncident(id, cleanedData);
      if (!updatedIncident) {
        return res.status(500).json({ error: "Failed to update incident" });
      }
      res.json({
        success: true,
        message: "Incident updated successfully",
        incident: updatedIncident
      });
    } catch (error) {
      console.error("Error updating unified incident:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.delete("/api/unified-incidents/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const incident = await storage.getUnifiedIncident(id);
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      if (incident.source !== "user") {
        return res.status(403).json({ error: "Cannot delete official incidents" });
      }
      if (incident.userId !== userId) {
        return res.status(403).json({ error: "You can only delete your own incidents" });
      }
      const deleteResult = await storage.deleteUnifiedIncident(id);
      if (!deleteResult) {
        return res.status(500).json({ error: "Failed to delete incident" });
      }
      res.json({
        success: true,
        message: "Incident deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting unified incident:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  console.log("\u{1F680} Initializing Unified Ingestion Pipeline...");
  const { unifiedIngestion: unifiedIngestion2 } = await Promise.resolve().then(() => (init_unified_ingestion(), unified_ingestion_exports));
  await unifiedIngestion2.initialize();
  console.log("\u2705 Unified Ingestion Pipeline initialized");
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  function validateEnvironment() {
    const isProduction = process.env.NODE_ENV === "production";
    console.log(`\u{1F30D} Environment: ${process.env.NODE_ENV || "development"}`);
    const checks = {
      "DATABASE_URL": process.env.DATABASE_URL,
      "SESSION_SECRET": process.env.SESSION_SECRET,
      "STRIPE_SECRET_KEY": process.env.STRIPE_SECRET_KEY,
      "VAPID_PRIVATE_KEY": process.env.VAPID_PRIVATE_KEY
    };
    let hasErrors = false;
    Object.entries(checks).forEach(([key, value]) => {
      if (value) {
        console.log(`\u2705 ${key}: configured`);
      } else {
        const level = ["DATABASE_URL", "SESSION_SECRET"].includes(key) ? "\u274C" : "\u26A0\uFE0F";
        console.log(`${level} ${key}: missing`);
        if (level === "\u274C" && isProduction) {
          hasErrors = true;
        }
      }
    });
    if (hasErrors) {
      console.error("\u{1F4A5} Critical environment variables missing in production!");
      process.exit(1);
    }
  }
  validateEnvironment();
  const server = await registerRoutes(app);
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.use((err, req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const requestId = req.headers["x-request-id"] || "unknown";
    console.error(`[ERROR ${requestId}] ${req.method} ${req.path} - Status: ${status}`);
    console.error(`[ERROR ${requestId}] Message: ${message}`);
    if (err.stack) {
      console.error(`[ERROR ${requestId}] Stack: ${err.stack}`);
    }
    res.status(status).json({ message });
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
