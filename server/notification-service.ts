/**
 * ============================================================================
 * NOTIFICATION SERVICE
 * ============================================================================
 * 
 * Centralized notification service for broadcasting push notifications
 * to eligible users based on their notification preferences.
 */

import webpush from "web-push";
import { storage } from "./storage";
import type { SelectPost } from "@shared/schema";

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
 * Broadcast notifications to eligible users when a new post is created.
 * Checks user notification preferences for categories and proximity.
 */
export async function broadcastPostNotifications(
  post: PostNotificationData,
  posterName: string
): Promise<void> {
  if (!webPushConfigured) {
    console.log('[NotificationService] Web push not configured, skipping push notifications');
    return;
  }

  try {
    console.log(`[NotificationService] Processing notifications for post ${post.id} (source: ${post.source || 'user'})`);
    
    // Get all users with notifications enabled
    const allUsers = await storage.getAllUsers();
    const eligibleUsers: string[] = [];

    for (const user of allUsers) {
      // Skip the post creator
      if (user.id === post.userId) continue;
      
      // Skip users with notifications disabled
      if (user.notificationsEnabled === false) continue;
      
      // Check category preference - if user has selected specific categories, filter by them
      const userCategories = (user.notificationCategories as string[]) || [];
      
      // Check if this post matches the user's category preferences
      if (!matchesUserCategories(userCategories, post.source, post.categoryId)) {
        continue;
      }
      
      // Check proximity preference
      if (post.centroidLat && post.centroidLng && user.preferredLocationLat && user.preferredLocationLng) {
        const radiusStr = user.notificationRadius || '10km';
        const radiusKm = parseInt(radiusStr.replace('km', ''));
        const distance = calculateDistanceKm(
          user.preferredLocationLat,
          user.preferredLocationLng,
          post.centroidLat,
          post.centroidLng
        );
        
        if (distance > radiusKm) continue;
      }
      
      eligibleUsers.push(user.id);
    }

    if (eligibleUsers.length === 0) {
      console.log(`[NotificationService] No eligible users for post ${post.id} (${post.source || 'user'})`);
      return;
    }

    // Create in-app notifications for eligible users
    for (const userId of eligibleUsers) {
      try {
        await storage.createNotification({
          userId,
          type: 'new_post',
          title: 'New Post Nearby',
          message: `${posterName} posted: ${post.title}`,
          entityId: post.id,
          entityType: 'post',
          fromUserId: post.userId,
        });
      } catch (err) {
        console.error(`[NotificationService] Failed to create in-app notification for user ${userId}:`, err);
      }
    }

    // Send actual push notifications to users with subscriptions
    const subscriptions = await storage.getPushSubscriptionsForUsers(eligibleUsers);
    
    if (subscriptions.length === 0) {
      console.log(`[NotificationService] No push subscriptions for ${eligibleUsers.length} eligible users`);
      return;
    }
    
    const notificationPayload = JSON.stringify({
      title: post.source === 'tmr' ? 'Traffic Alert' : 
             post.source === 'emergency' ? 'Emergency Alert' : 
             'New Post Nearby',
      body: `${posterName}: ${post.title}`,
      tag: `post-${post.id}`,
      url: `/feed?highlight=${post.id}`,
      incidentId: post.id,
    });
    
    let pushSuccessCount = 0;
    let pushFailCount = 0;
    
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
        pushSuccessCount++;
      } catch (pushError: any) {
        pushFailCount++;
        // If subscription is invalid (410 Gone or 404), remove it
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          console.log(`[NotificationService] Removing invalid push subscription for user ${sub.userId}`);
          await storage.removePushSubscription(sub.endpoint);
        } else {
          console.error(`[NotificationService] Push notification failed for user ${sub.userId}:`, pushError.message);
        }
      }
    }
    
    if (pushSuccessCount > 0 || pushFailCount > 0) {
      console.log(`[NotificationService] 📱 Push notifications for ${post.source || 'user'} post: ${pushSuccessCount} sent, ${pushFailCount} failed`);
    }

    console.log(`[NotificationService] 📢 Sent notifications to ${eligibleUsers.length} users for post ${post.id} (${post.source || 'user'})`);
  } catch (error) {
    console.error('[NotificationService] Error broadcasting post notifications:', error);
    // Don't throw - notification failure shouldn't block post creation
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
