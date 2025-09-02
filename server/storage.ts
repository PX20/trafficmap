import { 
  users,
  trafficEvents,
  incidents,
  comments,
  neighborhoodGroups,
  userNeighborhoodGroups,
  emergencyContacts,
  commentVotes,
  safetyCheckIns,
  type User, 
  type UpsertUser,
  type InsertUser, 
  type TrafficEvent, 
  type InsertTrafficEvent, 
  type Incident, 
  type InsertIncident,
  type Comment,
  type InsertComment,
  type NeighborhoodGroup,
  type InsertNeighborhoodGroup,
  type UserNeighborhoodGroup,
  type InsertUserNeighborhoodGroup,
  type EmergencyContact,
  type InsertEmergencyContact,
  type CommentVote,
  type InsertCommentVote,
  type SafetyCheckIn,
  type InsertSafetyCheckIn
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSuburb(id: string, homeSuburb: string): Promise<User | undefined>;
  
  // Enhanced user profile operations
  updateUserProfile(id: string, profile: Partial<User>): Promise<User | undefined>;
  getUsersBySuburb(suburb: string): Promise<User[]>;
  
  // Traffic and incident operations
  getTrafficEvents(): Promise<TrafficEvent[]>;
  createTrafficEvent(event: InsertTrafficEvent): Promise<TrafficEvent>;
  updateTrafficEvent(id: string, event: Partial<TrafficEvent>): Promise<TrafficEvent | undefined>;
  deleteTrafficEvent(id: string): Promise<boolean>;
  getIncidents(): Promise<Incident[]>;
  getRecentIncidents(limit: number): Promise<Incident[]>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  updateIncident(id: string, incident: Partial<Incident>): Promise<Incident | undefined>;
  deleteIncident(id: string): Promise<boolean>;
  
  // Comment operations
  getCommentsByIncidentId(incidentId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  updateComment(id: string, comment: Partial<Comment>): Promise<Comment | undefined>;
  deleteComment(id: string): Promise<boolean>;
  
  // Comment voting operations
  voteOnComment(vote: InsertCommentVote): Promise<CommentVote>;
  getUserVoteOnComment(userId: string, commentId: string): Promise<CommentVote | undefined>;
  
  // Neighborhood group operations
  getNeighborhoodGroups(): Promise<NeighborhoodGroup[]>;
  getGroupsBySuburb(suburb: string): Promise<NeighborhoodGroup[]>;
  createNeighborhoodGroup(group: InsertNeighborhoodGroup): Promise<NeighborhoodGroup>;
  joinNeighborhoodGroup(membership: InsertUserNeighborhoodGroup): Promise<UserNeighborhoodGroup>;
  leaveNeighborhoodGroup(userId: string, groupId: string): Promise<boolean>;
  
  // Emergency contact operations
  getEmergencyContacts(userId: string): Promise<EmergencyContact[]>;
  createEmergencyContact(contact: InsertEmergencyContact): Promise<EmergencyContact>;
  deleteEmergencyContact(id: string): Promise<boolean>;
  
  // Safety check-in operations
  createSafetyCheckIn(checkIn: InsertSafetyCheckIn): Promise<SafetyCheckIn>;
  getSafetyCheckIns(incidentId: string): Promise<SafetyCheckIn[]>;
  getUserSafetyCheckIns(userId: string): Promise<SafetyCheckIn[]>;
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

  async getCommentsByIncidentId(incidentId: string): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.incidentId, incidentId))
      .orderBy(comments.createdAt);
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const id = randomUUID();
    const [newComment] = await db
      .insert(comments)
      .values({
        ...comment,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newComment;
  }

  async updateComment(id: string, comment: Partial<Comment>): Promise<Comment | undefined> {
    const [updated] = await db
      .update(comments)
      .set({ ...comment, updatedAt: new Date() })
      .where(eq(comments.id, id))
      .returning();
    return updated;
  }

  async deleteComment(id: string): Promise<boolean> {
    const result = await db.delete(comments).where(eq(comments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Enhanced user profile operations
  async updateUserProfile(id: string, profile: Partial<User>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getUsersBySuburb(suburb: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.primarySuburb, suburb));
  }

  // Comment voting operations
  async voteOnComment(vote: InsertCommentVote): Promise<CommentVote> {
    // First check if user already voted on this comment
    const existingVote = await this.getUserVoteOnComment(vote.userId, vote.commentId);
    
    if (existingVote) {
      // Update existing vote
      const [updated] = await db
        .update(commentVotes)
        .set({ voteType: vote.voteType })
        .where(eq(commentVotes.id, existingVote.id))
        .returning();
      
      // Update comment helpful score
      await this.updateCommentHelpfulScore(vote.commentId);
      
      return updated;
    } else {
      // Create new vote
      const [newVote] = await db
        .insert(commentVotes)
        .values(vote)
        .returning();
      
      // Update comment helpful score
      await this.updateCommentHelpfulScore(vote.commentId);
      
      return newVote;
    }
  }

  async getUserVoteOnComment(userId: string, commentId: string): Promise<CommentVote | undefined> {
    const [vote] = await db
      .select()
      .from(commentVotes)
      .where(and(eq(commentVotes.userId, userId), eq(commentVotes.commentId, commentId)));
    return vote;
  }

  private async updateCommentHelpfulScore(commentId: string): Promise<void> {
    // Calculate helpful score (helpful votes - not_helpful votes)
    const votes = await db
      .select()
      .from(commentVotes)
      .where(eq(commentVotes.commentId, commentId));
    
    const helpfulVotes = votes.filter(v => v.voteType === 'helpful').length;
    const notHelpfulVotes = votes.filter(v => v.voteType === 'not_helpful').length;
    const helpfulScore = helpfulVotes - notHelpfulVotes;
    
    await db
      .update(comments)
      .set({ helpfulScore })
      .where(eq(comments.id, commentId));
  }

  // Neighborhood group operations
  async getNeighborhoodGroups(): Promise<NeighborhoodGroup[]> {
    return await db.select().from(neighborhoodGroups);
  }

  async getGroupsBySuburb(suburb: string): Promise<NeighborhoodGroup[]> {
    return await db.select().from(neighborhoodGroups).where(eq(neighborhoodGroups.suburb, suburb));
  }

  async createNeighborhoodGroup(group: InsertNeighborhoodGroup): Promise<NeighborhoodGroup> {
    const [newGroup] = await db
      .insert(neighborhoodGroups)
      .values(group)
      .returning();
    return newGroup;
  }

  async joinNeighborhoodGroup(membership: InsertUserNeighborhoodGroup): Promise<UserNeighborhoodGroup> {
    const [newMembership] = await db
      .insert(userNeighborhoodGroups)
      .values(membership)
      .returning();
    return newMembership;
  }

  async leaveNeighborhoodGroup(userId: string, groupId: string): Promise<boolean> {
    const deleted = await db
      .delete(userNeighborhoodGroups)
      .where(and(eq(userNeighborhoodGroups.userId, userId), eq(userNeighborhoodGroups.groupId, groupId)));
    
    return deleted.rowCount ? deleted.rowCount > 0 : false;
  }

  // Emergency contact operations
  async getEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    return await db.select().from(emergencyContacts).where(eq(emergencyContacts.userId, userId));
  }

  async createEmergencyContact(contact: InsertEmergencyContact): Promise<EmergencyContact> {
    const [newContact] = await db
      .insert(emergencyContacts)
      .values(contact)
      .returning();
    return newContact;
  }

  async deleteEmergencyContact(id: string): Promise<boolean> {
    const deleted = await db.delete(emergencyContacts).where(eq(emergencyContacts.id, id));
    return deleted.rowCount ? deleted.rowCount > 0 : false;
  }

  // Safety check-in operations
  async createSafetyCheckIn(checkIn: InsertSafetyCheckIn): Promise<SafetyCheckIn> {
    const [newCheckIn] = await db
      .insert(safetyCheckIns)
      .values(checkIn)
      .returning();
    return newCheckIn;
  }

  async getSafetyCheckIns(incidentId: string): Promise<SafetyCheckIn[]> {
    return await db
      .select()
      .from(safetyCheckIns)
      .where(and(eq(safetyCheckIns.incidentId, incidentId), eq(safetyCheckIns.isVisible, true)))
      .orderBy(desc(safetyCheckIns.createdAt));
  }

  async getUserSafetyCheckIns(userId: string): Promise<SafetyCheckIn[]> {
    return await db
      .select()
      .from(safetyCheckIns)
      .where(eq(safetyCheckIns.userId, userId))
      .orderBy(desc(safetyCheckIns.createdAt));
  }

}

export const storage = new DatabaseStorage();
