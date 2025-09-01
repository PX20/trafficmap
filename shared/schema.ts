import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean, index } from "drizzle-orm/pg-core";
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
  profileImageUrl: varchar("profile_image_url"),
  homeSuburb: varchar("home_suburb"),
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

export const trafficCameras = pgTable("traffic_cameras", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  status: text("status").notNull(),
  imageUrl: text("image_url"),
  geometry: jsonb("geometry"),
  properties: jsonb("properties"),
  lastUpdated: timestamp("last_updated").notNull(),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  comments: many(comments),
}));

export const incidentsRelations = relations(incidents, ({ many }) => ({
  comments: many(comments),
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
}));


export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertTrafficEventSchema = createInsertSchema(trafficEvents).omit({
  id: true,
  lastUpdated: true,
});

export const insertTrafficCameraSchema = createInsertSchema(trafficCameras).omit({
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


export type UpsertUser = typeof users.$inferInsert;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type TrafficEvent = typeof trafficEvents.$inferSelect;
export type InsertTrafficEvent = z.infer<typeof insertTrafficEventSchema>;
export type TrafficCamera = typeof trafficCameras.$inferSelect;
export type InsertTrafficCamera = z.infer<typeof insertTrafficCameraSchema>;
export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
