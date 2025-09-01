import { 
  users,
  trafficEvents,
  trafficCameras,
  incidents,
  type User, 
  type UpsertUser,
  type InsertUser, 
  type TrafficEvent, 
  type TrafficCamera, 
  type InsertTrafficEvent, 
  type InsertTrafficCamera, 
  type Incident, 
  type InsertIncident 
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSuburb(id: string, homeSuburb: string): Promise<User | undefined>;
  getTrafficEvents(): Promise<TrafficEvent[]>;
  createTrafficEvent(event: InsertTrafficEvent): Promise<TrafficEvent>;
  updateTrafficEvent(id: string, event: Partial<TrafficEvent>): Promise<TrafficEvent | undefined>;
  deleteTrafficEvent(id: string): Promise<boolean>;
  getTrafficCameras(): Promise<TrafficCamera[]>;
  createTrafficCamera(camera: InsertTrafficCamera): Promise<TrafficCamera>;
  updateTrafficCamera(id: string, camera: Partial<TrafficCamera>): Promise<TrafficCamera | undefined>;
  deleteTrafficCamera(id: string): Promise<boolean>;
  getIncidents(): Promise<Incident[]>;
  getRecentIncidents(limit: number): Promise<Incident[]>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  updateIncident(id: string, incident: Partial<Incident>): Promise<Incident | undefined>;
  deleteIncident(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
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

  async updateUserSuburb(id: string, homeSuburb: string): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ homeSuburb, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getTrafficEvents(): Promise<TrafficEvent[]> {
    return await db.select().from(trafficEvents);
  }

  async createTrafficEvent(event: InsertTrafficEvent): Promise<TrafficEvent> {
    const id = randomUUID();
    const [trafficEvent] = await db
      .insert(trafficEvents)
      .values({
        ...event,
        id,
        lastUpdated: new Date(),
      })
      .returning();
    return trafficEvent;
  }

  async updateTrafficEvent(id: string, event: Partial<TrafficEvent>): Promise<TrafficEvent | undefined> {
    const [updated] = await db
      .update(trafficEvents)
      .set({ ...event, lastUpdated: new Date() })
      .where(eq(trafficEvents.id, id))
      .returning();
    return updated;
  }

  async deleteTrafficEvent(id: string): Promise<boolean> {
    const result = await db.delete(trafficEvents).where(eq(trafficEvents.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getTrafficCameras(): Promise<TrafficCamera[]> {
    return await db.select().from(trafficCameras);
  }

  async createTrafficCamera(camera: InsertTrafficCamera): Promise<TrafficCamera> {
    const id = randomUUID();
    const [trafficCamera] = await db
      .insert(trafficCameras)
      .values({
        ...camera,
        id,
        lastUpdated: new Date(),
      })
      .returning();
    return trafficCamera;
  }

  async updateTrafficCamera(id: string, camera: Partial<TrafficCamera>): Promise<TrafficCamera | undefined> {
    const [updated] = await db
      .update(trafficCameras)
      .set({ ...camera, lastUpdated: new Date() })
      .where(eq(trafficCameras.id, id))
      .returning();
    return updated;
  }

  async deleteTrafficCamera(id: string): Promise<boolean> {
    const result = await db.delete(trafficCameras).where(eq(trafficCameras.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getIncidents(): Promise<Incident[]> {
    return await db.select().from(incidents);
  }

  async getRecentIncidents(limit: number): Promise<Incident[]> {
    return await db
      .select()
      .from(incidents)
      .orderBy(desc(incidents.lastUpdated))
      .limit(limit);
  }

  async createIncident(incident: InsertIncident): Promise<Incident> {
    const id = randomUUID();
    const [newIncident] = await db
      .insert(incidents)
      .values({
        ...incident,
        id,
        lastUpdated: new Date(),
      })
      .returning();
    return newIncident;
  }

  async updateIncident(id: string, incident: Partial<Incident>): Promise<Incident | undefined> {
    const [updated] = await db
      .update(incidents)
      .set({ ...incident, lastUpdated: new Date() })
      .where(eq(incidents.id, id))
      .returning();
    return updated;
  }

  async deleteIncident(id: string): Promise<boolean> {
    const result = await db.delete(incidents).where(eq(incidents.id, id));
    return (result.rowCount ?? 0) > 0;
  }

}

export const storage = new DatabaseStorage();
