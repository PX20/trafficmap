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
  pushSubscriptions,
  notificationDeliveries,
  categories,
  subcategories,
  incidentFollowUps,
  reports,
  feedback,
  postReactions,
  savedPosts,
  stories,
  storyViews,
  userBadges,
  posts,
  stagingEvents,
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
  type Feedback,
  type InsertFeedback,
  type InsertReport,
  type AdCampaign,
  type InsertAdCampaign,
  type AdView,
  type InsertAdView,
  type AdClick,
  type InsertAdClick,
  type PostReaction,
  type SavedPost,
  type Story,
  type StoryView,
  type UserBadge,
  type SelectPost,
  type InsertPost,
  type SelectStagingEvent,
  type InsertStagingEvent,
  type DataSource,
  type IngestDTO,
  type InsertNotificationDelivery,
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
  resolveAttribution,
  SYSTEM_USER_IDS,
  incidentComments,
  type IncidentComment,
  type InsertIncidentComment,
  type UnifiedIncidentsResponse,
  generateUnifiedIncidentId,
  prepareUnifiedIncidentForInsert,
  type SafeUser,
  discountCodes,
  discountRedemptions,
  type DiscountCode,
  type InsertDiscountCode,
  type DiscountRedemption,
  type InsertDiscountRedemption
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ne, sql, inArray, gte, lte } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { spatialLookup, computeGeocellForIncident, type SpatialQuery, type SpatialQueryResult } from "./spatial-lookup";

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
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
  // POSTS OPERATIONS - Single source of truth for community posts
  // ============================================================================
  
  // Post CRUD
  getAllPosts(): Promise<SelectPost[]>;
  getPost(id: string): Promise<SelectPost | undefined>;
  getPostsByUser(userId: string): Promise<SelectPost[]>;
  getPostsByCategory(categoryId: string): Promise<SelectPost[]>;
  createPost(post: InsertPost): Promise<SelectPost>;
  updatePost(id: string, post: Partial<SelectPost>): Promise<SelectPost | undefined>;
  deletePost(id: string): Promise<boolean>;
  
  // Spatial queries for posts
  getPostsInArea(southWest: [number, number], northEast: [number, number]): Promise<SelectPost[]>;
  getActivePosts(): Promise<SelectPost[]>;
  
  // GeoJSON for map display
  getPostsAsGeoJSON(): Promise<{ type: 'FeatureCollection'; features: any[] }>;
  
  // ============================================================================
  // UNIFIED INCIDENT OPERATIONS - LEGACY (use Posts instead)
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
  
  // Push subscription operations
  savePushSubscription(subscription: { userId: string; endpoint: string; p256dh: string; auth: string }): Promise<void>;
  removePushSubscription(endpoint: string): Promise<void>;
  getPushSubscriptionsForUsers(userIds: string[]): Promise<Array<{ userId: string; endpoint: string; p256dh: string; auth: string }>>;
  
  // Notification delivery ledger operations
  hasUserBeenNotifiedForPost(userId: string, postId: string): Promise<boolean>;
  recordNotificationDelivery(delivery: InsertNotificationDelivery): Promise<void>;
  getUsersNotNotifiedForPost(postId: string, userIds: string[]): Promise<string[]>;
  getRecentActivePostsInRadius(lat: number, lng: number, radiusKm: number, maxAgeHours?: number): Promise<SelectPost[]>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  getSubcategories(categoryId?: string): Promise<Subcategory[]>;
  getSubcategory(id: string): Promise<Subcategory | undefined>;
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
  
  // ============================================================================
  // STAGING OPERATIONS - Multi-source data ingestion
  // ============================================================================
  
  // Source-specific post queries
  getPostsBySource(source: DataSource): Promise<SelectPost[]>;
  getPostBySourceId(source: DataSource, sourceId: string): Promise<SelectPost | undefined>;
  upsertPostFromSource(source: DataSource, sourceId: string, post: Omit<InsertPost, 'source' | 'sourceId'>): Promise<SelectPost>;
  
  // Staging table operations
  upsertStagingEvent(event: InsertStagingEvent): Promise<SelectStagingEvent>;
  getStagingEventsBySource(source: DataSource): Promise<SelectStagingEvent[]>;
  getUnsyncedStagingEvents(source?: DataSource): Promise<SelectStagingEvent[]>;
  markStagingEventSynced(id: string, postId?: string): Promise<void>;
  markStagingEventError(id: string, error: string): Promise<void>;
  cleanupOldStagingEvents(olderThanDays: number): Promise<number>;
  
  // ============================================================================
  // DISCOUNT CODE OPERATIONS - Admin-managed promotional codes
  // ============================================================================
  
  // Discount code management (admin)
  createDiscountCode(code: InsertDiscountCode): Promise<DiscountCode>;
  getDiscountCode(id: string): Promise<DiscountCode | undefined>;
  getDiscountCodeByCode(code: string): Promise<DiscountCode | undefined>;
  getAllDiscountCodes(): Promise<DiscountCode[]>;
  updateDiscountCode(id: string, updates: Partial<DiscountCode>): Promise<DiscountCode | undefined>;
  deactivateDiscountCode(id: string): Promise<boolean>;
  
  // Discount redemption (business)
  validateDiscountCode(code: string, businessId: string): Promise<{ valid: boolean; error?: string; discountCode?: DiscountCode }>;
  redeemDiscountCode(codeId: string, businessId: string, campaignId?: string): Promise<DiscountRedemption>;
  getBusinessRedemptions(businessId: string): Promise<DiscountRedemption[]>;
  getRedemptionCount(codeId: string): Promise<number>;
  getBusinessRedemptionCount(codeId: string, businessId: string): Promise<number>;
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
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
      preferredLocation: 'Caloundra',
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
      preferredLocation: 'Brisbane',
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

  async updateUserSuburb(id: string, preferredLocation: string): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ preferredLocation, updatedAt: new Date() })
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
  // POSTS OPERATIONS - Single source of truth for community posts
  // ============================================================================

  async getAllPosts(): Promise<SelectPost[]> {
    return await db.select().from(posts).orderBy(desc(posts.createdAt));
  }

  async getPost(id: string): Promise<SelectPost | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async getPostsByUser(userId: string): Promise<SelectPost[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt));
  }

  async getPostsByCategory(categoryId: string): Promise<SelectPost[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.categoryId, categoryId))
      .orderBy(desc(posts.createdAt));
  }

  async createPost(post: InsertPost): Promise<SelectPost> {
    const [newPost] = await db
      .insert(posts)
      .values({
        ...post,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newPost;
  }

  async updatePost(id: string, post: Partial<SelectPost>): Promise<SelectPost | undefined> {
    const [updated] = await db
      .update(posts)
      .set({ ...post, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    return updated;
  }

  async deletePost(id: string): Promise<boolean> {
    const result = await db.delete(posts).where(eq(posts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getPostsInArea(southWest: [number, number], northEast: [number, number]): Promise<SelectPost[]> {
    const [swLat, swLng] = southWest;
    const [neLat, neLng] = northEast;
    
    return await db
      .select()
      .from(posts)
      .where(
        and(
          sql`${posts.centroidLat} >= ${swLat}`,
          sql`${posts.centroidLat} <= ${neLat}`,
          sql`${posts.centroidLng} >= ${swLng}`,
          sql`${posts.centroidLng} <= ${neLng}`
        )
      )
      .orderBy(desc(posts.createdAt));
  }

  async getActivePosts(): Promise<SelectPost[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.status, 'active'))
      .orderBy(desc(posts.createdAt));
  }

  async getPostsAsGeoJSON(): Promise<{ type: 'FeatureCollection'; features: any[] }> {
    const allPosts = await this.getAllPosts();
    
    // Get category info for all posts
    const categoryIds = Array.from(new Set(allPosts.filter(p => p.categoryId).map(p => p.categoryId!)));
    const subcategoryIds = Array.from(new Set(allPosts.filter(p => p.subcategoryId).map(p => p.subcategoryId!)));
    
    const categoryMap = new Map<string, { name: string; icon?: string; color?: string }>();
    const subcategoryMap = new Map<string, { name: string }>();
    
    if (categoryIds.length > 0) {
      const cats = await db.select().from(categories).where(inArray(categories.id, categoryIds));
      cats.forEach(c => categoryMap.set(c.id, { name: c.name, icon: c.icon ?? undefined, color: c.color ?? undefined }));
    }
    
    if (subcategoryIds.length > 0) {
      const subs = await db.select().from(subcategories).where(inArray(subcategories.id, subcategoryIds));
      subs.forEach(s => subcategoryMap.set(s.id, { name: s.name }));
    }
    
    // Get user info for attribution
    const userIds = Array.from(new Set(allPosts.map(p => p.userId)));
    const userMap = new Map<string, { firstName?: string | null; lastName?: string | null; displayName?: string | null; profileImageUrl?: string | null }>();
    
    if (userIds.length > 0) {
      const usersData = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        displayName: users.displayName,
        profileImageUrl: users.profileImageUrl
      }).from(users).where(inArray(users.id, userIds));
      usersData.forEach(u => userMap.set(u.id, u));
    }
    
    const features = allPosts.map(post => {
      const cat = post.categoryId ? categoryMap.get(post.categoryId) : null;
      const subcat = post.subcategoryId ? subcategoryMap.get(post.subcategoryId) : null;
      const user = userMap.get(post.userId);
      
      // Determine source - check post.source column first, then properties fallback
      const postProps = post.properties as any || {};
      const source = post.source || postProps.source || 'user';
      const isUserReported = source === 'user';
      
      return {
        type: 'Feature' as const,
        id: post.id,
        source: source,
        geometry: post.geometry || (post.centroidLat && post.centroidLng ? {
          type: 'Point',
          coordinates: [post.centroidLng, post.centroidLat]
        } : null),
        properties: {
          id: post.id,
          title: post.title,
          description: post.description,
          location: post.location,
          photoUrl: post.photoUrl,
          category: cat?.name || 'General',
          categoryId: post.categoryId,
          categoryUuid: post.categoryId,
          categoryIcon: cat?.icon,
          categoryColor: cat?.color,
          subcategory: subcat?.name,
          subcategoryId: post.subcategoryId,
          status: post.status,
          userId: post.userId,
          userName: user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Anonymous',
          reporterName: user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Anonymous',
          userAvatar: user?.profileImageUrl || null,
          reporterAvatar: user?.profileImageUrl || null,
          reactionsCount: post.reactionsCount || 0,
          commentsCount: post.commentsCount || 0,
          createdAt: post.createdAt?.toISOString(),
          updatedAt: post.updatedAt?.toISOString(),
          centroidLat: post.centroidLat,
          centroidLng: post.centroidLng,
          source: source,
          userReported: isUserReported,
          iconType: postProps.iconType || undefined,
          ...postProps,
        }
      };
    });
    
    return {
      type: 'FeatureCollection',
      features
    };
  }

  // ============================================================================
  // UNIFIED INCIDENT OPERATIONS - LEGACY (use Posts instead)
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
    // ATTRIBUTION ENFORCEMENT: Ensure all incidents have valid user attribution
    const props = incident.properties as any || {};
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
    const [newIncident] = await db
      .insert(unifiedIncidents)
      .values({
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
        userId: attribution.userId, // Override with resolved attribution
        properties: {
          ...((incident.properties as any) || {}),
          reporterId: attribution.reporterId, // Ensure reporterId in properties
          source: incident.source,
          userReported: !attribution.isSystemAccount
        },
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
    // ATTRIBUTION ENFORCEMENT: Ensure all incidents have valid user attribution
    const props = incident.properties as any || {};
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
      // First check if an incident with this ID already exists
      const [existing] = await db
        .select()
        .from(unifiedIncidents)
        .where(eq(unifiedIncidents.id, id))
        .limit(1);

      // DEDUPLICATION RULE: Prefer emergency/tmr incidents over user reports
      if (existing && existing.source !== 'user' && source === 'user') {
        return existing;
      }

      // CHANGE DETECTION: Skip update if data hasn't changed (reduces DB writes by ~90%)
      if (existing) {
        const hasChanged = 
          existing.title !== incident.title ||
          existing.description !== incident.description ||
          existing.status !== incident.status ||
          existing.severity !== incident.severity ||
          JSON.stringify(existing.geometry) !== JSON.stringify(incident.geometry);
        
        if (!hasChanged) {
          return existing; // No changes, skip DB write
        }
      }

      const [upserted] = await db
        .insert(unifiedIncidents)
        .values({
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
          properties: {
            ...((incident.properties as any) || {}),
            reporterId: attribution.reporterId,
            source: source,
            userReported: !attribution.isSystemAccount
          },
          lastUpdated: new Date(),
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: unifiedIncidents.id,
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
            properties: {
              ...((incident.properties as any) || {}),
              reporterId: attribution.reporterId,
              source: source,
              userReported: !attribution.isSystemAccount
            },
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

  // Helper method to map category names to UUIDs for frontend icon matching
  private getCategoryUuid(categoryName: string): string | undefined {
    const categoryMap: Record<string, string> = {
      'Safety & Crime': '792759f4-1b98-4665-b14c-44a54e9969e9',
      'Infrastructure & Hazards': '9b1d58d9-cfd1-4c31-93e9-754276a5f265',
      'Emergency Situations': '54d31da5-fc10-4ad2-8eca-04bac680e668',
      'Wildlife & Nature': 'd03f47a9-10fb-4656-ae73-92e959d7566a',
      'Community Issues': 'deaca906-3561-4f80-b79f-ed99561c3b04',
      'Pets': '4ea3a6f0-c49e-4baf-9ca5-f074ca2811b0',
      'Lost & Found': 'd1dfcd4e-48e9-4e58-9476-4782a2a132f3'
    };
    
    return categoryMap[categoryName];
  }

  // Helper method for GeoJSON conversion
  private convertIncidentsToGeoJSON(incidents: SelectUnifiedIncident[]): UnifiedIncidentsResponse {
    const features: UnifiedFeature[] = incidents.map(incident => {
      // Use database category_uuid field first, then fall back to name mapping
      const categoryUuid = incident.categoryUuid || this.getCategoryUuid(incident.category);
      const subcategoryUuid = incident.subcategoryUuid || undefined;
      
      return {
        type: "Feature",
        id: incident.id,
        source: incident.source, // CRITICAL: Expose source at top level for isUserReport() function
        userId: incident.userId, // CRITICAL: Expose userId at top level for getReporterUserId() function
        photoUrl: incident.photoUrl, // CRITICAL: Expose photoUrl at top level for display in modals
        subcategory: incident.subcategory, // CRITICAL: Expose subcategory at top level for icon mapping
        properties: {
          id: incident.id,
          source: incident.source,
          title: incident.title,
          description: incident.description || undefined,
          category: incident.category,
          categoryUuid: categoryUuid || incident.category, // CRITICAL: Include UUID for frontend icon matching (camelCase)
          subcategory: incident.subcategory || undefined,
          subcategoryUuid: subcategoryUuid, // CRITICAL: Include subcategory UUID for frontend (camelCase)
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
          // CRITICAL: Extract reporterId from JSONB properties for user attribution - fixed to use userId directly
          reporterId: incident.userId || (incident.properties as any)?.reporterId || undefined,
          // CRITICAL: Extract userReported flag from JSONB properties for proper classification
          userReported: (incident.properties as any)?.userReported || undefined,
          // CRITICAL: Extract categoryId and subcategoryId from properties for icon mapping (backwards compat)
          categoryId: categoryUuid || (incident.properties as any)?.categoryId || (incident.properties as any)?.category || undefined,
          subcategoryId: subcategoryUuid || (incident.properties as any)?.subcategoryId || (incident.properties as any)?.subcategory || undefined,
          // CRITICAL: Extract QFES-specific fields for proper categorization display
          GroupedType: (incident.properties as any)?.GroupedType || undefined,
          Incident_Type: (incident.properties as any)?.Incident_Type || undefined,
          Jurisdiction: (incident.properties as any)?.Jurisdiction || undefined,
          Master_Incident_Number: (incident.properties as any)?.Master_Incident_Number || undefined,
          originalProperties: incident.properties,
        },
        geometry: incident.geometry as any,
      };
    });

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
    return await db.select().from(users).where(eq(users.preferredLocation, suburb));
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
  
  // Push subscription operations
  async savePushSubscription(subscription: { userId: string; endpoint: string; p256dh: string; auth: string }): Promise<void> {
    await db
      .insert(pushSubscriptions)
      .values(subscription)
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId: subscription.userId,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      });
  }
  
  async removePushSubscription(endpoint: string): Promise<void> {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
  }
  
  async getPushSubscriptionsForUsers(userIds: string[]): Promise<Array<{ userId: string; endpoint: string; p256dh: string; auth: string }>> {
    if (userIds.length === 0) return [];
    
    const subscriptions = await db
      .select({
        userId: pushSubscriptions.userId,
        endpoint: pushSubscriptions.endpoint,
        p256dh: pushSubscriptions.p256dh,
        auth: pushSubscriptions.auth,
      })
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.userId, userIds));
    
    return subscriptions;
  }
  
  // Notification delivery ledger operations
  async hasUserBeenNotifiedForPost(userId: string, postId: string): Promise<boolean> {
    const existing = await db
      .select({ id: notificationDeliveries.id })
      .from(notificationDeliveries)
      .where(
        and(
          eq(notificationDeliveries.userId, userId),
          eq(notificationDeliveries.postId, postId)
        )
      )
      .limit(1);
    return existing.length > 0;
  }
  
  async recordNotificationDelivery(delivery: InsertNotificationDelivery): Promise<void> {
    await db
      .insert(notificationDeliveries)
      .values({
        id: randomUUID(),
        userId: delivery.userId,
        postId: delivery.postId,
        reason: delivery.reason,
        pushSent: delivery.pushSent ?? false,
        deliveredAt: new Date(),
      })
      .onConflictDoNothing(); // Ignore if already exists
  }
  
  async getUsersNotNotifiedForPost(postId: string, userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    
    // Get users who have already been notified for this post
    const notified = await db
      .select({ userId: notificationDeliveries.userId })
      .from(notificationDeliveries)
      .where(
        and(
          eq(notificationDeliveries.postId, postId),
          inArray(notificationDeliveries.userId, userIds)
        )
      );
    
    const notifiedSet = new Set(notified.map(n => n.userId));
    return userIds.filter(id => !notifiedSet.has(id));
  }
  
  async getRecentActivePostsInRadius(lat: number, lng: number, radiusKm: number, maxAgeHours: number = 24): Promise<SelectPost[]> {
    // Calculate the bounding box for initial filtering (rough approximation)
    const latDelta = radiusKm / 111.0; // ~111km per degree latitude
    const lngDelta = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180));
    
    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;
    
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    const results = await db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.status, 'active'),
          gte(posts.createdAt, cutoffTime),
          gte(posts.centroidLat, minLat),
          lte(posts.centroidLat, maxLat),
          gte(posts.centroidLng, minLng),
          lte(posts.centroidLng, maxLng)
        )
      )
      .orderBy(desc(posts.createdAt));
    
    // Filter by actual distance (Haversine)
    return results.filter(post => {
      if (!post.centroidLat || !post.centroidLng) return false;
      const R = 6371; // Earth's radius in km
      const dLat = (post.centroidLat - lat) * Math.PI / 180;
      const dLon = (post.centroidLng - lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat * Math.PI / 180) * Math.cos(post.centroidLat * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      return distance <= radiusKm;
    });
  }
  
  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.order);
  }
  
  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    return category;
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
  
  async getSubcategory(id: string): Promise<Subcategory | undefined> {
    const [subcategory] = await db
      .select()
      .from(subcategories)
      .where(eq(subcategories.id, id));
    return subcategory;
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

  // ============================================================================
  // FEEDBACK - User suggestions and general feedback to admin
  // ============================================================================

  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [created] = await db
      .insert(feedback)
      .values(feedbackData)
      .returning();
    return created;
  }

  async getFeedback(status?: string): Promise<Feedback[]> {
    if (status) {
      return await db
        .select()
        .from(feedback)
        .where(eq(feedback.status, status))
        .orderBy(desc(feedback.createdAt));
    } else {
      return await db
        .select()
        .from(feedback)
        .orderBy(desc(feedback.createdAt));
    }
  }

  async updateFeedbackStatus(feedbackId: string, status: string, adminNotes?: string): Promise<Feedback | undefined> {
    const updateData: any = { status };
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    const [updated] = await db
      .update(feedback)
      .set(updateData)
      .where(eq(feedback.id, feedbackId))
      .returning();
    return updated;
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
      .select({
        id: incidentComments.id,
        content: incidentComments.content,
        createdAt: incidentComments.createdAt,
        updatedAt: incidentComments.updatedAt,
        userId: incidentComments.userId,
        incidentId: incidentComments.incidentId,
        parentCommentId: incidentComments.parentCommentId,
        photoUrl: incidentComments.photoUrl,
        photoUrls: incidentComments.photoUrls,
        user: {
          id: users.id,
          displayName: users.displayName,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl
        }
      })
      .from(incidentComments)
      .leftJoin(users, eq(incidentComments.userId, users.id))
      .where(eq(incidentComments.incidentId, incidentId))
      .orderBy(desc(incidentComments.createdAt));
    
    return result as IncidentComment[];
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

  // ============================================================================
  // POST REACTIONS - Facebook-style likes/reactions
  // ============================================================================

  async getPostReactions(incidentId: string): Promise<PostReaction[]> {
    const result = await db
      .select()
      .from(postReactions)
      .where(eq(postReactions.incidentId, incidentId));
    return result;
  }

  async addPostReaction(incidentId: string, userId: string, reactionType: string): Promise<PostReaction> {
    const existingReaction = await db
      .select()
      .from(postReactions)
      .where(and(
        eq(postReactions.incidentId, incidentId),
        eq(postReactions.userId, userId)
      ));

    if (existingReaction.length > 0) {
      const [updated] = await db
        .update(postReactions)
        .set({ reactionType: reactionType as any })
        .where(eq(postReactions.id, existingReaction[0].id))
        .returning();
      return updated;
    }

    const [newReaction] = await db
      .insert(postReactions)
      .values({
        incidentId,
        userId,
        reactionType: reactionType as any
      })
      .returning();
    return newReaction;
  }

  async removePostReaction(incidentId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(postReactions)
      .where(and(
        eq(postReactions.incidentId, incidentId),
        eq(postReactions.userId, userId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  // Get posts that a user has reacted to (for My Reactions feature)
  async getPostsUserReactedTo(userId: string): Promise<SelectPost[]> {
    const userReactions = await db
      .select({ incidentId: postReactions.incidentId })
      .from(postReactions)
      .where(eq(postReactions.userId, userId))
      .orderBy(desc(postReactions.createdAt));
    
    if (userReactions.length === 0) return [];
    
    const postIds = userReactions.map(r => r.incidentId);
    const result = await db
      .select()
      .from(posts)
      .where(inArray(posts.id, postIds))
      .orderBy(desc(posts.createdAt));
    return result;
  }

  // ============================================================================
  // SAVED POSTS - User bookmarks/saved posts
  // ============================================================================

  async getSavedPosts(userId: string): Promise<SelectPost[]> {
    const saved = await db
      .select({ postId: savedPosts.postId })
      .from(savedPosts)
      .where(eq(savedPosts.userId, userId))
      .orderBy(desc(savedPosts.createdAt));
    
    if (saved.length === 0) return [];
    
    const postIds = saved.map(s => s.postId);
    const result = await db
      .select()
      .from(posts)
      .where(inArray(posts.id, postIds))
      .orderBy(desc(posts.createdAt));
    return result;
  }

  async savePost(userId: string, postId: string): Promise<SavedPost> {
    const [saved] = await db
      .insert(savedPosts)
      .values({ userId, postId })
      .onConflictDoNothing()
      .returning();
    
    // If conflict (already saved), return the existing one
    if (!saved) {
      const [existing] = await db
        .select()
        .from(savedPosts)
        .where(and(
          eq(savedPosts.userId, userId),
          eq(savedPosts.postId, postId)
        ));
      return existing;
    }
    return saved;
  }

  async unsavePost(userId: string, postId: string): Promise<boolean> {
    const result = await db
      .delete(savedPosts)
      .where(and(
        eq(savedPosts.userId, userId),
        eq(savedPosts.postId, postId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  async isPostSaved(userId: string, postId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(savedPosts)
      .where(and(
        eq(savedPosts.userId, userId),
        eq(savedPosts.postId, postId)
      ));
    return result.length > 0;
  }

  // ============================================================================
  // STORIES - "Happening Now" time-limited posts
  // ============================================================================

  async getActiveStories(): Promise<Story[]> {
    const now = new Date();
    const result = await db
      .select()
      .from(stories)
      .where(sql`${stories.expiresAt} > ${now}`)
      .orderBy(desc(stories.createdAt));
    return result;
  }

  async createStory(storyData: {
    userId: string;
    content?: string;
    photoUrl?: string;
    location?: string;
    locationLat?: number;
    locationLng?: number;
    expiresAt: Date;
  }): Promise<Story> {
    const [newStory] = await db
      .insert(stories)
      .values(storyData)
      .returning();
    return newStory;
  }

  async hasViewedStory(storyId: string, userId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(storyViews)
      .where(and(
        eq(storyViews.storyId, storyId),
        eq(storyViews.userId, userId)
      ));
    return result.length > 0;
  }

  async markStoryViewed(storyId: string, userId: string): Promise<void> {
    const existing = await this.hasViewedStory(storyId, userId);
    if (existing) return;

    await db
      .insert(storyViews)
      .values({ storyId, userId })
      .onConflictDoNothing();

    await db
      .update(stories)
      .set({ viewCount: sql`${stories.viewCount} + 1` })
      .where(eq(stories.id, storyId));
  }

  // ============================================================================
  // STAGING OPERATIONS - Multi-source data ingestion
  // ============================================================================

  async getPostsBySource(source: DataSource): Promise<SelectPost[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.source, source))
      .orderBy(desc(posts.createdAt));
  }

  async getPostBySourceId(source: DataSource, sourceId: string): Promise<SelectPost | undefined> {
    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.source, source), eq(posts.sourceId, sourceId)));
    return post;
  }

  async upsertPostFromSource(
    source: DataSource, 
    sourceId: string, 
    postData: Omit<InsertPost, 'source' | 'sourceId'>
  ): Promise<SelectPost> {
    // Enforce sourceId presence for non-user sources
    if (source !== 'user' && !sourceId) {
      throw new Error(`sourceId is required for source '${source}'`);
    }
    
    // Use single-statement UPSERT to avoid race conditions
    // INSERT ... ON CONFLICT (source, source_id) DO UPDATE
    const [result] = await db
      .insert(posts)
      .values({
        ...postData,
        source,
        sourceId,
      })
      .onConflictDoUpdate({
        target: [posts.source, posts.sourceId],
        set: {
          title: postData.title,
          description: postData.description,
          location: postData.location,
          photoUrl: postData.photoUrl,
          categoryId: postData.categoryId,
          subcategoryId: postData.subcategoryId,
          geometry: postData.geometry,
          centroidLat: postData.centroidLat,
          centroidLng: postData.centroidLng,
          status: postData.status,
          properties: postData.properties,
          incidentTime: postData.incidentTime,
          expiresAt: postData.expiresAt,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async upsertStagingEvent(event: InsertStagingEvent): Promise<SelectStagingEvent> {
    const [result] = await db
      .insert(stagingEvents)
      .values(event)
      .onConflictDoUpdate({
        target: [stagingEvents.source, stagingEvents.sourceId],
        set: {
          title: event.title,
          description: event.description,
          location: event.location,
          categoryId: event.categoryId,
          subcategoryId: event.subcategoryId,
          geometry: event.geometry,
          centroidLat: event.centroidLat,
          centroidLng: event.centroidLng,
          status: event.status,
          severity: event.severity,
          incidentTime: event.incidentTime,
          expiresAt: event.expiresAt,
          rawData: event.rawData,
          properties: event.properties,
          updatedAt: new Date(),
          syncedToPostsAt: null, // Reset sync status on update
          syncError: null,
        },
      })
      .returning();
    return result;
  }

  async getStagingEventsBySource(source: DataSource): Promise<SelectStagingEvent[]> {
    return await db
      .select()
      .from(stagingEvents)
      .where(eq(stagingEvents.source, source as any))
      .orderBy(desc(stagingEvents.updatedAt));
  }

  async getUnsyncedStagingEvents(source?: DataSource): Promise<SelectStagingEvent[]> {
    const conditions = [sql`${stagingEvents.syncedToPostsAt} IS NULL`];
    
    if (source) {
      conditions.push(eq(stagingEvents.source, source as any));
    }
    
    return await db
      .select()
      .from(stagingEvents)
      .where(and(...conditions))
      .orderBy(stagingEvents.updatedAt);
  }

  async markStagingEventSynced(id: string, postId?: string): Promise<void> {
    await db
      .update(stagingEvents)
      .set({
        syncedToPostsAt: new Date(),
        syncError: null,
      })
      .where(eq(stagingEvents.id, id));
  }

  async markStagingEventError(id: string, error: string): Promise<void> {
    await db
      .update(stagingEvents)
      .set({
        syncError: error,
      })
      .where(eq(stagingEvents.id, id));
  }

  async cleanupOldStagingEvents(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const result = await db
      .delete(stagingEvents)
      .where(sql`${stagingEvents.createdAt} < ${cutoffDate}`);
    
    return result.rowCount ?? 0;
  }

  // ============================================================================
  // DISCOUNT CODE OPERATIONS - Admin-managed promotional codes
  // ============================================================================

  async createDiscountCode(codeData: InsertDiscountCode): Promise<DiscountCode> {
    const [code] = await db
      .insert(discountCodes)
      .values({
        ...codeData,
        code: codeData.code.toUpperCase().trim(),
      })
      .returning();
    return code;
  }

  async getDiscountCode(id: string): Promise<DiscountCode | undefined> {
    const [code] = await db
      .select()
      .from(discountCodes)
      .where(eq(discountCodes.id, id));
    return code;
  }

  async getDiscountCodeByCode(code: string): Promise<DiscountCode | undefined> {
    const [result] = await db
      .select()
      .from(discountCodes)
      .where(eq(discountCodes.code, code.toUpperCase().trim()));
    return result;
  }

  async getAllDiscountCodes(): Promise<DiscountCode[]> {
    return await db
      .select()
      .from(discountCodes)
      .orderBy(desc(discountCodes.createdAt));
  }

  async updateDiscountCode(id: string, updates: Partial<DiscountCode>): Promise<DiscountCode | undefined> {
    const [updated] = await db
      .update(discountCodes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(discountCodes.id, id))
      .returning();
    return updated;
  }

  async deactivateDiscountCode(id: string): Promise<boolean> {
    const result = await db
      .update(discountCodes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(discountCodes.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async validateDiscountCode(code: string, businessId: string): Promise<{ valid: boolean; error?: string; discountCode?: DiscountCode }> {
    // Find the discount code
    const discountCode = await this.getDiscountCodeByCode(code);
    
    if (!discountCode) {
      return { valid: false, error: "Invalid discount code" };
    }
    
    if (!discountCode.isActive) {
      return { valid: false, error: "This discount code is no longer active" };
    }
    
    // Check validity period
    const now = new Date();
    if (discountCode.validFrom && now < discountCode.validFrom) {
      return { valid: false, error: "This discount code is not yet valid" };
    }
    if (discountCode.validUntil && now > discountCode.validUntil) {
      return { valid: false, error: "This discount code has expired" };
    }
    
    // Check max redemptions
    if (discountCode.maxRedemptions !== null && discountCode.currentRedemptions >= discountCode.maxRedemptions) {
      return { valid: false, error: "This discount code has reached its maximum redemptions" };
    }
    
    // Check per-business limit
    if (discountCode.perBusinessLimit !== null) {
      const businessRedemptions = await this.getBusinessRedemptionCount(discountCode.id, businessId);
      if (businessRedemptions >= discountCode.perBusinessLimit) {
        return { valid: false, error: "You have already used this discount code the maximum number of times" };
      }
    }
    
    return { valid: true, discountCode };
  }

  async redeemDiscountCode(codeId: string, businessId: string, campaignId?: string): Promise<DiscountRedemption> {
    const discountCode = await this.getDiscountCode(codeId);
    if (!discountCode) {
      throw new Error("Discount code not found");
    }
    
    // Calculate period for free_month type
    let periodStart: Date | null = null;
    let periodEnd: Date | null = null;
    
    if (discountCode.discountType === "free_month" && discountCode.durationDays) {
      periodStart = new Date();
      periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + discountCode.durationDays);
    }
    
    // Create redemption record
    const [redemption] = await db
      .insert(discountRedemptions)
      .values({
        discountCodeId: codeId,
        businessId,
        campaignId: campaignId || null,
        discountType: discountCode.discountType,
        discountValue: discountCode.discountValue,
        status: "pending",
        periodStart,
        periodEnd,
      })
      .returning();
    
    // Increment redemption counter
    await db
      .update(discountCodes)
      .set({ 
        currentRedemptions: sql`${discountCodes.currentRedemptions} + 1`,
        updatedAt: new Date()
      })
      .where(eq(discountCodes.id, codeId));
    
    return redemption;
  }

  async getBusinessRedemptions(businessId: string): Promise<DiscountRedemption[]> {
    return await db
      .select()
      .from(discountRedemptions)
      .where(eq(discountRedemptions.businessId, businessId))
      .orderBy(desc(discountRedemptions.redeemedAt));
  }

  async getRedemptionCount(codeId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(discountRedemptions)
      .where(eq(discountRedemptions.discountCodeId, codeId));
    return result[0]?.count ?? 0;
  }

  async getBusinessRedemptionCount(codeId: string, businessId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(discountRedemptions)
      .where(
        and(
          eq(discountRedemptions.discountCodeId, codeId),
          eq(discountRedemptions.businessId, businessId)
        )
      );
    return result[0]?.count ?? 0;
  }

}

export const storage = new DatabaseStorage();
