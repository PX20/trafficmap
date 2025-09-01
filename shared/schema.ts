import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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

export const weatherStations = pgTable("weather_stations", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  temperature: text("temperature"),
  humidity: text("humidity"),
  weatherCode: text("weather_code"),
  windSpeed: text("wind_speed"),
  windDirection: text("wind_direction"),
  lastUpdated: timestamp("last_updated").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
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

export const insertWeatherStationSchema = createInsertSchema(weatherStations).omit({
  id: true,
  lastUpdated: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type TrafficEvent = typeof trafficEvents.$inferSelect;
export type InsertTrafficEvent = z.infer<typeof insertTrafficEventSchema>;
export type TrafficCamera = typeof trafficCameras.$inferSelect;
export type InsertTrafficCamera = z.infer<typeof insertTrafficCameraSchema>;
export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type WeatherStation = typeof weatherStations.$inferSelect;
export type InsertWeatherStation = z.infer<typeof insertWeatherStationSchema>;
