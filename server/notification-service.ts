/**
 * ============================================================================
 * NOTIFICATION SERVICE
 * ============================================================================
 * 
 * Centralized notification service for broadcasting push notifications
 * to eligible users based on their notification preferences.
 * 
 * Features:
 * - Notification delivery ledger to prevent duplicate notifications
 * - Support for new posts, updates, and backfill notifications
 * - Category and proximity filtering based on user preferences
 */

import webpush from "web-push";
import { storage } from "./storage";
import type { SelectPost, InsertNotificationDelivery } from "@shared/schema";

// Configure web push with VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

let webPushConfigured = false;

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(
      'mailto:notifications@communityconnect.com.au',
      vapidPublicKey,
      vapidPrivateKey
    );
    webPushConfigured = true;
    console.log('[NotificationService] Web push configured with VAPID keys');
  } catch (error) {
    console.error('[NotificationService] Failed to configure web push:', error);
  }
}

// Haversine distance calculation in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface PostNotificationData {
  id: string;
  title: string;
  categoryId: string | null;
  centroidLat: number | null;
  centroidLng: number | null;
  userId: string;
  source?: string;
}

type NotificationReason = "new_post" | "status_update" | "severity_update" | "backfill";

/**
 * Notification category mapping from short IDs to category UUIDs/sources
 * This maps user preference IDs to what the posts use
 */
const NOTIFICATION_CATEGORY_MAPPING: Record<string, { source?: string; categoryMatch?: string }> = {
  'tmr': { source: 'tmr' },           // TMR Traffic alerts
  'emergency': { source: 'emergency' }, // QFES Emergency alerts
  'safety': { categoryMatch: 'safety' },
  'community': { categoryMatch: 'community' },
  'pets': { categoryMatch: 'pets' },
  'lostfound': { categoryMatch: 'lostfound' },
};

/**
 * Check if a post matches user's notification category preferences
 */
function matchesUserCategories(
  userCategories: string[],
  postSource: string | undefined,
  postCategoryId: string | null
): boolean {
  // If user has no category preferences, they want all notifications
  if (userCategories.length === 0) {
    return true;
  }
  
  // Check each user category preference
  for (const userCat of userCategories) {
    const mapping = NOTIFICATION_CATEGORY_MAPPING[userCat];
    
    if (mapping?.source && postSource === mapping.source) {
      // Match by source (e.g., 'tmr' or 'emergency')
      return true;
    }
    
    // For now, if user has 'tmr' preference, match TMR posts
    if (userCat === 'tmr' && postSource === 'tmr') {
      return true;
    }
    
    // For 'emergency' preference, match QFES posts
    if (userCat === 'emergency' && postSource === 'emergency') {
      return true;
    }
    
    // For community posts (source is 'user' or undefined), check if user wants community alerts
    if ((!postSource || postSource === 'user') && 
        ['safety', 'community', 'pets', 'lostfound'].includes(userCat)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get eligible users for a post based on their notification preferences
 * Requires both post and user to have valid coordinates for proximity filtering
 */
async function getEligibleUsersForPost(
  post: PostNotificationData
): Promise<string[]> {
  // Skip posts without valid coordinates - can't do proximity matching
  if (!post.centroidLat || !post.centroidLng) {
    console.log(`[NotificationService] Skipping notification - post ${post.id} has no coordinates`);
    return [];
  }

  const allUsers = await storage.getAllUsers();
  const eligibleUsers: string[] = [];

  for (const user of allUsers) {
    // Skip the post creator
    if (user.id === post.userId) continue;
    
    // Skip users with notifications disabled
    if (user.notificationsEnabled === false) continue;
    
    // Skip users without valid location - can't do proximity matching
    if (!user.preferredLocationLat || !user.preferredLocationLng) continue;
    
    // Check category preference - if user has selected specific categories, filter by them
    const userCategories = (user.notificationCategories as string[]) || [];
    
    // Check if this post matches the user's category preferences
    if (!matchesUserCategories(userCategories, post.source, post.categoryId)) {
      continue;
    }
    
    // Check proximity preference - both post and user have valid coordinates at this point
    const radiusStr = user.notificationRadius || '10km';
    const radiusKm = parseInt(radiusStr.replace('km', ''));
    const distance = calculateDistanceKm(
      user.preferredLocationLat,
      user.preferredLocationLng,
      post.centroidLat,
      post.centroidLng
    );
    
    if (distance > radiusKm) continue;
    
    eligibleUsers.push(user.id);
  }

  return eligibleUsers;
}

/**
 * Send notifications to users who haven't been notified for this post yet
 */
async function sendNotificationsToUsers(
  post: PostNotificationData,
  posterName: string,
  userIds: string[],
  reason: NotificationReason
): Promise<{ inAppCount: number; pushCount: number }> {
  if (userIds.length === 0) {
    return { inAppCount: 0, pushCount: 0 };
  }

  // Filter out users who have already been notified for this post
  const usersToNotify = await storage.getUsersNotNotifiedForPost(post.id, userIds);
  
  if (usersToNotify.length === 0) {
    console.log(`[NotificationService] All ${userIds.length} eligible users already notified for post ${post.id}`);
    return { inAppCount: 0, pushCount: 0 };
  }

  // Determine notification title based on reason and source
  const getNotificationTitle = () => {
    if (reason === 'status_update') {
      return post.source === 'tmr' ? 'Traffic Update' : 
             post.source === 'emergency' ? 'Emergency Update' : 
             'Post Updated';
    }
    return post.source === 'tmr' ? 'Traffic Alert' : 
           post.source === 'emergency' ? 'Emergency Alert' : 
           'New Post Nearby';
  };

  const notificationTitle = getNotificationTitle();
  let inAppCount = 0;
  let pushCount = 0;

  // Create in-app notifications for eligible users
  for (const userId of usersToNotify) {
    try {
      await storage.createNotification({
        userId,
        type: reason === 'new_post' ? 'new_post' : 'post_update',
        title: notificationTitle,
        message: `${posterName}: ${post.title}`,
        entityId: post.id,
        entityType: 'post',
        fromUserId: post.userId,
      });
      
      // Record delivery in ledger
      await storage.recordNotificationDelivery({
        userId,
        postId: post.id,
        reason,
        pushSent: false,
      });
      
      inAppCount++;
    } catch (err) {
      console.error(`[NotificationService] Failed to create in-app notification for user ${userId}:`, err);
    }
  }

  // Send actual push notifications to users with subscriptions
  if (webPushConfigured) {
    const subscriptions = await storage.getPushSubscriptionsForUsers(usersToNotify);
    
    if (subscriptions.length > 0) {
      const notificationPayload = JSON.stringify({
        title: notificationTitle,
        body: `${posterName}: ${post.title}`,
        tag: `post-${post.id}`,
        url: `/feed?highlight=${post.id}`,
        incidentId: post.id,
      });
      
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            notificationPayload
          );
          pushCount++;
        } catch (pushError: any) {
          // If subscription is invalid (410 Gone or 404), remove it
          if (pushError.statusCode === 410 || pushError.statusCode === 404) {
            console.log(`[NotificationService] Removing invalid push subscription for user ${sub.userId}`);
            await storage.removePushSubscription(sub.endpoint);
          } else {
            console.error(`[NotificationService] Push notification failed for user ${sub.userId}:`, pushError.message);
          }
        }
      }
    }
  }

  return { inAppCount, pushCount };
}

/**
 * Broadcast notifications to eligible users when a new post is created.
 * Checks user notification preferences for categories and proximity.
 * Uses ledger to prevent duplicate notifications.
 */
export async function broadcastPostNotifications(
  post: PostNotificationData,
  posterName: string,
  reason: NotificationReason = 'new_post'
): Promise<void> {
  try {
    console.log(`[NotificationService] Processing ${reason} notifications for post ${post.id} (source: ${post.source || 'user'})`);
    
    // Get all eligible users based on preferences
    const eligibleUsers = await getEligibleUsersForPost(post);

    if (eligibleUsers.length === 0) {
      console.log(`[NotificationService] No eligible users for post ${post.id} (${post.source || 'user'})`);
      return;
    }

    // Send notifications (ledger check happens inside)
    const { inAppCount, pushCount } = await sendNotificationsToUsers(
      post,
      posterName,
      eligibleUsers,
      reason
    );

    if (inAppCount > 0 || pushCount > 0) {
      console.log(`[NotificationService] Sent ${reason} notifications: ${inAppCount} in-app, ${pushCount} push for post ${post.id}`);
    }
  } catch (error) {
    console.error('[NotificationService] Error broadcasting post notifications:', error);
    // Don't throw - notification failure shouldn't block post creation
  }
}

/**
 * Broadcast notifications for a post update (status change, severity change, etc.)
 * Only notifies users who haven't been notified about this post yet.
 */
export async function broadcastPostUpdateNotifications(
  post: PostNotificationData,
  posterName: string,
  updateType: 'status_update' | 'severity_update' = 'status_update'
): Promise<void> {
  await broadcastPostNotifications(post, posterName, updateType);
}

/**
 * Backfill notifications for a user who just enabled notifications or changed their location.
 * Notifies them about relevant active posts they haven't seen yet.
 */
export async function backfillNotificationsForUser(
  userId: string,
  lat: number,
  lng: number,
  radiusKm: number,
  maxAgeHours: number = 24
): Promise<number> {
  try {
    console.log(`[NotificationService] Backfilling notifications for user ${userId} (${radiusKm}km radius)`);
    
    // Get recent active posts in the user's area
    const nearbyPosts = await storage.getRecentActivePostsInRadius(lat, lng, radiusKm, maxAgeHours);
    
    if (nearbyPosts.length === 0) {
      console.log(`[NotificationService] No recent posts found for backfill`);
      return 0;
    }
    
    // Get user's notification preferences
    const user = await storage.getUser(userId);
    if (!user || user.notificationsEnabled === false) {
      return 0;
    }
    
    const userCategories = (user.notificationCategories as string[]) || [];
    let backfillCount = 0;
    
    for (const post of nearbyPosts) {
      // Skip user's own posts
      if (post.userId === userId) continue;
      
      // Check if post matches user's category preferences
      if (!matchesUserCategories(userCategories, post.source || undefined, post.categoryId)) {
        continue;
      }
      
      // Check if user has already been notified
      const alreadyNotified = await storage.hasUserBeenNotifiedForPost(userId, post.id);
      if (alreadyNotified) continue;
      
      // Get poster name
      const posterName = await getPosterName(post.userId);
      
      // Create in-app notification
      try {
        await storage.createNotification({
          userId,
          type: 'backfill',
          title: post.source === 'tmr' ? 'Active Traffic Alert' :
                 post.source === 'emergency' ? 'Active Emergency' :
                 'Active Post Nearby',
          message: `${posterName}: ${post.title}`,
          entityId: post.id,
          entityType: 'post',
          fromUserId: post.userId,
        });
        
        // Record in ledger
        await storage.recordNotificationDelivery({
          userId,
          postId: post.id,
          reason: 'backfill',
          pushSent: false,
        });
        
        backfillCount++;
      } catch (err) {
        console.error(`[NotificationService] Failed to create backfill notification:`, err);
      }
    }
    
    if (backfillCount > 0) {
      console.log(`[NotificationService] Backfilled ${backfillCount} notifications for user ${userId}`);
    }
    
    return backfillCount;
  } catch (error) {
    console.error('[NotificationService] Error backfilling notifications:', error);
    return 0;
  }
}

/**
 * Get the poster name for a given user ID
 */
export async function getPosterName(userId: string): Promise<string> {
  try {
    const user = await storage.getUser(userId);
    if (user) {
      return user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Anonymous';
    }
    return 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
}
