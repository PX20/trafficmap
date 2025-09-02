import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean, index, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  status: text("status").notNull(),
  priority: text("priority"),
  agency: text("agency"),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  comments: many(comments),
  neighborhoodGroups: many(userNeighborhoodGroups),
  emergencyContacts: many(emergencyContacts),
  commentVotes: many(commentVotes),
  safetyCheckIns: many(safetyCheckIns),
}));

export const incidentsRelations = relations(incidents, ({ many }) => ({
  comments: many(comments),
  safetyCheckIns: many(safetyCheckIns),
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

export type UpsertUser = typeof users.$inferInsert;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
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
