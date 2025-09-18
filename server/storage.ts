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
  adClicks,
  billingPlans,
  billingCycles,
  payments,
  campaignAnalytics,
  type BillingPlan,
  type InsertBillingPlan,
  type BillingCycle,
  type InsertBillingCycle,
  type Payment,
  type InsertPayment,
  type CampaignAnalytics,
  type InsertCampaignAnalytics,
  unifiedIncidents,
  type SelectUnifiedIncident,
  type InsertUnifiedIncident,
  type UnifiedFeature,
  incidentComments,
  incidentLikes,
  commentLikes,
  type IncidentComment,
  type InsertIncidentComment,
  type IncidentLike,
  type InsertIncidentLike,
  type CommentLike,
  type InsertCommentLike,
  type UnifiedIncidentsResponse,
  generateUnifiedIncidentId,
  prepareUnifiedIncidentForInsert,
  type SafeUser
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ne, sql, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { spatialLookup, computeGeocellForIncident, type SpatialQuery, type SpatialQueryResult } from "./spatial-lookup";

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Password authentication methods
  createUserWithPassword(email: string, password: string, userData: Partial<InsertUser>): Promise<User>;
  authenticateUser(email: string, password: string): Promise<User | null>;
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
  completeUserSetup(userId: string, setupData: { 
    accountType: 'regular' | 'business'; 
    businessName?: string; 
    businessCategory?: string; 
    businessDescription?: string; 
    businessWebsite?: string; 
    businessPhone?: string; 
    businessAddress?: string; 
  }): Promise<User | undefined>;
  getUsersBySuburb(suburb: string): Promise<User[]>;
  
  // Batch user operations
  getUsersByIds(userIds: string[]): Promise<User[]>;
  
  // Terms and conditions
  acceptUserTerms(id: string): Promise<User | undefined>;
  
  // ============================================================================
  // UNIFIED INCIDENT OPERATIONS - Single source for all incident types
  // ============================================================================
  
  // Unified incident management
  getAllUnifiedIncidents(): Promise<SelectUnifiedIncident[]>;
  getUnifiedIncident(id: string): Promise<SelectUnifiedIncident | undefined>;
  getUnifiedIncidentsByRegion(regionId: string): Promise<SelectUnifiedIncident[]>;
  getUnifiedIncidentsBySource(source: 'tmr' | 'emergency' | 'user'): Promise<SelectUnifiedIncident[]>;
  getUnifiedIncidentsByCategory(category: string): Promise<SelectUnifiedIncident[]>;
  createUnifiedIncident(incident: InsertUnifiedIncident): Promise<SelectUnifiedIncident>;
  updateUnifiedIncident(id: string, incident: Partial<SelectUnifiedIncident>): Promise<SelectUnifiedIncident | undefined>;
  upsertUnifiedIncident(source: 'tmr' | 'emergency' | 'user', sourceId: string, incident: InsertUnifiedIncident): Promise<SelectUnifiedIncident>;
  deleteUnifiedIncident(id: string): Promise<boolean>;
  
  // Spatial and temporal queries
  getUnifiedIncidentsInArea(southWest: [number, number], northEast: [number, number]): Promise<SelectUnifiedIncident[]>;
  getUnifiedIncidentsSince(timestamp: Date): Promise<SelectUnifiedIncident[]>;
  getActiveUnifiedIncidents(): Promise<SelectUnifiedIncident[]>;
  
  // Unified data conversion to GeoJSON
  getUnifiedIncidentsAsGeoJSON(): Promise<UnifiedIncidentsResponse>;
  getUnifiedIncidentsByRegionAsGeoJSON(regionId: string): Promise<UnifiedIncidentsResponse>;
  
  // ============================================================================
  // 3-STAGE SPATIAL LOOKUP SYSTEM - High-performance spatial queries
  // ============================================================================
  
  // Advanced spatial queries with grid index, bounding box, and point-in-polygon
  spatialQuery(query: SpatialQuery): Promise<SpatialQueryResult>;
  spatialQueryInViewport(southWest: [number, number], northEast: [number, number], filters?: { category?: string; source?: 'tmr' | 'emergency' | 'user'; activeOnly?: boolean }): Promise<SpatialQueryResult>;
  spatialQueryNearLocation(lat: number, lng: number, radiusKm: number, filters?: { category?: string; source?: 'tmr' | 'emergency' | 'user'; activeOnly?: boolean }): Promise<SpatialQueryResult>;
  
  // Cache and performance utilities
  refreshSpatialIndex(): Promise<void>;
  getSpatialCacheStats(): { size: number; maxSize: number; hitRate: number };
  
  // Legacy traffic and incident operations (deprecated - use unified instead)
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
  getUserCampaigns(userId: string): Promise<AdCampaign[]>;
  getUserCampaignAnalytics(userId: string): Promise<Array<{ campaignId: string; views: number; clicks: number; spend: number; ctr: number; cpm: number; }>>;
  createAdCampaign(campaign: InsertAdCampaign): Promise<AdCampaign>;
  updateAdCampaign(id: string, updates: Partial<AdCampaign>): Promise<AdCampaign | undefined>;
  getPendingAds(): Promise<AdCampaign[]>;
  
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
  markNotificationAsRead(notificationId: string, userId: string): Promise<void>;
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
  
  // ============================================================================
  // INCIDENT SOCIAL INTERACTION OPERATIONS - Comments and Likes
  // ============================================================================
  
  // Incident comment operations
  getIncidentComments(incidentId: string): Promise<IncidentComment[]>;
  getIncidentCommentsCount(incidentId: string): Promise<number>;
  createIncidentComment(comment: InsertIncidentComment): Promise<IncidentComment>;
  deleteIncidentComment(id: string, userId: string): Promise<boolean>;
  
  // Incident like operations
  getIncidentLikes(incidentId: string): Promise<IncidentLike[]>;
  getIncidentLikesCount(incidentId: string): Promise<number>;
  toggleIncidentLike(incidentId: string, userId: string): Promise<{ liked: boolean; count: number }>;
  isIncidentLikedByUser(incidentId: string, userId: string): Promise<boolean>;

  // Billing operations
  getBillingPlans(): Promise<BillingPlan[]>;
  createBillingPlan(plan: InsertBillingPlan): Promise<BillingPlan>;
  createBillingCycle(cycle: InsertBillingCycle): Promise<BillingCycle>;
  getBillingCycle(cycleId: string): Promise<BillingCycle | undefined>;
  updateBillingCycleStatus(cycleId: string, status: string): Promise<BillingCycle | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePaymentStatus(paymentId: string, status: string, paidAt?: Date): Promise<Payment | undefined>;
  getBusinessPayments(businessId: string): Promise<Payment[]>;
  getCampaignAnalytics(campaignId: string, startDate: string, endDate: string): Promise<CampaignAnalytics[]>;
  upsertCampaignAnalytics(analytics: InsertCampaignAnalytics): Promise<CampaignAnalytics>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }


  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async createTestBusinessUser(): Promise<User> {
    // Create test business user for development/testing
    const hashedPassword = await bcrypt.hash('Coffee123!', 10);
    
    const testBusinessData: InsertUser = {
      id: 'test-business-001',
      email: 'sarah.mitchell@sunshinecoastcoffee.com.au',
      password: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Mitchell',
      profileImageUrl: null,
      homeSuburb: 'Caloundra',
      primarySuburb: 'Caloundra',
      accountType: 'business',
      businessName: 'Sunshine Coast Coffee Co.',
      businessCategory: 'Restaurant & Food',
      businessDescription: 'Locally roasted coffee beans and specialty drinks serving the Sunshine Coast community',
      businessWebsite: 'https://sunshinecoastcoffee.com.au',
      businessPhone: '(07) 5491 2345',
      businessAddress: '123 Bulcock Street, Caloundra QLD 4551',
      termsAccepted: true,
    };

    // Check if user already exists
    const existingUser = await this.getUser(testBusinessData.id!);
    if (existingUser) {
      return existingUser;
    }

    const [user] = await db
      .insert(users)
      .values(testBusinessData)
      .returning();
    
    return user;
  }

  async createAdminUser(): Promise<User> {
    // Create admin user for management access
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    const adminUserData: InsertUser = {
      id: 'admin-001',
      email: 'admin@qldsafety.com.au',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      profileImageUrl: null,
      homeSuburb: 'Brisbane',
      primarySuburb: 'Brisbane',
      accountType: 'regular',
      role: 'admin',
      termsAccepted: true,
    };

    // Check if admin user already exists
    const existingAdmin = await this.getUser(adminUserData.id!);
    if (existingAdmin) {
      return existingAdmin;
    }

    const [adminUser] = await db
      .insert(users)
      .values(adminUserData)
      .returning();
    
    return adminUser;
  }

  // Password authentication methods implementation
  async createUserWithPassword(email: string, password: string, userData: Partial<InsertUser>): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const userInsert: InsertUser = {
      email: email.toLowerCase(),
      password: hashedPassword,
      ...userData,
    };

    const [user] = await db
      .insert(users)
      .values(userInsert)
      .returning();
    
    return user;
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
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

  // ============================================================================
  // UNIFIED INCIDENT OPERATIONS - Single source for all incident types
  // ============================================================================

  async getAllUnifiedIncidents(): Promise<SelectUnifiedIncident[]> {
    return await db.select().from(unifiedIncidents).orderBy(desc(unifiedIncidents.lastUpdated));
  }

  async getUnifiedIncident(id: string): Promise<SelectUnifiedIncident | undefined> {
    const [incident] = await db.select().from(unifiedIncidents).where(eq(unifiedIncidents.id, id));
    return incident;
  }

  async getUnifiedIncidentsByRegion(regionId: string): Promise<SelectUnifiedIncident[]> {
    return await db
      .select()
      .from(unifiedIncidents)
      .where(sql`${unifiedIncidents.regionIds} @> ARRAY[${regionId}]`)
      .orderBy(desc(unifiedIncidents.lastUpdated));
  }

  async getUnifiedIncidentsBySource(source: 'tmr' | 'emergency' | 'user'): Promise<SelectUnifiedIncident[]> {
    return await db
      .select()
      .from(unifiedIncidents)
      .where(eq(unifiedIncidents.source, source))
      .orderBy(desc(unifiedIncidents.lastUpdated));
  }

  async getUnifiedIncidentsByCategory(category: string): Promise<SelectUnifiedIncident[]> {
    return await db
      .select()
      .from(unifiedIncidents)
      .where(eq(unifiedIncidents.category, category))
      .orderBy(desc(unifiedIncidents.lastUpdated));
  }

  async createUnifiedIncident(incident: InsertUnifiedIncident): Promise<SelectUnifiedIncident> {
    const id = generateUnifiedIncidentId(incident.source, incident.sourceId);
    const [newIncident] = await db
      .insert(unifiedIncidents)
      .values({
        ...incident,
        id,
        lastUpdated: new Date(),
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newIncident;
  }

  async updateUnifiedIncident(id: string, incident: Partial<SelectUnifiedIncident>): Promise<SelectUnifiedIncident | undefined> {
    const [updated] = await db
      .update(unifiedIncidents)
      .set({ 
        ...incident, 
        lastUpdated: new Date(), 
        updatedAt: new Date(),
        version: sql`${unifiedIncidents.version} + 1`
      })
      .where(eq(unifiedIncidents.id, id))
      .returning();
    return updated;
  }

  async upsertUnifiedIncident(source: 'tmr' | 'emergency' | 'user', sourceId: string, incident: InsertUnifiedIncident): Promise<SelectUnifiedIncident> {
    const id = generateUnifiedIncidentId(source, sourceId);
    try {
      const [upserted] = await db
        .insert(unifiedIncidents)
        .values({
          ...incident,
          id,
          source,
          sourceId,
          lastUpdated: new Date(),
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: unifiedIncidents.id, // Use primary key instead of (source, sourceId)
          set: {
            ...incident,
            lastUpdated: new Date(),
            updatedAt: new Date(),
            version: sql`${unifiedIncidents.version} + 1`,
          },
        })
        .returning();
      return upserted;
    } catch (error: any) {
      console.error(`❌ Failed to upsert unified incident [${source}:${sourceId}] with id [${id}]:`, {
        error: error.message,
        code: error.code,
        detail: error.detail,
        sourceId,
        id
      });
      throw error;
    }
  }

  async deleteUnifiedIncident(id: string): Promise<boolean> {
    const result = await db.delete(unifiedIncidents).where(eq(unifiedIncidents.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getUnifiedIncidentsInArea(southWest: [number, number], northEast: [number, number]): Promise<SelectUnifiedIncident[]> {
    const [swLat, swLng] = southWest;
    const [neLat, neLng] = northEast;
    
    return await db
      .select()
      .from(unifiedIncidents)
      .where(
        and(
          sql`${unifiedIncidents.centroidLat} >= ${swLat}`,
          sql`${unifiedIncidents.centroidLat} <= ${neLat}`,
          sql`${unifiedIncidents.centroidLng} >= ${swLng}`,
          sql`${unifiedIncidents.centroidLng} <= ${neLng}`
        )
      )
      .orderBy(desc(unifiedIncidents.lastUpdated));
  }

  async getUnifiedIncidentsSince(timestamp: Date): Promise<SelectUnifiedIncident[]> {
    return await db
      .select()
      .from(unifiedIncidents)
      .where(sql`${unifiedIncidents.lastUpdated} >= ${timestamp}`)
      .orderBy(desc(unifiedIncidents.lastUpdated));
  }

  async getActiveUnifiedIncidents(): Promise<SelectUnifiedIncident[]> {
    return await db
      .select()
      .from(unifiedIncidents)
      .where(eq(unifiedIncidents.status, 'active'))
      .orderBy(desc(unifiedIncidents.lastUpdated));
  }

  async getUnifiedIncidentsAsGeoJSON(): Promise<UnifiedIncidentsResponse> {
    const incidents = await this.getAllUnifiedIncidents();
    return this.convertIncidentsToGeoJSON(incidents);
  }

  async getUnifiedIncidentsByRegionAsGeoJSON(regionId: string): Promise<UnifiedIncidentsResponse> {
    const incidents = await this.getUnifiedIncidentsByRegion(regionId);
    return this.convertIncidentsToGeoJSON(incidents);
  }

  // Helper method for GeoJSON conversion
  private convertIncidentsToGeoJSON(incidents: SelectUnifiedIncident[]): UnifiedIncidentsResponse {
    const features: UnifiedFeature[] = incidents.map(incident => ({
      type: "Feature",
      id: incident.id,
      properties: {
        id: incident.id,
        source: incident.source,
        title: incident.title,
        description: incident.description || undefined,
        category: incident.category,
        subcategory: incident.subcategory || undefined,
        severity: incident.severity || "medium",
        status: incident.status || "active",
        location: incident.location || undefined,
        incidentTime: incident.incidentTime?.toISOString(),
        lastUpdated: incident.lastUpdated.toISOString(),
        publishedAt: incident.publishedAt.toISOString(),
        regionIds: incident.regionIds || [],
        userId: incident.userId || undefined,
        photoUrl: incident.photoUrl || undefined,
        verificationStatus: incident.verificationStatus || undefined,
        originalProperties: incident.properties,
      },
      geometry: incident.geometry as any,
    }));

    // Calculate metadata
    const sourceCounts = incidents.reduce((acc, incident) => {
      acc[incident.source] = (acc[incident.source] || 0) + 1;
      return acc;
    }, { tmr: 0, emergency: 0, user: 0 });

    const regionCounts = incidents.reduce((acc, incident) => {
      incident.regionIds?.forEach(regionId => {
        acc[regionId] = (acc[regionId] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return {
      type: "FeatureCollection",
      features,
      metadata: {
        total: incidents.length,
        updated: new Date().toISOString(),
        version: 1,
        sources: sourceCounts,
        regions: regionCounts,
      },
    };
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

  async completeUserSetup(userId: string, setupData: { 
    accountType: 'regular' | 'business'; 
    businessName?: string; 
    businessCategory?: string; 
    businessDescription?: string; 
    businessWebsite?: string; 
    businessPhone?: string; 
    businessAddress?: string; 
  }): Promise<User | undefined> {
    const updateData: any = {
      accountType: setupData.accountType,
      updatedAt: new Date(),
    };

    // Add business fields if it's a business account
    if (setupData.accountType === 'business') {
      updateData.businessName = setupData.businessName;
      updateData.businessCategory = setupData.businessCategory;
      updateData.businessDescription = setupData.businessDescription || null;
      updateData.businessWebsite = setupData.businessWebsite || null;
      updateData.businessPhone = setupData.businessPhone || null;
      updateData.businessAddress = setupData.businessAddress || null;
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
      
    return user;
  }

  async getUsersBySuburb(suburb: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.primarySuburb, suburb));
  }

  async getUsersByIds(userIds: string[]): Promise<User[]> {
    if (!userIds.length) return [];
    
    // Use in clause for efficient batch lookup - limited to 1000 IDs for performance
    const limitedIds = userIds.slice(0, 1000);
    
    return await db
      .select()
      .from(users)
      .where(inArray(users.id, limitedIds));
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

  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
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

  async getUserCampaigns(userId: string): Promise<AdCampaign[]> {
    // Note: Ad campaigns don't have userId field yet, this is a placeholder implementation
    // For now, return campaigns that match user's business name as a workaround
    const user = await this.getUser(userId);
    if (!user || !user.businessName) {
      return [];
    }
    
    return await db
      .select()
      .from(adCampaigns)
      .where(eq(adCampaigns.businessName, user.businessName))
      .orderBy(desc(adCampaigns.createdAt));
  }

  async getUserCampaignAnalytics(userId: string): Promise<Array<{ campaignId: string; views: number; clicks: number; spend: number; ctr: number; cpm: number; }>> {
    // Get user campaigns first
    const userCampaigns = await this.getUserCampaigns(userId);
    
    const analytics = [];
    for (const campaign of userCampaigns) {
      // Get views for this campaign
      const views = await db.select().from(adViews).where(eq(adViews.adCampaignId, campaign.id));
      const clicks = await db.select().from(adClicks).where(eq(adClicks.adCampaignId, campaign.id));
      
      const viewCount = views.length;
      const clickCount = clicks.length;
      const ctr = viewCount > 0 ? (clickCount / viewCount) * 100 : 0;
      const spend = parseFloat(campaign.dailyBudget || "0") * 30; // Rough calculation
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

  async getPendingAds(): Promise<AdCampaign[]> {
    const pending = await db
      .select()
      .from(adCampaigns)
      .where(eq(adCampaigns.status, 'pending'))
      .orderBy(adCampaigns.createdAt);
    
    return pending;
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

  // Billing operations
  async getBillingPlans(): Promise<BillingPlan[]> {
    return await db
      .select()
      .from(billingPlans)
      .where(eq(billingPlans.isActive, true))
      .orderBy(billingPlans.createdAt);
  }

  async createBillingPlan(plan: InsertBillingPlan): Promise<BillingPlan> {
    const id = randomUUID();
    const [newPlan] = await db
      .insert(billingPlans)
      .values({
        ...plan,
        id,
      })
      .returning();
    
    return newPlan;
  }

  async createBillingCycle(cycle: InsertBillingCycle): Promise<BillingCycle> {
    const id = randomUUID();
    const [newCycle] = await db
      .insert(billingCycles)
      .values({
        ...cycle,
        id,
      })
      .returning();
    
    return newCycle;
  }

  async getBillingCycle(cycleId: string): Promise<BillingCycle | undefined> {
    const [cycle] = await db
      .select()
      .from(billingCycles)
      .where(eq(billingCycles.id, cycleId));
    
    return cycle;
  }

  async updateBillingCycleStatus(cycleId: string, status: string): Promise<BillingCycle | undefined> {
    const [updated] = await db
      .update(billingCycles)
      .set({ 
        status, 
        updatedAt: new Date() 
      })
      .where(eq(billingCycles.id, cycleId))
      .returning();
    
    return updated;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const [newPayment] = await db
      .insert(payments)
      .values({
        ...payment,
        id,
      })
      .returning();
    
    return newPayment;
  }

  async updatePaymentStatus(paymentId: string, status: string, paidAt?: Date): Promise<Payment | undefined> {
    const updateData: Partial<Payment> = { status };
    if (paidAt) {
      updateData.paidAt = paidAt;
    }

    const [updated] = await db
      .update(payments)
      .set(updateData)
      .where(eq(payments.id, paymentId))
      .returning();
    
    return updated;
  }

  async getBusinessPayments(businessId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.businessId, businessId))
      .orderBy(desc(payments.createdAt));
  }

  async getCampaignAnalytics(campaignId: string, startDate: string, endDate: string): Promise<CampaignAnalytics[]> {
    return await db
      .select()
      .from(campaignAnalytics)
      .where(
        and(
          eq(campaignAnalytics.campaignId, campaignId),
          sql`${campaignAnalytics.date} >= ${startDate}`,
          sql`${campaignAnalytics.date} <= ${endDate}`
        )
      )
      .orderBy(campaignAnalytics.date);
  }

  async upsertCampaignAnalytics(analytics: InsertCampaignAnalytics): Promise<CampaignAnalytics> {
    const id = randomUUID();
    const [upserted] = await db
      .insert(campaignAnalytics)
      .values({
        ...analytics,
        id,
      })
      .onConflictDoUpdate({
        target: [campaignAnalytics.campaignId, campaignAnalytics.date],
        set: {
          ...analytics,
          updatedAt: new Date()
        }
      })
      .returning();
    
    return upserted;
  }

  // ============================================================================
  // 3-STAGE SPATIAL LOOKUP IMPLEMENTATIONS
  // ============================================================================

  async spatialQuery(query: SpatialQuery): Promise<SpatialQueryResult> {
    // Only load incidents if spatial index is empty (first query or after restart)
    if (!spatialLookup.hasData()) {
      const incidents = await this.getAllUnifiedIncidents();
      spatialLookup.loadIncidents(incidents);
    }
    
    return spatialLookup.query(query);
  }

  async spatialQueryInViewport(
    southWest: [number, number], 
    northEast: [number, number], 
    filters?: { category?: string; source?: 'tmr' | 'emergency' | 'user'; activeOnly?: boolean }
  ): Promise<SpatialQueryResult> {
    const query: SpatialQuery = {
      boundingBox: { southWest, northEast },
      ...(filters?.category && { category: filters.category }),
      ...(filters?.source && { source: filters.source }),
      ...(filters?.activeOnly && { activeOnly: filters.activeOnly })
    };
    
    return this.spatialQuery(query);
  }

  async spatialQueryNearLocation(
    lat: number, 
    lng: number, 
    radiusKm: number, 
    filters?: { category?: string; source?: 'tmr' | 'emergency' | 'user'; activeOnly?: boolean }
  ): Promise<SpatialQueryResult> {
    // Convert radius to approximate bounding box
    const latOffset = radiusKm / 111; // Rough: 1 degree lat ≈ 111 km
    const lngOffset = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
    
    const southWest: [number, number] = [lat - latOffset, lng - lngOffset];
    const northEast: [number, number] = [lat + latOffset, lng + lngOffset];
    
    return this.spatialQueryInViewport(southWest, northEast, filters);
  }

  async refreshSpatialIndex(): Promise<void> {
    const incidents = await this.getAllUnifiedIncidents();
    
    // Ensure all incidents have geocells computed
    const incidentsWithGeocells = incidents.map(incident => ({
      ...incident,
      geocell: incident.geocell || computeGeocellForIncident(incident)
    }));
    
    // Update database with computed geocells
    for (const incident of incidentsWithGeocells) {
      if (!incident.geocell) continue;
      
      await db
        .update(unifiedIncidents)
        .set({ geocell: incident.geocell })
        .where(eq(unifiedIncidents.id, incident.id));
    }
    
    // Load into spatial lookup engine
    spatialLookup.loadIncidents(incidentsWithGeocells);
  }

  getSpatialCacheStats(): { size: number; maxSize: number; hitRate: number; hits: number; misses: number; totalRequests: number; } {
    return spatialLookup.getCacheStats();
  }

  // ============================================================================
  // INCIDENT SOCIAL INTERACTION METHODS - Comments and Likes
  // ============================================================================

  async getIncidentComments(incidentId: string, userId?: string): Promise<IncidentComment[]> {
    const result = await db
      .select()
      .from(incidentComments)
      .where(eq(incidentComments.incidentId, incidentId))
      .orderBy(desc(incidentComments.createdAt));
    
    // Get like information for all comments if user is provided
    const commentsWithLikes = await Promise.all(
      result.map(async (comment) => {
        const likeCount = await this.getCommentLikesCount(comment.id);
        const isLiked = userId ? await this.isCommentLikedByUser(comment.id, userId) : false;
        
        return {
          ...comment,
          likeCount,
          isLiked
        };
      })
    );
    
    // Organize comments into nested structure
    const comments = commentsWithLikes;
    const commentMap = new Map<string, IncidentComment & { replies?: IncidentComment[]; likeCount: number; isLiked: boolean }>();
    const topLevelComments: (IncidentComment & { replies?: IncidentComment[]; likeCount: number; isLiked: boolean })[] = [];
    
    // First, create a map of all comments
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });
    
    // Then, organize into tree structure
    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!;
      
      if (comment.parentCommentId) {
        // This is a reply - add it to parent's replies
        const parent = commentMap.get(comment.parentCommentId);
        if (parent) {
          parent.replies!.push(commentWithReplies);
        }
      } else {
        // This is a top-level comment
        topLevelComments.push(commentWithReplies);
      }
    });
    
    // Sort replies by creation time (oldest first for replies)
    const sortReplies = (comments: any[]) => {
      comments.forEach(comment => {
        if (comment.replies && comment.replies.length > 0) {
          comment.replies.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          sortReplies(comment.replies);
        }
      });
    };
    
    sortReplies(topLevelComments);
    
    return topLevelComments as IncidentComment[];
  }

  async getIncidentCommentsCount(incidentId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(incidentComments)
      .where(eq(incidentComments.incidentId, incidentId));
    return result[0]?.count || 0;
  }

  async getIncidentCommentById(id: string): Promise<IncidentComment | undefined> {
    const [comment] = await db
      .select()
      .from(incidentComments)
      .where(eq(incidentComments.id, id));
    return comment;
  }

  async createIncidentComment(comment: InsertIncidentComment): Promise<IncidentComment> {
    const [newComment] = await db
      .insert(incidentComments)
      .values(comment)
      .returning();
    return newComment;
  }

  async deleteIncidentComment(id: string, userId: string): Promise<boolean> {
    // Only allow users to delete their own comments
    const result = await db
      .delete(incidentComments)
      .where(and(eq(incidentComments.id, id), eq(incidentComments.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getIncidentLikes(incidentId: string): Promise<IncidentLike[]> {
    const result = await db
      .select()
      .from(incidentLikes)
      .where(eq(incidentLikes.incidentId, incidentId))
      .orderBy(desc(incidentLikes.createdAt));
    return result;
  }

  async getIncidentLikesCount(incidentId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(incidentLikes)
      .where(eq(incidentLikes.incidentId, incidentId));
    return result[0]?.count || 0;
  }

  async toggleIncidentLike(incidentId: string, userId: string): Promise<{ liked: boolean; count: number }> {
    // Check if user already liked this incident
    const [existingLike] = await db
      .select()
      .from(incidentLikes)
      .where(and(eq(incidentLikes.incidentId, incidentId), eq(incidentLikes.userId, userId)));

    if (existingLike) {
      // Remove the like
      await db
        .delete(incidentLikes)
        .where(and(eq(incidentLikes.incidentId, incidentId), eq(incidentLikes.userId, userId)));
      
      const count = await this.getIncidentLikesCount(incidentId);
      return { liked: false, count };
    } else {
      // Add the like
      await db
        .insert(incidentLikes)
        .values({ incidentId, userId });
      
      const count = await this.getIncidentLikesCount(incidentId);
      return { liked: true, count };
    }
  }

  async isIncidentLikedByUser(incidentId: string, userId: string): Promise<boolean> {
    const [existingLike] = await db
      .select()
      .from(incidentLikes)
      .where(and(eq(incidentLikes.incidentId, incidentId), eq(incidentLikes.userId, userId)));
    
    return !!existingLike;
  }

  // Comment likes methods
  async toggleCommentLike(commentId: string, userId: string): Promise<{ liked: boolean; count: number }> {
    // Check if user already liked this comment
    const [existingLike] = await db
      .select()
      .from(commentLikes)
      .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, userId)));

    if (existingLike) {
      // Remove the like
      await db
        .delete(commentLikes)
        .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, userId)));
      
      const count = await this.getCommentLikesCount(commentId);
      return { liked: false, count };
    } else {
      // Add the like
      await db
        .insert(commentLikes)
        .values({ commentId, userId });
      
      const count = await this.getCommentLikesCount(commentId);
      return { liked: true, count };
    }
  }

  async getCommentLikesCount(commentId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(commentLikes)
      .where(eq(commentLikes.commentId, commentId));
    
    return result[0]?.count || 0;
  }

  async isCommentLikedByUser(commentId: string, userId: string): Promise<boolean> {
    const [existingLike] = await db
      .select()
      .from(commentLikes)
      .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, userId)));
    
    return !!existingLike;
  }

}

export const storage = new DatabaseStorage();
