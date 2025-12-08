import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { isAuthenticated, setupAuth as setupReplitAuth } from "./replitAuth";
import { initializeAgencyAccounts } from "./init-agency-accounts";
import { startTMRPostsIngestion } from "./tmr-posts-ingestion";
import { startQFESPostsIngestion } from "./qfes-posts-ingestion";
import { backfillNotificationsForUser } from "./notification-service";
import webpush from "web-push";
import Stripe from "stripe";
import { insertIncidentSchema, insertCommentSchema, insertConversationSchema, insertMessageSchema, insertNotificationSchema, insertIncidentCommentSchema, type SafeUser, categories, subcategories } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  ObjectStorageService,
  ObjectNotFoundError,
  objectStorageClient,
} from "./objectStorage";
import express from "express";
import path from "path";
import sharp from "sharp";
import fs from "fs";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { secureLogger, createSafeRequestInfo } from "./secure-logger";
import { fileTypeFromBuffer } from "file-type";
import { 
  findRegionBySuburb, 
  getRegionFromCoordinates, 
  isFeatureInRegion, 
  extractCoordinatesFromGeometry,
  isPointInPolygon,
  QLD_REGIONS,
} from "./region-utils";
import { computeGeocellForIncident } from "./spatial-lookup";


const API_BASE_URL = "https://api.qldtraffic.qld.gov.au";
const PUBLIC_API_KEY = "3e83add325cbb69ac4d8e5bf433d770b";

// Legacy cache structures removed - now using unified SWR dataCache system

// Legacy constants removed - unified pipeline handles all caching

// QLD Traffic API constants
const QLD_TRAFFIC_API_KEY = '3e83add325cbb69ac4d8e5bf433d770b';
const QLD_TRAFFIC_BASE_URL = 'https://api.qldtraffic.qld.gov.au/v2';
const QLD_EMERGENCY_API = 'https://services7.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/QLDEmergency_Incidents/FeatureServer/0/query';

// Legacy interfaces removed - unified pipeline uses its own caching

// Legacy cache removed - unified pipeline manages its own cache

// Legacy polling intervals removed - unified pipeline manages its own timing

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.log('Stripe integration disabled - STRIPE_SECRET_KEY not found');
}
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Configure web push - Generate VAPID keys for production
// For now, skip configuration to avoid startup errors
// In production, generate proper VAPID keys with: npx web-push generate-vapid-keys
try {
  // Only configure if proper VAPID keys are available
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  
  if (publicKey && privateKey && privateKey.length > 20) {
    webpush.setVapidDetails(
      'mailto:support@communityconnect.com.au',
      publicKey,
      privateKey
    );
    console.log('Web push configured with VAPID keys');
  } else {
    console.log('Web push: VAPID keys not configured - push notifications disabled');
  }
} catch (error) {
  console.log('Web push configuration skipped:', error instanceof Error ? error.message : 'Unknown error');
}

/**
 * Automatically seed categories and subcategories if they don't exist
 * This ensures production deployments have the necessary category data
 */
async function seedCategoriesIfNeeded() {
  try {
    console.log("🌱 Checking categories and subcategories...");
    
    // CRITICAL FIX: Get ALL categories from database (including inactive ones) to update them
    // Don't use storage.getCategories() because it filters isActive=true, hiding broken categories
    const existingCategories = await db.select().from(categories);
    const existingSubcategories = await storage.getSubcategories();
    
    console.log(`📊 Found ${existingCategories.length} categories (including inactive) and ${existingSubcategories.length} subcategories`);
    
    // Main categories with hierarchy
    const categoryData = [
      {
        name: "Safety & Crime",
        description: "Crime, violence, theft, and public safety concerns",
        icon: "shield",
        color: "#7c3aed", // purple
        order: 1,
        isActive: true,
        subcategories: [
          { name: "Violence & Threats", description: "Physical violence, threats, intimidation", order: 1 },
          { name: "Theft & Property Crime", description: "Theft, burglary, property damage", order: 2 },
          { name: "Suspicious Activity", description: "Unusual behavior or activities", order: 3 },
          { name: "Public Disturbances", description: "Noise, disruptions, antisocial behavior", order: 4 }
        ]
      },
      {
        name: "Infrastructure & Hazards",
        description: "Road hazards, utilities, and structural problems",
        icon: "construction",
        color: "#ea580c", // orange
        order: 2,
        isActive: true,
        subcategories: [
          { name: "Road Hazards", description: "Fallen trees, debris, potholes, dangerous conditions", order: 1 },
          { name: "Utility Issues", description: "Power lines, water leaks, gas problems", order: 2 },
          { name: "Building Problems", description: "Structural damage, unsafe buildings", order: 3 },
          { name: "Environmental Hazards", description: "Chemical spills, pollution, toxic materials", order: 4 }
        ]
      },
      {
        name: "Emergency Situations",
        description: "Active emergencies requiring immediate attention",
        icon: "siren",
        color: "#dc2626", // red
        order: 3,
        isActive: true,
        subcategories: [
          { name: "Fire & Smoke", description: "Fires, smoke, burning structures or vegetation", order: 1 },
          { name: "Medical Emergencies", description: "Medical incidents in public spaces", order: 2 },
          { name: "Natural Disasters", description: "Floods, storms, weather emergencies", order: 3 },
          { name: "Chemical/Hazmat", description: "Chemical spills, gas leaks, hazardous materials", order: 4 }
        ]
      },
      {
        name: "Wildlife & Nature",
        description: "Animal-related incidents and environmental concerns",
        icon: "leaf",
        color: "#16a34a", // green
        order: 4,
        isActive: true,
        subcategories: [
          { name: "Dangerous Animals", description: "Snakes, aggressive animals, pest control", order: 1 },
          { name: "Animal Welfare", description: "Injured or distressed animals", order: 2 },
          { name: "Environmental Issues", description: "Pollution, illegal dumping, habitat damage", order: 3 },
          { name: "Pest Problems", description: "Insect infestations, rodent problems", order: 4 }
        ]
      },
      {
        name: "Community Issues",
        description: "Local community concerns and quality of life issues",
        icon: "users",
        color: "#2563eb", // blue
        order: 5,
        isActive: true,
        subcategories: [
          { name: "Noise Complaints", description: "Excessive noise, loud parties, construction", order: 1 },
          { name: "Traffic Issues", description: "Dangerous driving, parking problems", order: 2 },
          { name: "Public Space Problems", description: "Park issues, playground damage", order: 3 },
          { name: "Events & Gatherings", description: "Large gatherings, street events", order: 4 }
        ]
      },
      {
        name: "Pets",
        description: "Pet-related incidents and concerns",
        icon: "heart",
        color: "#ec4899", // pink
        order: 6,
        isActive: true,
        subcategories: [
          { name: "Missing Pets", description: "Lost or missing cats, dogs, and other pets", order: 1 },
          { name: "Found Pets", description: "Found animals looking for their owners", order: 2 }
        ]
      },
      {
        name: "Lost & Found",
        description: "Lost and found personal items and belongings",
        icon: "search",
        color: "#f59e0b", // amber
        order: 7,
        isActive: true,
        subcategories: [
          { name: "Lost Items", description: "Lost keys, phones, wallets, jewelry, documents", order: 1 },
          { name: "Found Items", description: "Found personal belongings that need to be returned", order: 2 }
        ]
      }
    ];
    
    let createdCategories = 0;
    let createdSubcategories = 0;
    let skippedCategories = 0;
    let skippedSubcategories = 0;
    
    // Idempotent seeding: check and create each category/subcategory individually
    for (const catData of categoryData) {
      const { subcategories, ...categoryInfo } = catData;
      
      // Check if category already exists by name
      const existingCategory = existingCategories.find(cat => cat.name === categoryInfo.name);
      let categoryToUse;
      
      if (existingCategory) {
        categoryToUse = existingCategory;
        skippedCategories++;
        console.log(`✓ Category "${categoryInfo.name}" already exists`);
        
        // CRITICAL FIX: Update existing category if isActive is not true
        if (existingCategory.isActive !== true) {
          await db.update(categories)
            .set({ isActive: true })
            .where(eq(categories.id, existingCategory.id));
          console.log(`  ⚡ Updated "${categoryInfo.name}" to set isActive=true`);
        }
      } else {
        categoryToUse = await storage.createCategory(categoryInfo);
        createdCategories++;
        console.log(`+ Created category "${categoryInfo.name}"`);
      }
      
      // Check and create subcategories for this category
      for (const subData of subcategories) {
        const existingSubcategory = existingSubcategories.find(sub => 
          sub.categoryId === categoryToUse.id && sub.name === subData.name
        );
        
        if (existingSubcategory) {
          skippedSubcategories++;
          console.log(`✓ Subcategory "${subData.name}" already exists under "${categoryInfo.name}"`);
        } else {
          await storage.createSubcategory({
            ...subData,
            categoryId: categoryToUse.id
          });
          createdSubcategories++;
          console.log(`+ Created subcategory "${subData.name}" under "${categoryInfo.name}"`);
        }
      }
    }
    
    const totalCategories = createdCategories + skippedCategories;
    const totalSubcategories = createdSubcategories + skippedSubcategories;
    
    console.log(`✅ Seeding complete: ${createdCategories} new categories, ${createdSubcategories} new subcategories (${skippedCategories} categories and ${skippedSubcategories} subcategories already existed)`);
    
    return { 
      success: true, 
      message: `Seeding complete: ${createdCategories} new categories, ${createdSubcategories} new subcategories created`,
      created: { categories: createdCategories, subcategories: createdSubcategories },
      skipped: { categories: skippedCategories, subcategories: skippedSubcategories },
      total: { categories: totalCategories, subcategories: totalSubcategories }
    };
  } catch (error) {
    console.error("❌ Error seeding categories:", error);
    return { 
      success: false,
      error: "Failed to seed categories", 
      message: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

// Sunshine Coast suburbs for filtering
const SUNSHINE_COAST_SUBURBS = [
  'caloundra', 'mooloolaba', 'noosa', 'maroochydore', 'nambour', 'cooroy', 
  'tewantin', 'buderim', 'sippy downs', 'kawana', 'pelican waters', 
  'kings beach', 'moffat beach', 'dicky beach', 'currimundi', 'bokarina',
  'warana', 'wurtulla', 'landsborough', 'beerwah', 'glass house mountains'
];


function isSunshineCoastLocation(feature: any): boolean {
  const locality = feature.properties?.road_summary?.locality?.toLowerCase() || '';
  const roadName = feature.properties?.road_summary?.road_name?.toLowerCase() || '';
  const location = `${locality} ${roadName}`.toLowerCase();
  
  return SUNSHINE_COAST_SUBURBS.some(suburb => 
    location.includes(suburb) || locality.includes(suburb)
  );
}

// Legacy fetchWithRetry removed - unified pipeline handles retries


// Legacy circuit breaker functions removed - unified pipeline handles circuit breaking

// Legacy cache management functions removed - unified pipeline handles caching

// Rate limiting store for photo uploads
const photoUploadRateLimit = new Map();

// Security constants for image processing
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGE_DIMENSION = 1600; // pixels
const UPLOADS_PER_HOUR = 10; // Max uploads per user per hour

// Secure image validation middleware
async function validateSecureImage(buffer: Buffer, filename: string): Promise<{ isValid: boolean; error?: string; detectedType?: string }> {
  try {
    // Magic-byte validation using file-type
    const detectedType = await fileTypeFromBuffer(buffer);
    
    if (!detectedType) {
      return { isValid: false, error: 'Unable to detect file type from content' };
    }

    // Reject SVG files completely (XSS risk)
    if (detectedType.mime === 'image/svg+xml') {
      return { isValid: false, error: 'SVG files are not allowed for security reasons' };
    }

    // Only allow specific image types
    if (!ALLOWED_IMAGE_TYPES.includes(detectedType.mime)) {
      return { isValid: false, error: `File type ${detectedType.mime} is not allowed. Only JPEG, PNG, and WebP are supported.` };
    }

    // Validate file extension matches detected type
    const ext = filename.toLowerCase().split('.').pop();
    const expectedExts = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/webp': ['webp']
    };

    if (!expectedExts[detectedType.mime as keyof typeof expectedExts]?.includes(ext || '')) {
      return { isValid: false, error: 'File extension does not match detected file type' };
    }

    return { isValid: true, detectedType: detectedType.mime };
  } catch (error) {
    return { isValid: false, error: 'File validation failed: ' + (error instanceof Error ? error.message : 'Unknown error') };
  }
}

// Rate limiting check for photo uploads
function checkPhotoUploadRateLimit(userId: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const userKey = `upload_${userId}`;
  
  if (!photoUploadRateLimit.has(userKey)) {
    photoUploadRateLimit.set(userKey, { count: 1, resetTime: now + oneHour });
    return { allowed: true };
  }
  
  const userData = photoUploadRateLimit.get(userKey);
  
  // Reset if hour has passed
  if (now >= userData.resetTime) {
    photoUploadRateLimit.set(userKey, { count: 1, resetTime: now + oneHour });
    return { allowed: true };
  }
  
  // Check if limit exceeded
  if (userData.count >= UPLOADS_PER_HOUR) {
    return { allowed: false, resetTime: userData.resetTime };
  }
  
  // Increment count
  userData.count++;
  photoUploadRateLimit.set(userKey, userData);
  return { allowed: true };
}

// Secure image processing with Sharp
async function processSecureImage(buffer: Buffer, options: { quality?: number; format?: 'jpeg' | 'webp' | 'png'; maxDimension?: number } = {}) {
  const {
    quality = 85,
    format = 'jpeg',
    maxDimension = MAX_IMAGE_DIMENSION
  } = options;

  try {
    let processor = sharp(buffer)
      .rotate() // Auto-rotate based on EXIF
      .resize(maxDimension, maxDimension, { 
        fit: 'inside', 
        withoutEnlargement: true 
      }); // Remove metadata through format conversion

    // Apply format-specific processing
    if (format === 'jpeg') {
      processor = processor.jpeg({ 
        quality, 
        progressive: true,
        mozjpeg: true 
      });
    } else if (format === 'webp') {
      processor = processor.webp({ 
        quality,
        effort: 4 
      });
    } else if (format === 'png') {
      processor = processor.png({ 
        quality,
        compressionLevel: 6 
      });
    }

    return await processor.toBuffer();
  } catch (error) {
    throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate image variants (thumbnail, medium, full)
async function generateImageVariants(buffer: Buffer, baseFilename: string) {
  const variants = {
    thumbnail: await processSecureImage(buffer, { maxDimension: 200, quality: 60 }),
    medium: await processSecureImage(buffer, { maxDimension: 600, quality: 75 }),
    full: await processSecureImage(buffer, { maxDimension: MAX_IMAGE_DIMENSION, quality: 85 })
  };

  const paths = {
    thumbnail: `${baseFilename}_thumb.jpg`,
    medium: `${baseFilename}_med.jpg`,
    full: `${baseFilename}.jpg`
  };

  return { variants, paths };
}

// Configure secure multer for handling multipart/form-data uploads
const storage_multer = multer.memoryStorage();
const secureUpload = multer({
  storage: storage_multer,
  limits: {
    fileSize: MAX_FILE_SIZE, // 5MB file size limit
    files: 1, // Only allow 1 file per request
    fieldSize: 1024 * 1024, // 1MB field size limit
    fields: 10, // Max 10 form fields
  },
  fileFilter: (req, file, cb) => {
    // Basic MIME type check (will be validated more thoroughly later)
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed') as any, false);
    }
    
    // Basic filename validation
    if (!file.originalname || file.originalname.length > 255) {
      return cb(new Error('Invalid filename') as any, false);
    }
    
    cb(null, true);
  },
});

// Legacy upload configuration (kept for backward compatibility)
const upload = secureUpload;


// Server readiness flag
let isServerReady = false;

// Guard to prevent multiple deferred initialization runs (e.g., on hot reload)
let deferredInitStarted = false;

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

// Broadcast notifications to eligible users when a new post is created
async function broadcastPostNotifications(
  post: { id: string; title: string; categoryId: string | null; centroidLat: number | null; centroidLng: number | null; userId: string },
  posterName: string
): Promise<void> {
  try {
    // Get all users with notifications enabled
    const allUsers = await storage.getAllUsers();
    const eligibleUsers: string[] = [];

    for (const user of allUsers) {
      // Skip the post creator
      if (user.id === post.userId) continue;
      
      // Skip users with notifications disabled
      if (user.notificationsEnabled === false) continue;
      
      // Check category preference
      const userCategories = (user.notificationCategories as string[]) || [];
      if (userCategories.length > 0 && post.categoryId) {
        if (!userCategories.includes(post.categoryId)) continue;
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

    // Create in-app notifications for eligible users
    for (const userId of eligibleUsers) {
      await storage.createNotification({
        userId,
        type: 'new_post',
        title: 'New Post Nearby',
        message: `${posterName} posted: ${post.title}`,
        entityId: post.id,
        entityType: 'post',
        fromUserId: post.userId,
      });
    }

    // Send actual push notifications to users with subscriptions
    if (eligibleUsers.length > 0) {
      const subscriptions = await storage.getPushSubscriptionsForUsers(eligibleUsers);
      
      const notificationPayload = JSON.stringify({
        title: 'New Post Nearby',
        body: `${posterName} posted: ${post.title}`,
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
            console.log(`🗑️ Removing invalid push subscription for user ${sub.userId}`);
            await storage.removePushSubscription(sub.endpoint);
          } else {
            console.error(`Push notification failed for user ${sub.userId}:`, pushError.message);
          }
        }
      }
      
      if (pushSuccessCount > 0 || pushFailCount > 0) {
        console.log(`📱 Push notifications: ${pushSuccessCount} sent, ${pushFailCount} failed`);
      }
    }

    console.log(`📢 Sent notifications to ${eligibleUsers.length} users for post ${post.id}`);
  } catch (error) {
    console.error('Error broadcasting post notifications:', error);
    // Don't throw - notification failure shouldn't block post creation
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Handle favicon.ico requests - redirect to the PWA icon
  app.get('/favicon.ico', (_req, res) => {
    res.redirect(301, '/badge-72x72.png');
  });
  
  // Readiness check middleware - prevent requests during initialization
  app.use((req, res, next) => {
    // Allow healthcheck even during initialization
    if (req.path === '/healthz') {
      return next();
    }
    
    if (!isServerReady) {
      return res.status(503).json({ 
        error: 'Service Unavailable',
        message: 'Server is initializing, please try again in a moment'
      });
    }
    next();
  });
  
  // DEFERRED: Heavy startup tasks are now run AFTER server is ready to accept requests
  // This prevents database connection pool exhaustion during boot
  // See deferredInitialization() below
  
  // Debug: log the path being used
  const assetsPath = path.resolve(process.cwd(), 'attached_assets');
  console.log('Serving static assets from:', assetsPath);
  console.log('Directory exists:', fs.existsSync(assetsPath));
  
  // Serve static assets with compression for images
  app.use('/attached_assets', express.static(assetsPath));
  
  // Secure photo upload endpoint with comprehensive validation and processing
  app.post('/api/upload/photo', isAuthenticated, secureUpload.single('photo'), async (req: any, res) => {
    try {
      secureLogger.authDebug('Photo upload started', {
        requestInfo: createSafeRequestInfo(req),
        hasFile: !!req.file,
        fileInfo: req.file ? {
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        } : null,
        user: req.user
      });
      
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      secureLogger.authDebug('User ID extracted', { userId: userId ? '[USER_ID]' : 'none' });
      
      if (!userId) {
        secureLogger.authError('No userId found in photo upload', { user: req.user });
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
          loginUrl: '/api/login',
          message: 'Please log in to upload photos. Click here to login.',
          debug: process.env.NODE_ENV === 'development' ? {
            userExists: !!req.user,
            isAuthenticated: req.isAuthenticated(),
            hasSession: !!req.session
          } : undefined
        });
      }

      // Check rate limiting
      const rateLimitCheck = checkPhotoUploadRateLimit(userId);
      if (!rateLimitCheck.allowed) {
        const resetDate = new Date(rateLimitCheck.resetTime!);
        return res.status(429).json({ 
          error: 'Upload rate limit exceeded',
          resetTime: resetDate.toISOString(),
          message: `Maximum ${UPLOADS_PER_HOUR} uploads per hour. Try again after ${resetDate.toLocaleTimeString()}.`
        });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No photo file provided' });
      }

      // Validate file size
      if (req.file.size > MAX_FILE_SIZE) {
        return res.status(413).json({ 
          error: `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB` 
        });
      }

      // Secure validation using magic-byte detection
      const validation = await validateSecureImage(req.file.buffer, req.file.originalname);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
      }

      try {
        // Generate secure filename
        const fileId = randomUUID();
        const baseFilename = `photo_${fileId}`;
        
        // Generate image variants
        const { variants, paths } = await generateImageVariants(req.file.buffer, baseFilename);
        
        // Upload to object storage
        console.log('Initializing object storage service...');
        const objectStorageService = new ObjectStorageService();
        console.log('Getting private object directory...');
        const privateObjectDir = objectStorageService.getPrivateObjectDir();
        console.log('Private object dir:', privateObjectDir);
        
        if (!privateObjectDir) {
          console.error('Object storage not configured - privateObjectDir is null/undefined');
          throw new Error('Object storage not configured');
        }

        const uploadPromises = Object.entries(variants).map(async ([size, buffer]) => {
          const fullPath = `${privateObjectDir}/photos/${paths[size as keyof typeof paths]}`;
          const { bucketName, objectName } = (() => {
            if (!fullPath.startsWith("/")) {
              const path = `/${fullPath}`;
              const pathParts = path.split("/");
              return {
                bucketName: pathParts[1],
                objectName: pathParts.slice(2).join("/")
              };
            }
            const pathParts = fullPath.split("/");
            return {
              bucketName: pathParts[1],
              objectName: pathParts.slice(2).join("/")
            };
          })();
          
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);
          
          await file.save(buffer, {
            metadata: {
              contentType: 'image/jpeg',
              metadata: {
                uploadedBy: userId,
                uploadedAt: new Date().toISOString(),
                processed: 'true',
                variant: size,
                securityValidated: 'true'
              }
            }
          });
          
          return {
            size,
            path: fullPath,
            url: `/objects${fullPath}`
          };
        });

        const uploadedVariants = await Promise.all(uploadPromises);
        
        // Return response with all variant URLs
        const response = {
          success: true,
          fileId,
          variants: uploadedVariants.reduce((acc, variant) => {
            acc[variant.size] = {
              url: variant.url,
              path: variant.path
            };
            return acc;
          }, {} as Record<string, { url: string; path: string }>),
          originalFilename: req.file.originalname,
          detectedType: validation.detectedType,
          processed: true
        };
        
        secureLogger.authDebug('Photo upload completed successfully', {
          fileId,
          variantCount: Object.keys(response.variants).length,
          originalFilename: req.file.originalname
        });
        res.json(response);
        
      } catch (processingError: unknown) {
        console.error('=== IMAGE PROCESSING ERROR ===');
        console.error('Error type:', processingError instanceof Error ? processingError.constructor.name : 'Unknown');
        console.error('Error message:', processingError instanceof Error ? processingError.message : 'Unknown processing error');
        console.error('Error stack:', processingError instanceof Error ? processingError.stack : 'No stack trace');
        console.error('=== END PROCESSING ERROR ===');
        res.status(500).json({ 
          error: 'Image processing failed',
          message: processingError instanceof Error ? processingError.message : 'Unknown processing error'
        });
      }
      
    } catch (error: unknown) {
      console.error('=== PHOTO UPLOAD ERROR ===');
      console.error('Error type:', error instanceof Error ? error.constructor.name : 'Unknown');
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('File info:', req.file ? { 
        filename: req.file.originalname, 
        size: req.file.size, 
        mimetype: req.file.mimetype 
      } : 'No file');
      secureLogger.authError('Photo upload failed', {
        user: req.user,
        error,
        fileInfo: req.file
      });
      console.error('=== END PHOTO UPLOAD ERROR ===');
      
      // Provide specific error codes and user-friendly messages
      let statusCode = 500;
      let errorCode = 'UPLOAD_FAILED';
      let userMessage = 'Photo upload failed';
      
      if (error instanceof Error && error.message.includes('Object storage not configured')) {
        statusCode = 503;
        errorCode = 'STORAGE_UNAVAILABLE';
        userMessage = 'File storage temporarily unavailable. Please try again later.';
      } else if (error instanceof Error && error.message.includes('rate limit')) {
        statusCode = 429;
        errorCode = 'RATE_LIMITED';
        userMessage = 'Too many uploads. Please wait before uploading again.';
      } else if (error instanceof Error && error.message.includes('file too large')) {
        statusCode = 413;
        errorCode = 'FILE_TOO_LARGE';
        userMessage = 'File is too large. Please choose a smaller image.';
      } else if (error instanceof Error && error.message.includes('Invalid filename')) {
        statusCode = 400;
        errorCode = 'INVALID_FILE';
        userMessage = 'Invalid file type. Please upload a valid image file.';
      }
      
      res.status(statusCode).json({ 
        error: userMessage,
        code: errorCode,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        debug: process.env.NODE_ENV === 'development' ? { 
          stack: error instanceof Error ? error.stack : undefined,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          hasFile: !!req.file,
          hasUser: !!req.user
        } : undefined
      });
    }
  });

  // Comment photo upload endpoint - allows up to 3 photos
  const commentPhotoUpload = multer({
    storage: storage_multer,
    limits: {
      fileSize: MAX_FILE_SIZE, // 5MB per file
      files: 3, // Max 3 photos per comment
      fieldSize: 1024 * 1024,
      fields: 10,
    },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed') as any, false);
      }
      if (!file.originalname || file.originalname.length > 255) {
        return cb(new Error('Invalid filename') as any, false);
      }
      cb(null, true);
    },
  });

  app.post('/api/upload/comment-photos', isAuthenticated, commentPhotoUpload.array('photos', 3), async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: 'No photos provided' });
      }

      if (req.files.length > 3) {
        return res.status(400).json({ error: 'Maximum 3 photos allowed per comment' });
      }

      // Validate each file
      const uploadedUrls: string[] = [];
      const objectStorageService = new ObjectStorageService();
      const privateObjectDir = objectStorageService.getPrivateObjectDir();

      for (const file of req.files) {
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          return res.status(413).json({ 
            error: `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB` 
          });
        }

        // Secure validation
        const validation = await validateSecureImage(file.buffer, file.originalname);
        if (!validation.isValid) {
          return res.status(400).json({ error: validation.error });
        }

        // Process image - resize to max 1200px width, compress to JPEG
        const processedBuffer = await sharp(file.buffer)
          .resize(1200, 1200, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 85, mozjpeg: true })
          .toBuffer();

        // Generate secure filename
        const fileId = randomUUID();
        const filename = `comment_photo_${fileId}.jpg`;
        const fullPath = `${privateObjectDir}/comments/${filename}`;
        
        const { bucketName, objectName } = (() => {
          const pathParts = fullPath.startsWith("/") ? fullPath.split("/") : `/${fullPath}`.split("/");
          return {
            bucketName: pathParts[1],
            objectName: pathParts.slice(2).join("/")
          };
        })();

        const bucket = objectStorageClient.bucket(bucketName);
        const fileObj = bucket.file(objectName);
        
        await fileObj.save(processedBuffer, {
          metadata: {
            contentType: 'image/jpeg',
            metadata: {
              uploadedBy: userId,
              uploadedAt: new Date().toISOString(),
              processed: 'true',
              type: 'comment_photo'
            }
          }
        });

        uploadedUrls.push(`/objects${fullPath}`);
      }

      res.json({
        success: true,
        urls: uploadedUrls,
        count: uploadedUrls.length
      });

    } catch (error: unknown) {
      console.error('Comment photo upload error:', error);
      res.status(500).json({ 
        error: 'Photo upload failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Serve comment photos from object storage
  app.get('/api/photos/comment-photos/:filename', async (req, res) => {
    try {
      const { filename } = req.params;
      
      // Validate filename to prevent path traversal
      if (!filename || filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ error: 'Invalid filename' });
      }
      
      const objectStorageService = new ObjectStorageService();
      const privateObjectDir = objectStorageService.getPrivateObjectDir();
      
      if (!privateObjectDir) {
        return res.status(500).json({ error: 'Object storage not configured' });
      }
      
      const fullPath = `${privateObjectDir}/comment-photos/${filename}`;
      
      const parseObjectPath = (path: string) => {
        if (!path.startsWith("/")) path = `/${path}`;
        const pathParts = path.split("/");
        const bucketName = pathParts[1];
        const objectName = pathParts.slice(2).join("/");
        return { bucketName, objectName };
      };
      
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).json({ error: 'Photo not found' });
      }
      
      const [metadata] = await file.getMetadata();
      const contentType = metadata.contentType || 'image/jpeg';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
      
      const stream = file.createReadStream();
      stream.pipe(res);
      
    } catch (error) {
      console.error('Error serving comment photo:', error);
      res.status(500).json({ error: 'Failed to serve photo' });
    }
  });

  // Enhanced image compression endpoint with multiple sizes and WebP support
  app.get('/api/compress-image', async (req, res) => {
    const imagePath = req.query.path as string;
    const size = req.query.size as string || 'medium'; // thumbnail, medium, full
    const format = req.query.format as string || 'auto'; // auto, webp, jpeg
    
    if (!imagePath) {
      return res.status(400).json({ error: 'Path parameter required' });
    }
    
    const filePath = path.join(process.cwd(), imagePath);
    
    try {
      if (!fs.existsSync(filePath) || !imagePath.startsWith('/attached_assets/')) {
        return res.status(404).json({ error: 'Image not found' });
      }

      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      
      // Define size configurations
      const sizeConfigs = {
        thumbnail: { width: 200, height: 200, quality: 60 },
        medium: { width: 600, height: 400, quality: 70 },
        full: { width: 1200, height: 800, quality: 80 }
      };
      
      const config = sizeConfigs[size as keyof typeof sizeConfigs] || sizeConfigs.medium;
      
      // Auto-detect WebP support from Accept header
      const supportsWebP = req.headers.accept?.includes('image/webp') || format === 'webp';
      const outputFormat = supportsWebP && format !== 'jpeg' ? 'webp' : 'jpeg';
      
      // Only compress images larger than 50KB
      if (fileSize < 50 * 1024 && size === 'thumbnail') {
        return res.sendFile(filePath);
      }

      let imageProcessor = sharp(filePath)
        .resize(config.width, config.height, { 
          fit: 'inside', 
          withoutEnlargement: true 
        });

      let compressed: Buffer;
      let contentType: string;

      if (outputFormat === 'webp') {
        compressed = await imageProcessor
          .webp({ 
            quality: config.quality,
            effort: 4 // Balance between compression and speed
          })
          .toBuffer();
        contentType = 'image/webp';
      } else {
        compressed = await imageProcessor
          .jpeg({ 
            quality: config.quality, 
            progressive: true,
            mozjpeg: true // Better compression
          })
          .toBuffer();
        contentType = 'image/jpeg';
      }

      const compressionRatio = Math.round(((fileSize - compressed.length) / fileSize) * 100);

      res.set({
        'Content-Type': contentType,
        'Content-Length': compressed.length.toString(),
        'Cache-Control': 'public, max-age=2592000, immutable', // 30 days cache with immutable
        'ETag': `"${imagePath}-${size}-${outputFormat}"`,
        'X-Original-Size': fileSize.toString(),
        'X-Compressed-Size': compressed.length.toString(),
        'X-Compression-Ratio': `${compressionRatio}%`,
        'X-Image-Size': size,
        'X-Image-Format': outputFormat
      });

      res.send(compressed);
      
    } catch (error) {
      console.error('Image compression error:', error);
      res.status(500).json({ error: 'Compression failed' });
    }
  });

  // Batch users lookup endpoint for community reports - FINAL IMPLEMENTATION
  // Note: Originally requested as /api/users/batch but conflicts with existing parameterized route
  // This endpoint provides the same functionality at /api/batch-users
  app.get('/api/batch-users', async (req, res) => {
    try {
      const { ids } = req.query;
      
      // Validate that ids parameter exists and is a string
      if (!ids || typeof ids !== 'string') {
        return res.status(400).json({ 
          error: 'Missing or invalid ids parameter. Expected comma-separated user IDs.' 
        });
      }
      
      // Parse and validate user IDs
      const userIds = ids.split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);
      
      // Validate that we have valid IDs
      if (userIds.length === 0) {
        return res.status(400).json({ 
          error: 'No valid user IDs provided' 
        });
      }
      
      // Limit to 100 IDs per request to prevent abuse
      if (userIds.length > 100) {
        return res.status(400).json({ 
          error: 'Too many user IDs requested. Maximum 100 IDs per request.' 
        });
      }
      
      // Fetch users from storage
      const users = await storage.getUsersByIds(userIds);
      
      // Transform to safe user format - only public fields
      const safeUsers: SafeUser[] = users.map(user => ({
        id: user.id,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.profileImageUrl, // Map profileImageUrl to avatarUrl
        accountType: user.accountType,
        isOfficialAgency: user.isOfficialAgency || false,
      }));
      
      // Return safe user data (missing users are simply not included in response)
      res.json(safeUsers);
      
    } catch (error) {
      console.error("Error fetching batch users:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });

  // Auth middleware with error handling
  try {
    await setupAuth(app);
    console.log('✅ Session and auth middleware initialized');
  } catch (error) {
    console.error('❌ CRITICAL: Failed to initialize auth middleware:', error);
    throw error; // Auth is critical - must crash if it fails
  }
  
  // Replit Auth routes (login, logout, callback) with error handling
  try {
    await setupReplitAuth(app);
    console.log('✅ Replit OAuth initialized');
  } catch (error) {
    console.error('❌ CRITICAL: Failed to initialize Replit OAuth:', error);
    throw error; // OAuth is critical - must crash if it fails
  }

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Support both OAuth and local authentication
      const userId = (req.user as any).claims?.sub || (req.user as any).id;
      const user = await storage.getUser(userId);
      
      // Return user without sensitive fields
      if (user && user.password) {
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      } else {
        res.json(user);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/user/accept-terms', isAuthenticated, async (req: any, res) => {
    try {
      // Support both OAuth and local authentication
      const userId = (req.user as any).claims?.sub || (req.user as any).id;
      const user = await storage.acceptUserTerms(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "Terms accepted successfully", user });
    } catch (error) {
      console.error("Error accepting terms:", error);
      res.status(500).json({ message: "Failed to accept terms" });
    }
  });

  // Update user's location preferences (replaces old suburb endpoint)
  app.patch('/api/user/location-preferences', isAuthenticated, async (req: any, res) => {
    try {
      const preferences = z.object({
        preferredLocation: z.string().nullable().optional(),
        preferredLocationLat: z.number().nullable().optional(),
        preferredLocationLng: z.number().nullable().optional(),
        preferredLocationBounds: z.any().nullable().optional(), // JSONB field
        distanceFilter: z.enum(['1km', '2km', '5km', '10km', '25km', '50km']).optional(),
      }).parse(req.body);

      // Support both OAuth and local authentication
      const userId = (req.user as any).claims?.sub || (req.user as any).id;
      
      // Get existing user to check for location changes
      const existingUser = await storage.getUser(userId);
      const oldLat = existingUser?.preferredLocationLat;
      const oldLng = existingUser?.preferredLocationLng;
      
      const updatedUser = await storage.updateUserProfile(userId, preferences);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Clear user cache so next auth request gets fresh data with location
      if ((app as any).clearUserCache) {
        (app as any).clearUserCache(userId);
      }
      
      // Backfill notifications when location changes and notifications are enabled
      const newLat = updatedUser.preferredLocationLat;
      const newLng = updatedUser.preferredLocationLng;
      const locationChanged = (newLat !== oldLat || newLng !== oldLng);
      
      // Validate coordinates are finite numbers before backfilling
      const hasValidCoordinates = (
        typeof newLat === 'number' && Number.isFinite(newLat) &&
        typeof newLng === 'number' && Number.isFinite(newLng)
      );
      
      if (locationChanged && updatedUser.notificationsEnabled && hasValidCoordinates) {
        const radiusKm = parseInt((updatedUser.notificationRadius || '10km').replace('km', ''));
        
        // Trigger backfill asynchronously (don't block the response)
        backfillNotificationsForUser(
          userId,
          newLat,
          newLng,
          radiusKm,
          24 // Last 24 hours of posts
        ).then(count => {
          console.log(`[Routes] Backfilled ${count} notifications for user ${userId} after location change`);
        }).catch(err => {
          console.error(`[Routes] Backfill failed for user ${userId}:`, err);
        });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating location preferences:", error);
      res.status(500).json({ message: "Failed to update location preferences" });
    }
  });

  // Update user's notification preferences
  app.patch('/api/user/notification-preferences', isAuthenticated, async (req: any, res) => {
    try {
      const preferences = z.object({
        notificationsEnabled: z.boolean().optional(),
        notificationCategories: z.array(z.string()).nullable().optional(), // Array of category IDs (null = all)
        notificationRadius: z.enum(['1km', '2km', '5km', '10km', '25km', '50km']).optional(),
      }).parse(req.body);

      // Support both OAuth and local authentication
      const userId = (req.user as any).claims?.sub || (req.user as any).id;
      
      // Get existing user to check for preference changes
      const existingUser = await storage.getUser(userId);
      const wasEnabled = existingUser?.notificationsEnabled ?? false;
      const oldRadius = existingUser?.notificationRadius || '10km';
      
      const updatedUser = await storage.updateUserProfile(userId, preferences);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Clear user cache so next auth request gets fresh data
      if ((app as any).clearUserCache) {
        (app as any).clearUserCache(userId);
      }
      
      // Backfill notifications when enabling or changing radius/categories
      const nowEnabled = updatedUser.notificationsEnabled ?? false;
      const newRadius = updatedUser.notificationRadius || '10km';
      const shouldBackfill = (
        (nowEnabled && !wasEnabled) || // Just enabled
        (nowEnabled && newRadius !== oldRadius) // Radius changed while enabled
      );
      
      // Validate coordinates are finite numbers before backfilling
      const backfillLat = updatedUser.preferredLocationLat;
      const backfillLng = updatedUser.preferredLocationLng;
      const hasValidBackfillCoords = (
        typeof backfillLat === 'number' && Number.isFinite(backfillLat) &&
        typeof backfillLng === 'number' && Number.isFinite(backfillLng)
      );
      
      if (shouldBackfill && hasValidBackfillCoords) {
        // Parse radius to km
        const radiusKm = parseInt(newRadius.replace('km', ''));
        
        // Trigger backfill asynchronously (don't block the response)
        backfillNotificationsForUser(
          userId,
          backfillLat,
          backfillLng,
          radiusKm,
          24 // Last 24 hours of posts
        ).then(count => {
          console.log(`[Routes] Backfilled ${count} notifications for user ${userId}`);
        }).catch(err => {
          console.error(`[Routes] Backfill failed for user ${userId}:`, err);
        });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // Ad serving endpoint - get ads for user's region (temporarily without auth for testing)
  app.get("/api/ads", async (req, res) => {
    try {
      // For testing, use a default suburb if no user auth
      const testSuburb = req.query.suburb as string || "Sunshine Coast";
      const limit = parseInt(req.query.limit as string) || 3;
      const ads = await storage.getActiveAdsForSuburb(testSuburb, limit);
      
      console.log(`Serving ${ads.length} ads for suburb: ${testSuburb}`);
      res.json(ads);
    } catch (error) {
      console.error("Error fetching ads:", error);
      res.status(500).json({ message: "Failed to fetch ads" });
    }
  });

  // Ad creation endpoint - for businesses to submit ads
  app.post("/api/ads/create", async (req: any, res) => {
    try {
      // Use the same auth pattern as other routes
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user has a business account
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.accountType !== 'business') {
        return res.status(403).json({ 
          message: "Only business accounts can create advertisements. Please upgrade to a business account." 
        });
      }

      const adData = z.object({
        businessName: z.string().min(1).max(100),
        title: z.string().min(1).max(100),
        content: z.string().min(1).max(500),
        websiteUrl: z.string().optional().transform(val => {
          if (!val || val.trim() === '') return '';
          // Auto-add https:// if no protocol is provided
          if (!val.match(/^https?:\/\//)) {
            return `https://${val}`;
          }
          return val;
        }).pipe(z.string().url().optional().or(z.literal(''))),
        address: z.string().max(200).optional().or(z.literal('')),
        suburb: z.string().min(1).max(100),
        cta: z.string().min(1).max(50),
        targetSuburbs: z.array(z.string()).optional(),
        dailyBudget: z.string(),
        totalBudget: z.string().optional(),
        template: z.string().optional(),
        logoUrl: z.string().optional(),
        backgroundUrl: z.string().optional(),
        status: z.enum(['pending', 'active', 'paused', 'rejected']).default('pending')
      }).parse(req.body);

      // Auto-populate target suburbs with the main suburb if not provided
      if (!adData.targetSuburbs || adData.targetSuburbs.length === 0) {
        adData.targetSuburbs = [adData.suburb];
      }

      // Set default total budget based on daily budget if not provided
      if (!adData.totalBudget) {
        const dailyAmount = parseFloat(adData.dailyBudget);
        adData.totalBudget = (dailyAmount * 30).toString(); // 30 days default
      }

      // Set default CPM rate
      const cpmRate = "3.50";

      const newAd = await storage.createAdCampaign({
        businessName: adData.businessName,
        title: adData.title,
        content: adData.content,
        imageUrl: adData.logoUrl || null, // Use logo as the main image
        websiteUrl: adData.websiteUrl || null,
        address: adData.address || null,
        suburb: adData.suburb,
        cta: adData.cta,
        targetSuburbs: adData.targetSuburbs,
        dailyBudget: adData.dailyBudget,
        totalBudget: adData.totalBudget,
        cpmRate,
        status: adData.status
      });

      console.log(`New ad created: ${newAd.businessName} - ${newAd.title}`);
      res.json({ 
        success: true, 
        id: newAd.id,
        message: "Ad submitted successfully and is pending review" 
      });

    } catch (error) {
      console.error("Error creating ad:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Invalid ad data", 
          errors: error.errors 
        });
      } else {
        res.status(500).json({ message: "Failed to create ad" });
      }
    }
  });

  // Ad view tracking endpoint
  app.post("/api/ads/track-view", async (req, res) => {
    try {
      const { adId, duration, userSuburb, timestamp } = req.body;
      
      // Basic validation
      if (!adId || !duration || !userSuburb || !timestamp) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const userId = (req.user as any)?.claims?.sub || 'anonymous';
      const viewedAt = new Date(timestamp);
      
      // Check if view already recorded today
      const today = viewedAt.toISOString().split('T')[0];
      const existingViews = await storage.getAdViewsToday(userId, adId, today);
      
      if (existingViews >= 3) { // Max 3 views per user per ad per day
        return res.json({ message: "View limit reached" });
      }

      await storage.recordAdView({
        adCampaignId: adId,
        userId: userId,
        viewedAt: viewedAt,
        durationMs: duration,
        userSuburb: userSuburb,
        date: today
      });

      res.json({ message: "View recorded" });
    } catch (error) {
      console.error("Error tracking ad view:", error);
      res.status(500).json({ message: "Failed to track view" });
    }
  });

  // Ad click tracking endpoint
  app.post("/api/ads/track-click", async (req, res) => {
    try {
      const { adId, timestamp } = req.body;
      
      if (!adId || !timestamp) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const userId = (req.user as any)?.claims?.sub || 'anonymous';
      const clickedAt = new Date(timestamp);

      await storage.recordAdClick({
        adCampaignId: adId,
        userId: userId,
        clickedAt: clickedAt
      });

      res.json({ message: "Click recorded" });
    } catch (error) {
      console.error("Error tracking ad click:", error);
      res.status(500).json({ message: "Failed to track click" });
    }
  });

  // DEPRECATED: Get traffic events - redirects to unified API
  app.get("/api/traffic/events", (req, res) => {
    res.status(410).json({ 
      error: 'This endpoint is deprecated. Please use /api/unified instead.',
      migration: {
        old: '/api/traffic/events',
        new: '/api/unified',
        note: 'The unified API provides all traffic and incident data in a single response'
      }
    });
  });


  // REMOVED: Legacy /api/events endpoint - replaced by /api/unified


  // REMOVED: Legacy /api/incidents endpoint - replaced by /api/unified

  // Location search endpoint using Nominatim (OpenStreetMap)
  app.get('/api/location/search', async (req, res) => {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }

    try {
      // Using Nominatim (OpenStreetMap) as a free alternative
      // Don't append "Queensland, Australia" as it can break searches for suburbs
      // Use countrycodes=au and state parameter instead for Queensland focus
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(q)}&` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=10&` +
        `countrycodes=au`;
      
      console.log('[Location Search] Querying Nominatim for:', q);
      
      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'QLDCommunityConnect/1.0 (Queensland Safety Monitor Application)',
          'Accept': 'application/json',
          'Accept-Language': 'en'
        }
      });

      console.log('[Location Search] Nominatim response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Location Search] Nominatim error response:', errorText);
        throw new Error(`Geocoding request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('[Location Search] Nominatim returned', data.length, 'results');
      if (data.length > 0) {
        console.log('[Location Search] First result:', data[0].display_name);
      }
      
      // Transform to our format - accept any Australian result
      const locationSuggestions = data
        .filter((item: any) => {
          // Must have address
          if (!item.address) return false;
          
          // Must be in Australia (already filtered by countrycodes=au, but double-check)
          const country = item.address.country || item.address.country_code || '';
          if (!country.toLowerCase().includes('australia') && country.toLowerCase() !== 'au') return false;
          
          // Accept any location type (suburb, city, town, village, residential, etc.)
          return true;
        })
        .map((item: any) => {
          // Extract the actual suburb name from display_name
          // Format: "Street Name, Suburb, City, Region, State, Postcode, Country"
          const parts = item.display_name.split(',').map((p: string) => p.trim());
          
          // Try to get suburb from the second part of display_name first
          let suburb = parts[1] || parts[0]; // Use second part (suburb) or fallback to first part
          
          // Fallback to address fields if display_name doesn't work
          if (!suburb || suburb.length < 2) {
            suburb = item.address.suburb || 
                    item.address.town || 
                    item.address.village ||
                    item.address.city;
          }
          
          const postcode = item.address.postcode;
          
          return {
            display_name: item.display_name, // Keep original for debugging
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            address: {
              suburb: suburb,
              city: item.address.city,
              state: item.address.state,
              postcode: postcode,
              country: item.address.country
            },
            boundingbox: item.boundingbox ? [
              item.boundingbox[0], // min_lat
              item.boundingbox[1], // max_lat
              item.boundingbox[2], // min_lon
              item.boundingbox[3]  // max_lon
            ] : undefined
          };
        });

      // Deduplicate results by suburb + postcode combination
      const uniqueLocations = locationSuggestions.filter((location: any, index: number, arr: any[]) => {
        const key = `${location.address.suburb}-${location.address.postcode}`;
        return arr.findIndex((l: any) => `${l.address.suburb}-${l.address.postcode}` === key) === index;
      });

      res.json(uniqueLocations);

    } catch (error) {
      console.error('Location search error:', error);
      res.status(500).json({ error: 'Location search failed' });
    }
  });

  // Reverse geocoding endpoint - convert coordinates to suburb name
  app.get("/api/location/reverse", async (req, res) => {
    const lat = req.query.lat as string;
    const lon = req.query.lon as string;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&extratags=1&namedetails=1`,
        {
          headers: {
            'User-Agent': 'QLD Safety Monitor/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding request failed');
      }

      const data = await response.json();
      
      if (!data.address) {
        return res.status(404).json({ error: 'No address found for coordinates' });
      }

      // Extract street/road name from address data
      const road = data.address.road || 
                  data.address.street ||
                  // Get from display_name if it's not infrastructure
                  (() => {
                    const parts = data.display_name?.split(',') || [];
                    const firstPart = parts[0]?.trim();
                    // Only use first part if it's NOT infrastructure (no numbers, "Access", etc.)
                    if (firstPart && !(/\d|Access|Way$|Path$|Bridge|Link|Cycleway|Pathway/.test(firstPart))) {
                      return firstPart;
                    }
                    return null;
                  })();

      // Extract suburb name from address data - prioritize actual suburb over infrastructure names
      const suburb = data.address.suburb || 
                    data.address.residential ||  // Local area name like "Kawana Forest"
                    data.address.town || 
                    data.address.village ||
                    data.address.city_district ||  // More specific than city
                    data.address.city ||
                    // If no address suburb, try to get actual suburb from display_name (usually 2nd part)
                    (() => {
                      const parts = data.display_name?.split(',') || [];
                      // Skip first part if it looks like infrastructure (contains numbers, "Access", "Way", etc.)
                      if (parts.length > 1 && parts[0] && (/\d|Access|Way|Path|Bridge|Link|Cycleway|Pathway/.test(parts[0]))) {
                        return parts[1]?.trim();
                      }
                      return parts[0]?.trim();
                    })();
      
      const postcode = data.address.postcode;
      const state = data.address.state;

      // Only return locations in Queensland
      if (!state || !state.includes('Queensland')) {
        return res.status(400).json({ error: 'Location must be in Queensland' });
      }

      res.json({
        road: road,
        suburb: suburb,
        postcode: postcode,
        state: state,
        display_name: data.display_name
      });

    } catch (error) {
      console.error('Reverse geocoding error:', error);
      res.status(500).json({ error: 'Reverse geocoding failed' });
    }
  });

  // Refresh incidents from external API (slow endpoint)
  app.post("/api/incidents/refresh", async (req, res) => {
    try {
      console.log("Refreshing incidents from external API...");
      
      // Set timeout for external API call to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(
        "https://services1.arcgis.com/vkTwD8kHw2woKBqV/arcgis/rest/services/ESCAD_Current_Incidents_Public/FeatureServer/0/query?f=geojson&where=1%3D1&outFields=*",
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      let data;
      if (!response.ok) {
        console.warn(`ArcGIS API error: ${response.status} ${response.statusText}`);
        return res.json({ success: false, message: "External API temporarily unavailable" });
      }
      
      data = await response.json();
      
      // Clear existing emergency incidents (but keep user reports)
      const existingIncidents = await storage.getIncidents();
      const userIncidents = existingIncidents.filter(inc => (inc.properties as any)?.userReported);
      
      // Store new emergency incidents (keep all, filter by age only)
      let storedCount = 0;
      let ageFilteredCount = 0;
      if (data.features) {
        for (const feature of data.features) {
          const props = feature.properties;
          
          // Filter out incidents older than 7 days
          const responseDate = props.Response_Date ? new Date(props.Response_Date) : null;
          if (responseDate) {
            const daysSinceResponse = (Date.now() - responseDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceResponse > 7) {
              ageFilteredCount++;
              continue;
            }
          }
          
          // Enhanced ESQ incident data extraction
          const incidentType = props.GroupedType || 'Emergency Incident';
          const locality = props.Locality || 'Queensland';
          const location = props.Location;
          
          // Create more informative title and description
          const title = location ? `${incidentType} - ${location}, ${locality}` : `${incidentType} - ${locality}`;
          
          // Build comprehensive description with available details
          const descriptionParts = [];
          if (props.Master_Incident_Number) {
            descriptionParts.push(`Incident #${props.Master_Incident_Number}`);
          }
          if (props.Jurisdiction) {
            descriptionParts.push(`Jurisdiction: ${props.Jurisdiction}`);
          }
          
          // Add vehicle deployment information if available
          const totalVehicles = (props.VehiclesAssigned || 0) + (props.VehiclesOnRoute || 0) + (props.VehiclesOnScene || 0);
          if (totalVehicles > 0) {
            const vehicleInfo = [];
            if (props.VehiclesOnScene > 0) vehicleInfo.push(`${props.VehiclesOnScene} on scene`);
            if (props.VehiclesOnRoute > 0) vehicleInfo.push(`${props.VehiclesOnRoute} en route`);
            if (props.VehiclesAssigned > 0) vehicleInfo.push(`${props.VehiclesAssigned} assigned`);
            if (vehicleInfo.length > 0) {
              descriptionParts.push(`Vehicles: ${vehicleInfo.join(', ')}`);
            }
          }
          
          const incident = {
            id: props.OBJECTID?.toString() || randomUUID(),
            incidentType: incidentType,
            title: title,
            description: descriptionParts.length > 0 ? descriptionParts.join(' • ') : null,
            location: location || locality,
            status: props.CurrentStatus || 'Active',
            priority: totalVehicles > 5 ? 'high' : totalVehicles > 2 ? 'medium' : 'low',
            agency: props.Jurisdiction || 'Emergency Services Queensland',
            geometry: feature.geometry,
            properties: feature.properties,
            publishedDate: props.Response_Date ? new Date(props.Response_Date) : null,
          };
          
          try {
            await storage.updateIncident(incident.id, incident) || await storage.createIncident(incident);
            storedCount++;
          } catch (error) {
            console.warn('Failed to store incident:', incident.id, error);
          }
        }
      }
      
      res.json({ 
        success: true, 
        message: `Successfully refreshed ${storedCount} emergency incidents (filtered out ${ageFilteredCount} incidents older than 7 days)`,
        count: storedCount,
        filtered: ageFilteredCount
      });
    } catch (error) {
      console.error("Error refreshing incidents:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to refresh incidents", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Get cached incidents from local storage
  app.get("/api/cached/incidents", async (req, res) => {
    try {
      const incidents = await storage.getIncidents();
      res.json(incidents);
    } catch (error) {
      console.error("Error fetching cached incidents:", error);
      res.status(500).json({ error: "Failed to fetch incidents" });
    }
  });

  // Authentication status endpoint for frontend
  app.get('/api/auth/status', async (req: any, res) => {
    try {
      const isAuth = req.isAuthenticated();
      const user = req.user;
      
      res.json({
        isAuthenticated: isAuth,
        user: user ? {
          id: user.claims?.sub || user.id,
          email: user.claims?.email || user.email,
          name: user.claims?.first_name || user.firstName
        } : null,
        loginUrl: '/api/login',
        message: isAuth ? 'Authenticated' : 'Please log in to upload photos and submit reports'
      });
    } catch (error) {
      console.error('Auth status check error:', error);
      res.status(500).json({ error: 'Failed to check authentication status' });
    }
  });

  // Development mode: Create test user session (ONLY in development)
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/auth/dev-login', async (req, res) => {
      try {
        console.log('Development login requested');
        
        // Create a test user in the database
        const testUser = await storage.upsertUser({
          id: 'dev-test-user-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: null
        });
        
        // Create a fake OAuth-style user object for session
        const sessionUser = {
          claims: {
            sub: testUser.id,
            email: testUser.email,
            first_name: testUser.firstName,
            last_name: testUser.lastName
          },
          access_token: 'dev-token',
          expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
        };
        
        // Manually log in the user
        req.login(sessionUser as any, (err: any) => {
          if (err) {
            console.error('Dev login error:', err);
            return res.status(500).json({ error: 'Failed to create dev session' });
          }
          
          secureLogger.authDebug('Development user session created successfully');
          res.json({ 
            success: true, 
            message: 'Development user logged in',
            user: {
              id: testUser.id,
              email: testUser.email,
              name: testUser.firstName
            }
          });
        });
        
      } catch (error) {
        console.error('Dev login setup error:', error);
        res.status(500).json({ error: 'Failed to setup dev login' });
      }
    });
  }

  // Report new incident (authenticated users only)
  app.post("/api/incidents/report", isAuthenticated, async (req: any, res) => {
    try {
      secureLogger.authDebug('Incident submission started', {
        requestInfo: createSafeRequestInfo(req),
        hasBody: !!req.body,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        user: req.user
      });
      
      const reportData = z.object({
        categoryId: z.string().min(1, "Category is required"),
        subcategoryId: z.string().min(1, "Subcategory is required"),
        title: z.string().min(1),
        description: z.string().optional(),
        location: z.string().min(1),
        policeNotified: z.enum(["yes", "no", "not_needed", "unsure"]).optional(),
        photoUrl: z.string().optional(),
      }).parse(req.body);
      
      secureLogger.authDebug('Report data parsed successfully', {
        hasTitle: !!reportData.title,
        hasLocation: !!reportData.location,
        hasCategoryId: !!reportData.categoryId,
        hasPhoto: !!reportData.photoUrl
      });

      // Handle different auth formats - check both claims.sub and direct id
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      secureLogger.authDebug('User ID extracted for incident', { hasUserId: !!userId });
      
      if (!userId) {
        secureLogger.authError('No userId found in incident submission', { user: req.user });
        return res.status(401).json({ 
          error: 'Authentication required - no user ID found',
          code: 'AUTH_REQUIRED',
          loginUrl: '/api/login',
          message: 'Please log in to submit incident reports. Click here to login.',
          debug: process.env.NODE_ENV === 'development' ? {
            userExists: !!req.user,
            isAuthenticated: req.isAuthenticated(),
            sessionId: req.sessionID
          } : undefined
        });
      }
      
      const user = await storage.getUser(userId);
      secureLogger.authDebug('User retrieved for incident', { hasUser: !!user });
      
      // ✅ ENRICHMENT: Look up category and subcategory names from UUIDs
      const category = await storage.getCategory(reportData.categoryId);
      const subcategory = reportData.subcategoryId ? await storage.getSubcategory(reportData.subcategoryId) : null;
      
      if (!category) {
        return res.status(400).json({ 
          error: 'Invalid category ID',
          code: 'INVALID_CATEGORY',
          message: 'The selected category does not exist. Please refresh and try again.'
        });
      }
      
      if (reportData.subcategoryId && !subcategory) {
        return res.status(400).json({ 
          error: 'Invalid subcategory ID',
          code: 'INVALID_SUBCATEGORY',
          message: 'The selected subcategory does not exist. Please refresh and try again.'
        });
      }
      
      // Increment subcategory report count for analytics
      if (reportData.subcategoryId) {
        await storage.incrementSubcategoryReportCount(reportData.subcategoryId);
      }

      // Geocode the location to get coordinates for mapping (with timeout)
      let geometry = null;
      try {
        const geocodeResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(reportData.location + ', Queensland, Australia')}&` +
          `format=json&limit=1&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'QLD Safety Monitor (contact: support@example.com)'
            },
            signal: AbortSignal.timeout(3000) // 3 second timeout
          }
        );
        
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json();
          if (geocodeData.length > 0) {
            const result = geocodeData[0];
            geometry = {
              type: "Point",
              coordinates: [parseFloat(result.lon), parseFloat(result.lat)]
            };
          }
        }
      } catch (error) {
        console.error("Error geocoding user incident location:", error);
        // Continue without coordinates - incident will still be created but won't appear on map
        // Note: Timeout after 3 seconds to prevent delays in incident reporting
      }

      const incident = {
        incidentType: "User Report", // Keep for backward compatibility
        categoryId: reportData.categoryId,
        subcategoryId: reportData.subcategoryId,
        title: reportData.title,
        description: reportData.description || null,
        location: reportData.location,
        status: "Reported",
        policeNotified: reportData.policeNotified || null,
        agency: "User Report",
        publishedDate: new Date(),
        photoUrl: reportData.photoUrl || null, // User-uploaded photo
        geometry: geometry,
        properties: {
          reportedBy: user?.email || "Anonymous",
          userReported: true,
          // Store user details for proper attribution
          reporterId: user?.id,
          reporterName: user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user?.firstName || user?.email?.split('@')[0] || "Anonymous User",
          photoUrl: reportData.photoUrl || null,
          timeReported: new Date().toISOString(),
        },
      };
      
      console.log('Creating incident with data:', JSON.stringify(incident, null, 2));
      const newIncident = await storage.createIncident(incident);
      console.log('Successfully created incident:', newIncident.id);
      
      // IMMEDIATE UNIFIED STORE UPDATE: Add incident to unified store immediately
      // so it appears in frontend without waiting for background ingestion pipeline
      try {
        // Extract coordinates safely using proper utility function
        const coordinates = extractCoordinatesFromGeometry(newIncident.geometry);
        
        if (!coordinates) {
          console.error('⚠️ Cannot add incident to unified store: missing valid coordinates');
          // Return regular incident if no valid coordinates
          res.json(newIncident);
          return;
        }
        
        const [lat, lng] = coordinates;
        const reporterUserId = userId; // We already have this from auth
        
        // Create properly normalized unified incident following exact schema from ingestion pipeline
        // ✅ USE ENRICHED CATEGORY DATA: Store both human-readable names AND UUIDs
        const unifiedIncident = {
          source: 'user' as const,
          sourceId: newIncident.id,
          title: newIncident.title,
          description: newIncident.description || '',
          location: newIncident.location || '',
          category: category.name, // ✅ Human-readable name (e.g., "Pets")
          subcategory: subcategory?.name || '', // ✅ Human-readable name (e.g., "Missing Pets")
          categoryUuid: category.id, // ✅ UUID for icon mapping
          subcategoryUuid: subcategory?.id || null, // ✅ UUID for filtering
          severity: 'medium' as const,
          status: 'active' as const,
          geometry: newIncident.geometry as any,
          centroidLat: lat,
          centroidLng: lng,
          regionIds: getRegionFromCoordinates(lat, lng) ? [getRegionFromCoordinates(lat, lng)!.id] : [],
          geocell: '', // Will be computed after full incident creation
          incidentTime: newIncident.publishedDate || new Date(),
          lastUpdated: new Date(),
          publishedAt: new Date(),
          userId: reporterUserId,
          properties: {
            ...(newIncident.properties as object || {}),
            id: newIncident.id,
            title: newIncident.title,
            description: newIncident.description || '',
            location: newIncident.location,
            category: category.name, // ✅ Store name in properties for backward compat
            categoryUuid: category.id, // ✅ Store UUID for icon lookups
            source: 'user',
            userReported: true,
            reporterId: reporterUserId
          },
          photoUrl: newIncident.photoUrl,
          verificationStatus: 'unverified' as const,
          // Add default values for fields that may be expected downstream
          tags: [],
          impact: 'local' as const,
          confidence: 0.8
        };

        // Compute geocell with full incident context
        unifiedIncident.geocell = computeGeocellForIncident(unifiedIncident);

        await storage.upsertUnifiedIncident('user', newIncident.id, unifiedIncident);
        console.log('✅ Incident immediately added to unified store for instant frontend display');
        
        // Return the unified incident so frontend can invalidate cache
        res.json({ 
          success: true, 
          incident: newIncident,
          unifiedIncident: unifiedIncident,
          message: 'Incident reported successfully'
        });
        
      } catch (unifiedError) {
        console.error('⚠️ Failed to add incident to unified store, but regular incident was created:', unifiedError);
        // Return regular incident even if unified update fails
        res.json(newIncident);
      }
      
      console.log('=== INCIDENT SUBMISSION DEBUG END ===');
    } catch (error: unknown) {
      console.error('=== INCIDENT SUBMISSION ERROR ===');
      console.error('Error type:', error instanceof Error ? error.constructor.name : 'Unknown');
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Request body that caused error:', JSON.stringify(req.body, null, 2));
      secureLogger.authError('Incident submission error', { user: req.user, error });
      console.error('=== END ERROR DEBUG ===');
      
      // Provide specific error codes and user-friendly messages
      let statusCode = 500;
      let errorCode = 'INCIDENT_SUBMISSION_FAILED';
      let userMessage = 'Failed to submit incident report';
      
      if (error instanceof z.ZodError) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        userMessage = 'Please check your form data and try again';
      } else if (error instanceof Error && error.message.includes('geocod')) {
        statusCode = 503;
        errorCode = 'GEOCODING_FAILED';
        userMessage = 'Unable to process location. Your report was saved but may not appear on the map.';
      } else if (error instanceof Error && error.message.includes('database')) {
        statusCode = 503;
        errorCode = 'DATABASE_ERROR';
        userMessage = 'Database temporarily unavailable. Please try again in a moment.';
      }
      
      res.status(statusCode).json({ 
        error: userMessage,
        code: errorCode,
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        debug: process.env.NODE_ENV === 'development' ? { 
          stack: error instanceof Error ? error.stack : undefined,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          requestBody: req.body,
          userId: (req.user as any)?.claims?.sub || (req.user as any)?.id
        } : undefined
      });
    }
  });

  // Update incident status - only allow creator to mark complete
  app.patch("/api/incidents/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const incidentId = req.params.id;
      const { status } = req.body;
      const userId = (req.user as any).claims.sub;

      if (!status || !['active', 'completed'].includes(status)) {
        return res.status(400).json({ error: "Status must be 'active' or 'completed'" });
      }

      // Get the incident to check if user is the creator
      const incident = await storage.getIncident(incidentId);
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }

      // Check if user is the creator (stored in properties.reporterId)
      const reporterId = (incident.properties as any)?.reporterId;
      if (reporterId !== userId) {
        return res.status(403).json({ error: "Only the incident creator can update status" });
      }

      // Update the incident status
      await storage.updateIncidentStatus(incidentId, status);
      
      res.json({ success: true, message: "Incident status updated successfully" });
    } catch (error) {
      console.error("Error updating incident status:", error);
      res.status(500).json({ error: "Failed to update incident status" });
    }
  });

  // Comments API endpoints
  app.get("/api/incidents/:incidentId/comments", async (req, res) => {
    try {
      const { incidentId } = req.params;
      const comments = await storage.getCommentsByIncidentId(incidentId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post("/api/incidents/:incidentId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const { incidentId } = req.params;
      
      // Check if user object exists and has expected structure
      if (!req.user || !req.user.id) {
        secureLogger.authError('User object missing or malformed for comment', { user: req.user });
        return res.status(401).json({ message: "User authentication failed" });
      }
      
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        incidentId,
        userId,
      });

      const comment = await storage.createComment(validatedData);
      
      // Create notification for replies
      if (comment.parentCommentId) {
        // This is a reply - notify the original comment author
        const parentComment = await storage.getCommentById(comment.parentCommentId);
        if (parentComment && parentComment.userId !== userId) {
          const displayName = user?.displayName || user?.firstName || 'Someone';
          await storage.createNotification({
            userId: parentComment.userId,
            type: 'comment_reply',
            title: 'New Reply',
            message: `${displayName} replied to your comment`,
            entityId: comment.id,
            entityType: 'comment',
            fromUserId: userId,
          });
        }
      }
      
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.patch("/api/comments/:commentId", isAuthenticated, async (req: any, res) => {
    try {
      const { commentId } = req.params;
      const userId = (req.user as any).claims.sub;

      // Check if user owns the comment
      const existingComments = await storage.getCommentsByIncidentId(''); // We'll need to get by comment ID
      // For now, we'll trust the user - in production, add proper ownership check

      const validatedData = z.object({
        content: z.string().min(1),
      }).parse(req.body);

      const comment = await storage.updateComment(commentId, validatedData);
      
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      res.json(comment);
    } catch (error) {
      console.error("Error updating comment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update comment" });
    }
  });

  // Delete incident comment with ownership check
  app.delete("/api/incidents/:incidentId/social/comments/:commentId", isAuthenticated, async (req: any, res) => {
    try {
      const { commentId } = req.params;
      
      // Safe extraction of user ID with proper null checks
      const userId = req.user?.claims?.sub || req.user?.id;
      
      if (!userId) {
        secureLogger.authError('Delete comment: No user ID found', { user: req.user });
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get the comment to verify ownership
      const comment = await storage.getIncidentCommentById(commentId);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      // Check if the user owns the comment
      if (comment.userId !== userId) {
        return res.status(403).json({ message: "You can only delete your own comments" });
      }

      // Delete the comment from database
      const success = await storage.deleteIncidentComment(commentId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Comment not found or not authorized" });
      }
      
      // If comment had a photo, try to delete it from object storage (but don't fail if photo doesn't exist)
      if (comment.photoUrl) {
        try {
          // Note: Photo deletion from object storage is not implemented yet
          // For now, just log that we would delete the photo
          console.log("Note: Comment had photo, but photo deletion not implemented yet:", comment.photoUrl);
        } catch (photoError: any) {
          // Log but don't fail the comment deletion if photo deletion fails
          console.log("Note: Could not delete associated photo:", photoError.message);
        }
      }
      
      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });


  // Legacy endpoint for backwards compatibility
  app.delete("/api/comments/:commentId", isAuthenticated, async (req: any, res) => {
    try {
      const { commentId } = req.params;
      const userId = (req.user as any).claims.sub;

      // Get the comment to verify ownership
      const comment = await storage.getCommentById(commentId);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      // Check if the user owns the comment
      if (comment.userId !== userId) {
        return res.status(403).json({ message: "You can only delete your own comments" });
      }

      const success = await storage.deleteComment(commentId);
      
      if (!success) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // ============================================================================
  // INCIDENT SOCIAL INTERACTION ROUTES - Comments and Likes for Unified Incidents
  // ============================================================================

  // Get incident comments
  app.get("/api/incidents/:incidentId/social/comments", async (req: any, res) => {
    try {
      const { incidentId } = req.params;
      // Get userId if user is authenticated for like information
      const userId = req.user?.claims?.sub;
      const comments = await storage.getIncidentComments(incidentId, userId);
      const count = await storage.getIncidentCommentsCount(incidentId);
      res.json({ comments, count });
    } catch (error) {
      console.error("Error fetching incident comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Add incident comment
  app.post("/api/incidents/:incidentId/social/comments", isAuthenticated, async (req: any, res) => {
    try {
      const { incidentId } = req.params;
      
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const validatedData = {
        incidentId,
        userId,
        parentCommentId: req.body.parentCommentId || null, // Support nested replies
        username: user.displayName || user.firstName || `User${userId.slice(0,4)}`,
        content: req.body.content,
        photoUrls: req.body.photoUrls || [] // Array of photo URLs from separate upload endpoint
      };

      // Basic validation
      if (!validatedData.content || validatedData.content.trim().length === 0) {
        return res.status(400).json({ message: "Comment content is required" });
      }

      if (validatedData.content.length > 1000) {
        return res.status(400).json({ message: "Comment too long" });
      }

      // Validate photoUrls array if provided
      if (validatedData.photoUrls && validatedData.photoUrls.length > 3) {
        return res.status(400).json({ message: "Maximum 3 photos allowed per comment" });
      }

      // Handle base64 photo uploads if provided
      let uploadedPhotoUrls: string[] = [];
      if (req.body.base64Photos && Array.isArray(req.body.base64Photos) && req.body.base64Photos.length > 0) {
        if (req.body.base64Photos.length > 3) {
          return res.status(400).json({ message: "Maximum 3 photos allowed per comment" });
        }

        const rateLimitCheck = checkPhotoUploadRateLimit(userId);
        if (!rateLimitCheck.allowed) {
          const resetDate = new Date(rateLimitCheck.resetTime!);
          return res.status(429).json({ 
            error: 'Upload rate limit exceeded',
            resetTime: resetDate.toISOString(),
            message: `Maximum ${UPLOADS_PER_HOUR} uploads per hour. Try again after ${resetDate.toLocaleTimeString()}.`
          });
        }

        try {
          const objectStorageService = new ObjectStorageService();
          const privateObjectDir = objectStorageService.getPrivateObjectDir();
          
          if (!privateObjectDir) {
            console.error('Object storage not configured for comment photos');
          } else {
            for (const base64Data of req.body.base64Photos) {
              try {
                // Extract base64 content (remove data URL prefix if present)
                const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
                if (!matches) {
                  console.error('Invalid base64 image format');
                  continue;
                }
                
                const imageType = matches[1];
                const base64Content = matches[2];
                const buffer = Buffer.from(base64Content, 'base64');
                
                // Validate file size (5MB max)
                if (buffer.length > 5 * 1024 * 1024) {
                  console.error('Image too large, skipping');
                  continue;
                }
                
                // Generate filename and upload
                const fileId = randomUUID();
                const filename = `comment-${fileId}.${imageType === 'jpeg' ? 'jpg' : imageType}`;
                const fullPath = `${privateObjectDir}/comment-photos/${filename}`;
                
                const parseObjectPath = (path: string) => {
                  if (!path.startsWith("/")) path = `/${path}`;
                  const pathParts = path.split("/");
                  const bucketName = pathParts[1];
                  const objectName = pathParts.slice(2).join("/");
                  return { bucketName, objectName };
                };
                
                const { bucketName, objectName } = parseObjectPath(fullPath);
                const bucket = objectStorageClient.bucket(bucketName);
                const file = bucket.file(objectName);
                
                await file.save(buffer, {
                  metadata: {
                    contentType: `image/${imageType}`,
                    metadata: {
                      uploadedBy: userId,
                      uploadedAt: new Date().toISOString(),
                    }
                  },
                });
                
                // Use our own proxy endpoint to serve the photo
                const proxyUrl = `/api/photos/comment-photos/${filename}`;
                uploadedPhotoUrls.push(proxyUrl);
              } catch (uploadError) {
                console.error('Error uploading base64 photo:', uploadError);
              }
            }
          }
        } catch (storageError) {
          console.error('Error with object storage for base64 photos:', storageError);
        }
      }

      // Merge any uploaded photos with provided photoUrls
      const finalPhotoUrls = [...(validatedData.photoUrls || []), ...uploadedPhotoUrls];
      validatedData.photoUrls = finalPhotoUrls.slice(0, 3); // Ensure max 3

      const comment = await storage.createIncidentComment(validatedData);
      const count = await storage.getIncidentCommentsCount(incidentId);
      
      res.status(201).json({ comment, count });
    } catch (error) {
      console.error("Error creating incident comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Add incident comment with secure photo upload (multipart form data)
  app.post("/api/incidents/:incidentId/social/comments/with-photo", isAuthenticated, secureUpload.single('photo'), async (req: any, res) => {
    try {
      const { incidentId } = req.params;
      
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check rate limiting for photo uploads
      if (req.file) {
        const rateLimitCheck = checkPhotoUploadRateLimit(userId);
        if (!rateLimitCheck.allowed) {
          const resetDate = new Date(rateLimitCheck.resetTime!);
          return res.status(429).json({ 
            error: 'Upload rate limit exceeded',
            resetTime: resetDate.toISOString(),
            message: `Maximum ${UPLOADS_PER_HOUR} uploads per hour. Try again after ${resetDate.toLocaleTimeString()}.`
          });
        }
      }

      // Validate comment data from form fields
      const formData = {
        content: req.body.content,
        parentCommentId: req.body.parentCommentId || null,
        photoAlt: req.body.photoAlt || null,
      };

      // Basic validation using the insertIncidentCommentSchema
      const validatedCommentData = insertIncidentCommentSchema.parse({
        incidentId,
        userId,
        username: user.displayName || user.firstName || `User${userId.slice(0,4)}`,
        ...formData,
      });

      let photoUrl = null;
      let photoSize = null;
      let photoVariants = null;

      // Handle secure photo upload if file is provided
      if (req.file) {
        try {
          // Validate file size
          if (req.file.size > MAX_FILE_SIZE) {
            return res.status(413).json({ 
              error: `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB` 
            });
          }

          // Secure validation using magic-byte detection
          const validation = await validateSecureImage(req.file.buffer, req.file.originalname);
          if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
          }

          const objectStorageService = new ObjectStorageService();
          const privateObjectDir = objectStorageService.getPrivateObjectDir();
          
          if (!privateObjectDir) {
            throw new Error('Object storage not configured');
          }
          
          // Generate secure filename
          const fileId = randomUUID();
          const baseFilename = `comment-${fileId}`;
          
          // Generate image variants with secure processing
          const { variants, paths } = await generateImageVariants(req.file.buffer, baseFilename);
          
          // Parse the object path to get bucket and object name
          const parseObjectPath = (path: string) => {
            if (!path.startsWith("/")) {
              path = `/${path}`;
            }
            const pathParts = path.split("/");
            if (pathParts.length < 3) {
              throw new Error("Invalid path: must contain at least a bucket name");
            }
            const bucketName = pathParts[1];
            const objectName = pathParts.slice(2).join("/");
            return { bucketName, objectName };
          };

          // Upload all variants to object storage
          const uploadPromises = Object.entries(variants).map(async ([size, buffer]) => {
            const fullPath = `${privateObjectDir}/comment-photos/${paths[size as keyof typeof paths]}`;
            const { bucketName, objectName } = parseObjectPath(fullPath);
            
            const bucket = objectStorageClient.bucket(bucketName);
            const file = bucket.file(objectName);
            
            await file.save(buffer, {
              metadata: {
                contentType: 'image/jpeg',
                metadata: {
                  uploadedBy: userId,
                  uploadedAt: new Date().toISOString(),
                  processed: 'true',
                  variant: size,
                  securityValidated: 'true',
                  originalFilename: req.file.originalname,
                  detectedType: validation.detectedType
                }
              },
              public: false, // Keep photos private initially
            });
            
            // Build URL with just the relative path within private directory
            const relativePath = `comment-photos/${paths[size as keyof typeof paths]}`;
            
            return {
              size,
              url: `/objects/${relativePath}`,
              path: fullPath
            };
          });

          const uploadedVariants = await Promise.all(uploadPromises);
          
          // Use medium variant as the main photo URL
          const mediumVariant = uploadedVariants.find(v => v.size === 'medium');
          photoUrl = mediumVariant?.url || uploadedVariants[0]?.url;
          photoSize = variants.medium.length;
          
          // Store variant information for potential future use
          photoVariants = uploadedVariants.reduce((acc, variant) => {
            acc[variant.size] = {
              url: variant.url,
              path: variant.path
            };
            return acc;
          }, {} as Record<string, { url: string; path: string }>);
          
          console.log(`Secure photo upload completed for comment: ${photoUrl}, size: ${photoSize} bytes, variants: ${Object.keys(photoVariants).join(', ')}`);
        } catch (uploadError) {
          console.error("Error uploading photo:", uploadError);
          return res.status(500).json({ 
            message: "Failed to upload photo",
            error: uploadError instanceof Error ? uploadError.message : 'Unknown error'
          });
        }
      }

      // Create comment with photo data
      const commentData = {
        ...validatedCommentData,
        photoUrl,
        photoSize,
      };

      const comment = await storage.createIncidentComment(commentData);
      const count = await storage.getIncidentCommentsCount(incidentId);
      
      res.status(201).json({ 
        comment, 
        count,
        photoVariants, // Include variant information in response
        message: req.file ? "Comment with secure photo created successfully" : "Comment created successfully"
      });
    } catch (error) {
      console.error("Error creating incident comment with photo:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid comment data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Delete incident comment (only by comment owner)
  app.delete("/api/incidents/:incidentId/social/comments/:commentId", isAuthenticated, async (req: any, res) => {
    try {
      const { incidentId, commentId } = req.params;
      
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = req.user.id;
      const success = await storage.deleteIncidentComment(commentId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Comment not found or not authorized" });
      }
      
      const count = await storage.getIncidentCommentsCount(incidentId);
      res.json({ message: "Comment deleted", count });
    } catch (error) {
      console.error("Error deleting incident comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });


  // Batch users lookup endpoint for community reports (MUST be before parameterized route)
  app.get('/api/users/batch', async (req, res) => {
    try {
      const { ids } = req.query;
      
      // Validate that ids parameter exists and is a string
      if (!ids || typeof ids !== 'string') {
        return res.status(400).json({ 
          error: 'Missing or invalid ids parameter. Expected comma-separated user IDs.' 
        });
      }
      
      // Parse and validate user IDs
      const userIds = ids.split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);
      
      // Validate that we have valid IDs
      if (userIds.length === 0) {
        return res.status(400).json({ 
          error: 'No valid user IDs provided' 
        });
      }
      
      // Limit to 100 IDs per request to prevent abuse
      if (userIds.length > 100) {
        return res.status(400).json({ 
          error: 'Too many user IDs requested. Maximum 100 IDs per request.' 
        });
      }
      
      // Fetch users from storage
      const users = await storage.getUsersByIds(userIds);
      
      // Transform to safe user format - only public fields
      const safeUsers: SafeUser[] = users.map(user => ({
        id: user.id,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.profileImageUrl, // Map profileImageUrl to avatarUrl
        accountType: user.accountType,
        isOfficialAgency: user.isOfficialAgency || false,
      }));
      
      // Return safe user data (missing users are simply not included in response)
      res.json(safeUsers);
      
    } catch (error) {
      console.error("Error fetching batch users:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });

  // User Profile Routes (parameterized routes must come after specific routes)
  app.get('/api/users/:userId', async (req: any, res) => {
    try {
      // Use the same auth pattern as other routes
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check privacy settings - only return public information for non-own profiles
      const currentUserId = req.user.id;
      if (currentUserId !== userId && user.profileVisibility === 'private') {
        return res.status(403).json({ message: "This profile is private" });
      }
      
      // Filter sensitive information for non-own profiles
      if (currentUserId !== userId) {
        const { phoneNumber, ...publicUser } = user;
        return res.json(user.profileVisibility === 'public' ? user : publicUser);
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Messaging Routes
  app.get('/api/conversations', async (req: any, res) => {
    try {
      // Use the same auth pattern as /api/auth/user
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.id;
      const conversations = await storage.getConversationsByUserId(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/conversations', async (req: any, res) => {
    try {
      // Use the same auth pattern as /api/auth/user
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { otherUserId } = z.object({
        otherUserId: z.string().min(1),
      }).parse(req.body);

      const currentUserId = req.user.id;
      
      // Check if conversation already exists
      let conversation = await storage.getConversationBetweenUsers(currentUserId, otherUserId);
      
      if (!conversation) {
        // Create new conversation
        conversation = await storage.createConversation({
          user1Id: currentUserId,
          user2Id: otherUserId,
        });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get('/api/conversations/:conversationId/messages', async (req: any, res) => {
    try {
      // Use the same auth pattern as /api/auth/user
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { conversationId } = req.params;
      const userId = req.user.id;
      
      // Verify user has access to this conversation
      const conversation = await storage.getConversationBetweenUsers(userId, "dummy"); // We'll check properly
      const conversations = await storage.getConversationsByUserId(userId);
      const hasAccess = conversations.some(c => c.id === conversationId);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this conversation" });
      }
      
      const messages = await storage.getMessagesByConversationId(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:conversationId/messages', async (req: any, res) => {
    try {
      // Use the same auth pattern as /api/auth/user
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { conversationId } = req.params;
      const { content } = z.object({
        content: z.string().min(1).max(1000),
      }).parse(req.body);

      const userId = req.user.id;
      
      // Verify user has access to this conversation
      const conversations = await storage.getConversationsByUserId(userId);
      const hasAccess = conversations.some(c => c.id === conversationId);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this conversation" });
      }
      
      const message = await storage.createMessage({
        conversationId,
        senderId: userId,
        content,
      });
      
      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.patch('/api/conversations/:conversationId/read', async (req: any, res) => {
    try {
      // Use the same auth pattern as /api/auth/user
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { conversationId } = req.params;
      const userId = req.user.id;
      
      // Verify user has access to this conversation
      const conversations = await storage.getConversationsByUserId(userId);
      const hasAccess = conversations.some(c => c.id === conversationId);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this conversation" });
      }
      
      await storage.markMessagesAsRead(conversationId, userId);
      res.json({ message: "Messages marked as read" });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  // Notification Routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User authentication failed" });
      }
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await storage.getNotifications(userId, limit);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/notifications/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user || !req.user.claims || !(req.user as any).claims.sub) {
        return res.status(401).json({ message: "User authentication failed" });
      }
      
      const userId = (req.user as any).claims.sub;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json(count);
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      res.status(500).json({ message: "Failed to fetch unread notification count" });
    }
  });

  app.patch('/api/notifications/:notificationId/read', isAuthenticated, async (req: any, res) => {
    try {
      const { notificationId } = req.params;
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      await storage.markNotificationAsRead(notificationId, userId);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.get('/api/messages/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user || !req.user.claims || !(req.user as any).claims.sub) {
        return res.status(401).json({ message: "User authentication failed" });
      }
      
      const userId = (req.user as any).claims.sub;
      const count = await storage.getUnreadMessageCount(userId);
      res.json(count);
    } catch (error) {
      console.error("Error fetching unread message count:", error);
      res.status(500).json({ message: "Failed to fetch unread message count" });
    }
  });

  // Object storage routes for profile photos (removed duplicate - see line 1903)

  // Serve object files
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Update profile photo
  app.put("/api/user/profile-photo", isAuthenticated, async (req, res) => {
    if (!req.body.photoURL) {
      return res.status(400).json({ error: "photoURL is required" });
    }

    try {
      const userId = (req.user as any)?.claims?.sub;
      const objectStorageService = new ObjectStorageService();
      
      // Normalize the object path from the uploaded URL
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.photoURL
      );

      // Set ACL policy for the uploaded photo (make it public since profile photos are visible to others)
      await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.photoURL,
        {
          owner: userId,
          visibility: "public",
        }
      );

      // Update user's profileImageUrl in the database
      const updatedUser = await storage.updateUserProfile(userId, {
        profileImageUrl: objectPath,
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        objectPath: objectPath,
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error setting profile photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Enhanced user profile routes
  app.put('/api/user/profile', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const profileData = req.body;
      
      const updatedUser = await storage.updateUserProfile(userId, profileData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // PATCH /api/users/me - Update current user's profile (used by onboarding wizard)
  app.patch('/api/users/me', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Validate allowed fields - accept both string and number arrays for notificationCategories
      const updateSchema = z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        preferredLocation: z.string().nullable().optional(),
        preferredLocationLat: z.number().nullable().optional(),
        preferredLocationLng: z.number().nullable().optional(),
        preferredLocationBounds: z.any().nullable().optional(),
        distanceFilter: z.enum(['1km', '2km', '5km', '10km', '25km', '50km']).optional(),
        notificationsEnabled: z.boolean().optional(),
        notificationCategories: z.array(z.union([z.number(), z.string()])).nullable().optional(),
        notificationRadius: z.enum(['1km', '2km', '5km', '10km', '25km', '50km']).optional(),
        onboardingCompleted: z.boolean().optional(),
      });
      
      const parsed = updateSchema.parse(req.body);
      
      // Normalize notificationCategories to numbers for consistency
      const profileData = {
        ...parsed,
        notificationCategories: parsed.notificationCategories 
          ? parsed.notificationCategories.map(c => typeof c === 'string' ? parseInt(c, 10) : c)
          : parsed.notificationCategories
      };
      
      const updatedUser = await storage.updateUserProfile(userId, profileData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Clear user cache so next auth request gets fresh data
      if ((app as any).clearUserCache) {
        (app as any).clearUserCache(userId);
      }
      
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Business account upgrade endpoint
  app.post('/api/users/upgrade-to-business', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const businessData = z.object({
        businessName: z.string().min(1, "Business name is required"),
        businessCategory: z.string().min(1, "Business category is required"),
        businessDescription: z.string().optional(),
        businessWebsite: z.string().optional(),
        businessPhone: z.string().optional(),
        businessAddress: z.string().optional(),
      }).parse(req.body);

      const updatedUser = await storage.upgradeToBusinessAccount(userId, businessData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error upgrading to business account:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid business data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to upgrade to business account" });
    }
  });

  // Get campaigns for current business user
  app.get('/api/ads/my-campaigns', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      secureLogger.authDebug('Campaigns request', {
        hasUserId: !!userId,
        user: req.user
      });
      const user = await storage.getUser(userId);
      secureLogger.authDebug('Campaign user lookup', {
        hasUser: !!user,
        hasBusinessAccount: user?.accountType === 'business'
      });
      
      if (!user || user.accountType !== 'business') {
        secureLogger.authDebug('Business account check failed', {
          hasUser: !!user,
          accountType: user?.accountType
        });
        return res.status(403).json({ message: "Business account required" });
      }

      const campaigns = await storage.getUserCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching user campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  // Get analytics for current business user
  app.get('/api/ads/analytics', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.accountType !== 'business') {
        return res.status(403).json({ message: "Business account required" });
      }

      const analytics = await storage.getUserCampaignAnalytics(userId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching campaign analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Get single ad by ID (for editing)
  app.get('/api/ads/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.claims?.sub;
      
      const ad = await storage.getAdCampaign(id);
      
      if (!ad) {
        return res.status(404).json({ message: "Ad not found" });
      }

      // Check if user owns this ad (business users can only edit their own ads)
      const user = await storage.getUser(userId);
      if (user?.accountType === 'business') {
        const userCampaigns = await storage.getUserCampaigns(userId);
        const userOwnsAd = userCampaigns.some(campaign => campaign.id === id);
        
        if (!userOwnsAd) {
          return res.status(403).json({ message: "You can only edit your own ads" });
        }
      }

      res.json(ad);
    } catch (error) {
      console.error("Error fetching ad:", error);
      res.status(500).json({ message: "Failed to fetch ad" });
    }
  });

  // Update ad (for resubmission)
  app.put('/api/ads/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.claims?.sub;
      
      // Check if user owns this ad
      const user = await storage.getUser(userId);
      if (user?.accountType !== 'business') {
        return res.status(403).json({ message: "Business account required" });
      }

      const userCampaigns = await storage.getUserCampaigns(userId);
      const userOwnsAd = userCampaigns.some(campaign => campaign.id === id);
      
      if (!userOwnsAd) {
        return res.status(403).json({ message: "You can only edit your own ads" });
      }

      // Validate ad data
      const adData = z.object({
        businessName: z.string().min(1, "Business name is required"),
        title: z.string().min(1, "Title is required"),
        content: z.string().min(1, "Content is required"),
        websiteUrl: z.string().optional(),
        address: z.string().optional(),
        suburb: z.string().min(1, "Suburb is required"),
        cta: z.string().min(1, "Call-to-action is required"),
        targetSuburbs: z.array(z.string()).optional(),
        dailyBudget: z.string(),
        totalBudget: z.string(),
        logoUrl: z.string().optional(),
        backgroundUrl: z.string().optional(),
        template: z.string().optional(),
        status: z.enum(['pending', 'active', 'paused', 'rejected']).optional()
      }).parse(req.body);

      // Auto-populate target suburbs with the main suburb if not provided
      if (!adData.targetSuburbs || adData.targetSuburbs.length === 0) {
        adData.targetSuburbs = [adData.suburb];
      }

      // Set default total budget based on daily budget if not provided
      if (!adData.totalBudget) {
        const dailyAmount = parseFloat(adData.dailyBudget);
        adData.totalBudget = (dailyAmount * 30).toString(); // 30 days default
      }

      const updatedAd = await storage.updateAdCampaign(id, {
        businessName: adData.businessName,
        title: adData.title,
        content: adData.content,
        imageUrl: adData.logoUrl || null,
        websiteUrl: adData.websiteUrl || null,
        address: adData.address || null,
        suburb: adData.suburb,
        cta: adData.cta,
        targetSuburbs: adData.targetSuburbs,
        dailyBudget: adData.dailyBudget,
        totalBudget: adData.totalBudget,
        status: adData.status || 'pending', // Default to pending for resubmission
        rejectionReason: null, // Clear rejection reason when updating
        updatedAt: new Date()
      });

      if (!updatedAd) {
        return res.status(404).json({ message: "Ad not found" });
      }

      console.log(`Ad updated and resubmitted: ${updatedAd.businessName} - ${updatedAd.title}`);
      res.json({ 
        success: true, 
        ad: updatedAd,
        message: "Ad updated and resubmitted for review" 
      });

    } catch (error) {
      console.error("Error updating ad:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Invalid ad data", 
          errors: error.errors 
        });
      } else {
        res.status(500).json({ message: "Failed to update ad" });
      }
    }
  });

  // Complete account setup for new users
  app.post('/api/users/complete-setup', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      
      const setupData = z.object({
        accountType: z.enum(['regular', 'business']),
        businessName: z.string().optional(),
        businessCategory: z.string().optional(),
        businessDescription: z.string().optional(),
        businessWebsite: z.string().optional(),
        businessPhone: z.string().optional(),
        businessAddress: z.string().optional(),
      }).parse(req.body);

      // Validate business data if business account
      if (setupData.accountType === 'business') {
        if (!setupData.businessName?.trim()) {
          return res.status(400).json({ message: "Business name is required for business accounts" });
        }
        if (!setupData.businessCategory) {
          return res.status(400).json({ message: "Business category is required for business accounts" });
        }
      }

      // Update user with account setup data
      const updatedUser = await storage.completeUserSetup(userId, setupData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error completing account setup:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid setup data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to complete account setup" });
    }
  });

  app.get('/api/users/suburb/:suburb', async (req, res) => {
    try {
      const { suburb } = req.params;
      const users = await storage.getUsersBySuburb(suburb);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users by suburb:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create test business user for development
  app.post('/api/test/create-business-user', async (req, res) => {
    try {
      const user = await storage.createTestBusinessUser();
      res.json({ success: true, user });
    } catch (error) {
      console.error("Error creating test business user:", error);
      res.status(500).json({ message: "Failed to create test business user" });
    }
  });

  // Initialize admin user on startup
  try {
    await storage.createAdminUser();
    console.log('Admin user created/verified');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
  
  // Automatically seed categories and subcategories on startup
  try {
    const seedResult = await seedCategoriesIfNeeded();
    if (seedResult.success) {
      console.log('Categories seeding completed:', seedResult.message);
    } else {
      console.error('Categories seeding failed:', seedResult.error);
    }
  } catch (error) {
    console.error('Error during automatic category seeding:', error);
  }

  // Email/Password authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.authenticateUser(email, password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set up session (simple approach)
      (req.session as any).userId = user.id;
      (req.session as any).authenticated = true;
      
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          accountType: user.accountType,
          businessName: user.businessName
        }
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ success: true });
    });
  });

  // Simple session-based auth check (replace isAuthenticated)
  app.get('/api/auth/user', async (req, res) => {
    if (!(req.session as any).authenticated || !(req.session as any).userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accountType: user.accountType,
        businessName: user.businessName,
        preferredLocation: user.preferredLocation,
        preferredLocationLat: user.preferredLocationLat,
        preferredLocationLng: user.preferredLocationLng,
        distanceFilter: user.distanceFilter
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Comment voting routes
  app.post('/api/comments/:commentId/vote', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const { commentId } = req.params;
      const { voteType } = req.body;
      
      if (!['helpful', 'not_helpful'].includes(voteType)) {
        return res.status(400).json({ message: "Invalid vote type" });
      }
      
      const vote = await storage.voteOnComment({
        userId,
        commentId,
        voteType
      });
      
      res.json(vote);
    } catch (error) {
      console.error("Error voting on comment:", error);
      res.status(500).json({ message: "Failed to vote on comment" });
    }
  });

  app.get('/api/comments/:commentId/user-vote', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const { commentId } = req.params;
      
      const vote = await storage.getUserVoteOnComment(userId, commentId);
      res.json(vote || null);
    } catch (error) {
      console.error("Error fetching user vote:", error);
      res.status(500).json({ message: "Failed to fetch vote" });
    }
  });

  // Neighborhood group routes
  app.get('/api/neighborhood-groups', async (req, res) => {
    try {
      const { suburb } = req.query;
      
      let groups;
      if (suburb) {
        groups = await storage.getGroupsBySuburb(suburb as string);
      } else {
        groups = await storage.getNeighborhoodGroups();
      }
      
      res.json(groups);
    } catch (error) {
      console.error("Error fetching neighborhood groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  app.post('/api/neighborhood-groups', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const groupData = {
        ...req.body,
        createdBy: userId
      };
      
      const group = await storage.createNeighborhoodGroup(groupData);
      
      // Auto-join the creator to the group
      await storage.joinNeighborhoodGroup({
        userId,
        groupId: group.id,
        role: 'admin'
      });
      
      res.json(group);
    } catch (error) {
      console.error("Error creating neighborhood group:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  app.post('/api/neighborhood-groups/:groupId/join', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const { groupId } = req.params;
      
      const membership = await storage.joinNeighborhoodGroup({
        userId,
        groupId,
        role: 'member'
      });
      
      res.json(membership);
    } catch (error) {
      console.error("Error joining neighborhood group:", error);
      res.status(500).json({ message: "Failed to join group" });
    }
  });

  app.delete('/api/neighborhood-groups/:groupId/leave', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const { groupId } = req.params;
      
      const success = await storage.leaveNeighborhoodGroup(userId, groupId);
      
      if (!success) {
        return res.status(404).json({ message: "Membership not found" });
      }
      
      res.json({ success });
    } catch (error) {
      console.error("Error leaving neighborhood group:", error);
      res.status(500).json({ message: "Failed to leave group" });
    }
  });

  // Emergency contact routes
  app.get('/api/emergency-contacts', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const contacts = await storage.getEmergencyContacts(userId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching emergency contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post('/api/emergency-contacts', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const contactData = {
        ...req.body,
        userId
      };
      
      const contact = await storage.createEmergencyContact(contactData);
      res.json(contact);
    } catch (error) {
      console.error("Error creating emergency contact:", error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.delete('/api/emergency-contacts/:contactId', isAuthenticated, async (req, res) => {
    try {
      const { contactId } = req.params;
      const success = await storage.deleteEmergencyContact(contactId);
      
      if (!success) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      res.json({ success });
    } catch (error) {
      console.error("Error deleting emergency contact:", error);
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // Safety check-in routes
  app.post('/api/safety-checkins', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const checkInData = {
        ...req.body,
        userId
      };
      
      const checkIn = await storage.createSafetyCheckIn(checkInData);
      res.json(checkIn);
    } catch (error) {
      console.error("Error creating safety check-in:", error);
      res.status(500).json({ message: "Failed to create check-in" });
    }
  });

  app.get('/api/safety-checkins/incident/:incidentId', async (req, res) => {
    try {
      const { incidentId } = req.params;
      const checkIns = await storage.getSafetyCheckIns(incidentId);
      res.json(checkIns);
    } catch (error) {
      console.error("Error fetching safety check-ins:", error);
      res.status(500).json({ message: "Failed to fetch check-ins" });
    }
  });

  app.get('/api/safety-checkins/user', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const checkIns = await storage.getUserSafetyCheckIns(userId);
      res.json(checkIns);
    } catch (error) {
      console.error("Error fetching user safety check-ins:", error);
      res.status(500).json({ message: "Failed to fetch check-ins" });
    }
  });
  
  // Seed categories with hierarchical structure
  app.post("/api/categories/seed", async (req, res) => {
    try {
      const result = await seedCategoriesIfNeeded();
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error("Error seeding categories:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to seed categories", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Get all categories - resilient endpoint that returns empty array on error
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      // Return empty array instead of 500 to prevent frontend crashes
      // Categories will be populated once seeding completes in the background
      res.json([]);
    }
  });
  
  // Get subcategories (all or by category) - resilient endpoint
  app.get("/api/subcategories", async (req, res) => {
    try {
      const categoryId = req.query.categoryId as string | undefined;
      const subcategories = await storage.getSubcategories(categoryId);
      res.json(subcategories || []);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      // Return empty array instead of 500 to prevent frontend crashes
      res.json([]);
    }
  });

  // Create a new category
  app.post("/api/categories", async (req, res) => {
    try {
      const categoryData = req.body;
      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  // Create a new subcategory
  app.post("/api/subcategories", async (req, res) => {
    try {
      const subcategoryData = req.body;
      const subcategory = await storage.createSubcategory(subcategoryData);
      res.json(subcategory);
    } catch (error) {
      console.error("Error creating subcategory:", error);
      res.status(500).json({ error: "Failed to create subcategory" });
    }
  });

  // Object Storage endpoints for photo uploads
  
  // Get upload URL for photos
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Process uploaded image and return viewing URL
  app.post("/api/objects/process-upload", isAuthenticated, async (req, res) => {
    try {
      const { uploadURL, type } = req.body;
      
      console.log('Processing upload URL:', uploadURL);
      
      if (!uploadURL) {
        return res.status(400).json({ error: "Upload URL is required" });
      }
      
      // Extract the object path from the upload URL
      const url = new URL(uploadURL);
      console.log('Parsed URL pathname:', url.pathname);
      
      const pathMatch = url.pathname.match(/^\/([^\/]+)\/(.+)$/);
      
      if (!pathMatch) {
        console.error('Invalid upload URL format. Expected /{bucket}/{path}, got:', url.pathname);
        return res.status(400).json({ error: `Invalid upload URL format: ${url.pathname}` });
      }
      
      const bucketName = pathMatch[1];
      const fullObjectPath = pathMatch[2]; // e.g., "uploads/uuid"
      
      console.log('Bucket:', bucketName, 'Object path:', fullObjectPath);
      
      // The object path should be in uploads/ directory
      if (!fullObjectPath.startsWith('uploads/')) {
        console.error('Object not in uploads directory:', fullObjectPath);
        return res.status(400).json({ error: "Object not in uploads directory" });
      }
      
      // Create a viewing URL that goes through our server
      const viewURL = `/objects/${fullObjectPath}`;
      
      console.log(`✅ Processed ${type} upload: ${uploadURL} -> ${viewURL}`);
      res.json({ viewURL });
      
    } catch (error: any) {
      console.error("Error processing upload:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ error: `Failed to process upload: ${error.message}` });
    }
  });

  // Push notification endpoints
  
  // Get VAPID public key - needed for push subscription
  app.get('/api/push/vapid-key', (req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return res.status(503).json({ error: 'Push notifications not configured' });
    }
    res.json({ publicKey });
  });

  // Subscribe to push notifications
  app.post('/api/push/subscribe', isAuthenticated, async (req, res) => {
    try {
      console.log('[Push Subscribe] Request received');
      const { subscription } = req.body;
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;

      console.log('[Push Subscribe] User ID:', userId);
      console.log('[Push Subscribe] Has subscription:', !!subscription);

      if (!subscription || !userId) {
        console.error('[Push Subscribe] Missing subscription or userId');
        return res.status(400).json({ error: 'Invalid subscription data' });
      }

      // Extract keys from the subscription
      const { endpoint, keys } = subscription;
      console.log('[Push Subscribe] Endpoint:', endpoint?.substring(0, 50) + '...');
      console.log('[Push Subscribe] Has keys:', !!keys, 'p256dh:', !!keys?.p256dh, 'auth:', !!keys?.auth);
      
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        console.error('[Push Subscribe] Invalid format - missing endpoint or keys');
        return res.status(400).json({ error: 'Invalid subscription format - missing endpoint or keys' });
      }

      // Save subscription to database
      await storage.savePushSubscription({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });
      
      console.log(`✅ Push subscription saved for user ${userId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Push Subscribe] Error:', error?.message);
      console.error('[Push Subscribe] Stack:', error?.stack);
      res.status(500).json({ error: 'Failed to save subscription' });
    }
  });

  app.post('/api/push/unsubscribe', isAuthenticated, async (req, res) => {
    try {
      const { endpoint } = req.body;
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;

      if (!endpoint || !userId) {
        return res.status(400).json({ error: 'Invalid unsubscribe data' });
      }

      // Remove subscription from database
      await storage.removePushSubscription(endpoint);
      
      console.log(`✅ Push subscription removed for user ${userId}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing push subscription:', error);
      res.status(500).json({ error: 'Failed to remove subscription' });
    }
  });

  // Get notifications for current user
  app.get('/api/notifications', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.put('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      
      await storage.markNotificationAsRead(id, userId);
      
      res.json({ success: true, message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Test push notification endpoint (for development)
  app.post('/api/push/test', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      
      // In a real implementation, you'd fetch user's subscription from database
      // For demo purposes, we'll return success without sending actual notification
      secureLogger.authDebug('Test push notification requested', {
        hasUserId: !!userId
      });
      
      res.json({ 
        success: true, 
        message: 'Push notification system is ready. Subscription management needed for actual sending.' 
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  });

  // Incident Follow-up Routes
  app.get('/api/incidents/:incidentId/follow-ups', async (req, res) => {
    try {
      const { incidentId } = req.params;
      const followUps = await storage.getIncidentFollowUps(incidentId);
      res.json(followUps);
    } catch (error) {
      console.error("Error fetching incident follow-ups:", error);
      res.status(500).json({ message: "Failed to fetch incident follow-ups" });
    }
  });

  app.post('/api/incidents/:incidentId/follow-ups', isAuthenticated, async (req: any, res) => {
    try {
      const { incidentId } = req.params;
      const { status, description, photoUrl } = req.body;
      const userId = (req.user as any).claims.sub;

      // Validate required fields
      if (!status || !description) {
        return res.status(400).json({ message: "Status and description are required" });
      }

      const followUp = await storage.createIncidentFollowUp({
        incidentId,
        userId,
        status,
        description,
        photoUrl: photoUrl || null,
      });

      res.json(followUp);
    } catch (error) {
      console.error("Error creating incident follow-up:", error);
      res.status(500).json({ message: "Failed to create incident follow-up" });
    }
  });

  // Admin middleware for role checking
  const isAdmin = async (req: any, res: any, next: any) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      next();
    } catch (error) {
      console.error("Admin auth error:", error);
      res.status(500).json({ message: "Admin authentication failed" });
    }
  };

  // Admin Routes for Ad Management
  app.get('/api/admin/ads/pending', isAdmin, async (req, res) => {
    try {
      const pendingAds = await storage.getPendingAds();
      res.json(pendingAds);
    } catch (error) {
      console.error("Error fetching pending ads:", error);
      res.status(500).json({ message: "Failed to fetch pending ads" });
    }
  });

  app.put('/api/admin/ads/:id/approve', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id; // Admin user ID
      const updatedAd = await storage.updateAdCampaign(id, { status: 'active' });
      
      if (!updatedAd) {
        return res.status(404).json({ message: "Ad not found" });
      }
      
      // TODO: Create notification for business user about approval
      // Note: Need to add userId field to adCampaigns schema to properly link ads to users
      // For now, notification system will be implemented when user ownership is added
      
      console.log(`Admin approved ad: ${updatedAd.businessName} - ${updatedAd.title}`);
      res.json({ success: true, ad: updatedAd });
    } catch (error) {
      console.error("Error approving ad:", error);
      res.status(500).json({ message: "Failed to approve ad" });
    }
  });

  app.put('/api/admin/ads/:id/reject', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const updatedAd = await storage.updateAdCampaign(id, { 
        status: 'rejected',
        rejectionReason: reason || 'Does not meet guidelines'
      });
      
      if (!updatedAd) {
        return res.status(404).json({ message: "Ad not found" });
      }
      
      // TODO: Add notification system when userId field is added to adCampaigns schema
      // For now, the rejection reason is stored and will be visible in business dashboard
      
      console.log(`Admin rejected ad: ${updatedAd.businessName} - ${updatedAd.title}`);
      res.json({ success: true, ad: updatedAd });
    } catch (error) {
      console.error("Error rejecting ad:", error);
      res.status(500).json({ message: "Failed to reject ad" });
    }
  });

  // Initialize default billing plan if it doesn't exist
  async function initializeBillingPlans() {
    try {
      const existingPlans = await storage.getBillingPlans();
      if (existingPlans.length === 0) {
        await storage.createBillingPlan({
          name: "Basic Daily",
          description: "Standard daily advertising rate with 7-day minimum",
          pricePerDay: "8.00",
          minimumDays: 7,
          features: ["Standard placement", "Analytics dashboard", "Campaign management"],
          isActive: true
        });
        console.log('✅ Default billing plan created');
      }
    } catch (error) {
      console.error('Error initializing billing plans:', error);
    }
  }
  
  initializeBillingPlans();

  // BILLING ENDPOINTS
  
  // Get available billing plans
  app.get('/api/billing/plans', async (req, res) => {
    try {
      const plans = await storage.getBillingPlans();
      res.json(plans);
    } catch (error) {
      console.error('Error fetching billing plans:', error);
      res.status(500).json({ message: 'Failed to fetch billing plans' });
    }
  });

  // Get billing quote for a campaign
  app.post('/api/billing/quote', isAuthenticated, async (req, res) => {
    try {
      const { campaignId, days } = req.body;
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;

      if (!campaignId || !days || days < 7) {
        return res.status(400).json({ message: 'Campaign ID and minimum 7 days required' });
      }

      // Get the default plan (could be made configurable later)
      const plans = await storage.getBillingPlans();
      const plan = plans.find(p => p.isActive) || plans[0];

      if (!plan) {
        return res.status(404).json({ message: 'No billing plans available' });
      }

      const dailyRate = parseFloat(plan.pricePerDay);
      const totalAmount = dailyRate * days;
      const amountCents = Math.round(totalAmount * 100); // Convert to cents for Stripe

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days);

      res.json({
        campaignId,
        days,
        dailyRate: plan.pricePerDay,
        totalAmount: totalAmount.toFixed(2),
        amountCents,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        planId: plan.id,
        minDaysEnforced: Math.max(days, plan.minimumDays || 7)
      });
    } catch (error) {
      console.error('Error creating billing quote:', error);
      res.status(500).json({ message: 'Failed to create quote' });
    }
  });

  // Create Stripe payment intent for campaign billing
  app.post('/api/billing/create-payment-intent', isAuthenticated, async (req, res) => {
    try {
      // Enhanced request validation using Zod
      const paymentIntentSchema = z.object({
        campaignId: z.string().min(1, 'Campaign ID is required'),
        days: z.number().int().min(7, 'Minimum 7 days required').max(365, 'Maximum 365 days allowed'),
        planId: z.string().optional()
      });

      const validatedData = paymentIntentSchema.parse(req.body);
      const { campaignId, days, planId } = validatedData;
      
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'User authentication failed' });
      }

      if (!stripe) {
        return res.status(503).json({ message: 'Payment processing unavailable' });
      }

      // Get plan and calculate amount server-side (never trust client)
      const plans = await storage.getBillingPlans();
      const plan = plans.find(p => p.id === planId) || plans.find(p => p.isActive) || plans[0];

      if (!plan) {
        return res.status(404).json({ message: 'Billing plan not found' });
      }

      const dailyRate = parseFloat(plan.pricePerDay);
      const enforcedDays = Math.max(days, plan.minimumDays || 7);
      const totalAmount = dailyRate * enforcedDays;
      const amountCents = Math.round(totalAmount * 100);

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + enforcedDays);

      // Create billing cycle (pending status)
      const billingCycle = await storage.createBillingCycle({
        campaignId,
        planId: plan.id,
        businessId: userId,
        status: 'pending',
        startDate,
        endDate,
        dailyRate: plan.pricePerDay,
        totalDays: enforcedDays,
        totalAmount: totalAmount.toFixed(2)
      });

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'aud',
        metadata: {
          billing_cycle_id: billingCycle.id,
          campaign_id: campaignId,
          business_id: userId,
          days: enforcedDays.toString()
        }
      });

      // Create payment record (pending status)
      await storage.createPayment({
        billingCycleId: billingCycle.id,
        businessId: userId,
        amount: totalAmount.toFixed(2),
        currency: 'AUD',
        status: 'pending',
        paymentMethod: 'stripe',
        stripePaymentIntentId: paymentIntent.id,
        daysCharged: enforcedDays,
        periodStart: startDate,
        periodEnd: endDate
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        billingCycleId: billingCycle.id,
        amount: totalAmount.toFixed(2),
        days: enforcedDays
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      
      // Handle Zod validation errors with detailed messages
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      res.status(500).json({ message: 'Failed to create payment intent' });
    }
  });

  // Get business payment history
  app.get('/api/billing/history', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      const payments = await storage.getBusinessPayments(userId);
      res.json(payments);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      res.status(500).json({ message: 'Failed to fetch payment history' });
    }
  });

  // Stripe webhook endpoint - CRITICAL for payment completion
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      console.error('Missing Stripe webhook signature or secret');
      return res.status(400).json({ error: 'Missing webhook signature or secret' });
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature for security
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    try {
      // Handle the payment completion event
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const { billing_cycle_id, business_id } = paymentIntent.metadata || {};

        if (!billing_cycle_id || !business_id) {
          console.error('Missing metadata in payment intent:', paymentIntent.id);
          return res.status(400).json({ error: 'Missing payment metadata' });
        }

        console.log(`Processing payment completion for billing cycle: ${billing_cycle_id}`);

        // Find the payment record by Stripe payment intent ID
        const existingPayments = await storage.getBusinessPayments(business_id);
        const payment = existingPayments.find(p => p.stripePaymentIntentId === paymentIntent.id);

        if (!payment) {
          console.error('Payment record not found for payment intent:', paymentIntent.id);
          return res.status(404).json({ error: 'Payment record not found' });
        }

        // Idempotent processing - check if already processed
        if (payment.status === 'completed') {
          console.log('Payment already processed, skipping:', payment.id);
          return res.json({ received: true, status: 'already_processed' });
        }

        // Update payment status to completed
        await storage.updatePaymentStatus(payment.id, 'completed', new Date());

        // Update billing cycle status to active
        await storage.updateBillingCycleStatus(billing_cycle_id, 'active');

        console.log(`Payment completed successfully: ${payment.id}, Billing cycle activated: ${billing_cycle_id}`);

        return res.json({ 
          received: true, 
          status: 'processed',
          payment_id: payment.id,
          billing_cycle_id 
        });
      }

      // Handle payment failure events
      if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const { billing_cycle_id } = paymentIntent.metadata || {};

        console.log('Payment failed for payment intent:', paymentIntent.id);

        // Find and update payment record
        const { business_id } = paymentIntent.metadata || {};
        if (!business_id) {
          console.error('Missing business_id in payment intent metadata:', paymentIntent.id);
          return res.json({ received: true, status: 'missing_business_id' });
        }
        
        const existingPayments = await storage.getBusinessPayments(business_id);
        const payment = existingPayments.find(p => p.stripePaymentIntentId === paymentIntent.id);

        if (payment) {
          await storage.updatePaymentStatus(payment.id, 'failed');
          if (billing_cycle_id) {
            await storage.updateBillingCycleStatus(billing_cycle_id, 'failed');
          }
        }

        return res.json({ received: true, status: 'payment_failed' });
      }

      console.log('Unhandled webhook event type:', event.type);
      return res.json({ received: true, status: 'unhandled_event' });

    } catch (error) {
      console.error('Error processing webhook:', error);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // DEPRECATED: Legacy traffic status endpoint
  app.get('/api/traffic/status', (req, res) => {
    res.status(410).json({ 
      error: 'This endpoint is deprecated. Legacy background ingestion has been removed.',
      migration: {
        old: '/api/traffic/status',
        new: '/api/unified',
        note: 'Use the unified API endpoint for current data. Status monitoring is now handled by the unified pipeline.'
      }
    });
  });

  // ============================================================================
  // POSTS API - Single source of truth for community posts
  // ============================================================================
  
  // Get all posts as GeoJSON (for feed and map)
  app.get('/api/posts', async (req, res) => {
    try {
      const { 
        category, 
        status: statusFilter, 
        southwest, 
        northeast,
        userId 
      } = req.query;

      let result;

      // Spatial filtering for map viewport
      if (southwest && northeast) {
        const [swLat, swLng] = (southwest as string).split(',').map(Number);
        const [neLat, neLng] = (northeast as string).split(',').map(Number);
        
        const postsInArea = await storage.getPostsInArea(
          [Math.min(swLat, neLat), Math.min(swLng, neLng)],
          [Math.max(swLat, neLat), Math.max(swLng, neLng)]
        );
        
        // Convert to GeoJSON - preserve actual source from post root level or properties
        result = {
          type: 'FeatureCollection' as const,
          features: postsInArea.map(post => {
            const postProps = post.properties as any || {};
            // Read source from root level first (where it's stored), then fallback to properties
            const actualSource = post.source || postProps.source || 'user';
            const isTmrPost = actualSource === 'tmr';
            const isEmergencyPost = actualSource === 'emergency';
            
            return {
              type: 'Feature' as const,
              id: post.id,
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
                categoryId: post.categoryId,
                categoryUuid: post.categoryId,
                subcategoryId: post.subcategoryId,
                status: post.status,
                userId: post.userId,
                reactionsCount: post.reactionsCount || 0,
                commentsCount: post.commentsCount || 0,
                createdAt: post.createdAt?.toISOString(),
                updatedAt: post.updatedAt?.toISOString(),
                centroidLat: post.centroidLat,
                centroidLng: post.centroidLng,
                source: actualSource,
                userReported: !isTmrPost && !isEmergencyPost,
                iconType: postProps.iconType || (isTmrPost ? 'traffic' : isEmergencyPost ? 'emergency' : undefined),
                ...postProps,
              }
            };
          })
        };
      }
      // User-specific posts - preserve actual source from post root level or properties
      else if (userId) {
        const userPosts = await storage.getPostsByUser(userId as string);
        result = {
          type: 'FeatureCollection' as const,
          features: userPosts.map(post => {
            const postProps = post.properties as any || {};
            // Read source from root level first (where it's stored), then fallback to properties
            const actualSource = post.source || postProps.source || 'user';
            const isTmrPost = actualSource === 'tmr';
            const isEmergencyPost = actualSource === 'emergency';
            
            return {
              type: 'Feature' as const,
              id: post.id,
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
                categoryId: post.categoryId,
                categoryUuid: post.categoryId,
                subcategoryId: post.subcategoryId,
                status: post.status,
                userId: post.userId,
                reactionsCount: post.reactionsCount || 0,
                commentsCount: post.commentsCount || 0,
                createdAt: post.createdAt?.toISOString(),
                updatedAt: post.updatedAt?.toISOString(),
                centroidLat: post.centroidLat,
                centroidLng: post.centroidLng,
                source: actualSource,
                userReported: !isTmrPost && !isEmergencyPost,
                iconType: postProps.iconType || (isTmrPost ? 'traffic' : isEmergencyPost ? 'emergency' : undefined),
                ...postProps,
              }
            };
          })
        };
      }
      // All posts with enriched data
      else {
        result = await storage.getPostsAsGeoJSON();
      }

      // Apply additional filters
      if (category || statusFilter) {
        result.features = result.features.filter(feature => {
          const props = feature.properties;
          if (category && props.categoryId !== category && props.category !== category) return false;
          if (statusFilter && props.status !== statusFilter) return false;
          return true;
        });
      }

      // Generate ETag for HTTP caching
      const etag = `W/"posts-${result.features.length}-${Date.now()}"`;
      
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }

      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({ 
        error: 'Failed to fetch posts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get single post by ID
  app.get('/api/posts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const post = await storage.getPost(id);
      
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Get category info
      let category = null;
      let subcategory = null;
      if (post.categoryId) {
        category = await storage.getCategory(post.categoryId);
      }
      if (post.subcategoryId) {
        subcategory = await storage.getSubcategory(post.subcategoryId);
      }

      // Get user info
      const user = await storage.getUser(post.userId);

      res.json({
        ...post,
        category: category?.name,
        categoryIcon: category?.icon,
        categoryColor: category?.color,
        subcategory: subcategory?.name,
        userName: user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Anonymous',
        userAvatar: user?.profileImageUrl,
      });
    } catch (error) {
      console.error('Error fetching post:', error);
      res.status(500).json({ error: 'Failed to fetch post' });
    }
  });

  // Create new post (authenticated)
  app.post('/api/posts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
          loginUrl: '/api/login'
        });
      }

      const { 
        title, 
        description, 
        location, 
        categoryId, 
        subcategoryId, 
        photoUrl,
        geometry: providedGeometry,
        centroidLat: providedLat,
        centroidLng: providedLng
      } = req.body;

      if (!title || title.trim().length === 0) {
        return res.status(400).json({ error: 'Title is required' });
      }

      // Geocode location if coordinates not provided
      let centroidLat = providedLat;
      let centroidLng = providedLng;
      let geometry = providedGeometry;

      if (location && (!centroidLat || !centroidLng)) {
        try {
          // Use Nominatim API to geocode the location (Australia-focused)
          const searchParams = new URLSearchParams({
            q: location,
            format: 'json',
            limit: '1',
            countrycodes: 'au'
          });
          
          const geocodeResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?${searchParams}`,
            {
              headers: {
                'User-Agent': 'CommunityConnectAustralia/1.0'
              }
            }
          );
          
          if (geocodeResponse.ok) {
            const results = await geocodeResponse.json();
            if (results && results.length > 0) {
              const result = results[0];
              centroidLat = parseFloat(result.lat);
              centroidLng = parseFloat(result.lon);
              
              // Create Point geometry
              geometry = {
                type: 'Point',
                coordinates: [centroidLng, centroidLat]
              };
              
              console.log(`Geocoded "${location}" to [${centroidLat}, ${centroidLng}]`);
            } else {
              console.log(`No geocode results for "${location}"`);
            }
          }
        } catch (geocodeError) {
          console.error('Geocoding error:', geocodeError);
          // Continue without coordinates - post will still be created
        }
      }

      const newPost = await storage.createPost({
        userId,
        title: title.trim(),
        description: description?.trim(),
        location: location?.trim(),
        categoryId,
        subcategoryId,
        photoUrl,
        geometry,
        centroidLat,
        centroidLng,
        status: 'active',
        source: 'user',
        properties: {}
      });

      // Get enriched post data to return
      const user = await storage.getUser(userId);
      let category = null;
      let subcategory = null;
      if (newPost.categoryId) {
        category = await storage.getCategory(newPost.categoryId);
      }
      if (newPost.subcategoryId) {
        subcategory = await storage.getSubcategory(newPost.subcategoryId);
      }

      const posterName = user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Anonymous';

      // Broadcast notifications to eligible users (async, non-blocking)
      broadcastPostNotifications(
        {
          id: newPost.id,
          title: newPost.title,
          categoryId: newPost.categoryId,
          centroidLat: newPost.centroidLat,
          centroidLng: newPost.centroidLng,
          userId: newPost.userId
        },
        posterName
      );

      res.status(201).json({
        ...newPost,
        category: category?.name,
        categoryIcon: category?.icon,
        categoryColor: category?.color,
        subcategory: subcategory?.name,
        userName: posterName,
        userAvatar: user?.profileImageUrl,
      });
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ error: 'Failed to create post' });
    }
  });

  // Update post (authenticated, own posts only)
  app.put('/api/posts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const post = await storage.getPost(id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.userId !== userId) {
        return res.status(403).json({ error: 'You can only edit your own posts' });
      }

      const { title, description, location, status } = req.body;

      const updated = await storage.updatePost(id, {
        title: title?.trim(),
        description: description?.trim(),
        location: location?.trim(),
        status
      });

      res.json(updated);
    } catch (error) {
      console.error('Error updating post:', error);
      res.status(500).json({ error: 'Failed to update post' });
    }
  });

  // Delete post (authenticated, own posts only)
  app.delete('/api/posts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const post = await storage.getPost(id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.userId !== userId) {
        return res.status(403).json({ error: 'You can only delete your own posts' });
      }

      const success = await storage.deletePost(id);
      if (!success) {
        return res.status(500).json({ error: 'Failed to delete post' });
      }

      res.json({ success: true, message: 'Post deleted successfully' });
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ error: 'Failed to delete post' });
    }
  });

  // ============================================================================
  // UNIFIED API ENDPOINT - LEGACY (use /api/posts instead)
  // ============================================================================
  
  app.get('/api/unified', async (req, res) => {
    try {
      const { 
        region, 
        category, 
        source, 
        status: statusFilter, 
        southwest, 
        northeast,
        since 
      } = req.query;

      let result;

      // OPTIMIZATION: Database-level spatial filtering instead of fetch-all-then-filter
      if (southwest && northeast) {
        const [swLat, swLng] = (southwest as string).split(',').map(Number);
        const [neLat, neLng] = (northeast as string).split(',').map(Number);
        
        // Use database spatial query for efficiency
        const incidents = await storage.getUnifiedIncidentsInArea(
          [Math.min(swLat, neLat), Math.min(swLng, neLng)],
          [Math.max(swLat, neLat), Math.max(swLng, neLng)]
        );
        
        // Convert to GeoJSON
        result = {
          type: 'FeatureCollection' as const,
          features: incidents.map(inc => {
            const incAny = inc as any;
            return {
              type: 'Feature' as const,
              id: inc.id,
              geometry: inc.geometry as any,
              properties: {
                ...incAny,
                geometry: undefined,
                originalProperties: incAny.originalProperties || {}
              }
            };
          })
        };
      }
      // Regional filtering 
      else if (region) {
        result = await storage.getUnifiedIncidentsByRegionAsGeoJSON(region as string);
      }
      // All unified incidents (use sparingly - viewport filtering preferred)
      else {
        result = await storage.getUnifiedIncidentsAsGeoJSON();
      }

      // Apply additional filters on the result
      if (category || source || statusFilter || since) {
        const sinceDate = since ? new Date(since as string) : null;
        
        result.features = result.features.filter(feature => {
          const props = feature.properties;
          
          if (category && props.category !== category) return false;
          if (source && props.source !== source) return false;
          if (statusFilter && props.status !== statusFilter) return false;
          if (sinceDate && new Date(props.lastUpdated) < sinceDate) return false;
          
          return true;
        });
      }

      // Generate ETag for HTTP caching
      const etag = `W/"${result.features.length}-${Date.now()}"`;
      
      // Check if client has current version
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }

      // Set cache headers
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'public, max-age=30'); // 30 second cache
      res.setHeader('Last-Modified', new Date().toUTCString());

      // Add response metadata
      const response = {
        ...result,
        metadata: {
          totalFeatures: result.features.length,
          sources: ['tmr', 'emergency', 'user'],
          lastUpdated: new Date().toISOString(),
          cached: true,
          filters: {
            region: region || null,
            category: category || null,
            source: source || null,
            status: statusFilter || null,
            spatialBounds: southwest && northeast ? { southwest, northeast } : null,
            since: since || null
          }
        }
      };

      res.json(response);
    } catch (error) {
      console.error('❌ Unified API error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch unified incidents',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Delete unified incident (authenticated users only, own incidents)
  app.delete('/api/unified-incidents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get the incident to check ownership
      const incident = await storage.getUnifiedIncident(id);
      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }

      // Check if user owns this incident (only for user-reported incidents)
      if (incident.source !== 'user') {
        return res.status(403).json({ error: 'Cannot delete official incidents' });
      }

      if (incident.userId !== userId) {
        return res.status(403).json({ error: 'You can only delete your own incidents' });
      }

      // Delete the incident
      const success = await storage.deleteUnifiedIncident(id);
      if (!success) {
        return res.status(500).json({ error: 'Failed to delete incident' });
      }

      res.json({ success: true, message: 'Incident deleted successfully' });
    } catch (error) {
      console.error('Error deleting unified incident:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update unified incident (authenticated users only, own incidents)
  app.put('/api/unified-incidents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get the incident to check ownership
      const incident = await storage.getUnifiedIncident(id);
      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }

      // Check if user owns this incident (only for user-reported incidents)
      if (incident.source !== 'user') {
        return res.status(403).json({ error: 'Cannot edit official incidents' });
      }

      // Enhanced ownership checking - handle multiple forms of user identification
      const incidentUserId = incident.userId;
      const reporterId = (incident.properties as any)?.reporterId;
      const isOwner = incidentUserId === userId || reporterId === userId;

      if (!isOwner) {
        // Check if incident has corrupted data (no user attribution)
        if (!incidentUserId && !reporterId) {
          return res.status(403).json({ 
            error: 'This incident has corrupted ownership data and cannot be edited' 
          });
        }
        return res.status(403).json({ error: 'You can only edit your own incidents' });
      }

      // Validate request body using Zod schema
      const updateIncidentSchema = z.object({
        title: z.string().min(1, "Title is required").optional(),
        description: z.string().optional(),
        location: z.string().min(1, "Location is required").optional(),
        categoryId: z.string().optional(),
        subcategoryId: z.string().optional(),
        photoUrl: z.string().optional(),
        policeNotified: z.enum(["yes", "no", "not_needed", "unsure"]).optional(),
      });

      let cleanedData;
      try {
        const validatedData = updateIncidentSchema.parse(req.body);
        
        // Remove undefined values
        cleanedData = Object.fromEntries(
          Object.entries(validatedData).filter(([_, value]) => value !== undefined)
        );

        if (Object.keys(cleanedData).length === 0) {
          return res.status(400).json({ error: 'No valid fields to update' });
        }
      } catch (validationError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: validationError instanceof z.ZodError ? validationError.errors : 'Validation failed'
        });
      }

      // Update the incident
      const updatedIncident = await storage.updateUnifiedIncident(id, cleanedData);
      if (!updatedIncident) {
        return res.status(500).json({ error: 'Failed to update incident' });
      }

      res.json({ 
        success: true, 
        message: 'Incident updated successfully',
        incident: updatedIncident
      });
    } catch (error) {
      console.error('Error updating unified incident:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete unified incident (authenticated users only, own incidents)
  app.delete('/api/unified-incidents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get the incident to check ownership
      const incident = await storage.getUnifiedIncident(id);
      if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
      }

      // Check if user owns this incident (only for user-reported incidents)
      if (incident.source !== 'user') {
        return res.status(403).json({ error: 'Cannot delete official incidents' });
      }

      if (incident.userId !== userId) {
        return res.status(403).json({ error: 'You can only delete your own incidents' });
      }

      // Delete the incident
      const deleteResult = await storage.deleteUnifiedIncident(id);
      if (!deleteResult) {
        return res.status(500).json({ error: 'Failed to delete incident' });
      }

      res.json({ 
        success: true, 
        message: 'Incident deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting unified incident:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ============================================================================
  // POST REACTIONS API - Facebook-style likes/reactions
  // ============================================================================

  // Get reactions for a post - resilient endpoint that returns default data on error
  app.get('/api/reactions/:incidentId', async (req, res) => {
    try {
      const { incidentId } = req.params;
      const reactions = await storage.getPostReactions(incidentId);
      
      // Count by type
      const reactionCounts: Record<string, number> = {};
      (reactions || []).forEach((r: any) => {
        reactionCounts[r.reactionType] = (reactionCounts[r.reactionType] || 0) + 1;
      });

      // Check if current user has reacted
      let userReaction = null;
      if (req.user) {
        const userId = (req.user as any).id || (req.user as any).claims?.sub;
        const userReact = (reactions || []).find((r: any) => r.userId === userId);
        userReaction = userReact?.reactionType || null;
      }

      res.json({
        count: (reactions || []).length,
        reactions: reactionCounts,
        userReaction
      });
    } catch (error) {
      console.error('Error getting reactions:', error);
      // Return default empty data instead of 500 to prevent frontend crashes
      res.json({ count: 0, reactions: {}, userReaction: null });
    }
  });

  // Add or update reaction
  app.post('/api/reactions/:incidentId', isAuthenticated, async (req: any, res) => {
    try {
      const { incidentId } = req.params;
      const { reactionType } = req.body;
      const userId = req.user?.id || req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (reactionType === 'remove') {
        await storage.removePostReaction(incidentId, userId);
        return res.json({ success: true, removed: true });
      }

      const reaction = await storage.addPostReaction(incidentId, userId, reactionType || 'like');
      res.json({ success: true, reaction });
    } catch (error) {
      console.error('Error adding reaction:', error);
      res.status(500).json({ error: 'Failed to add reaction' });
    }
  });

  // ============================================================================
  // MY REACTIONS API - Posts the user has reacted to
  // ============================================================================

  app.get('/api/my-reactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const posts = await storage.getPostsUserReactedTo(userId);
      
      // Enrich posts with user and category data
      const enrichedPosts = await Promise.all(posts.map(async (post) => {
        const user = await storage.getUser(post.userId);
        const category = post.categoryId ? await storage.getCategory(post.categoryId) : null;
        const subcategory = post.subcategoryId ? await storage.getSubcategory(post.subcategoryId) : null;
        
        return {
          ...post,
          userName: user?.displayName || user?.firstName || 'Anonymous',
          userAvatar: user?.profileImageUrl,
          categoryName: category?.name,
          categoryColor: category?.color,
          subcategoryName: subcategory?.name,
        };
      }));

      res.json(enrichedPosts);
    } catch (error) {
      console.error('Error getting my reactions:', error);
      res.status(500).json({ error: 'Failed to get reactions' });
    }
  });

  // ============================================================================
  // SAVED POSTS API - User bookmarks/saved posts
  // ============================================================================

  // Get user's saved posts
  app.get('/api/saved-posts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const posts = await storage.getSavedPosts(userId);
      
      // Enrich posts with user and category data
      const enrichedPosts = await Promise.all(posts.map(async (post) => {
        const user = await storage.getUser(post.userId);
        const category = post.categoryId ? await storage.getCategory(post.categoryId) : null;
        const subcategory = post.subcategoryId ? await storage.getSubcategory(post.subcategoryId) : null;
        
        return {
          ...post,
          userName: user?.displayName || user?.firstName || 'Anonymous',
          userAvatar: user?.profileImageUrl,
          categoryName: category?.name,
          categoryColor: category?.color,
          subcategoryName: subcategory?.name,
        };
      }));

      res.json(enrichedPosts);
    } catch (error) {
      console.error('Error getting saved posts:', error);
      res.status(500).json({ error: 'Failed to get saved posts' });
    }
  });

  // Check if a post is saved
  app.get('/api/posts/:postId/saved', isAuthenticated, async (req: any, res) => {
    try {
      const { postId } = req.params;
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const isSaved = await storage.isPostSaved(userId, postId);
      res.json({ saved: isSaved });
    } catch (error) {
      console.error('Error checking saved status:', error);
      res.status(500).json({ error: 'Failed to check saved status' });
    }
  });

  // Save a post
  app.post('/api/posts/:postId/save', isAuthenticated, async (req: any, res) => {
    try {
      const { postId } = req.params;
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const saved = await storage.savePost(userId, postId);
      res.json({ success: true, saved });
    } catch (error) {
      console.error('Error saving post:', error);
      res.status(500).json({ error: 'Failed to save post' });
    }
  });

  // Unsave a post
  app.delete('/api/posts/:postId/save', isAuthenticated, async (req: any, res) => {
    try {
      const { postId } = req.params;
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const removed = await storage.unsavePost(userId, postId);
      res.json({ success: true, removed });
    } catch (error) {
      console.error('Error unsaving post:', error);
      res.status(500).json({ error: 'Failed to unsave post' });
    }
  });

  // ============================================================================
  // CONTENT MODERATION REPORTS API - User reporting inappropriate content
  // ============================================================================

  // Create a new content report
  app.post('/api/content-reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { entityType, entityId, reason, description } = req.body;

      if (!entityType || !entityId || !reason) {
        return res.status(400).json({ error: 'Entity type, entity ID, and reason are required' });
      }

      const validReasons = ['spam', 'inappropriate', 'harassment', 'false_information', 'other'];
      if (!validReasons.includes(reason)) {
        return res.status(400).json({ error: 'Invalid reason' });
      }

      const report = await storage.createReport({
        reporterId: userId,
        entityType,
        entityId,
        reason,
        description: description || null,
      });

      res.json({ success: true, report });
    } catch (error) {
      console.error('Error creating content report:', error);
      res.status(500).json({ error: 'Failed to create report' });
    }
  });

  // Get all content reports (admin only)
  app.get('/api/content-reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const status = req.query.status as string | undefined;
      const reports = await storage.getReports(status);

      // Enrich reports with reporter info
      const enrichedReports = await Promise.all(reports.map(async (report) => {
        const reporter = await storage.getUser(report.reporterId);
        let entityInfo = null;

        // Get info about the reported content
        if (report.entityType === 'incident' || report.entityType === 'post') {
          const post = await storage.getPost(report.entityId);
          if (post) {
            const postUser = await storage.getUser(post.userId);
            entityInfo = {
              title: post.title,
              content: post.description,
              userName: postUser?.displayName || postUser?.firstName || 'Unknown',
            };
          }
        } else if (report.entityType === 'comment') {
          const comments = await storage.getIncidentComments(report.entityId);
          const comment = comments?.[0];
          if (comment) {
            const commentUser = await storage.getUser(comment.userId);
            entityInfo = {
              content: comment.content,
              userName: commentUser?.displayName || commentUser?.firstName || 'Unknown',
            };
          }
        }

        return {
          ...report,
          reporterName: reporter?.displayName || reporter?.firstName || 'Unknown',
          entityInfo,
        };
      }));

      res.json(enrichedReports);
    } catch (error) {
      console.error('Error getting content reports:', error);
      res.status(500).json({ error: 'Failed to get reports' });
    }
  });

  // Update content report status (admin only)
  app.put('/api/content-reports/:reportId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { reportId } = req.params;
      const { status, moderatorNotes } = req.body;

      const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const report = await storage.updateReportStatus(reportId, status, userId, moderatorNotes);

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      res.json({ success: true, report });
    } catch (error) {
      console.error('Error updating content report:', error);
      res.status(500).json({ error: 'Failed to update report' });
    }
  });

  // ============================================================================
  // FEEDBACK API - User suggestions and general feedback
  // ============================================================================

  // Create feedback submission
  app.post('/api/feedback', async (req: any, res) => {
    try {
      const { category, subject, message, email } = req.body;

      if (!category || !subject || !message) {
        return res.status(400).json({ error: 'Category, subject, and message are required' });
      }

      const validCategories = ['suggestion', 'bug', 'question', 'other'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      // Get user ID if authenticated (optional)
      let userId = null;
      if (req.user) {
        userId = req.user.id || req.user.claims?.sub;
      }

      const feedbackItem = await storage.createFeedback({
        userId,
        email: email || null,
        category,
        subject,
        message,
      });

      res.json({ success: true, feedback: feedbackItem });
    } catch (error) {
      console.error('Error creating feedback:', error);
      res.status(500).json({ error: 'Failed to submit feedback' });
    }
  });

  // Get all feedback (admin only)
  app.get('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const status = req.query.status as string | undefined;
      const feedbackList = await storage.getFeedback(status);

      // Enrich feedback with user info if available
      const enrichedFeedback = await Promise.all(feedbackList.map(async (item) => {
        let userName = 'Anonymous';
        if (item.userId) {
          const feedbackUser = await storage.getUser(item.userId);
          userName = feedbackUser?.displayName || feedbackUser?.firstName || 'Anonymous';
        }
        return {
          ...item,
          userName,
        };
      }));

      res.json(enrichedFeedback);
    } catch (error) {
      console.error('Error getting feedback:', error);
      res.status(500).json({ error: 'Failed to get feedback' });
    }
  });

  // Update feedback status (admin only)
  app.put('/api/feedback/:feedbackId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { feedbackId } = req.params;
      const { status, adminNotes } = req.body;

      const validStatuses = ['new', 'read', 'responded', 'archived'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const feedbackItem = await storage.updateFeedbackStatus(feedbackId, status, adminNotes);

      if (!feedbackItem) {
        return res.status(404).json({ error: 'Feedback not found' });
      }

      res.json({ success: true, feedback: feedbackItem });
    } catch (error) {
      console.error('Error updating feedback:', error);
      res.status(500).json({ error: 'Failed to update feedback' });
    }
  });

  // ============================================================================
  // STORIES API - "Happening Now" time-limited posts
  // ============================================================================

  // Get active stories (not expired)
  app.get('/api/stories', async (req, res) => {
    try {
      const stories = await storage.getActiveStories();
      
      // Check which stories current user has viewed
      let userId = null;
      if (req.user) {
        userId = (req.user as any).id || (req.user as any).claims?.sub;
      }

      const storiesWithViewStatus = await Promise.all(stories.map(async (story: any) => {
        const hasViewed = userId ? await storage.hasViewedStory(story.id, userId) : false;
        const user = await storage.getUser(story.userId);
        return {
          ...story,
          userName: user?.displayName || user?.firstName || 'Anonymous',
          userAvatar: user?.profileImageUrl,
          hasViewed
        };
      }));

      res.json(storiesWithViewStatus);
    } catch (error) {
      console.error('Error getting stories:', error);
      res.status(500).json({ error: 'Failed to get stories' });
    }
  });

  // Create a new story
  app.post('/api/stories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { content, photoUrl, location, locationLat, locationLng } = req.body;

      if (!content && !photoUrl) {
        return res.status(400).json({ error: 'Story must have content or a photo' });
      }

      // Stories expire after 24 hours
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const story = await storage.createStory({
        userId,
        content,
        photoUrl,
        location,
        locationLat,
        locationLng,
        expiresAt
      });

      res.json(story);
    } catch (error) {
      console.error('Error creating story:', error);
      res.status(500).json({ error: 'Failed to create story' });
    }
  });

  // Mark story as viewed
  app.post('/api/stories/:storyId/view', isAuthenticated, async (req: any, res) => {
    try {
      const { storyId } = req.params;
      const userId = req.user?.id || req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      await storage.markStoryViewed(storyId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking story viewed:', error);
      res.status(500).json({ error: 'Failed to mark story as viewed' });
    }
  });

  // ============================================================================
  // NOTIFICATIONS COUNT API
  // ============================================================================

  app.get('/api/notifications/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({ error: 'Failed to get unread count' });
    }
  });

  // REMOVED: Legacy background ingestion - replaced by unified ingestion pipeline

  // Mark server as ready to accept requests FIRST
  // This allows the server to respond to health checks and user requests immediately
  isServerReady = true;
  console.log('✅ Server ready to accept requests - starting background initialization...');

  const httpServer = createServer(app);
  
  // DEFERRED INITIALIZATION: Run heavy startup tasks in the background
  // This prevents blocking user requests during boot
  // Guard to prevent duplicate runs on hot reload
  if (deferredInitStarted) {
    console.log('⏭️ Deferred initialization already started, skipping...');
    return httpServer;
  }
  deferredInitStarted = true;
  
  setImmediate(async () => {
    console.log('🔄 Starting deferred initialization tasks...');
    
    // 1. Seed categories (with delay to let connections settle)
    setTimeout(async () => {
      try {
        console.log('🌱 Running deferred category seeding...');
        await seedCategoriesIfNeeded();
      } catch (error) {
        console.error('⚠️ Warning: Category seeding failed:', error);
      }
    }, 2000);
    
    // 2. Initialize agency accounts (staggered to avoid connection pool exhaustion)
    setTimeout(async () => {
      try {
        console.log('👥 Initializing agency accounts...');
        await initializeAgencyAccounts(storage);
        console.log('✅ Agency accounts initialized');
      } catch (error) {
        console.error('⚠️ Warning: Agency account initialization failed:', error);
      }
    }, 5000);
    
    // 3. Start TMR ingestion (further delayed)
    setTimeout(() => {
      try {
        startTMRPostsIngestion();
        console.log('✅ TMR Posts Ingestion service started');
      } catch (error) {
        console.error('⚠️ Warning: TMR Posts Ingestion failed to start:', error);
      }
    }, 8000);
    
    // 4. Start QFES ingestion (further delayed)
    setTimeout(() => {
      try {
        startQFESPostsIngestion();
        console.log('✅ QFES Posts Ingestion service started');
      } catch (error) {
        console.error('⚠️ Warning: QFES Posts Ingestion failed to start:', error);
      }
    }, 10000);
    
    // 5. Initialize unified ingestion pipeline (last, most resource-intensive)
    setTimeout(async () => {
      try {
        console.log('🚀 Initializing Unified Ingestion Pipeline...');
        const { unifiedIngestion } = await import('./unified-ingestion');
        await unifiedIngestion.initialize();
        console.log('✅ Unified Ingestion Pipeline initialized');
        console.log('✅ All deferred initialization complete');
      } catch (error) {
        console.error('⚠️ Warning: Unified ingestion pipeline initialization failed:', error);
      }
    }, 15000);
  });

  return httpServer;
}

