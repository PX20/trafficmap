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
  conversations,
  messages,
  notifications,
  categories,
  subcategories,
  incidentFollowUps,
  reports,
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
  type InsertSafetyCheckIn,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Notification,
  type InsertNotification,
  type Category,
  type InsertCategory,
  type Subcategory,
  type InsertSubcategory,
  type IncidentFollowUp,
  type InsertIncidentFollowUp,
  type Report,
  type InsertReport,
  type AdCampaign,
  type InsertAdCampaign,
  type AdView,
  type InsertAdView,
  type AdClick,
  type InsertAdClick,
  adCampaigns,
  adViews,
  adClicks
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ne, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSuburb(id: string, homeSuburb: string): Promise<User | undefined>;
  
  // Enhanced user profile operations
  updateUserProfile(id: string, profile: Partial<User>): Promise<User | undefined>;
  upgradeToBusinessAccount(id: string, businessData: { 
    businessName: string; 
    businessCategory: string; 
    businessDescription?: string; 
    businessWebsite?: string; 
    businessPhone?: string; 
    businessAddress?: string; 
  }): Promise<User | undefined>;
  getUsersBySuburb(suburb: string): Promise<User[]>;
  
  // Terms and conditions
  acceptUserTerms(id: string): Promise<User | undefined>;
  
  // Traffic and incident operations
  getTrafficEvents(): Promise<TrafficEvent[]>;
  createTrafficEvent(event: InsertTrafficEvent): Promise<TrafficEvent>;
  updateTrafficEvent(id: string, event: Partial<TrafficEvent>): Promise<TrafficEvent | undefined>;
  deleteTrafficEvent(id: string): Promise<boolean>;
  getIncidents(): Promise<Incident[]>;
  getIncident(id: string): Promise<Incident | undefined>;
  getRecentIncidents(limit: number): Promise<Incident[]>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  updateIncident(id: string, incident: Partial<Incident>): Promise<Incident | undefined>;
  updateIncidentStatus(id: string, status: string): Promise<Incident | undefined>;
  deleteIncident(id: string): Promise<boolean>;
  
  // Comment operations
  getCommentsByIncidentId(incidentId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  updateComment(id: string, comment: Partial<Comment>): Promise<Comment | undefined>;
  deleteComment(id: string): Promise<boolean>;
  getCommentById(id: string): Promise<Comment | undefined>;
  
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
  
  // Ad campaign operations
  getActiveAdsForSuburb(suburb: string, limit: number): Promise<AdCampaign[]>;
  getAdCampaign(id: string): Promise<AdCampaign | undefined>;
  createAdCampaign(campaign: InsertAdCampaign): Promise<AdCampaign>;
  updateAdCampaign(id: string, updates: Partial<AdCampaign>): Promise<AdCampaign | undefined>;
  
  // Ad tracking operations
  recordAdView(viewData: InsertAdView): Promise<AdView>;
  recordAdClick(clickData: InsertAdClick): Promise<AdClick>;
  getAdViewsToday(userId: string, adId: string, date: string): Promise<number>;
  
  // Safety check-in operations
  createSafetyCheckIn(checkIn: InsertSafetyCheckIn): Promise<SafetyCheckIn>;
  getSafetyCheckIns(incidentId: string): Promise<SafetyCheckIn[]>;
  getUserSafetyCheckIns(userId: string): Promise<SafetyCheckIn[]>;
  
  // Messaging operations
  getConversationsByUserId(userId: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversationBetweenUsers(user1Id: string, user2Id: string): Promise<Conversation | undefined>;
  getMessagesByConversationId(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;
  
  // Notification operations
  getNotifications(userId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  getSubcategories(categoryId?: string): Promise<Subcategory[]>;
  createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory>;
  incrementSubcategoryReportCount(subcategoryId: string): Promise<void>;
  
  // Incident follow-up operations
  getIncidentFollowUps(incidentId: string): Promise<IncidentFollowUp[]>;
  createIncidentFollowUp(followUp: InsertIncidentFollowUp): Promise<IncidentFollowUp>;
  
  // Report operations for content moderation
  createReport(report: InsertReport): Promise<Report>;
  getReports(status?: string): Promise<Report[]>;
  updateReportStatus(reportId: string, status: string, moderatorId?: string, moderatorNotes?: string): Promise<Report | undefined>;
  getReportsByEntity(entityType: string, entityId: string): Promise<Report[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }


  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
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

  async acceptUserTerms(id: string): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ termsAccepted: true, termsAcceptedAt: new Date(), updatedAt: new Date() })
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

  async getIncident(id: string): Promise<Incident | undefined> {
    const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
    return incident;
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

  async updateIncidentStatus(id: string, status: string): Promise<Incident | undefined> {
    const [updated] = await db
      .update(incidents)
      .set({ status, lastUpdated: new Date() })
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

  async getCommentById(id: string): Promise<Comment | undefined> {
    const [comment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, id));
    return comment;
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

  async upgradeToBusinessAccount(id: string, businessData: { 
    businessName: string; 
    businessCategory: string; 
    businessDescription?: string; 
    businessWebsite?: string; 
    businessPhone?: string; 
    businessAddress?: string; 
  }): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({
        accountType: 'business',
        businessName: businessData.businessName,
        businessCategory: businessData.businessCategory,
        businessDescription: businessData.businessDescription || null,
        businessWebsite: businessData.businessWebsite || null,
        businessPhone: businessData.businessPhone || null,
        businessAddress: businessData.businessAddress || null,
        updatedAt: new Date()
      })
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

  // Messaging operations
  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(
        or(
          eq(conversations.user1Id, userId),
          eq(conversations.user2Id, userId)
        )
      )
      .orderBy(desc(conversations.lastMessageAt));
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values({
        ...conversation,
        id: randomUUID(),
        createdAt: new Date(),
        lastMessageAt: new Date(),
      })
      .returning();
    return newConversation;
  }

  async getConversationBetweenUsers(user1Id: string, user2Id: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.user1Id, user1Id),
          eq(conversations.user2Id, user2Id)
        )
      );
    
    if (conversation) {
      return conversation;
    }

    // Check the reverse order
    const [reverseConversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.user1Id, user2Id),
          eq(conversations.user2Id, user1Id)
        )
      );
    
    return reverseConversation;
  }

  async getMessagesByConversationId(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values({
        ...message,
        id: randomUUID(),
        createdAt: new Date(),
      })
      .returning();

    // Update the conversation's last message time
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, message.conversationId));

    return newMessage;
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          ne(messages.senderId, userId) // Only mark as read for messages NOT sent by the current user (i.e., received messages)
        )
      );
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const conversations = await this.getConversationsByUserId(userId);
    let unreadCount = 0;
    
    for (const conversation of conversations) {
      const unreadMessages = await db
        .select()
        .from(messages)
        .where(
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
  async getNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
    return result.length;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values({
        ...notification,
        id: randomUUID(),
        createdAt: new Date(),
      })
      .returning();
    return newNotification;
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }
  
  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.order);
  }
  
  async createCategory(category: InsertCategory): Promise<Category> {
    const [created] = await db
      .insert(categories)
      .values(category)
      .returning();
    return created;
  }
  
  async getSubcategories(categoryId?: string): Promise<Subcategory[]> {
    if (categoryId) {
      return await db
        .select()
        .from(subcategories)
        .where(and(
          eq(subcategories.isActive, true),
          eq(subcategories.categoryId, categoryId)
        ))
        .orderBy(subcategories.order);
    } else {
      return await db
        .select()
        .from(subcategories)
        .where(eq(subcategories.isActive, true))
        .orderBy(subcategories.order);
    }
  }
  
  async createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory> {
    const [created] = await db
      .insert(subcategories)
      .values(subcategory)
      .returning();
    return created;
  }
  
  async incrementSubcategoryReportCount(subcategoryId: string): Promise<void> {
    try {
      await db
        .update(subcategories)
        .set({ 
          reportCount: sql`${subcategories.reportCount} + 1` 
        })
        .where(eq(subcategories.id, subcategoryId));
    } catch (error) {
      console.log(`Failed to increment report count for subcategory ${subcategoryId}:`, error);
    }
  }

  async getIncidentFollowUps(incidentId: string): Promise<IncidentFollowUp[]> {
    return await db
      .select()
      .from(incidentFollowUps)
      .where(eq(incidentFollowUps.incidentId, incidentId))
      .orderBy(desc(incidentFollowUps.createdAt));
  }

  async createIncidentFollowUp(followUp: InsertIncidentFollowUp): Promise<IncidentFollowUp> {
    const [created] = await db
      .insert(incidentFollowUps)
      .values(followUp)
      .returning();
    return created;
  }

  async createReport(report: InsertReport): Promise<Report> {
    const [created] = await db
      .insert(reports)
      .values(report)
      .returning();
    return created;
  }

  async getReports(status?: string): Promise<Report[]> {
    if (status) {
      return await db
        .select()
        .from(reports)
        .where(eq(reports.status, status))
        .orderBy(desc(reports.createdAt));
    } else {
      return await db
        .select()
        .from(reports)
        .orderBy(desc(reports.createdAt));
    }
  }

  async updateReportStatus(reportId: string, status: string, moderatorId?: string, moderatorNotes?: string): Promise<Report | undefined> {
    const updateData: any = { 
      status,
      ...(moderatorId && { moderatorId }),
      ...(moderatorNotes && { moderatorNotes })
    };
    
    if (status === 'resolved' || status === 'dismissed') {
      updateData.resolvedAt = new Date();
    }

    const [updated] = await db
      .update(reports)
      .set(updateData)
      .where(eq(reports.id, reportId))
      .returning();
    return updated;
  }

  async getReportsByEntity(entityType: string, entityId: string): Promise<Report[]> {
    return await db
      .select()
      .from(reports)
      .where(and(
        eq(reports.entityType, entityType),
        eq(reports.entityId, entityId)
      ))
      .orderBy(desc(reports.createdAt));
  }

  // Ad Campaign Operations
  async getActiveAdsForSuburb(suburb: string, limit: number): Promise<AdCampaign[]> {
    // Find ads that target this suburb or neighboring areas
    const campaigns = await db
      .select()
      .from(adCampaigns)
      .where(
        and(
          eq(adCampaigns.status, 'active'),
          or(
            eq(adCampaigns.suburb, suburb),
            sql`${suburb} = ANY(${adCampaigns.targetSuburbs})`
          )
        )
      )
      .limit(limit)
      .orderBy(sql`RANDOM()`); // Random order for fair distribution

    return campaigns;
  }

  async getAdCampaign(id: string): Promise<AdCampaign | undefined> {
    const [campaign] = await db
      .select()
      .from(adCampaigns)
      .where(eq(adCampaigns.id, id));
    
    return campaign;
  }

  async createAdCampaign(campaignData: InsertAdCampaign): Promise<AdCampaign> {
    const [campaign] = await db
      .insert(adCampaigns)
      .values({
        ...campaignData,
        updatedAt: new Date(),
      })
      .returning();
    
    return campaign;
  }

  async updateAdCampaign(id: string, updates: Partial<AdCampaign>): Promise<AdCampaign | undefined> {
    const [updated] = await db
      .update(adCampaigns)
      .set({ 
        ...updates, 
        updatedAt: new Date() 
      })
      .where(eq(adCampaigns.id, id))
      .returning();
    
    return updated;
  }

  // Ad Tracking Operations
  async recordAdView(viewData: InsertAdView): Promise<AdView> {
    try {
      const [view] = await db
        .insert(adViews)
        .values({
          ...viewData,
          date: viewData.viewedAt.toISOString().split('T')[0], // YYYY-MM-DD
        })
        .returning();
      
      return view;
    } catch (error: any) {
      // Handle duplicate view gracefully (user already viewed this ad today)
      if (error.code === '23505') { // PostgreSQL unique violation
        throw new Error('View already recorded for this user today');
      }
      throw error;
    }
  }

  async recordAdClick(clickData: InsertAdClick): Promise<AdClick> {
    const [click] = await db
      .insert(adClicks)
      .values(clickData)
      .returning();
    
    return click;
  }

  async getAdViewsToday(userId: string, adId: string, date: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(adViews)
      .where(
        and(
          eq(adViews.userId, userId),
          eq(adViews.adCampaignId, adId),
          eq(adViews.date, date)
        )
      );
    
    return result[0]?.count || 0;
  }

}

export const storage = new DatabaseStorage();
