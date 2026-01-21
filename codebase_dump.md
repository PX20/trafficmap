# Community Connect Australia - Complete Codebase Dump

This document contains the complete source code for the Community Connect Australia application, a Facebook-style community social network for safety and incident reporting across Australia.

## Table of Contents
1. Project Configuration
2. Database Schema
3. Server Code
4. Client Code
5. Shared Types

---

## 1. Project Overview (replit.md)
```markdown
# Community Connect Australia

## Overview
Community Connect Australia is a Facebook-style community social network for safety and incident reporting across Australia. It provides community-driven posts for safety updates, crime reports, suspicious activity, lost/found items, and local community issues. The application features a full-stack web application with an interactive map interface and social features (reactions, comments) to view and engage with community posts in real-time.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React and TypeScript, following a component-based architecture. It uses Wouter for routing, TanStack Query for server state management, Shadcn/ui (built on Radix UI) for UI components, and Tailwind CSS for styling. Leaflet is integrated for interactive map functionality, and Vite is used for fast development and optimized builds. The structure is modular, separating UI components, business logic, and API interactions.

### Backend Architecture
The backend is a Node.js Express server written in TypeScript. It provides RESTful endpoints for posts, categories, social interactions, and user management. It utilizes PostgreSQL for all data storage.

### Data Storage Solutions
The application uses PostgreSQL via Drizzle ORM with the following key tables:
- **Posts Table**: Central data model for all community posts (schema: id, userId, title, description, location, geometry, centroidLat/Lng, categoryId, subcategoryId, photoUrl, status, timestamps)
- **Categories & Subcategories**: Hierarchical categorization system for posts
- **Users**: User accounts with profile data
- **Comments & Reactions**: Social engagement features
- **Notifications**: User notification system

### Primary API Endpoint
- **GET /api/posts**: Returns all posts in GeoJSON FeatureCollection format with enriched data (category info, user info, reaction counts)
- **POST /api/posts**: Creates new posts with automatic location geocoding via Nominatim API
- **PUT /api/posts/:id**: Updates existing posts (owner only)
- **DELETE /api/posts/:id**: Deletes posts (owner only)

### Authentication and Authorization
The system includes a full user authentication and authorization system:
- **Replit Auth Integration**: Secure OpenID Connect authentication using Replit's identity provider.
- **Session Management**: PostgreSQL-based session storage with automatic token refresh.
- **Community Reporting**: Authenticated users can report safety incidents.
- **User Profile System**: Manages user data and incident history.
- **Agency Accounts**: System automatically initializes official agency accounts (e.g., TMR, QFES) on startup to ensure proper incident attribution.

### Map and Visualization
An interactive mapping solution is provided:
- **Map Library**: Leaflet for rendering and interaction.
- **Markers**: Custom color-coded markers for various event types (traffic, emergency, crime, suspicious activity).
- **Filtering**: Real-time filtering by category, incident type, impact level, and time range.
- **Data Sources**: Displays both official emergency data and community-reported incidents with source attribution.
- **Responsiveness**: Mobile-optimized interface with a collapsible sidebar and improved modal UX for mobile (compact header, larger touch targets, bottom-sheet comments).
- **Scalability**: Implements viewport-based fetching, database-level spatial filtering, HTTP caching with ETags, and change detection in the ingestion pipeline to optimize performance and reduce load.

## External Dependencies

### Third-Party APIs
- **QLD Traffic API**: Data source for traffic events and camera feeds (`https://api.qldtraffic.qld.gov.au`).
- **QLD Emergency Services API**: Real-time emergency incident data via an ArcGIS Feature Server.

### Database Services
- **PostgreSQL**: Primary database.
- **Neon Database**: Cloud PostgreSQL provider (via connection string).

### UI and Mapping Libraries
- **Leaflet**: Open-source mapping library.
- **Radix UI**: Headless UI component primitives.
- **Shadcn/ui**: Component library based on Radix UI.
- **Tailwind CSS**: Utility-first CSS framework.

### Development and Build Tools
- **Vite**: Frontend build tool and development server.
- **TanStack Query**: Data fetching and caching library.
- **Drizzle ORM**: TypeScript ORM.
- **TypeScript**: For type safety.

### External Services Integration
- **OpenStreetMap**: Tile provider for map base layers.
- **Google Fonts**: Web font delivery (Inter).
- **Replit Integration**: Development environment integration.

## Recent Architectural Changes (December 2024)

### Server Stability Improvements
The following changes were made to address intermittent 500 errors on mobile:

1. **Deferred Initialization**: Heavy startup tasks (category seeding, agency account initialization, TMR/QFES ingestion services, unified ingestion pipeline) are now executed AFTER the server is ready to accept requests. This prevents database connection pool exhaustion during boot and ensures immediate responsiveness.

2. **Staggered Background Tasks**: Initialization tasks run with staggered delays (2s, 5s, 8s, 10s, 15s) to avoid overwhelming the database connection pool.

3. **Idempotent Initialization Guard**: A `deferredInitStarted` flag prevents duplicate initialization runs during hot reload.

4. **Resilient API Endpoints**: `/api/categories`, `/api/subcategories`, and `/api/reactions` now return empty arrays/default data instead of 500 errors when database issues occur.

5. **Reduced N+1 Queries**: PostCard component uses `reactionsCount` and `commentsCount` from post data for initial display, only fetching detailed reaction/comment data when user interacts (hover on desktop, touch on mobile).

### Server Boot Sequence
1. Express server starts listening immediately
2. `isServerReady = true` is set before deferred tasks
3. Background tasks run in sequence with delays to prevent connection pool exhaustion
4. Ingestion services have internal guards to prevent double-starts

### Sidebar Menu & User Features (December 2024)
The sidebar menu provides access to:
- **My Profile**: User profile settings (location, notifications, preferences)
- **My Location**: Redirects to Profile where location settings exist
- **Saved Posts**: Posts bookmarked by the user (requires authentication)
- **My Reactions**: Posts the user has reacted to (requires authentication)
- **Preferences**: Redirects to Profile where notification/display settings exist
- **Privacy**: Static privacy policy page (accessible without login)
- **Help & Support**: FAQ and contact information (accessible without login)

### Database Tables for User Features
- **savedPosts**: User bookmarks with unique(userId, postId) constraint
- **postReactions**: User reactions with support for multiple reaction types

### API Endpoints for User Features
- **GET /api/saved-posts**: Get user's saved posts
- **POST /api/posts/:postId/save**: Save a post
- **DELETE /api/posts/:postId/save**: Unsave a post
- **GET /api/posts/:postId/saved**: Check if a post is saved
- **GET /api/my-reactions**: Get posts the user has reacted to

### ViewModeContext for Mobile Performance (December 2024)
The ViewModeContext provides instant switching between feed and map views without route remounting:

1. **Architecture**: Uses `derivedMode` (from URL) + `overrideMode` (for instant switching)
   - `derivedMode`: Source of truth from current URL path
   - `overrideMode`: Local state for instant view switching without URL changes

2. **Override Reset Logic**: Only clears `overrideMode` when navigating AWAY from feed/map pages
   - Preserves override when switching between feed/map or arriving from other pages
   - Resets when leaving to /profile, /notifications, etc.

3. **Components Using Context**:
   - `app-header.tsx`: View mode toggle in header
   - `mobile-nav.tsx`: Bottom navigation on mobile
   - `feed.tsx`: Uses viewMode to show/hide map vs feed

4. **Performance Impact**: Eliminated 30-second navigation delays on mobile by preventing Leaflet map remounting

### Persistent Feed Architecture for Mobile Performance (December 2024)
To prevent Leaflet map reinitializing on navigation, Feed component stays mounted:

1. **Overlay Routes** (profile, notifications, saved, reactions, privacy, help):
   - Feed stays mounted but hidden with CSS `hidden` class
   - Overlay page renders on top of hidden Feed
   - When navigating back, Feed is already initialized - instant display

2. **Full Page Routes** (create, admin, business pages, messages):
   - These fully unmount Feed as before (acceptable tradeoff)
   - Map reinitializes only for these less-frequently-used pages

3. **Lazy Loading**: Overlay pages use React.lazy() with Suspense for better initial load

4. **Implementation in App.tsx**:
   - `OVERLAY_ROUTES` array defines which pages use the overlay pattern
   - `isOverlayRoute` check determines if Feed should stay mounted
   - `isFullPageRoute` check for pages that require full unmount

5. **isActive Prop Optimization** (December 2024):
   - Feed component receives `isActive={!isOverlayRoute}` prop
   - When `isActive=false`:
     - `useQuery` stops auto-refetching posts (refetchInterval: false)
     - `refetchOnWindowFocus` is disabled
     - TrafficMap and SimpleFilterSidebar also receive `isActive=false`
   - This prevents background polling and expensive operations when Feed is hidden

### Map Performance & Incident Aging (December 2024)
The map includes advanced performance optimizations and incident aging:

1. **Supercluster Marker Clustering**: Uses Supercluster library for high-performance client-side clustering of 3000+ markers with 10-50x faster rendering using bulk layer operations.

2. **Incident Aging System** (`client/src/lib/incident-aging.ts`):
   - 12-hour unified aging timeline for all incidents
   - Expired incidents (>12 hours) are automatically filtered out
   - Fresh markers have vibrant colors, older markers fade to grey using `getAgedColor()`
   - Opacity reduces from 1.0 to 0.5 based on age
   - Major tier (emergency/high-severity) uses same 12-hour timeline

3. **Initial Viewport Optimization**: 
   - Restores saved map position from localStorage on load
   - Falls back to Brisbane metro area bounds (not full Queensland) for faster initial API call
   - Reduced initial API response from 2+ seconds to ~845ms

4. **Extended Zoom Range**:
   - minZoom: 6 (state-wide view)
   - maxZoom: 18 (street-level detail)
   - Cluster expansion zoom aligned to maxZoom 18

5. **Tile Rendering Fix**: Calls `map.invalidateSize()` when map transitions from hidden to visible to fix Leaflet initialization bug```

## 2. Package Configuration (package.json)
```json
{
  "name": "rest-express",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@geoapify/geocoder-autocomplete": "^2.2.1",
    "@google-cloud/storage": "^7.17.0",
    "@hookform/resolvers": "^3.10.0",
    "@jridgewell/trace-mapping": "^0.3.25",
    "@neondatabase/serverless": "^0.10.4",
    "@radix-ui/react-accordion": "^1.2.4",
    "@radix-ui/react-alert-dialog": "^1.1.7",
    "@radix-ui/react-aspect-ratio": "^1.1.3",
    "@radix-ui/react-avatar": "^1.1.4",
    "@radix-ui/react-checkbox": "^1.1.5",
    "@radix-ui/react-collapsible": "^1.1.4",
    "@radix-ui/react-context-menu": "^2.2.7",
    "@radix-ui/react-dialog": "^1.1.7",
    "@radix-ui/react-dropdown-menu": "^2.1.7",
    "@radix-ui/react-hover-card": "^1.1.7",
    "@radix-ui/react-label": "^2.1.3",
    "@radix-ui/react-menubar": "^1.1.7",
    "@radix-ui/react-navigation-menu": "^1.2.6",
    "@radix-ui/react-popover": "^1.1.7",
    "@radix-ui/react-progress": "^1.1.3",
    "@radix-ui/react-radio-group": "^1.2.4",
    "@radix-ui/react-scroll-area": "^1.2.4",
    "@radix-ui/react-select": "^2.1.7",
    "@radix-ui/react-separator": "^1.1.3",
    "@radix-ui/react-slider": "^1.2.4",
    "@radix-ui/react-slot": "^1.2.0",
    "@radix-ui/react-switch": "^1.1.4",
    "@radix-ui/react-tabs": "^1.1.4",
    "@radix-ui/react-toast": "^1.2.7",
    "@radix-ui/react-toggle": "^1.1.3",
    "@radix-ui/react-toggle-group": "^1.1.3",
    "@radix-ui/react-tooltip": "^1.2.0",
    "@stripe/react-stripe-js": "^4.0.0",
    "@stripe/stripe-js": "^7.9.0",
    "@tanstack/react-query": "^5.60.5",
    "@types/bcryptjs": "^2.4.6",
    "@types/leaflet": "^1.9.20",
    "@types/memoizee": "^0.4.12",
    "@types/multer": "^2.0.0",
    "@types/supercluster": "^7.1.3",
    "@types/web-push": "^3.6.4",
    "@uppy/aws-s3": "^5.0.0",
    "@uppy/core": "^5.0.1",
    "@uppy/dashboard": "^5.0.1",
    "@uppy/react": "^5.0.2",
    "bcryptjs": "^3.0.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "connect-pg-simple": "^10.0.0",
    "date-fns": "^3.6.0",
    "drizzle-orm": "^0.39.1",
    "drizzle-zod": "^0.7.0",
    "embla-carousel-react": "^8.6.0",
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "file-type": "^21.0.0",
    "framer-motion": "^11.13.1",
    "input-otp": "^1.4.2",
    "leaflet": "^1.9.4",
    "lucide-react": "^0.453.0",
    "memoizee": "^0.4.17",
    "memorystore": "^1.6.7",
    "multer": "^2.0.2",
    "nanoid": "^5.1.5",
    "next-themes": "^0.4.6",
    "openid-client": "^6.7.1",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.55.0",
    "react-icons": "^5.4.0",
    "react-resizable-panels": "^2.1.7",
    "recharts": "^2.15.2",
    "sharp": "^0.34.3",
    "stripe": "^18.5.0",
    "supercluster": "^8.0.1",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "tw-animate-css": "^1.2.5",
    "vaul": "^1.1.2",
    "web-push": "^3.6.7",
    "wouter": "^3.3.5",
    "ws": "^8.18.0",
    "zod": "^3.24.2",
    "zod-validation-error": "^3.4.0"
  },
  "devDependencies": {
    "@replit/vite-plugin-cartographer": "^0.3.0",
    "@replit/vite-plugin-runtime-error-modal": "^0.0.3",
    "@tailwindcss/typography": "^0.5.15",
    "@tailwindcss/vite": "^4.1.3",
    "@types/connect-pg-simple": "^7.0.3",
    "@types/express": "4.17.21",
    "@types/express-session": "^1.18.0",
    "@types/node": "20.16.11",
    "@types/passport": "^1.0.16",
    "@types/passport-local": "^1.0.38",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@types/ws": "^8.5.13",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "drizzle-kit": "^0.30.4",
    "esbuild": "^0.25.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.20.5",
    "typescript": "^5.6.3",
    "vite": "^5.4.19"
  },
  "optionalDependencies": {
    "bufferutil": "^4.0.8"
  }
}
```

## 3. Database Schema (shared/schema.ts)
```typescript
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean, index, integer, real, doublePrecision, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// DATA SOURCE ENUM - Identifies origin of posts (user-generated vs API sources)
// ============================================================================
export const DATA_SOURCES = ["user", "tmr", "nsw_live", "vic_roads", "emergency", "qfes"] as const;
export type DataSource = typeof DATA_SOURCES[number];

// ============================================================================
// POSTS TABLE - Single source of truth for all community posts
// Used for both feed display and map plotting
// ============================================================================

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // User who created the post
  userId: varchar("user_id").notNull(),
  
  // Data source tracking for multi-API ingestion
  source: varchar("source", { enum: ["user", "tmr", "nsw_live", "vic_roads", "emergency", "qfes"] }).default("user"),
  sourceId: varchar("source_id"), // External ID from the source API (null for user posts)
  
  // Core post content
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"), // Human-readable location text
  photoUrl: text("photo_url"), // Optional photo attachment
  
  // Category system
  categoryId: varchar("category_id"), // FK to categories table
  subcategoryId: varchar("subcategory_id"), // FK to subcategories table
  
  // Spatial data for map display
  geometry: jsonb("geometry"), // GeoJSON Point for map plotting
  centroidLat: doublePrecision("centroid_lat"), // Latitude for fast queries
  centroidLng: doublePrecision("centroid_lng"), // Longitude for fast queries
  
  // Post status
  status: varchar("status", { enum: ["active", "resolved", "closed"] }).default("active"),
  
  // Social engagement counters (denormalized for performance)
  reactionsCount: integer("reactions_count").default(0),
  commentsCount: integer("comments_count").default(0),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Incident/event timing (for aging calculations)
  incidentTime: timestamp("incident_time"), // When the incident actually occurred
  expiresAt: timestamp("expires_at"), // When this post should auto-expire
  
  // Optional metadata
  properties: jsonb("properties").default('{}'), // For extensibility
}, (table) => [
  // Performance indexes
  index("idx_posts_user").on(table.userId),
  index("idx_posts_category").on(table.categoryId),
  index("idx_posts_subcategory").on(table.subcategoryId),
  index("idx_posts_status").on(table.status),
  index("idx_posts_centroid").on(table.centroidLat, table.centroidLng),
  index("idx_posts_created").on(table.createdAt.desc()),
  index("idx_posts_source").on(table.source),
  index("idx_posts_incident_time").on(table.incidentTime),
  // Unique constraint for deduplication of API-sourced posts
  unique("unique_source_sourceid").on(table.source, table.sourceId),
]);

// Posts Zod Schemas
export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reactionsCount: true,
  commentsCount: true,
}).extend({
  title: z.string().min(1, "Title is required"),
  userId: z.string().min(1, "User ID is required"),
  status: z.enum(["active", "resolved", "closed"]).default("active"),
  source: z.enum(["user", "tmr", "nsw_live", "vic_roads", "emergency", "qfes"]).default("user"),
  sourceId: z.string().nullable().optional(),
});

export type InsertPost = z.infer<typeof insertPostSchema>;
export type SelectPost = typeof posts.$inferSelect;

// ============================================================================
// STAGING TABLE - Intermediate storage for API data before sync to posts
// Each source writes to this staging area, then orchestrator syncs to posts
// ============================================================================

export const stagingEvents = pgTable("staging_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Source identification
  source: varchar("source", { enum: ["tmr", "nsw_live", "vic_roads", "emergency", "qfes"] }).notNull(),
  sourceId: varchar("source_id").notNull(), // External ID from source API
  
  // Normalized event data
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  
  // Category mapping
  categoryId: varchar("category_id"),
  subcategoryId: varchar("subcategory_id"),
  
  // Spatial data
  geometry: jsonb("geometry"),
  centroidLat: doublePrecision("centroid_lat"),
  centroidLng: doublePrecision("centroid_lng"),
  
  // Status and timing
  status: varchar("status", { enum: ["active", "resolved", "closed"] }).default("active"),
  severity: varchar("severity", { enum: ["low", "medium", "high", "critical"] }).default("medium"),
  incidentTime: timestamp("incident_time"), // When event actually occurred
  expiresAt: timestamp("expires_at"), // When to auto-expire
  
  // Raw source data for debugging/extensibility
  rawData: jsonb("raw_data").default('{}'),
  properties: jsonb("properties").default('{}'),
  
  // Sync tracking
  syncedToPostsAt: timestamp("synced_to_posts_at"), // null = not yet synced
  syncError: text("sync_error"), // Error message if sync failed
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Unique constraint for deduplication within staging
  unique("unique_staging_source_sourceid").on(table.source, table.sourceId),
  // Index for efficient sync queries
  index("idx_staging_synced").on(table.syncedToPostsAt),
  index("idx_staging_source").on(table.source),
  index("idx_staging_updated").on(table.updatedAt),
  index("idx_staging_created").on(table.createdAt),
]);

// Staging Zod Schemas
export const insertStagingEventSchema = createInsertSchema(stagingEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  syncedToPostsAt: true,
  syncError: true,
}).extend({
  source: z.enum(["tmr", "nsw_live", "vic_roads", "emergency", "qfes"]),
  sourceId: z.string().min(1, "Source ID is required"),
  title: z.string().min(1, "Title is required"),
  status: z.enum(["active", "resolved", "closed"]).default("active"),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
});

export type InsertStagingEvent = z.infer<typeof insertStagingEventSchema>;
export type SelectStagingEvent = typeof stagingEvents.$inferSelect;

// ============================================================================
// INGEST DTO - Common format that all source adapters must produce
// ============================================================================

export interface IngestDTO {
  source: DataSource;
  sourceId: string;
  title: string;
  description?: string;
  location?: string;
  categoryId?: string;
  subcategoryId?: string;
  geometry?: any;
  centroidLat: number;
  centroidLng: number;
  status: "active" | "resolved" | "closed";
  severity?: "low" | "medium" | "high" | "critical";
  incidentTime?: Date;
  expiresAt?: Date;
  rawData?: any;
  properties?: any;
}

// ============================================================================
// LEGACY: Unified Incidents (deprecated - use posts table instead)
// Keeping for backward compatibility during migration
// ============================================================================

// Unified incident storage - DEPRECATED: Use posts table instead
export const unifiedIncidents = pgTable("unified_incidents", {
  id: varchar("id").primaryKey(),
  source: varchar("source", { enum: ["tmr", "emergency", "user"] }).notNull(),
  sourceId: varchar("source_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  category: varchar("category").notNull(),
  subcategory: varchar("subcategory"),
  categoryUuid: varchar("category_uuid"),
  subcategoryUuid: varchar("subcategory_uuid"),
  severity: varchar("severity", { enum: ["low", "medium", "high", "critical"] }).default("medium"),
  status: varchar("status", { enum: ["active", "resolved", "monitoring", "closed"] }).default("active"),
  geometry: jsonb("geometry").notNull(),
  centroidLat: doublePrecision("centroid_lat").notNull(),
  centroidLng: doublePrecision("centroid_lng").notNull(),
  regionIds: text("region_ids").array().default([]),
  geocell: varchar("geocell"),
  incidentTime: timestamp("incident_time"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  properties: jsonb("properties").notNull().default('{}'),
  userId: varchar("user_id"),
  photoUrl: text("photo_url"),
  verificationStatus: varchar("verification_status", { enum: ["unverified", "community_verified", "official_verified"] }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  version: integer("version").default(1),
}, (table) => [
  unique("unique_source_sourceid").on(table.source, table.sourceId),
  index("idx_unified_source").on(table.source),
  index("idx_unified_category").on(table.category),
  index("idx_unified_category_uuid").on(table.categoryUuid),
  index("idx_unified_subcategory_uuid").on(table.subcategoryUuid),
  index("idx_unified_user_id").on(table.userId),
  index("idx_unified_severity").on(table.severity),
  index("idx_unified_status").on(table.status),
  index("idx_unified_centroid").on(table.centroidLat, table.centroidLng),
  index("idx_unified_geocell").on(table.geocell),
  index("idx_unified_region").using("gin", table.regionIds),
  index("idx_unified_time").on(table.incidentTime),
  index("idx_unified_updated").on(table.lastUpdated),
]);

// Legacy types for backward compatibility
export const insertUnifiedIncidentSchema = createInsertSchema(unifiedIncidents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  version: true,
}).extend({
  source: z.enum(["tmr", "emergency", "user"]),
  sourceId: z.string().min(1, "Source ID is required"),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["active", "resolved", "monitoring", "closed"]).default("active"),
  category: z.string().min(1, "Category is required"),
  title: z.string().min(1, "Title is required"),
  centroidLat: z.number().min(-90).max(90),
  centroidLng: z.number().min(-180).max(180),
  regionIds: z.array(z.string()).default([]),
});

export type InsertUnifiedIncident = z.infer<typeof insertUnifiedIncidentSchema>;
export type SelectUnifiedIncident = typeof unifiedIncidents.$inferSelect;

// Legacy helper functions
export function generateUnifiedIncidentId(source: "tmr" | "emergency" | "user", sourceId: string): string {
  return `${source}:${sourceId}`;
}

export function prepareUnifiedIncidentForInsert(data: InsertUnifiedIncident): InsertUnifiedIncident & { id: string } {
  const id = generateUnifiedIncidentId(data.source, data.sourceId);
  return {
    ...data,
    id,
  };
}

// GeoJSON Feature type for API responses
export interface UnifiedFeature {
  type: "Feature";
  id: string;
  properties: {
    id: string;
    source: "tmr" | "emergency" | "user";
    title: string;
    description?: string;
    category: string;
    subcategory?: string;
    severity: "low" | "medium" | "high" | "critical";
    status: "active" | "resolved" | "monitoring" | "closed";
    location?: string;
    incidentTime?: string;
    lastUpdated: string;
    publishedAt: string;
    regionIds: string[];
    userId?: string;
    photoUrl?: string;
    verificationStatus?: "unverified" | "community_verified" | "official_verified";
    originalProperties: any; // Original source properties
  };
  geometry: {
    type: "Point" | "Polygon" | "LineString";
    coordinates: number[] | number[][] | number[][][];
  };
}

// API Response type
export interface UnifiedIncidentsResponse {
  type: "FeatureCollection";
  features: UnifiedFeature[];
  metadata: {
    total: number;
    updated: string;
    version: number;
    sources: {
      tmr: number;
      emergency: number;  
      user: number;
    };
    regions: Record<string, number>; // Region ID -> count
  };
}

// Current Terms Version - Update this when terms change to prompt re-acceptance
export const CURRENT_TERMS_VERSION = "1.1";

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
  password: varchar("password"),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  displayName: varchar("display_name"),
  profileImageUrl: varchar("profile_image_url"),
  bio: text("bio"),
  verifiedResident: boolean("verified_resident").default(false),
  phoneNumber: varchar("phone_number"),
  reputationScore: integer("reputation_score").default(0),
  locationSharingLevel: varchar("location_sharing_level").default('suburb'), // 'exact' | 'suburb' | 'private'
  profileVisibility: varchar("profile_visibility").default('community'), // 'public' | 'community' | 'private'
  allowDirectMessages: boolean("allow_direct_messages").default(true),
  termsAccepted: boolean("terms_accepted").default(false),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  // Location Preferences - Single source of truth for map and feed
  preferredLocation: varchar("preferred_location"), // Suburb/area name (e.g., "Brisbane City")
  preferredLocationLat: doublePrecision("preferred_location_lat"), // Latitude coordinate
  preferredLocationLng: doublePrecision("preferred_location_lng"), // Longitude coordinate
  preferredLocationBounds: jsonb("preferred_location_bounds"), // Bounding box {southwest: [lat,lng], northeast: [lat,lng]}
  distanceFilter: varchar("distance_filter", { enum: ["1km", "2km", "5km", "10km", "25km", "50km"] }).default("10km"), // Proximity filter preference
  // Business account fields
  accountType: varchar("account_type", { enum: ["regular", "business"] }).default("regular"),
  businessName: varchar("business_name"),
  businessDescription: varchar("business_description", { length: 500 }),
  businessWebsite: varchar("business_website"),
  businessPhone: varchar("business_phone"),
  businessAddress: varchar("business_address"),
  businessCategory: varchar("business_category"),
  role: varchar("role").default("user"), // 'user' | 'admin'
  isOfficialAgency: boolean("is_official_agency").default(false), // Mark agency accounts
  // Notification Preferences
  notificationsEnabled: boolean("notifications_enabled").default(true), // Master toggle
  notificationCategories: jsonb("notification_categories"), // Array of category IDs to receive notifications for (null = all)
  notificationRadius: varchar("notification_radius", { enum: ["1km", "2km", "5km", "10km", "25km", "50km"] }).default("10km"), // Proximity filter for notifications
  onboardingCompleted: boolean("onboarding_completed").default(false), // Track if user has completed onboarding wizard
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


export const incidents = pgTable("incidents", {
  id: varchar("id").primaryKey(),
  incidentType: text("incident_type").notNull(),
  categoryId: varchar("category_id"), // New hierarchical category
  subcategoryId: varchar("subcategory_id"), // New hierarchical subcategory
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  status: text("status").notNull(),
  priority: text("priority"),
  agency: text("agency"),
  photoUrl: text("photo_url"), // Photo uploaded with incident
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
  helpfulScore: integer("helpful_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Neighborhood Groups for suburb-based discussions
export const neighborhoodGroups = pgTable("neighborhood_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  suburb: varchar("suburb").notNull(),
  description: text("description"),
  memberCount: integer("member_count").default(0),
  isPrivate: boolean("is_private").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Junction table for user group memberships
export const userNeighborhoodGroups = pgTable("user_neighborhood_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  groupId: varchar("group_id").notNull(),
  role: varchar("role").default('member'), // 'member' | 'moderator' | 'admin'
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Emergency contacts system
export const emergencyContacts = pgTable("emergency_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  contactUserId: varchar("contact_user_id"), // If contact is also a user
  contactName: varchar("contact_name").notNull(),
  contactPhone: varchar("contact_phone"),
  relationship: varchar("relationship"), // 'family' | 'friend' | 'neighbor' | 'colleague'
  createdAt: timestamp("created_at").defaultNow(),
});

// Incident follow-ups for status updates from original reporters
export const incidentFollowUps = pgTable("incident_follow_ups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: varchar("incident_id").notNull(),
  userId: varchar("user_id").notNull(), // Must be original reporter
  status: varchar("status").notNull(), // 'in_progress' | 'resolved' | 'escalated' | 'closed'
  description: text("description").notNull(),
  photoUrl: text("photo_url"), // Optional follow-up photo
  createdAt: timestamp("created_at").defaultNow(),
});

// Hierarchical category system for incident reporting
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  icon: varchar("icon"), // Icon name for UI
  color: varchar("color"), // Color for UI markers
  order: integer("order").default(0), // Display order
  isActive: boolean("is_active").default(true),
  requiresApproval: boolean("requires_approval").default(false), // For new categories
  createdAt: timestamp("created_at").defaultNow(),
});

export const subcategories = pgTable("subcategories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  icon: varchar("icon"),
  reportCount: integer("report_count").default(0), // For threshold-based display
  isActive: boolean("is_active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Comment voting for reputation system
export const commentVotes = pgTable("comment_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commentId: varchar("comment_id").notNull(),
  userId: varchar("user_id").notNull(),
  voteType: varchar("vote_type").notNull(), // 'helpful' | 'not_helpful'
  createdAt: timestamp("created_at").defaultNow(),
});

// Safety check-ins during emergencies
export const safetyCheckIns = pgTable("safety_check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  incidentId: varchar("incident_id"),
  status: varchar("status").notNull(), // 'safe' | 'needs_help' | 'evacuated'
  location: varchar("location"),
  message: text("message"),
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversations between users
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user1Id: varchar("user1_id").notNull(),
  user2Id: varchar("user2_id").notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages within conversations
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications system for tracking user activities
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // Who receives the notification
  type: varchar("type").notNull(), // 'comment_reply' | 'new_comment' | 'mention' | 'message'
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  entityId: varchar("entity_id"), // ID of the related item (comment, incident, message, etc.)
  entityType: varchar("entity_type"), // 'comment' | 'incident' | 'message'
  fromUserId: varchar("from_user_id"), // Who triggered the notification
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Push notification subscriptions for web push
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(), // Public key for encryption
  auth: text("auth").notNull(), // Auth secret for encryption
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_push_subscriptions_user").on(table.userId),
  unique("unique_push_endpoint").on(table.endpoint),
]);

export type InsertPushSubscription = {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};
export type SelectPushSubscription = typeof pushSubscriptions.$inferSelect;

// Notification delivery ledger - tracks which users have been notified about which posts
// Prevents duplicate notifications and enables backfill for new users
export const notificationDeliveries = pgTable("notification_deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  postId: varchar("post_id").notNull(),
  reason: varchar("reason", { enum: ["new_post", "status_update", "severity_update", "backfill"] }).notNull(),
  deliveredAt: timestamp("delivered_at").defaultNow(),
  pushSent: boolean("push_sent").default(false), // Whether push notification was actually sent
}, (table) => [
  index("idx_notification_deliveries_user").on(table.userId),
  index("idx_notification_deliveries_post").on(table.postId),
  unique("unique_user_post_delivery").on(table.userId, table.postId),
]);

export type InsertNotificationDelivery = {
  userId: string;
  postId: string;
  reason: "new_post" | "status_update" | "severity_update" | "backfill";
  pushSent?: boolean;
};
export type SelectNotificationDelivery = typeof notificationDeliveries.$inferSelect;

// Reports system for user-generated content moderation
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull(), // User who submitted the report
  entityType: varchar("entity_type").notNull(), // 'incident' | 'comment'
  entityId: varchar("entity_id").notNull(), // ID of the reported content
  reason: varchar("reason").notNull(), // 'spam' | 'inappropriate' | 'harassment' | 'false_information' | 'other'
  description: text("description"), // Optional additional details
  status: varchar("status").notNull().default('pending'), // 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  moderatorId: varchar("moderator_id"), // Admin who handled the report
  moderatorNotes: text("moderator_notes"), // Admin notes
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Feedback system for user suggestions and general feedback to admin
export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // Optional - can be anonymous
  email: varchar("email"), // Contact email (optional)
  category: varchar("category").notNull(), // 'suggestion' | 'bug' | 'question' | 'other'
  subject: varchar("subject").notNull(),
  message: text("message").notNull(),
  status: varchar("status").notNull().default('new'), // 'new' | 'read' | 'responded' | 'archived'
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_feedback_status").on(table.status),
  index("idx_feedback_user").on(table.userId),
]);

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = {
  userId?: string;
  email?: string;
  category: string;
  subject: string;
  message: string;
};

// Incident comments for unified incident system - social media style commenting
export const incidentComments = pgTable("incident_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: varchar("incident_id").notNull(), // References unified_incidents.id
  userId: varchar("user_id").notNull(), // References users.id
  parentCommentId: varchar("parent_comment_id"), // References incident_comments.id for nested replies
  content: text("content").notNull(), // Content validation in Zod schema
  photoUrl: text("photo_url"), // Optional photo attachment (legacy single photo)
  photoUrls: text("photo_urls").array().default([]), // Multiple photo attachments (up to 3)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Performance indexes for comment queries
  index("idx_incident_comments_incident_time").on(table.incidentId, table.createdAt.desc()),
  index("idx_incident_comments_user").on(table.userId, table.incidentId),
  index("idx_incident_comments_parent").on(table.parentCommentId),
]);

// Post reactions (likes) - Facebook-style reactions on incidents
export const postReactions = pgTable("post_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: varchar("incident_id").notNull(),
  userId: varchar("user_id").notNull(),
  reactionType: varchar("reaction_type", { enum: ["like", "love", "care", "wow", "sad", "angry"] }).default("like"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_post_reactions_incident").on(table.incidentId),
  index("idx_post_reactions_user").on(table.userId),
  unique("unique_user_incident_reaction").on(table.userId, table.incidentId),
]);

// Saved posts (bookmarks) - User's saved/bookmarked posts
export const savedPosts = pgTable("saved_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  postId: varchar("post_id").notNull(), // References posts.id
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_saved_posts_user").on(table.userId),
  index("idx_saved_posts_post").on(table.postId),
  unique("unique_user_saved_post").on(table.userId, table.postId),
]);

export type SavedPost = typeof savedPosts.$inferSelect;
export type InsertSavedPost = typeof savedPosts.$inferInsert;

// Stories - "Happening Now" time-limited posts that expire after 24 hours
export const stories = pgTable("stories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  content: text("content"),
  photoUrl: text("photo_url"),
  location: varchar("location"),
  locationLat: doublePrecision("location_lat"),
  locationLng: doublePrecision("location_lng"),
  viewCount: integer("view_count").default(0),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_stories_user").on(table.userId),
  index("idx_stories_expires").on(table.expiresAt),
  index("idx_stories_location").on(table.locationLat, table.locationLng),
]);

// Story views to track who has seen which stories
export const storyViews = pgTable("story_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storyId: varchar("story_id").notNull(),
  userId: varchar("user_id").notNull(),
  viewedAt: timestamp("viewed_at").defaultNow(),
}, (table) => [
  index("idx_story_views_story").on(table.storyId),
  unique("unique_story_view").on(table.storyId, table.userId),
]);

// User badges for reputation system
export const userBadges = pgTable("user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  badgeType: varchar("badge_type", { enum: ["newcomer", "contributor", "trusted", "expert", "moderator", "founding_member"] }).notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
}, (table) => [
  index("idx_user_badges_user").on(table.userId),
  unique("unique_user_badge").on(table.userId, table.badgeType),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  comments: many(comments),
  neighborhoodGroups: many(userNeighborhoodGroups),
  emergencyContacts: many(emergencyContacts),
  commentVotes: many(commentVotes),
  safetyCheckIns: many(safetyCheckIns),
  sentMessages: many(messages),
  conversations1: many(conversations, { relationName: 'user1' }),
  conversations2: many(conversations, { relationName: 'user2' }),
  notifications: many(notifications),
  incidentFollowUps: many(incidentFollowUps),
  submittedReports: many(reports, { relationName: 'reporter' }),
  moderatedReports: many(reports, { relationName: 'moderator' }),
}));

export const incidentsRelations = relations(incidents, ({ one, many }) => ({
  comments: many(comments),
  safetyCheckIns: many(safetyCheckIns),
  followUps: many(incidentFollowUps),
  category: one(categories, {
    fields: [incidents.categoryId],
    references: [categories.id],
  }),
  subcategory: one(subcategories, {
    fields: [incidents.subcategoryId],
    references: [subcategories.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  subcategories: many(subcategories),
  incidents: many(incidents),
}));

export const subcategoriesRelations = relations(subcategories, ({ one, many }) => ({
  category: one(categories, {
    fields: [subcategories.categoryId],
    references: [categories.id],
  }),
  incidents: many(incidents),
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
  votes: many(commentVotes),
}));

export const incidentFollowUpsRelations = relations(incidentFollowUps, ({ one }) => ({
  incident: one(incidents, {
    fields: [incidentFollowUps.incidentId],
    references: [incidents.id],
  }),
  user: one(users, {
    fields: [incidentFollowUps.userId],
    references: [users.id],
  }),
}));

export const neighborhoodGroupsRelations = relations(neighborhoodGroups, ({ many }) => ({
  members: many(userNeighborhoodGroups),
}));

export const userNeighborhoodGroupsRelations = relations(userNeighborhoodGroups, ({ one }) => ({
  user: one(users, {
    fields: [userNeighborhoodGroups.userId],
    references: [users.id],
  }),
  group: one(neighborhoodGroups, {
    fields: [userNeighborhoodGroups.groupId],
    references: [neighborhoodGroups.id],
  }),
}));

export const emergencyContactsRelations = relations(emergencyContacts, ({ one }) => ({
  user: one(users, {
    fields: [emergencyContacts.userId],
    references: [users.id],
  }),
  contactUser: one(users, {
    fields: [emergencyContacts.contactUserId],
    references: [users.id],
  }),
}));

export const commentVotesRelations = relations(commentVotes, ({ one }) => ({
  comment: one(comments, {
    fields: [commentVotes.commentId],
    references: [comments.id],
  }),
  user: one(users, {
    fields: [commentVotes.userId],
    references: [users.id],
  }),
}));

export const safetyCheckInsRelations = relations(safetyCheckIns, ({ one }) => ({
  user: one(users, {
    fields: [safetyCheckIns.userId],
    references: [users.id],
  }),
  incident: one(incidents, {
    fields: [safetyCheckIns.incidentId],
    references: [incidents.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user1: one(users, {
    fields: [conversations.user1Id],
    references: [users.id],
    relationName: 'user1',
  }),
  user2: one(users, {
    fields: [conversations.user2Id],
    references: [users.id],
    relationName: 'user2',
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  fromUser: one(users, {
    fields: [notifications.fromUserId],
    references: [users.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, {
    fields: [reports.reporterId],
    references: [users.id],
    relationName: 'reporter',
  }),
  moderator: one(users, {
    fields: [reports.moderatorId],
    references: [users.id],
    relationName: 'moderator',
  }),
}));

// Unified incidents relations
export const unifiedIncidentsRelations = relations(unifiedIncidents, ({ one }) => ({
  user: one(users, {
    fields: [unifiedIncidents.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [unifiedIncidents.categoryUuid],
    references: [categories.id],
  }),
  subcategory: one(subcategories, {
    fields: [unifiedIncidents.subcategoryUuid],
    references: [subcategories.id],
  }),
}));


export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertTrafficEventSchema = createInsertSchema(trafficEvents).omit({
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

export const insertIncidentCommentSchema = createInsertSchema(incidentComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  content: z.string().min(1, "Comment cannot be empty").max(1000, "Comment too long"),
  photoUrls: z.array(z.string().url()).max(3, "Maximum 3 photos per comment").optional(),
});

export type IncidentComment = typeof incidentComments.$inferSelect;
export type InsertIncidentComment = z.infer<typeof insertIncidentCommentSchema>;

export const insertNeighborhoodGroupSchema = createInsertSchema(neighborhoodGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserNeighborhoodGroupSchema = createInsertSchema(userNeighborhoodGroups).omit({
  id: true,
  joinedAt: true,
});

export const insertEmergencyContactSchema = createInsertSchema(emergencyContacts).omit({
  id: true,
  createdAt: true,
});

export const insertCommentVoteSchema = createInsertSchema(commentVotes).omit({
  id: true,
  createdAt: true,
});

export const insertSafetyCheckInSchema = createInsertSchema(safetyCheckIns).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertSubcategorySchema = createInsertSchema(subcategories).omit({
  id: true,
  createdAt: true,
});

export const insertIncidentFollowUpSchema = createInsertSchema(incidentFollowUps).omit({
  id: true,
  createdAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Safe user type for batch lookups - only includes public fields
export type SafeUser = {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  accountType: "regular" | "business" | null;
  isOfficialAgency: boolean;
};
export type TrafficEvent = typeof trafficEvents.$inferSelect;
export type InsertTrafficEvent = z.infer<typeof insertTrafficEventSchema>;
export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type NeighborhoodGroup = typeof neighborhoodGroups.$inferSelect;
export type InsertNeighborhoodGroup = z.infer<typeof insertNeighborhoodGroupSchema>;
export type UserNeighborhoodGroup = typeof userNeighborhoodGroups.$inferSelect;
export type InsertUserNeighborhoodGroup = z.infer<typeof insertUserNeighborhoodGroupSchema>;
export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type InsertEmergencyContact = z.infer<typeof insertEmergencyContactSchema>;
export type CommentVote = typeof commentVotes.$inferSelect;
export type InsertCommentVote = z.infer<typeof insertCommentVoteSchema>;
export type SafetyCheckIn = typeof safetyCheckIns.$inferSelect;
export type InsertSafetyCheckIn = z.infer<typeof insertSafetyCheckInSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Subcategory = typeof subcategories.$inferSelect;
export type InsertSubcategory = z.infer<typeof insertSubcategorySchema>;
export type IncidentFollowUp = typeof incidentFollowUps.$inferSelect;
export type InsertIncidentFollowUp = z.infer<typeof insertIncidentFollowUpSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

// New social features types
export type PostReaction = typeof postReactions.$inferSelect;
export type Story = typeof stories.$inferSelect;
export type StoryView = typeof storyViews.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;

// Ad Campaigns table
export const adCampaigns = pgTable("ad_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessName: varchar("business_name").notNull(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  websiteUrl: text("website_url"),
  address: text("address"),
  suburb: varchar("suburb", { length: 100 }).notNull(),
  cta: varchar("cta", { length: 100 }).default("Learn More"),
  targetSuburbs: text("target_suburbs").array(),
  dailyBudget: text("daily_budget"),
  totalBudget: text("total_budget"),
  cpmRate: text("cpm_rate").default("2.00"),
  status: varchar("status", { length: 50 }).default("active"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ad Views table
export const adViews = pgTable("ad_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adCampaignId: varchar("ad_campaign_id").references(() => adCampaigns.id),
  userId: varchar("user_id").references(() => users.id),
  durationMs: integer("duration_ms").notNull(),
  userSuburb: varchar("user_suburb", { length: 100 }),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  viewedAt: timestamp("viewed_at").notNull(),
  date: varchar("date").notNull(),
}, (table) => ({
  campaignDateIdx: index("idx_ad_campaign_date").on(table.adCampaignId, table.date),
  userDateIdx: index("idx_ad_user_date").on(table.userId, table.date),
}));

// Ad Clicks table
export const adClicks = pgTable("ad_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adCampaignId: varchar("ad_campaign_id").references(() => adCampaigns.id),
  userId: varchar("user_id").references(() => users.id),
  ipAddress: varchar("ip_address"),
  clickedAt: timestamp("clicked_at").notNull(),
});

// Ad table type exports
// Billing and payment tracking tables
export const billingPlans = pgTable("billing_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // "Basic Daily", "Premium Daily"
  description: text("description"),
  pricePerDay: text("price_per_day").notNull(), // $8.00, stored as string for precision
  minimumDays: integer("minimum_days").default(7), // 7-day minimum
  features: jsonb("features"), // Array of features included
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const billingCycles = pgTable("billing_cycles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull(),
  planId: varchar("plan_id").notNull(),
  businessId: varchar("business_id").notNull(), // User ID for business account
  status: varchar("status").notNull().default("active"), // 'active' | 'paused' | 'cancelled' | 'expired'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  dailyRate: text("daily_rate").notNull(), // Current daily rate (allows for historical pricing)
  totalDays: integer("total_days"),
  totalAmount: text("total_amount"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  businessDateIdx: index("idx_billing_business_date").on(table.businessId, table.startDate),
  campaignIdx: index("idx_billing_campaign").on(table.campaignId),
}));

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  billingCycleId: varchar("billing_cycle_id").notNull(),
  businessId: varchar("business_id").notNull(),
  amount: text("amount").notNull(), // Payment amount in dollars
  currency: varchar("currency", { length: 3 }).default("AUD"),
  status: varchar("status").notNull(), // 'pending' | 'completed' | 'failed' | 'refunded'
  paymentMethod: varchar("payment_method").notNull(), // 'stripe'
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  stripeInvoiceId: varchar("stripe_invoice_id"),
  failureReason: text("failure_reason"),
  paidAt: timestamp("paid_at"),
  daysCharged: integer("days_charged"), // Number of days this payment covers
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  businessDateIdx: index("idx_payments_business_date").on(table.businessId, table.paidAt),
  statusIdx: index("idx_payments_status").on(table.status),
}));

export const campaignAnalytics = pgTable("campaign_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull(),
  date: varchar("date").notNull(), // YYYY-MM-DD format
  totalViews: integer("total_views").default(0),
  uniqueViews: integer("unique_views").default(0),
  totalClicks: integer("total_clicks").default(0),
  uniqueClicks: integer("unique_clicks").default(0),
  ctr: text("ctr").default("0"), // Click-through rate as percentage
  impressionDuration: integer("impression_duration").default(0), // Average view duration in ms
  costPerView: text("cost_per_view").default("0"),
  costPerClick: text("cost_per_click").default("0"),
  totalSpent: text("total_spent").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  campaignDateIdx: index("idx_campaign_analytics_date").on(table.campaignId, table.date),
}));


export type AdCampaign = typeof adCampaigns.$inferSelect;
export type InsertAdCampaign = typeof adCampaigns.$inferInsert;
export type AdView = typeof adViews.$inferSelect;
export type InsertAdView = typeof adViews.$inferInsert;
export type AdClick = typeof adClicks.$inferSelect;
export type InsertAdClick = typeof adClicks.$inferInsert;

// Billing types
export type BillingPlan = typeof billingPlans.$inferSelect;
export type InsertBillingPlan = typeof billingPlans.$inferInsert;
export type BillingCycle = typeof billingCycles.$inferSelect;
export type InsertBillingCycle = typeof billingCycles.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
export type CampaignAnalytics = typeof campaignAnalytics.$inferSelect;
export type InsertCampaignAnalytics = typeof campaignAnalytics.$inferInsert;

// ============================================================================
// DISCOUNT CODES - Admin-managed promotional codes for business advertising
// ============================================================================

export const discountCodes = pgTable("discount_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(), // The promotional code (e.g., "FREEMONTH2024")
  description: text("description"), // Admin notes about the code
  
  // Discount type and value
  discountType: varchar("discount_type", { enum: ["percentage", "fixed", "free_month"] }).notNull(),
  discountValue: real("discount_value"), // Percentage (0-100) or fixed amount in dollars, null for free_month
  durationDays: integer("duration_days"), // Number of free/discounted days (for free_month type)
  
  // Usage limits
  maxRedemptions: integer("max_redemptions"), // Total redemptions allowed (null = unlimited)
  perBusinessLimit: integer("per_business_limit").default(1), // Max uses per business
  currentRedemptions: integer("current_redemptions").default(0), // Counter
  
  // Validity period
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"), // null = never expires
  
  // Status
  isActive: boolean("is_active").default(true),
  
  // Audit
  createdBy: varchar("created_by").notNull(), // Admin user ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  codeIdx: index("idx_discount_code").on(table.code),
  activeIdx: index("idx_discount_active").on(table.isActive),
}));

export const discountRedemptions = pgTable("discount_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  discountCodeId: varchar("discount_code_id").notNull().references(() => discountCodes.id),
  businessId: varchar("business_id").notNull().references(() => users.id), // Business account
  campaignId: varchar("campaign_id").references(() => adCampaigns.id), // Optional - which campaign used it
  
  // Discount details at time of redemption
  discountType: varchar("discount_type", { enum: ["percentage", "fixed", "free_month"] }).notNull(),
  discountValue: real("discount_value"),
  amountDiscounted: real("amount_discounted"), // Actual dollar amount saved
  
  // Status
  status: varchar("status", { enum: ["pending", "applied", "expired", "cancelled"] }).default("pending"),
  
  // Period for free/discounted advertising
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  
  redeemedAt: timestamp("redeemed_at").defaultNow(),
  appliedAt: timestamp("applied_at"), // When the discount was actually applied to a payment
}, (table) => ({
  businessIdx: index("idx_redemption_business").on(table.businessId),
  codeIdx: index("idx_redemption_code").on(table.discountCodeId),
  statusIdx: index("idx_redemption_status").on(table.status),
}));

// Discount code Zod schemas
export const insertDiscountCodeSchema = createInsertSchema(discountCodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentRedemptions: true,
}).extend({
  code: z.string().min(3, "Code must be at least 3 characters").max(50).transform(s => s.toUpperCase().trim()),
  discountType: z.enum(["percentage", "fixed", "free_month"]),
  discountValue: z.number().min(0).max(100).optional().nullable(),
  durationDays: z.number().min(1).max(365).optional().nullable(),
  maxRedemptions: z.number().min(1).optional().nullable(),
  perBusinessLimit: z.number().min(1).default(1),
  createdBy: z.string().min(1, "Creator ID is required"),
});

export const insertDiscountRedemptionSchema = createInsertSchema(discountRedemptions).omit({
  id: true,
  redeemedAt: true,
  appliedAt: true,
}).extend({
  discountCodeId: z.string().min(1, "Discount code ID is required"),
  businessId: z.string().min(1, "Business ID is required"),
  discountType: z.enum(["percentage", "fixed", "free_month"]),
  status: z.enum(["pending", "applied", "expired", "cancelled"]).default("pending"),
});

// Discount code types
export type DiscountCode = typeof discountCodes.$inferSelect;
export type InsertDiscountCode = z.infer<typeof insertDiscountCodeSchema>;
export type DiscountRedemption = typeof discountRedemptions.$inferSelect;
export type InsertDiscountRedemption = z.infer<typeof insertDiscountRedemptionSchema>;

// Analytics types
export interface AdStats {
  campaignId: string;
  totalViews: number;
  uniqueUsers: number;
  totalClicks: number;
  totalViewTime: number;
  ctr: number;
  costOwed: number;
}

export interface DailyAdStats {
  date: string;
  views: number;
  clicks: number;
  cost: number;
}

export interface BusinessAdPerformance {
  businessName: string;
  totalCampaigns: number;
  totalViews: number;
  totalClicks: number;
  totalSpent: number;
  averageCTR: number;
}

// ============================================================================
// USER ATTRIBUTION SYSTEM - Centralized attribution for all incident sources
// ============================================================================

// System user IDs for all incident attribution
export const SYSTEM_USER_IDS = {
  // Agency accounts for official sources
  TMR: 'tmr-agency-account-001',
  QFES: 'qfes-agency-account-001', 
  QAS: 'qas-agency-account-001',
  QPS: 'qps-agency-account-001',
  
  // Legacy system account for historical incidents without attribution
  LEGACY_SYSTEM: 'legacy-system-account-001'
} as const;

// Valid system user ID type
export type SystemUserId = typeof SYSTEM_USER_IDS[keyof typeof SYSTEM_USER_IDS];

// Attribution resolver result
export interface AttributionResult {
  userId: string;
  reporterId: string;
  isSystemAccount: boolean;
}

/**
 * Centralized attribution resolver for all incident sources
 * Ensures every incident has valid user attribution - no null values allowed
 * 
 * @param source - Incident source ('tmr', 'emergency', 'user', 'legacy')
 * @param userHint - Optional user ID hint from source data
 * @param sourceMetadata - Additional metadata for attribution resolution
 * @returns AttributionResult with guaranteed non-null userId
 * @throws Error if attribution cannot be resolved
 */
export function resolveAttribution(
  source: string, 
  userHint?: string | null,
  sourceMetadata?: any
): AttributionResult {
  // Handle user-submitted incidents
  if (source === 'user' && userHint) {
    return {
      userId: userHint,
      reporterId: userHint,
      isSystemAccount: false
    };
  }
  
  // Handle TMR incidents
  if (source === 'tmr') {
    return {
      userId: SYSTEM_USER_IDS.TMR,
      reporterId: SYSTEM_USER_IDS.TMR,
      isSystemAccount: true
    };
  }
  
  // Handle emergency incidents - determine specific agency
  if (source === 'emergency') {
    const agencyUserId = resolveEmergencyAgency(sourceMetadata);
    return {
      userId: agencyUserId,
      reporterId: agencyUserId,
      isSystemAccount: true
    };
  }
  
  // Handle legacy incidents without original attribution
  if (source === 'legacy') {
    return {
      userId: SYSTEM_USER_IDS.LEGACY_SYSTEM,
      reporterId: SYSTEM_USER_IDS.LEGACY_SYSTEM,
      isSystemAccount: true
    };
  }
  
  // Fallback for unknown sources or user incidents without userHint
  if (source === 'user' && !userHint) {
    throw new Error(`User incident missing required userHint for attribution`);
  }
  
  throw new Error(`Unable to resolve attribution for source: ${source}, userHint: ${userHint}`);
}

/**
 * Resolve emergency agency for incident attribution
 * All emergency incidents come from the QFES API data source
 * @param metadata - Incident properties from emergency services API (unused)
 * @returns QFES agency user ID
 */
function resolveEmergencyAgency(metadata: any = {}): SystemUserId {
  // All incidents from the emergency API feed are QFES data
  return SYSTEM_USER_IDS.QFES;
}
```

## 4. Server Code

### server/index.ts
```typescript
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: false, limit: '20mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Production environment validation
  function validateEnvironment() {
    const isProduction = process.env.NODE_ENV === 'production';
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Check critical environment variables
    const checks = {
      'DATABASE_URL': process.env.DATABASE_URL,
      'SESSION_SECRET': process.env.SESSION_SECRET,
      'STRIPE_SECRET_KEY': process.env.STRIPE_SECRET_KEY,
      'VAPID_PRIVATE_KEY': process.env.VAPID_PRIVATE_KEY
    };

    let hasErrors = false;
    
    Object.entries(checks).forEach(([key, value]) => {
      if (value) {
        console.log(`✅ ${key}: configured`);
      } else {
        const level = ['DATABASE_URL', 'SESSION_SECRET'].includes(key) ? '❌' : '⚠️';
        console.log(`${level} ${key}: missing`);
        if (level === '❌' && isProduction) {
          hasErrors = true;
        }
      }
    });

    if (hasErrors) {
      console.error('💥 Critical environment variables missing in production!');
      process.exit(1);
    }
  }

  validateEnvironment();
  const server = await registerRoutes(app);

  // Health check endpoint for production monitoring
  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const requestId = req.headers['x-request-id'] || 'unknown';

    // Log error details for debugging (don't re-throw in production)
    console.error(`[ERROR ${requestId}] ${req.method} ${req.path} - Status: ${status}`);
    console.error(`[ERROR ${requestId}] Message: ${message}`);
    if (err.stack) {
      console.error(`[ERROR ${requestId}] Stack: ${err.stack}`);
    }

    res.status(status).json({ message });
    // DO NOT re-throw - this crashes production servers
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
```

### server/routes.ts
```typescript
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
import { insertIncidentSchema, insertCommentSchema, insertConversationSchema, insertMessageSchema, insertNotificationSchema, insertIncidentCommentSchema, insertDiscountCodeSchema, type SafeUser, categories, subcategories } from "@shared/schema";
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

// Legacy cache structures removed - now using unified SWR dataCache system

// Legacy constants removed - unified pipeline handles all caching

// QLD Traffic API constants - use environment variable for security
const QLD_TRAFFIC_API_KEY = process.env.QLD_TRAFFIC_API_KEY;
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
  // Handle favicon.ico requests - serve the PWA icon directly
  app.get('/favicon.ico', (_req, res) => {
    const faviconPath = path.resolve(process.cwd(), 'client/public/badge-72x72.png');
    if (fs.existsSync(faviconPath)) {
      res.sendFile(faviconPath);
    } else {
      res.status(204).end(); // No content if file doesn't exist
    }
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
  app.post("/api/ads/create", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has a business account
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user || user.accountType !== 'business') {
        return res.status(403).json({ 
          message: "Only business accounts can create advertisements. Please upgrade to a business account." 
        });
      }

      // Strict validation schema with budget bounds and content sanitization
      const adData = z.object({
        businessName: z.string().min(1).max(100).transform(val => val.trim()),
        title: z.string().min(1).max(100).transform(val => val.trim()),
        content: z.string().min(1).max(500).transform(val => val.trim()),
        websiteUrl: z.string().optional().transform(val => {
          if (!val || val.trim() === '') return '';
          // Auto-add https:// if no protocol is provided
          if (!val.match(/^https?:\/\//)) {
            return `https://${val}`;
          }
          return val;
        }).pipe(z.string().url().optional().or(z.literal(''))),
        address: z.string().max(200).optional().or(z.literal('')).transform(val => val?.trim() || ''),
        suburb: z.string().min(1).max(100).transform(val => val.trim()),
        cta: z.string().min(1).max(50).transform(val => val.trim()),
        targetSuburbs: z.array(z.string().max(100)).max(20).optional(), // Limit array size
        dailyBudget: z.string().refine(val => {
          const num = parseFloat(val);
          return !isNaN(num) && num >= 1 && num <= 10000; // $1 - $10,000 daily budget
        }, { message: "Daily budget must be between $1 and $10,000" }),
        totalBudget: z.string().optional().refine(val => {
          if (!val) return true;
          const num = parseFloat(val);
          return !isNaN(num) && num >= 1 && num <= 1000000; // Up to $1M total
        }, { message: "Total budget must be between $1 and $1,000,000" }),
        template: z.string().max(50).optional(),
        logoUrl: z.string().url().optional().or(z.literal('')),
        backgroundUrl: z.string().url().optional().or(z.literal('')),
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

  // Rate limiting for ad tracking (IP-based)
  const adTrackingRateLimit = new Map<string, { count: number; resetTime: number }>();
  const AD_TRACKING_LIMIT = 100; // Max tracking calls per IP per minute
  const AD_TRACKING_WINDOW = 60 * 1000; // 1 minute

  function checkAdTrackingRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = adTrackingRateLimit.get(ip);
    
    if (!record || now >= record.resetTime) {
      adTrackingRateLimit.set(ip, { count: 1, resetTime: now + AD_TRACKING_WINDOW });
      return true;
    }
    
    if (record.count >= AD_TRACKING_LIMIT) {
      return false;
    }
    
    record.count++;
    return true;
  }

  // Ad view tracking endpoint with rate limiting
  app.post("/api/ads/track-view", async (req, res) => {
    try {
      // IP-based rate limiting
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      if (!checkAdTrackingRateLimit(clientIp)) {
        return res.status(429).json({ message: "Rate limit exceeded" });
      }

      // Validate input with Zod
      const trackingData = z.object({
        adId: z.string().uuid(),
        duration: z.number().min(0).max(3600000), // Max 1 hour
        userSuburb: z.string().max(100),
        timestamp: z.string().or(z.number())
      }).safeParse(req.body);

      if (!trackingData.success) {
        return res.status(400).json({ message: "Invalid tracking data" });
      }

      const { adId, duration, userSuburb, timestamp } = trackingData.data;
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id || `anon_${clientIp}`;
      const viewedAt = new Date(timestamp);
      
      // Validate timestamp is not in the future and not too old
      const now = Date.now();
      const viewTime = viewedAt.getTime();
      if (viewTime > now + 60000 || viewTime < now - 86400000) { // Within 1 min future or 24 hours past
        return res.status(400).json({ message: "Invalid timestamp" });
      }
      
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

  // Ad click tracking endpoint with rate limiting
  app.post("/api/ads/track-click", async (req, res) => {
    try {
      // IP-based rate limiting
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      if (!checkAdTrackingRateLimit(clientIp)) {
        return res.status(429).json({ message: "Rate limit exceeded" });
      }

      // Validate input with Zod
      const trackingData = z.object({
        adId: z.string().uuid(),
        timestamp: z.string().or(z.number())
      }).safeParse(req.body);

      if (!trackingData.success) {
        return res.status(400).json({ message: "Invalid tracking data" });
      }

      const { adId, timestamp } = trackingData.data;
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id || `anon_${clientIp}`;
      const clickedAt = new Date(timestamp);

      // Validate timestamp
      const now = Date.now();
      const clickTime = clickedAt.getTime();
      if (clickTime > now + 60000 || clickTime < now - 86400000) {
        return res.status(400).json({ message: "Invalid timestamp" });
      }

      // Rate limit clicks per user per ad (max 5 per day)
      const today = clickedAt.toISOString().split('T')[0];
      const existingClicks = await storage.getAdClicksToday?.(userId, adId, today) || 0;
      
      if (existingClicks >= 5) {
        return res.json({ message: "Click limit reached" });
      }

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

  // Get single ad by ID (for editing) - business users only
  app.get('/api/ads/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      
      // Require business account to access ad details
      const user = await storage.getUser(userId);
      if (!user || user.accountType !== 'business') {
        return res.status(403).json({ message: "Business account required" });
      }
      
      const ad = await storage.getAdCampaign(id);
      
      if (!ad) {
        return res.status(404).json({ message: "Ad not found" });
      }

      // Business users can only view their own ads
      const userCampaigns = await storage.getUserCampaigns(userId);
      const userOwnsAd = userCampaigns.some(campaign => campaign.id === id);
      
      if (!userOwnsAd) {
        return res.status(403).json({ message: "You can only view your own ads" });
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
  
  // Note: Category seeding is now handled in deferred initialization
  // to prevent blocking server startup

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

  // Admin Discount Code Management Endpoints
  
  // Create a new discount code
  app.post('/api/admin/discount-codes', isAdmin, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      
      // Validate request body with schema
      const parseResult = insertDiscountCodeSchema.safeParse({
        ...req.body,
        createdBy: userId
      });
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid discount code data", 
          errors: parseResult.error.errors 
        });
      }
      
      const discountCode = await storage.createDiscountCode(parseResult.data);
      console.log(`Admin created discount code: ${discountCode.code}`);
      res.status(201).json(discountCode);
    } catch (error) {
      console.error("Error creating discount code:", error);
      res.status(500).json({ message: "Failed to create discount code" });
    }
  });
  
  // Get all discount codes
  app.get('/api/admin/discount-codes', isAdmin, async (req, res) => {
    try {
      const discountCodes = await storage.getAllDiscountCodes();
      res.json(discountCodes);
    } catch (error) {
      console.error("Error fetching discount codes:", error);
      res.status(500).json({ message: "Failed to fetch discount codes" });
    }
  });
  
  // Get single discount code by ID
  app.get('/api/admin/discount-codes/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const discountCode = await storage.getDiscountCode(id);
      
      if (!discountCode) {
        return res.status(404).json({ message: "Discount code not found" });
      }
      
      res.json(discountCode);
    } catch (error) {
      console.error("Error fetching discount code:", error);
      res.status(500).json({ message: "Failed to fetch discount code" });
    }
  });
  
  // Update discount code
  app.put('/api/admin/discount-codes/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get existing code to verify it exists
      const existing = await storage.getDiscountCode(id);
      if (!existing) {
        return res.status(404).json({ message: "Discount code not found" });
      }
      
      // Define allowed mutable fields and validate with Zod
      // Matches the schema: discountType enum, discountValue is real (number), timestamps for dates
      const updateSchema = z.object({
        description: z.string().nullable().optional(),
        discountType: z.enum(['percentage', 'fixed', 'free_month']).optional(),
        discountValue: z.number().min(0).max(100).nullable().optional(),
        durationDays: z.number().min(1).max(365).nullable().optional(),
        maxRedemptions: z.number().min(1).nullable().optional(),
        perBusinessLimit: z.number().min(1).optional(),
        validFrom: z.coerce.date().optional(),
        validUntil: z.coerce.date().nullable().optional(),
        isActive: z.boolean().optional(),
      }).strict();
      
      const parseResult = updateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid update data", 
          errors: parseResult.error.errors 
        });
      }
      
      // Ensure at least one field is being updated
      if (Object.keys(parseResult.data).length === 0) {
        return res.status(400).json({ message: "At least one field must be provided for update" });
      }
      
      const updatedCode = await storage.updateDiscountCode(id, parseResult.data);
      console.log(`Admin updated discount code: ${updatedCode?.code}`);
      res.json(updatedCode);
    } catch (error) {
      console.error("Error updating discount code:", error);
      res.status(500).json({ message: "Failed to update discount code" });
    }
  });
  
  // Deactivate (soft delete) discount code
  app.delete('/api/admin/discount-codes/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get existing code to verify it exists
      const existing = await storage.getDiscountCode(id);
      if (!existing) {
        return res.status(404).json({ message: "Discount code not found" });
      }
      
      // Check if already inactive
      if (!existing.isActive) {
        return res.status(409).json({ message: "Discount code is already inactive" });
      }
      
      const deactivatedCode = await storage.deactivateDiscountCode(id);
      if (!deactivatedCode) {
        return res.status(500).json({ message: "Failed to deactivate discount code" });
      }
      
      console.log(`Admin deactivated discount code: ${deactivatedCode.code}`);
      res.json({ success: true, discountCode: deactivatedCode });
    } catch (error) {
      console.error("Error deactivating discount code:", error);
      res.status(500).json({ message: "Failed to deactivate discount code" });
    }
  });

  // ============================================================================
  // BUSINESS DISCOUNT CODE ENDPOINTS
  // ============================================================================
  
  // Validate a discount code for a business (checks validity without redeeming)
  app.post('/api/discount-codes/validate', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      
      const validateSchema = z.object({
        code: z.string().min(1, "Discount code is required"),
      });
      
      const parseResult = validateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          valid: false,
          message: "Invalid request", 
          errors: parseResult.error.errors 
        });
      }
      
      const { code } = parseResult.data;
      const result = await storage.validateDiscountCode(code.toUpperCase(), userId);
      
      if (!result.valid) {
        return res.json({ 
          valid: false, 
          message: result.error 
        });
      }
      
      // Return discount code details (without sensitive info)
      const discountCode = result.discountCode!;
      res.json({
        valid: true,
        discountCode: {
          id: discountCode.id,
          code: discountCode.code,
          description: discountCode.description,
          discountType: discountCode.discountType,
          discountValue: discountCode.discountValue,
          durationDays: discountCode.durationDays,
        }
      });
    } catch (error) {
      console.error("Error validating discount code:", error);
      res.status(500).json({ valid: false, message: "Failed to validate discount code" });
    }
  });
  
  // Redeem a discount code for a business
  app.post('/api/discount-codes/redeem', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      
      const redeemSchema = z.object({
        code: z.string().min(1, "Discount code is required"),
        campaignId: z.string().optional(), // Optional: associate with a specific campaign
      });
      
      const parseResult = redeemSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid request", 
          errors: parseResult.error.errors 
        });
      }
      
      const { code, campaignId } = parseResult.data;
      
      // First validate the code
      const validation = await storage.validateDiscountCode(code.toUpperCase(), userId);
      if (!validation.valid) {
        return res.status(400).json({ 
          success: false, 
          message: validation.error 
        });
      }
      
      // Redeem the code
      const redemption = await storage.redeemDiscountCode(
        validation.discountCode!.id, 
        userId, 
        campaignId
      );
      
      console.log(`Business ${userId} redeemed discount code: ${code}`);
      res.json({
        success: true,
        redemption: {
          id: redemption.id,
          discountType: redemption.discountType,
          discountValue: redemption.discountValue,
          periodStart: redemption.periodStart,
          periodEnd: redemption.periodEnd,
          status: redemption.status,
        }
      });
    } catch (error) {
      console.error("Error redeeming discount code:", error);
      res.status(500).json({ success: false, message: "Failed to redeem discount code" });
    }
  });
  
  // Get business's redemption history
  app.get('/api/discount-codes/my-redemptions', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      
      const redemptions = await storage.getBusinessRedemptions(userId);
      
      res.json(redemptions);
    } catch (error) {
      console.error("Error fetching redemptions:", error);
      res.status(500).json({ message: "Failed to fetch redemption history" });
    }
  });
  
  // Get billing quote with discount applied
  app.post('/api/billing/quote-with-discount', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub || (req.user as any)?.id;
      
      const quoteSchema = z.object({
        campaignId: z.string().optional(),
        days: z.number().int().min(7, "Minimum 7 days required").max(365, "Maximum 365 days"),
        discountCode: z.string().optional(),
      });
      
      const parseResult = quoteSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: parseResult.error.errors 
        });
      }
      
      const { campaignId, days, discountCode } = parseResult.data;
      
      // Get the default plan
      const plans = await storage.getBillingPlans();
      const plan = plans.find(p => p.isActive) || plans[0];
      
      if (!plan) {
        return res.status(404).json({ message: 'No billing plans available' });
      }
      
      const dailyRate = parseFloat(plan.pricePerDay);
      let totalAmount = dailyRate * days;
      let discountApplied = false;
      let discountDetails = null;
      let discountError = null;
      
      // If a discount code is provided, validate and calculate the discount
      if (discountCode) {
        const validation = await storage.validateDiscountCode(discountCode.toUpperCase(), userId);
        
        if (validation.valid && validation.discountCode) {
          const dc = validation.discountCode;
          discountApplied = true;
          
          let amountDiscounted = 0;
          
          if (dc.discountType === 'percentage') {
            // Percentage discount (e.g., 20% off)
            amountDiscounted = totalAmount * ((dc.discountValue || 0) / 100);
          } else if (dc.discountType === 'fixed') {
            // Fixed amount discount (e.g., $10 off)
            amountDiscounted = Math.min(dc.discountValue || 0, totalAmount);
          } else if (dc.discountType === 'free_month') {
            // Free month - calculate the value of durationDays
            const freeDays = dc.durationDays || 30;
            amountDiscounted = dailyRate * Math.min(freeDays, days);
          }
          
          totalAmount = Math.max(0, totalAmount - amountDiscounted);
          
          discountDetails = {
            code: dc.code,
            type: dc.discountType,
            value: dc.discountValue,
            durationDays: dc.durationDays,
            amountDiscounted: amountDiscounted.toFixed(2),
            description: dc.description,
          };
        } else {
          discountError = validation.error;
        }
      }
      
      const amountCents = Math.round(totalAmount * 100);
      
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days);
      
      res.json({
        campaignId,
        days,
        dailyRate: plan.pricePerDay,
        originalAmount: (dailyRate * days).toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        amountCents,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        planId: plan.id,
        minDaysEnforced: Math.max(days, plan.minimumDays || 7),
        discountApplied,
        discountDetails,
        discountError,
      });
    } catch (error) {
      console.error('Error creating billing quote with discount:', error);
      res.status(500).json({ message: 'Failed to create quote' });
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
        
        // Fetch user data for all posts
        const userIds = Array.from(new Set(postsInArea.map(p => p.userId)));
        const userMap = new Map<string, { firstName?: string | null; lastName?: string | null; displayName?: string | null; profileImageUrl?: string | null }>();
        for (const uid of userIds) {
          const user = await storage.getUser(uid);
          if (user) {
            userMap.set(uid, { firstName: user.firstName, lastName: user.lastName, displayName: user.displayName, profileImageUrl: user.profileImageUrl });
          }
        }
        
        // Convert to GeoJSON - preserve actual source from post root level or properties
        result = {
          type: 'FeatureCollection' as const,
          features: postsInArea.map(post => {
            const postProps = post.properties as any || {};
            const user = userMap.get(post.userId);
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
                userName: user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Anonymous',
                userAvatar: user?.profileImageUrl || null,
                reporterName: user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Anonymous',
                reporterAvatar: user?.profileImageUrl || null,
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
        
        // Fetch user data for the post author
        const postUser = await storage.getUser(userId as string);
        const userData = postUser ? { 
          firstName: postUser.firstName, 
          lastName: postUser.lastName, 
          displayName: postUser.displayName, 
          profileImageUrl: postUser.profileImageUrl 
        } : null;
        
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
                userName: userData?.displayName || `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'Anonymous',
                userAvatar: userData?.profileImageUrl || null,
                reporterName: userData?.displayName || `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'Anonymous',
                reporterAvatar: userData?.profileImageUrl || null,
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

```

### server/storage.ts
```typescript
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
    
    // Only return posts from the last 12 hours (matches incident aging system)
    const cutoffTime = new Date(Date.now() - 12 * 60 * 60 * 1000);
    
    return await db
      .select()
      .from(posts)
      .where(
        and(
          sql`${posts.centroidLat} >= ${swLat}`,
          sql`${posts.centroidLat} <= ${neLat}`,
          sql`${posts.centroidLng} >= ${swLng}`,
          sql`${posts.centroidLng} <= ${neLng}`,
          gte(posts.createdAt, cutoffTime) // Filter out posts older than 12 hours
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
```

### server/db.ts
```typescript
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon with optimized settings for connection pool management
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;
neonConfig.pipelineTLS = false;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Optimized connection pool configuration to prevent exhaustion
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Maximum number of connections in pool
  min: 2,                     // Minimum number of connections to maintain
  idleTimeoutMillis: 30000,   // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Timeout connection attempts after 10 seconds
  maxUses: 7500,              // Connection maximum reuse count before refresh
  allowExitOnIdle: true       // Allow process to exit when all connections idle
});

export const db = drizzle({ client: pool, schema });

// Log pool events for monitoring
pool.on('connect', (client) => {
  console.log('🔗 Database connection established');
});

pool.on('error', (err) => {
  console.error('💥 Database pool error:', err);
});

pool.on('remove', () => {
  console.log('🔌 Database connection removed from pool');
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, closing database pool...');
  pool.end().then(() => {
    console.log('✅ Database pool closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, closing database pool...');
  pool.end().then(() => {
    console.log('✅ Database pool closed');  
    process.exit(0);
  });
});```

### server/replitAuth.ts
```typescript
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { secureLogger, createSafeRequestInfo } from "./secure-logger";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: String(claims["sub"]), // Ensure ID is a string
    password: null, // OAuth users don't need passwords
    email: claims["email"] ? claims["email"].toLowerCase() : null,
    firstName: claims["first_name"] || null,
    lastName: claims["last_name"] || null,
    profileImageUrl: claims["profile_image_url"] || null,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    
    // Ensure the user object maintains OAuth structure for session
    secureLogger.authDebug('OAuth user created with claims', {
      hasUser: !!user,
      hasClaims: !!(user as any).claims,
      hasValidStructure: !!((user as any).claims && (user as any).claims.sub)
    });
    
    verified(null, user as any);
  };

  // Support both production domains and localhost for development
  const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
  const allDomains = [...domains, "localhost", "7c2800e2-dc85-4b8d-b4f0-349225d230ba.janeway.prod.repl.run", "07484835-201d-4254-8d4d-d43ff0f457fe.janeway.prod.repl.run"];
  
  for (const domain of allDomains) {
    const isLocalhost = domain === "localhost";
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `${isLocalhost ? 'http://localhost:5000' : `https://${domain}`}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => {
    // For OAuth users, serialize the entire user object to preserve claims structure
    secureLogger.authDebug('Serializing OAuth user', {
      hasUser: !!user,
      hasClaims: !!(user as any).claims,
      hasValidStructure: !!((user as any).claims && (user as any).claims.sub)
    });
    cb(null, user);
  });
  passport.deserializeUser((user: Express.User, cb) => {
    // For OAuth users, the user object already contains all necessary data
    secureLogger.authDebug('Deserializing OAuth user', {
      hasUser: !!user,
      hasClaims: !!(user as any).claims,
      hasValidStructure: !!((user as any).claims && (user as any).claims.sub)
    });
    cb(null, user);
  });

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    secureLogger.authDebug('OAuth callback received', {
      hostname: req.hostname,
      hasQuery: !!req.query,
      queryKeys: req.query ? Object.keys(req.query) : []
    });
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, (err: any) => {
      if (err) {
        secureLogger.authError('OAuth callback error', { error: err });
        return res.redirect("/api/login");
      }
      next();
    });
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  
  secureLogger.authDebug('Authentication check started', {
    requestInfo: createSafeRequestInfo(req),
    hasAuthFunction: typeof req.isAuthenticated === 'function',
    isAuthenticated: typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : !!user,
    hasUser: !!user,
    userStructure: user ? {
      hasId: !!user.id,
      hasClaims: !!user.claims,
      hasValidOAuth: !!(user.claims && user.claims.sub),
      hasEmail: !!(user.claims && user.claims.email),
      hasExpiry: !!user.expires_at,
      isExpired: user.expires_at ? Math.floor(Date.now() / 1000) > user.expires_at : false
    } : null,
    hasSession: !!req.session
  });
  
  // Check basic authentication - handle cases where passport functions aren't available
  const isAuth = typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : !!user;
  if (!isAuth || !user) {
    secureLogger.authError('Basic authentication failed', {
      hasUser: !!user,
      hasAuthFunction: typeof req.isAuthenticated === 'function',
      isAuthenticated: isAuth
    });
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Support both OAuth authentication (has claims) and local authentication (has id)
  if (user.claims && user.claims.sub) {
    // OAuth authentication - check token expiration and handle refresh
    if (!user.expires_at) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) {
      return next();
    }

    // Try to refresh token
    const refreshToken = user.refresh_token;
    if (!refreshToken) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
      return next();
    } catch (error) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
  }
  
  if (user.id) {
    // Local authentication - proceed directly
    return next();
  }

  // Neither authentication method worked
  secureLogger.authError('Authentication failed: Invalid user structure', {
    hasUser: !!user,
    hasClaims: !!(user && user.claims),
    hasValidOAuth: !!(user && user.claims && user.claims.sub),
    hasLocalId: !!(user && user.id),
    userType: user ? (user.claims ? 'oauth' : user.id ? 'local' : 'unknown') : 'none'
  });
  
  return res.status(401).json({ message: "Unauthorized - Invalid session" });
};```

### server/auth.ts
```typescript
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import MemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

async function comparePasswords(supplied: string, stored: string) {
  return await bcrypt.compare(supplied, stored);
}

export function setupAuth(app: Express) {
  // Use PostgreSQL session store in production, memory store in development
  let store;
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Production: Require PostgreSQL session store for persistence
    if (!process.env.DATABASE_URL) {
      console.error('❌ CRITICAL: DATABASE_URL environment variable must be set in production!');
      console.error('   PostgreSQL session store required for production session persistence');
      process.exit(1);
    }
    
    const PgSession = connectPgSimple(session);
    store = new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'sessions', // Use existing table name (plural)
      createTableIfMissing: false, // Don't try to create - table already exists
      pruneSessionInterval: 60 * 15, // Cleanup every 15 minutes
      errorLog: (error: any) => {
        console.error('Session store error:', error);
      }
    });
    console.log('✅ Using PostgreSQL session store for production');
  } else {
    // Development: Use memory store
    const memoryStore = MemoryStore(session);
    store = new memoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    console.log('🔧 Using memory session store for development');
  }
  
  // Ensure session secret is set in production
  const sessionSecret = process.env.SESSION_SECRET;
  if (isProduction && (!sessionSecret || sessionSecret === 'dev-secret-key-replace-in-prod')) {
    console.error('❌ CRITICAL: SESSION_SECRET environment variable must be set in production!');
    console.error('   Generate a secure secret and set SESSION_SECRET in your production environment');
    process.exit(1);
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret || "dev-secret-key-replace-in-prod",
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      httpOnly: true,
      secure: isProduction, // true in production for HTTPS, false in development
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      sameSite: 'lax' // Compatible with OAuth flows while maintaining security
    }
  };
  
  console.log(`🔐 Session configuration: secure=${sessionSettings.cookie!.secure}, sameSite=${sessionSettings.cookie!.sameSite}`);

  // Trust proxy for production deployments (needed for secure cookies behind reverse proxy)
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Alias /api/auth/user to match client expectations (must be AFTER session middleware)
  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    // Return user without sensitive fields
    const user = req.user as any;
    if (user && user.password) {
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      res.json(user);
    }
  });

  passport.use(
    new LocalStrategy({
        usernameField: 'email' // Use email instead of username
      }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user || !user.password || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  // User cache to prevent redundant database calls during session deserialization
  const userCache = new Map<string, { user: any; timestamp: number }>();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL
  const MAX_CACHE_SIZE = 1000; // Prevent memory leaks
  
  // Export function to clear a specific user's cache (call after profile updates)
  (app as any).clearUserCache = (userId: string) => {
    userCache.delete(userId);
    console.log(`🗑️ Cleared cache for user ${userId}`);
  };
  
  // Cache cleanup function
  const cleanupCache = () => {
    const now = Date.now();
    userCache.forEach((value, key) => {
      if (now - value.timestamp > CACHE_TTL) {
        userCache.delete(key);
      }
    });
    
    // Enforce max cache size by removing oldest entries
    if (userCache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(userCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE);
      toDelete.forEach(([key]) => userCache.delete(key));
    }
  };
  
  // Run cache cleanup every 10 minutes
  setInterval(cleanupCache, 10 * 60 * 1000);

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      // Check cache first to avoid database call
      const cachedEntry = userCache.get(id);
      const now = Date.now();
      
      if (cachedEntry && (now - cachedEntry.timestamp) < CACHE_TTL) {
        console.log(`🔄 Using cached user data for ${id}`);
        return done(null, cachedEntry.user);
      }
      
      // Cache miss or expired, fetch from database
      console.log(`📡 Fetching user ${id} from database`);
      const user = await storage.getUser(id);
      
      if (user) {
        // Cache the user data
        userCache.set(id, { user, timestamp: now });
        console.log(`✅ Cached user ${id} (cache size: ${userCache.size})`);
      }
      
      done(null, user);
    } catch (error) {
      console.error(`❌ Error deserializing user ${id}:`, error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { 
        password, 
        email, 
        firstName, 
        lastName, 
        homeSuburb,
        preferredLocation,
        accountType,
        businessName,
        businessDescription,
        businessWebsite,
        businessPhone,
        businessAddress,
        businessCategory
      } = req.body;
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const userData: any = {
        password: await hashPassword(password),
        email: email.toLowerCase(),
        firstName,
        lastName,
        preferredLocation: preferredLocation || homeSuburb,
        accountType: accountType || 'regular'
      };

      // Add business fields if it's a business account
      if (accountType === 'business') {
        userData.businessName = businessName;
        userData.businessDescription = businessDescription;
        userData.businessWebsite = businessWebsite;
        userData.businessPhone = businessPhone;
        userData.businessAddress = businessAddress;
        userData.businessCategory = businessCategory;
      }

      const user = await storage.createUser(userData);

      req.login(user, (err) => {
        if (err) return next(err);
        // Return user without sensitive fields
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      console.error("Registration error details:", {
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
        stack: error?.stack
      });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      req.login(user, (err) => {
        if (err) {
          console.error("Login session error:", err);
          return res.status(500).json({ error: "Session error" });
        }
        // Return user without sensitive fields
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Return user without sensitive fields
    const user = req.user as any;
    if (user && user.password) {
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      res.json(user);
    }
  });
}

export function isAuthenticated(req: any, res: any, next: any) {
  // Check if user is authenticated via Passport
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Check if user object exists and has valid ID (either local auth or OAuth)
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized - No user" });
  }
  
  // For OAuth authentication (has claims structure)
  if (req.user.claims && req.user.claims.sub) {
    return next();
  }
  
  // For local authentication (direct user object with ID)
  if (req.user.id) {
    return next();
  }
  
  // Neither authentication method worked
  console.error("Authentication failed: User has database fields but no OAuth claims, requiring re-authentication", { 
    hasUser: !!req.user, 
    hasClaims: !!(req.user && req.user.claims),
    hasSub: !!(req.user && req.user.claims && req.user.claims.sub),
    hasId: !!(req.user && req.user.id)
  });
  return res.status(401).json({ message: "Unauthorized - Please log in again" });
}```

### Ingestion Services

#### server/tmr-posts-ingestion.ts
```typescript
/**
 * ============================================================================
 * TMR POSTS INGESTION SERVICE
 * ============================================================================
 * 
 * Simple, streamlined TMR traffic incident ingestion that:
 * - Fetches traffic events every 5 minutes from TMR API
 * - Creates posts using the existing posts table (TMR as a "user")
 * - Uses single icon type for all TMR incidents
 * - Handles duplicate detection via sourceId in properties
 * 
 * This replaces the complex unified-ingestion approach with a simple post-based flow.
 */

import { storage } from "./storage";
import { SYSTEM_USER_IDS, type InsertPost } from "@shared/schema";
import { CATEGORY_UUIDS, SUBCATEGORY_UUIDS } from "./utils/category-mapping";
import { broadcastPostNotifications, broadcastPostUpdateNotifications } from "./notification-service";

// ============================================================================
// CONFIGURATION
// ============================================================================

const TMR_API_URL = "https://api.qldtraffic.qld.gov.au/v2";
const TMR_API_KEY = "3e83add325cbb69ac4d8e5bf433d770b"; // Public API key from TMR docs
const POLLING_INTERVAL = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// TMR POSTS INGESTION ENGINE
// ============================================================================

class TMRPostsIngestionEngine {
  private pollingTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastFetchTime = 0;
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 5;

  /**
   * Start the TMR ingestion polling
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[TMR Posts] Already running, skipping start');
      return;
    }

    console.log('[TMR Posts] Starting TMR posts ingestion service...');
    this.isRunning = true;

    // Initial fetch after short delay
    setTimeout(() => this.fetchAndIngest(), 10000);

    // Set up recurring polling
    this.pollingTimer = setInterval(() => {
      this.fetchAndIngest();
    }, POLLING_INTERVAL);

    console.log(`[TMR Posts] Service started - polling every ${POLLING_INTERVAL / 60000} minutes`);
  }

  /**
   * Stop the TMR ingestion polling
   */
  stop(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.isRunning = false;
    console.log('[TMR Posts] Service stopped');
  }

  /**
   * Fetch TMR events and ingest as posts
   */
  private async fetchAndIngest(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('[TMR Posts] Fetching traffic events from TMR API...');
      
      // Fetch TMR events
      const events = await this.fetchTMREvents();
      
      if (!events || events.length === 0) {
        console.log('[TMR Posts] No events received from TMR API');
        return;
      }

      console.log(`[TMR Posts] Received ${events.length} events from TMR API`);

      // Process events and create/update posts
      const results = await this.processEvents(events);
      
      this.lastFetchTime = Date.now();
      this.consecutiveErrors = 0;

      const duration = Date.now() - startTime;
      console.log(`[TMR Posts] Ingestion complete: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped (${duration}ms)`);

    } catch (error) {
      this.consecutiveErrors++;
      console.error(`[TMR Posts] Error fetching TMR events (attempt ${this.consecutiveErrors}):`, error);
      
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        console.error('[TMR Posts] Too many consecutive errors, service will continue but check API status');
      }
    }
  }

  /**
   * Fetch events from TMR API
   */
  private async fetchTMREvents(): Promise<TMREvent[]> {
    const url = `${TMR_API_URL}/events?apikey=${TMR_API_KEY}&f=geojson`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`TMR API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle GeoJSON format
    if (data.features && Array.isArray(data.features)) {
      return data.features.map((feature: any) => this.parseGeoJSONFeature(feature));
    }
    
    // Handle events array format
    if (data.events && Array.isArray(data.events)) {
      return data.events.map((event: any) => this.parseEventObject(event));
    }

    return [];
  }

  /**
   * Compute centroid from any GeoJSON geometry type
   */
  private computeCentroid(geometry: any): { lat: number; lng: number } | null {
    if (!geometry || !geometry.coordinates) return null;

    try {
      switch (geometry.type) {
        case 'Point':
          return { lng: geometry.coordinates[0], lat: geometry.coordinates[1] };
        
        case 'LineString':
          // Use midpoint of linestring
          const coords = geometry.coordinates;
          if (coords.length === 0) return null;
          const midIndex = Math.floor(coords.length / 2);
          return { lng: coords[midIndex][0], lat: coords[midIndex][1] };
        
        case 'Polygon':
          // Use centroid of first ring
          const ring = geometry.coordinates[0];
          if (!ring || ring.length === 0) return null;
          const sumLat = ring.reduce((sum: number, coord: number[]) => sum + coord[1], 0);
          const sumLng = ring.reduce((sum: number, coord: number[]) => sum + coord[0], 0);
          return { lng: sumLng / ring.length, lat: sumLat / ring.length };
        
        case 'MultiPoint':
          // Use centroid of all points
          const points = geometry.coordinates;
          if (points.length === 0) return null;
          const multiPointSumLat = points.reduce((sum: number, coord: number[]) => sum + coord[1], 0);
          const multiPointSumLng = points.reduce((sum: number, coord: number[]) => sum + coord[0], 0);
          return { lng: multiPointSumLng / points.length, lat: multiPointSumLat / points.length };
        
        case 'MultiLineString':
          // Use midpoint of first linestring
          const firstLine = geometry.coordinates[0];
          if (!firstLine || firstLine.length === 0) return null;
          const multiLineMidIndex = Math.floor(firstLine.length / 2);
          return { lng: firstLine[multiLineMidIndex][0], lat: firstLine[multiLineMidIndex][1] };
        
        case 'MultiPolygon':
          // Use centroid of first ring of first polygon
          const firstPolygon = geometry.coordinates[0]?.[0];
          if (!firstPolygon || firstPolygon.length === 0) return null;
          const multiPolygonSumLat = firstPolygon.reduce((sum: number, coord: number[]) => sum + coord[1], 0);
          const multiPolygonSumLng = firstPolygon.reduce((sum: number, coord: number[]) => sum + coord[0], 0);
          return { lng: multiPolygonSumLng / firstPolygon.length, lat: multiPolygonSumLat / firstPolygon.length };
        
        case 'GeometryCollection':
          // Use first supported geometry
          for (const subGeom of geometry.geometries) {
            const centroid = this.computeCentroid(subGeom);
            if (centroid) return centroid;
          }
          return null;
        
        default:
          console.warn(`[TMR Posts] Unsupported geometry type: ${geometry.type}`);
          return null;
      }
    } catch (error) {
      console.warn('[TMR Posts] Error computing centroid:', error);
      return null;
    }
  }

  /**
   * Parse GeoJSON feature to TMR event
   */
  private parseGeoJSONFeature(feature: any): TMREvent {
    const props = feature.properties || {};
    const geometry = feature.geometry;
    
    // Extract centroid using robust geometry handler
    const centroid = this.computeCentroid(geometry);
    const lat = centroid?.lat || 0;
    const lng = centroid?.lng || 0;

    // Build location string from road_summary if available
    let location = '';
    if (props.road_summary) {
      const roadSummary = props.road_summary;
      if (typeof roadSummary === 'object') {
        location = [roadSummary.road_name, roadSummary.locality].filter(Boolean).join(', ');
      } else if (typeof roadSummary === 'string') {
        location = roadSummary;
      }
    }
    if (!location) {
      location = props.locality || props.suburb || props.location || 'Queensland';
    }

    return {
      id: feature.id?.toString() || props.id?.toString() || `tmr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: this.buildEventTitle(props),
      description: [props.description, props.advice, props.information].filter(Boolean).join('. ') || '',
      location,
      lat,
      lng,
      geometry,
      eventType: props.event_type || props.type || 'Traffic Event',
      eventSubtype: props.event_subtype || props.subtype || '',
      status: props.status || 'Published',
      startTime: props.published || props.start_time || props.created || new Date().toISOString(),
      endTime: props.end_time || null,
      impact: props.impact?.impact_type || props.impact_type || 'unknown',
      properties: props
    };
  }

  /**
   * Parse event object format
   */
  private parseEventObject(event: any): TMREvent {
    return {
      id: event.id || event.event_id || `tmr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: this.buildEventTitle(event),
      description: event.description || event.event_description || event.advice || '',
      location: event.locality || event.suburb || event.road_summary || event.location || '',
      lat: event.latitude || event.lat || 0,
      lng: event.longitude || event.lng || 0,
      geometry: event.geometry || { type: 'Point', coordinates: [event.longitude || 0, event.latitude || 0] },
      eventType: event.event_type || event.type || 'Traffic Event',
      eventSubtype: event.event_subtype || event.subtype || '',
      status: event.status || 'active',
      startTime: event.start_time || event.created || new Date().toISOString(),
      endTime: event.end_time || null,
      impact: event.impact_type || event.impact || 'unknown',
      properties: event
    };
  }

  /**
   * Safely extract a string value from any type (handles nested objects)
   */
  private safeString(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'object') {
      // Try common string properties first
      if (value.name) return this.safeString(value.name);
      if (value.value) return this.safeString(value.value);
      if (value.text) return this.safeString(value.text);
      if (value.road_name) return this.safeString(value.road_name);
      if (value.locality) return this.safeString(value.locality);
      // Last resort: try to find any string property
      for (const key of Object.keys(value)) {
        if (typeof value[key] === 'string' && value[key].length > 0) {
          return value[key];
        }
      }
      return '';
    }
    return '';
  }

  /**
   * Build a readable title from TMR event properties
   */
  private buildEventTitle(props: any): string {
    const eventType = this.safeString(props.event_type || props.type) || 'Traffic';
    const eventSubtype = this.safeString(props.event_subtype || props.subtype);
    
    // Handle road_summary as object or string
    let roadName = '';
    let locality = '';
    
    if (props.road_summary) {
      if (typeof props.road_summary === 'object') {
        roadName = this.safeString(props.road_summary.road_name);
        locality = this.safeString(props.road_summary.locality) || this.safeString(props.locality);
      } else if (typeof props.road_summary === 'string') {
        roadName = props.road_summary;
        locality = this.safeString(props.locality);
      }
    } else {
      roadName = this.safeString(props.road || props.street);
      locality = this.safeString(props.locality || props.suburb);
    }

    // Build title parts
    const parts: string[] = [];
    
    if (eventSubtype && eventSubtype !== eventType) {
      parts.push(`${eventType} - ${eventSubtype}`);
    } else {
      parts.push(eventType);
    }

    if (roadName) {
      parts.push(`on ${roadName}`);
    }

    if (locality) {
      parts.push(`(${locality})`);
    }

    return parts.join(' ') || 'Traffic Event';
  }

  /**
   * Process TMR events and create/update posts using upsert for deduplication
   */
  private async processEvents(events: TMREvent[]): Promise<{ created: number; updated: number; skipped: number }> {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    // Use the new source-based query for existing posts
    const existingPosts = await storage.getPostsBySource('tmr');
    const existingBySourceId = new Map(
      existingPosts.map(post => [post.sourceId, post])
    );
    
    console.log(`[TMR Posts] Found ${existingPosts.length} existing TMR posts for deduplication`);

    for (const event of events) {
      try {
        // Skip events without valid coordinates
        if (!event.lat || !event.lng || (event.lat === 0 && event.lng === 0)) {
          skipped++;
          continue;
        }

        // Check for existing post with same source ID
        const existingPost = existingBySourceId.get(event.id);

        if (existingPost) {
          // Update existing post if status changed or has significant changes
          const existingProps = existingPost.properties as any;
          const existingStatus = existingProps?.tmrStatus || existingPost.status;
          const statusChanged = event.status !== existingStatus;
          const impactChanged = this.hasSignificantChanges(event, existingProps);
          
          if (statusChanged || impactChanged) {
            // Pass whether status actually changed to control notifications
            await this.updatePost(existingPost.id, event, statusChanged);
            updated++;
          } else {
            skipped++; // No changes needed
          }
        } else {
          // Create new post
          await this.createPost(event);
          created++;
        }
      } catch (error) {
        console.error(`[TMR Posts] Error processing event ${event.id}:`, error);
        skipped++;
      }
    }

    return { created, updated, skipped };
  }

  /**
   * Check if event has significant changes from existing post
   */
  private hasSignificantChanges(event: TMREvent, existingProps: any): boolean {
    // Check if description changed significantly
    if (event.description && event.description !== existingProps?.tmrDescription) {
      return true;
    }
    
    // Check if impact changed
    if (event.impact && event.impact !== existingProps?.tmrImpact) {
      return true;
    }

    return false;
  }

  /**
   * Create a new post from TMR event
   */
  private async createPost(event: TMREvent): Promise<void> {
    const post: InsertPost = {
      userId: SYSTEM_USER_IDS.TMR,
      source: 'tmr', // Data source tracking
      sourceId: event.id, // External TMR event ID
      title: event.title,
      description: event.description || `Traffic event reported by Transport and Main Roads Queensland.`,
      location: event.location || 'Queensland',
      categoryId: CATEGORY_UUIDS.INFRASTRUCTURE,
      subcategoryId: SUBCATEGORY_UUIDS.ROAD_HAZARDS,
      geometry: event.geometry || {
        type: 'Point',
        coordinates: [event.lng, event.lat]
      },
      centroidLat: event.lat,
      centroidLng: event.lng,
      status: this.mapTMRStatus(event.status),
      properties: {
        tmrSourceId: event.id,
        tmrEventType: event.eventType,
        tmrEventSubtype: event.eventSubtype,
        tmrStatus: event.status,
        tmrImpact: event.impact,
        tmrDescription: event.description,
        tmrStartTime: event.startTime,
        tmrEndTime: event.endTime,
        iconType: 'traffic' // Single icon type for all TMR events
      }
    };

    const createdPost = await storage.createPost(post);
    
    // Send push notifications to eligible users
    try {
      await broadcastPostNotifications(
        {
          id: createdPost.id,
          title: createdPost.title,
          categoryId: createdPost.categoryId,
          centroidLat: createdPost.centroidLat,
          centroidLng: createdPost.centroidLng,
          userId: createdPost.userId,
          source: 'tmr'
        },
        'Transport and Main Roads QLD'
      );
    } catch (notifyError) {
      console.error('[TMR Posts] Failed to send notifications:', notifyError);
    }
  }

  /**
   * Update existing post with new TMR data and optionally notify eligible users
   * @param statusChanged - Only send notifications when status actually changed
   */
  private async updatePost(postId: string, event: TMREvent, statusChanged: boolean = false): Promise<void> {
    const updatedPost = await storage.updatePost(postId, {
      description: event.description || `Traffic event reported by Transport and Main Roads Queensland.`,
      status: this.mapTMRStatus(event.status),
      properties: {
        source: 'tmr',
        tmrSourceId: event.id,
        tmrEventType: event.eventType,
        tmrEventSubtype: event.eventSubtype,
        tmrStatus: event.status,
        tmrImpact: event.impact,
        tmrDescription: event.description,
        tmrStartTime: event.startTime,
        tmrEndTime: event.endTime,
        iconType: 'traffic'
      }
    });
    
    // Only send notifications when status actually changed (not just metadata updates)
    if (updatedPost && statusChanged) {
      try {
        await broadcastPostUpdateNotifications(
          {
            id: updatedPost.id,
            title: updatedPost.title,
            categoryId: updatedPost.categoryId,
            centroidLat: updatedPost.centroidLat,
            centroidLng: updatedPost.centroidLng,
            userId: updatedPost.userId,
            source: 'tmr'
          },
          'Transport and Main Roads QLD',
          'status_update'
        );
      } catch (notifyError) {
        console.error('[TMR Posts] Failed to send update notifications:', notifyError);
      }
    }
  }

  /**
   * Map TMR status to post status
   */
  private mapTMRStatus(tmrStatus: string): 'active' | 'resolved' | 'closed' {
    const status = tmrStatus?.toLowerCase() || 'active';
    
    // TMR uses 'Published' for active events
    if (status === 'published' || status === 'active') {
      return 'active';
    }
    
    if (status.includes('clear') || status.includes('resolved') || status.includes('closed') || status.includes('ended')) {
      return 'resolved';
    }
    
    return 'active';
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface TMREvent {
  id: string;
  title: string;
  description: string;
  location: string;
  lat: number;
  lng: number;
  geometry: any;
  eventType: string;
  eventSubtype: string;
  status: string;
  startTime: string;
  endTime: string | null;
  impact: string;
  properties: any;
}

// ============================================================================
// SINGLETON & EXPORTS
// ============================================================================

let tmrIngestionEngine: TMRPostsIngestionEngine | null = null;

export function startTMRPostsIngestion(): void {
  if (!tmrIngestionEngine) {
    tmrIngestionEngine = new TMRPostsIngestionEngine();
  }
  tmrIngestionEngine.start();
}

export function stopTMRPostsIngestion(): void {
  if (tmrIngestionEngine) {
    tmrIngestionEngine.stop();
  }
}

export { TMRPostsIngestionEngine };
```

#### server/qfes-posts-ingestion.ts
```typescript
/**
 * ============================================================================
 * QFES POSTS INGESTION SERVICE
 * ============================================================================
 * 
 * Simple, streamlined QFES emergency incident ingestion that:
 * - Fetches emergency incidents every 5 minutes from QFES ESCAD API
 * - Creates posts using the existing posts table (QFES as a "user")
 * - Uses SINGLE icon type (Siren) for ALL emergency incidents
 * - Handles duplicate detection via sourceId
 * 
 * This follows the same pattern as TMR posts ingestion.
 */

import { storage } from "./storage";
import { SYSTEM_USER_IDS, type InsertPost } from "@shared/schema";
import { CATEGORY_UUIDS, SUBCATEGORY_UUIDS } from "./utils/category-mapping";
import { broadcastPostNotifications, broadcastPostUpdateNotifications } from "./notification-service";

// ============================================================================
// CONFIGURATION
// ============================================================================

const QFES_API_URL = "https://services1.arcgis.com/vkTwD8kHw2woKBqV/arcgis/rest/services/ESCAD_Current_Incidents_Public/FeatureServer/0/query?f=geojson&where=1%3D1&outFields=*&outSR=4326";
const POLLING_INTERVAL = 5 * 60 * 1000; // 5 minutes
const TTL_HOURS = 12; // Emergency incidents expire after 12 hours

// ============================================================================
// QFES POSTS INGESTION ENGINE
// ============================================================================

class QFESPostsIngestionEngine {
  private pollingTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastFetchTime = 0;
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 5;

  /**
   * Start the QFES ingestion polling
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[QFES Posts] Already running, skipping start');
      return;
    }

    console.log('[QFES Posts] Starting QFES posts ingestion service...');
    this.isRunning = true;

    // Initial fetch after short delay
    setTimeout(() => this.fetchAndIngest(), 15000);

    // Set up recurring polling
    this.pollingTimer = setInterval(() => {
      this.fetchAndIngest();
    }, POLLING_INTERVAL);

    console.log(`[QFES Posts] Service started - polling every ${POLLING_INTERVAL / 60000} minutes`);
  }

  /**
   * Stop the QFES ingestion polling
   */
  stop(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.isRunning = false;
    console.log('[QFES Posts] Service stopped');
  }

  /**
   * Fetch QFES incidents and ingest as posts
   */
  private async fetchAndIngest(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('[QFES Posts] Fetching emergency incidents from QFES ESCAD API...');
      
      // Fetch QFES incidents
      const incidents = await this.fetchQFESIncidents();
      
      if (!incidents || incidents.length === 0) {
        console.log('[QFES Posts] No incidents received from QFES API');
        return;
      }

      console.log(`[QFES Posts] Received ${incidents.length} incidents from QFES API`);

      // Process incidents and create/update posts
      const results = await this.processIncidents(incidents);
      
      this.lastFetchTime = Date.now();
      this.consecutiveErrors = 0;

      const duration = Date.now() - startTime;
      console.log(`[QFES Posts] Ingestion complete: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped (${duration}ms)`);

    } catch (error) {
      this.consecutiveErrors++;
      console.error(`[QFES Posts] Error fetching QFES incidents (attempt ${this.consecutiveErrors}):`, error);
      
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        console.error(`[QFES Posts] Max consecutive errors (${this.maxConsecutiveErrors}) reached, pausing ingestion`);
        this.stop();
      }
    }
  }

  /**
   * Fetch incidents from QFES ESCAD API
   */
  private async fetchQFESIncidents(): Promise<QFESIncident[]> {
    const response = await fetch(QFES_API_URL);
    
    if (!response.ok) {
      throw new Error(`QFES API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle GeoJSON format
    if (data.features && Array.isArray(data.features)) {
      return data.features
        .map((feature: any) => this.parseGeoJSONFeature(feature))
        .filter((incident: QFESIncident | null): incident is QFESIncident => incident !== null);
    }

    return [];
  }

  /**
   * Compute centroid from various geometry types
   */
  private computeCentroid(geometry: any): { lat: number; lng: number } | null {
    if (!geometry || !geometry.type) return null;

    try {
      switch (geometry.type) {
        case 'Point':
          if (!geometry.coordinates || geometry.coordinates.length < 2) return null;
          return { lng: geometry.coordinates[0], lat: geometry.coordinates[1] };
        
        case 'Polygon':
          // Use centroid of exterior ring
          const ring = geometry.coordinates[0];
          if (!ring || ring.length === 0) return null;
          const sumLat = ring.reduce((sum: number, coord: number[]) => sum + coord[1], 0);
          const sumLng = ring.reduce((sum: number, coord: number[]) => sum + coord[0], 0);
          return { lng: sumLng / ring.length, lat: sumLat / ring.length };
        
        case 'MultiPoint':
          // Use first point
          if (!geometry.coordinates || geometry.coordinates.length === 0) return null;
          return { lng: geometry.coordinates[0][0], lat: geometry.coordinates[0][1] };
        
        case 'LineString':
          // Use midpoint
          const coords = geometry.coordinates;
          if (!coords || coords.length === 0) return null;
          const midIndex = Math.floor(coords.length / 2);
          return { lng: coords[midIndex][0], lat: coords[midIndex][1] };
        
        default:
          console.warn(`[QFES Posts] Unsupported geometry type: ${geometry.type}`);
          return null;
      }
    } catch (error) {
      console.warn('[QFES Posts] Error computing centroid:', error);
      return null;
    }
  }

  /**
   * Parse GeoJSON feature to QFES incident
   */
  private parseGeoJSONFeature(feature: any): QFESIncident | null {
    const props = feature.properties || {};
    const geometry = feature.geometry;
    
    // Extract centroid
    const centroid = this.computeCentroid(geometry);
    if (!centroid || (centroid.lat === 0 && centroid.lng === 0)) {
      return null; // Skip incidents without valid coordinates
    }

    // Build incident ID
    const id = props.Master_Incident_Number || 
               props.Incident_Number || 
               feature.id?.toString() || 
               props.OBJECTID?.toString() || 
               `qfes-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Build location string
    const location = [props.Location, props.Locality]
      .filter(Boolean)
      .join(', ') || 'Queensland';

    // Determine status
    const status = this.mapQFESStatus(props.CurrentStatus);

    // Skip resolved/closed incidents
    if (status !== 'active') {
      return null;
    }

    return {
      id,
      title: this.buildIncidentTitle(props),
      description: this.buildIncidentDescription(props),
      location,
      lat: centroid.lat,
      lng: centroid.lng,
      geometry,
      incidentType: props.GroupedType || props.Type || 'Emergency',
      status: props.CurrentStatus || 'Active',
      responseDate: props.Response_Date || null,
      lastUpdate: props.LastUpdate || null,
      vehiclesOnScene: props.VehiclesOnScene || 0,
      vehiclesOnRoute: props.VehiclesOnRoute || 0,
      properties: props
    };
  }

  /**
   * Build a readable title from QFES incident properties
   */
  private buildIncidentTitle(props: any): string {
    const type = props.GroupedType || props.Type || 'Emergency';
    const locality = props.Locality || '';
    
    if (locality) {
      return `${type} - ${locality}`;
    }
    return type;
  }

  /**
   * Build description from QFES incident properties
   */
  private buildIncidentDescription(props: any): string {
    const parts: string[] = [];
    
    const type = props.GroupedType || props.Type;
    if (type) {
      parts.push(`${type} incident reported.`);
    }
    
    const location = props.Location;
    if (location) {
      parts.push(`Location: ${location}.`);
    }
    
    const vehiclesOnScene = props.VehiclesOnScene || 0;
    const vehiclesOnRoute = props.VehiclesOnRoute || 0;
    if (vehiclesOnScene > 0 || vehiclesOnRoute > 0) {
      parts.push(`Emergency response: ${vehiclesOnScene} units on scene, ${vehiclesOnRoute} en route.`);
    }
    
    return parts.join(' ') || 'Emergency incident reported by Queensland Fire and Emergency Services.';
  }

  /**
   * Process QFES incidents and create/update posts
   */
  private async processIncidents(incidents: QFESIncident[]): Promise<{ created: number; updated: number; skipped: number }> {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    // Get existing QFES posts for deduplication
    const existingPosts = await storage.getPostsBySource('emergency');
    const existingBySourceId = new Map(
      existingPosts.map(post => [post.sourceId, post])
    );
    
    console.log(`[QFES Posts] Found ${existingPosts.length} existing QFES posts for deduplication`);

    for (const incident of incidents) {
      try {
        // Skip incidents without valid coordinates
        if (!incident.lat || !incident.lng || (incident.lat === 0 && incident.lng === 0)) {
          skipped++;
          continue;
        }

        // Check for existing post with same source ID
        const existingPost = existingBySourceId.get(incident.id);

        if (existingPost) {
          // Update existing post if status changed
          const existingProps = existingPost.properties as any;
          const existingStatus = existingProps?.qfesStatus || existingPost.status;
          
          if (incident.status !== existingStatus) {
            // Status actually changed - pass true to trigger notifications
            await this.updatePost(existingPost.id, incident, true);
            updated++;
          } else {
            skipped++; // No changes needed
          }
        } else {
          // Create new post
          await this.createPost(incident);
          created++;
        }
      } catch (error) {
        console.error(`[QFES Posts] Error processing incident ${incident.id}:`, error);
        skipped++;
      }
    }

    return { created, updated, skipped };
  }

  /**
   * Create a new post from QFES incident
   */
  private async createPost(incident: QFESIncident): Promise<void> {
    // Calculate expiry time (12 hours from now based on last_updated pattern)
    const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);
    
    const post: InsertPost = {
      userId: SYSTEM_USER_IDS.QFES,
      source: 'emergency',
      sourceId: incident.id,
      title: incident.title,
      description: incident.description,
      location: incident.location || 'Queensland',
      categoryId: CATEGORY_UUIDS.EMERGENCY,
      subcategoryId: SUBCATEGORY_UUIDS.FIRE_SMOKE, // Default subcategory for QFES
      geometry: incident.geometry || {
        type: 'Point',
        coordinates: [incident.lng, incident.lat]
      },
      centroidLat: incident.lat,
      centroidLng: incident.lng,
      status: 'active',
      expiresAt,
      properties: {
        source: 'emergency',
        qfesIncidentType: incident.incidentType,
        qfesStatus: incident.status,
        qfesResponseDate: incident.responseDate,
        qfesLastUpdate: incident.lastUpdate,
        qfesVehiclesOnScene: incident.vehiclesOnScene,
        qfesVehiclesOnRoute: incident.vehiclesOnRoute,
        iconType: 'emergency' // Single icon type for all QFES incidents
      }
    };

    const createdPost = await storage.createPost(post);
    
    // Send push notifications to eligible users
    try {
      await broadcastPostNotifications(
        {
          id: createdPost.id,
          title: createdPost.title,
          categoryId: createdPost.categoryId,
          centroidLat: createdPost.centroidLat,
          centroidLng: createdPost.centroidLng,
          userId: createdPost.userId,
          source: 'emergency'
        },
        'QLD Fire & Emergency Services'
      );
    } catch (notifyError) {
      console.error('[QFES Posts] Failed to send notifications:', notifyError);
    }
  }

  /**
   * Update an existing post from QFES incident and optionally notify eligible users
   * @param statusChanged - Only send notifications when status actually changed
   */
  private async updatePost(postId: string, incident: QFESIncident, statusChanged: boolean = false): Promise<void> {
    // Refresh expiry time on update
    const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);
    
    const updatedPost = await storage.updatePost(postId, {
      title: incident.title,
      description: incident.description,
      status: this.mapQFESStatus(incident.status),
      expiresAt,
      properties: {
        source: 'emergency',
        qfesIncidentType: incident.incidentType,
        qfesStatus: incident.status,
        qfesResponseDate: incident.responseDate,
        qfesLastUpdate: incident.lastUpdate,
        qfesVehiclesOnScene: incident.vehiclesOnScene,
        qfesVehiclesOnRoute: incident.vehiclesOnRoute,
        iconType: 'emergency'
      }
    });
    
    // Only send notifications when status actually changed (not just metadata updates)
    if (updatedPost && statusChanged) {
      try {
        await broadcastPostUpdateNotifications(
          {
            id: updatedPost.id,
            title: updatedPost.title,
            categoryId: updatedPost.categoryId,
            centroidLat: updatedPost.centroidLat,
            centroidLng: updatedPost.centroidLng,
            userId: updatedPost.userId,
            source: 'emergency'
          },
          'QLD Fire & Emergency Services',
          'status_update'
        );
      } catch (notifyError) {
        console.error('[QFES Posts] Failed to send update notifications:', notifyError);
      }
    }
  }

  /**
   * Map QFES status to post status
   */
  private mapQFESStatus(qfesStatus: string): 'active' | 'resolved' | 'closed' {
    const status = qfesStatus?.toLowerCase() || 'active';
    
    if (status.includes('closed') || status.includes('resolved') || status.includes('complete')) {
      return 'resolved';
    }
    
    return 'active';
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface QFESIncident {
  id: string;
  title: string;
  description: string;
  location: string;
  lat: number;
  lng: number;
  geometry: any;
  incidentType: string;
  status: string;
  responseDate: string | null;
  lastUpdate: string | null;
  vehiclesOnScene: number;
  vehiclesOnRoute: number;
  properties: any;
}

// ============================================================================
// SINGLETON & EXPORTS
// ============================================================================

let qfesIngestionEngine: QFESPostsIngestionEngine | null = null;

export function startQFESPostsIngestion(): void {
  if (!qfesIngestionEngine) {
    qfesIngestionEngine = new QFESPostsIngestionEngine();
  }
  qfesIngestionEngine.start();
}

export function stopQFESPostsIngestion(): void {
  if (qfesIngestionEngine) {
    qfesIngestionEngine.stop();
  }
}

export { QFESPostsIngestionEngine };
```

#### server/unified-ingestion.ts
```typescript
/**
 * ============================================================================
 * UNIFIED BACKGROUND INGESTION PIPELINE
 * ============================================================================
 * 
 * Consolidates TMR traffic events, emergency incidents, and user reports
 * into the single UnifiedStore with spatial optimization and intelligent caching.
 * 
 * Features:
 * - Multi-source data normalization
 * - Spatial index computation (geocells, regionIds)
 * - Smart cache invalidation
 * - Circuit breaker protection
 * - Adaptive polling intervals
 */

import { storage } from "./storage";
import { spatialLookup, computeGeocellForIncident } from "./spatial-lookup";
import { generateUnifiedIncidentId, prepareUnifiedIncidentForInsert, type InsertUnifiedIncident } from "@shared/schema";
import { getRegionFromCoordinates, findRegionBySuburb, QLD_REGIONS } from "./region-utils";
import { mapTMRCategory, mapTMRSubcategory, mapEmergencyCategory, mapEmergencySubcategory } from "./utils/category-mapping";
// Import retry logic - create local implementation if not exported
const fetchWithRetry = async (url: string, options: { maxRetries: number; baseDelay: number; maxDelay: number }): Promise<Response> => {
  for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) {
        return response;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (attempt === options.maxRetries) throw error;
      
      const delay = Math.min(options.baseDelay * Math.pow(2, attempt - 1), options.maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const QLD_TRAFFIC_BASE_URL = "https://api.qldtraffic.qld.gov.au/v2";
const QLD_TRAFFIC_API_KEY = process.env.QLD_TRAFFIC_API_KEY;

const EMERGENCY_API_URL = "https://services1.arcgis.com/vkTwD8kHw2woKBqV/arcgis/rest/services/ESCAD_Current_Incidents_Public/FeatureServer/0/query?f=geojson&where=1%3D1&outFields=*&outSR=4326";

const POLLING_INTERVALS = {
  fast: 1 * 60 * 1000,      // 1 minute for active periods
  normal: 1.5 * 60 * 1000,  // 1.5 minutes for normal periods
  slow: 5 * 60 * 1000,      // 5 minutes for quiet periods
  circuit: 15 * 60 * 1000,  // 15 minutes when circuit breaker is open
  error: 10 * 60 * 1000     // 10 minutes after errors
};

// ============================================================================
// UNIFIED INGESTION ENGINE
// ============================================================================

// Global singleton to prevent duplicate initialization
let globalUnifiedEngine: UnifiedIngestionEngine | null = null;

interface IngestionSource {
  name: string;
  type: 'tmr' | 'emergency' | 'user';
  fetcher: () => Promise<any>;
  normalizer: (data: any) => InsertUnifiedIncident[];
  lastFetch: number;
  lastSuccess: number;
  errorCount: number;
  circuitOpen: boolean;
}

class UnifiedIngestionEngine {
  private sources: Map<string, IngestionSource> = new Map();
  private pollingTimers: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;

  constructor() {
    this.registerSources();
  }

  private registerSources() {
    // DISABLED: External API feeds removed for community-focused social experience
    // TMR Traffic Events and Emergency Services sources have been disabled
    // The app now focuses purely on user-generated community content

    // User Reports Source (database-based, no external API)
    // This is the only active source - community-driven content
    this.sources.set('user-reports', {
      name: 'User Reports',
      type: 'user',
      fetcher: this.fetchUserReports.bind(this),
      normalizer: this.passThrough.bind(this), // User reports are already normalized, don't re-process
      lastFetch: 0,
      lastSuccess: 0,
      errorCount: 0,
      circuitOpen: false
    });
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize() {
    if (this.isInitialized) {
      console.log('⏭️ Unified Ingestion Pipeline already initialized, skipping duplicate');
      return;
    }

    console.log('🚀 Initializing Unified Ingestion Pipeline...');

    // Start polling for each source with staggered timing
    this.scheduleSourceIngestion('tmr-traffic', 5000);        // Start immediately
    this.scheduleSourceIngestion('emergency-incidents', 15000); // 15 seconds later
    this.scheduleSourceIngestion('user-reports', 30000);       // 30 seconds later

    this.isInitialized = true;
    console.log('✅ Unified Ingestion Pipeline initialized');
    
    // Refresh spatial index in background (non-blocking)
    this.refreshSpatialIndex().catch(error => {
      console.error('Background spatial index refresh failed:', error);
    });
  }

  // ============================================================================
  // DATA FETCHERS
  // ============================================================================

  private async fetchTMRTrafficEvents(): Promise<any> {
    // Public API with common public key from TMR specification document
    const publicApiKey = '3e83add325cbb69ac4d8e5bf433d770b';
    const url = `${QLD_TRAFFIC_BASE_URL}/events?apikey=${publicApiKey}&f=geojson`;
    
    const response = await fetchWithRetry(url, {
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 30000
    });

    if (!response.ok) {
      throw new Error(`TMR API HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`📊 TMR API Response structure:`, Object.keys(data));
    if (data.features) {
      console.log(`📊 TMR GeoJSON: ${data.features.length} features`);
    } else if (data.events) {
      console.log(`📊 TMR Events: ${data.events.length} events`);
    }
    
    return data;
  }

  private async fetchEmergencyIncidents(): Promise<any> {
    const response = await fetchWithRetry(EMERGENCY_API_URL, {
      maxRetries: 2,
      baseDelay: 1000,
      maxDelay: 15000
    });

    if (!response.ok) {
      throw new Error(`Emergency API HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  private async fetchUserReports(): Promise<any> {
    // Fetch recent user-reported incidents from unified incidents table
    const unifiedIncidents = await storage.getAllUnifiedIncidents();
    
    // Filter for user reports only - STRICT filtering to prevent emergency incidents leaking
    const userReports = unifiedIncidents.filter(incident => {
      // Only include if source is 'user'
      if (incident.source !== 'user') return false;
      
      // STRICT RULE: Exclude anything with agency attribution
      if (incident.userId?.startsWith('agency:')) return false;
      
      // STRICT RULE: Exclude anything with emergency dataset fingerprints
      const props = incident.properties || {};
      const hasEmergencyFingerprints = 
        (props as any)?.Jurisdiction || (props as any)?.jurisdiction ||
        (props as any)?.Master_Incident_Number || (props as any)?.master_incident_number ||
        (props as any)?.OBJECTID || (props as any)?.objectid ||
        (props as any)?.CurrentStatus || (props as any)?.current_status ||
        (props as any)?.VehiclesOnScene || (props as any)?.vehicles_on_scene ||
        (props as any)?.GroupedType || (props as any)?.grouped_type;
        
      if (hasEmergencyFingerprints) return false;
      
      // STRICT RULE: Only include if explicitly marked as user-reported OR has non-agency userId
      const isUserReported = (props as any)?.userReported === true;
      const hasValidUserId = incident.userId && !incident.userId.startsWith('agency:');
      
      return isUserReported || hasValidUserId;
    });
    
    // ALSO fetch RECENT legacy incidents from the old incidents table (last 7 days only)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const allLegacyIncidents = await storage.getIncidents();
    const legacyIncidents = allLegacyIncidents.filter(incident => {
      if (!incident.publishedDate) return false; // Skip incidents without dates
      const incidentDate = new Date(incident.publishedDate);
      return incidentDate >= sevenDaysAgo; // Only include recent incidents
    });
    
    // Prepare legacy incidents for normalization (convert to UnifiedIncident format)
    const legacyIncidentsForNormalization = legacyIncidents
      .filter(incident => {
        if (!incident.geometry) return false; // Only include incidents with geometry
        
        // CRITICAL BUG FIX: Skip incidents that are already properly stored in unified store
        // This prevents new user reports from being overwritten with legacy system account
        const alreadyInUnifiedStore = userReports.find(unified => 
          unified.sourceId === incident.id && 
          unified.source === 'user' &&
          unified.userId && 
          unified.userId !== 'legacy-system-account-001'
        );
        
        if (alreadyInUnifiedStore) {
          // Skip this incident - it's already properly stored with correct user attribution
          return false;
        }
        
        // NOTE: Emergency incidents are handled by the Emergency Services pipeline,
        // so we don't need to filter them here - they won't be in the legacy user incidents table anyway
        
        return true;
      })
      .map(incident => {
        const props = incident.properties || {};
        // Smart categorization based on content
        const title = incident.title || '';
        const description = incident.description || '';
        const content = `${title} ${description}`.toLowerCase();
        
        let smartCategory = incident.categoryId;
        if (!smartCategory) {
          // Categorize power/electrical/utility incidents as Infrastructure & Hazards
          if (content.includes('power') || content.includes('electrical') || 
              content.includes('utility') || content.includes('gas') ||
              content.includes('water leak') || content.includes('outage')) {
            smartCategory = 'Infrastructure & Hazards';
          } else {
            smartCategory = 'Community Issues';
          }
        }
        
        return {
          source: 'user',
          sourceId: incident.id,
          title: incident.title,
          description: incident.description || '',
          location: incident.location,
          category: smartCategory,
          subcategory: incident.subcategoryId || '',
          severity: 'medium',
          status: incident.status === 'Reported' ? 'active' : incident.status || 'active',
          geometry: incident.geometry,
          centroidLat: (incident.geometry as any)?.coordinates?.[1] || 0,
          centroidLng: (incident.geometry as any)?.coordinates?.[0] || 0,
          regionIds: [],
          geocell: '',
          incidentTime: incident.publishedDate || new Date(),
          lastUpdated: incident.publishedDate || new Date(),
          publishedAt: new Date(),
          properties: {
            ...props,
            id: incident.id,
            title: incident.title,
            description: incident.description || '',
            location: incident.location,
            category: smartCategory,
            source: 'legacy',
            userReported: false,
            reporterId: 'legacy-system-account-001' // Legacy incidents use system account
          },
          userId: 'legacy-system-account-001',
          photoUrl: incident.photoUrl || null,
          verificationStatus: 'unverified'
        } as InsertUnifiedIncident;
      });

    // Transform userReports to ensure proper userId and reporterId mapping
    const transformedUserReports = userReports.map(incident => {
      // Extract user_id from database and map to both userId and properties.reporterId
      const userId = incident.userId || (incident as any).user_id || null;
      
      return {
        ...incident,
        userId: userId, // Set userId field
        properties: {
          ...(incident.properties || {}),
          // CRITICAL: Set reporterId in properties for user attribution
          reporterId: userId,
          source: 'user',
          userReported: true
        }
      } as InsertUnifiedIncident;
    });

    const allAlreadyNormalized = [...transformedUserReports, ...legacyIncidentsForNormalization];

    console.log(`📊 User Reports Fetch: ${userReports.length} unified + ${legacyIncidentsForNormalization.length} legacy = ${allAlreadyNormalized.length} total user incidents (emergency incidents excluded from user pipeline)`);
    
    // Return in pass-through format for the passThrough normalizer
    return {
      alreadyNormalized: allAlreadyNormalized
    };
  }

  // ============================================================================
  // DATA NORMALIZERS
  // ============================================================================

  private normalizeTMREvents(data: any): InsertUnifiedIncident[] {
    let events: any[] = [];
    
    // Handle GeoJSON format
    if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
      events = data.features;
    }
    // Handle non-GeoJSON format  
    else if (Array.isArray(data.events)) {
      events = data.events.map((event: any) => ({
        type: 'Feature',
        id: event.id,
        geometry: event.geometry || null,
        properties: event
      }));
    }
    
    if (events.length === 0) {
      console.log(`⚠️ TMR normalizer: No events found. Data keys:`, Object.keys(data));
      return [];
    }

    console.log(`📊 TMR normalizer: Processing ${events.length} events`);

    return events
      .filter(this.filterRecentEvents)
      .map((feature: any) => {
        const props = feature.properties || {};
        const geometry = feature.geometry;
        
        // Compute centroid from geometry
        const centroid = this.computeCentroid(geometry);
        if (!centroid) return null;

        // Get region assignments
        const regionIds = this.computeRegionIds(centroid.lat, centroid.lng, props);

        // Create unified incident
        const title = `${props.event_type || 'Traffic'} - ${props.event_subtype || 'Event'}`;
        
        // Map TMR category and subcategory to UUIDs
        const tmrCategory = mapTMRCategory('traffic');
        const tmrSubcategoryText = this.getTMRSubcategory(props);
        const tmrSubcategory = mapTMRSubcategory(tmrSubcategoryText);
        
        const incident: InsertUnifiedIncident = {
          source: 'tmr',
          sourceId: feature.id?.toString() || props.id || `tmr-${Date.now()}`,
          title,
          description: [props.description, props.advice, props.information].filter(Boolean).join('. '),
          location: props.road_summary ? `${props.road_summary.road_name}, ${props.road_summary.locality}` : 'Queensland',
          category: tmrCategory.name,
          subcategory: tmrSubcategory?.name || tmrSubcategoryText,
          categoryUuid: tmrCategory.uuid,
          subcategoryUuid: tmrSubcategory?.uuid || undefined,
          severity: this.getTMRSeverity(props),
          status: props.status === 'Published' ? 'active' : 'resolved',
          geometry,
          centroidLat: centroid.lat,
          centroidLng: centroid.lng,
          regionIds,
          geocell: computeGeocellForIncident({ centroidLat: centroid.lat, centroidLng: centroid.lng }),
          incidentTime: props.published ? new Date(props.published) : new Date(),
          lastUpdated: props.last_updated ? new Date(props.last_updated) : new Date(),
          publishedAt: new Date(),
          userId: undefined, // Will be resolved by storage layer attribution system
          properties: props
        };

        return prepareUnifiedIncidentForInsert(incident);
      })
      .filter((incident): incident is InsertUnifiedIncident & { id: string } => incident !== null);
  }

  private normalizeEmergencyIncidents(data: any): InsertUnifiedIncident[] {
    if (!data.features || !Array.isArray(data.features)) return [];

    return data.features
      .filter(this.filterRecentEvents)
      .map((feature: any) => {
        const props = feature.properties || {};
        const geometry = feature.geometry;
        
        const centroid = this.computeCentroid(geometry);
        if (!centroid) return null;

        const regionIds = this.computeRegionIds(centroid.lat, centroid.lng, props);

        const title = props.Master_Incident_Number || props.Incident_Number || 'Emergency Incident';
        const description = `${props.GroupedType || 'Emergency incident'} in ${props.Locality || props.Location || 'Queensland'}. Status: ${props.CurrentStatus || 'Active'}. Vehicles: ${props.VehiclesOnScene || 0} on scene, ${props.VehiclesOnRoute || 0} en route.`;
        
        // Map Emergency category and subcategory to UUIDs
        const emergencyCategory = mapEmergencyCategory('emergency');
        const emergencySubcategoryText = this.getEmergencyCategory({ ...props, description });
        const emergencySubcategory = mapEmergencySubcategory(emergencySubcategoryText);
        
        const incident: InsertUnifiedIncident = {
          source: 'emergency',
          sourceId: feature.id?.toString() || props.OBJECTID?.toString() || `emg-${Date.now()}`,
          title,
          description,
          location: props.Locality ? `${props.Location}, ${props.Locality}` : (props.Location || 'Queensland'),
          category: emergencyCategory.name,
          subcategory: emergencySubcategory?.name || emergencySubcategoryText,
          categoryUuid: emergencyCategory.uuid,
          subcategoryUuid: emergencySubcategory?.uuid || undefined,
          severity: this.getEmergencySeverity(props),
          status: (props.CurrentStatus === 'Closed' || props.CurrentStatus === 'Resolved') ? 'resolved' : 'active',
          geometry,
          centroidLat: centroid.lat,
          centroidLng: centroid.lng,
          regionIds,
          geocell: computeGeocellForIncident({ centroidLat: centroid.lat, centroidLng: centroid.lng }),
          incidentTime: props.Response_Date ? new Date(props.Response_Date) : new Date(),
          lastUpdated: props.LastUpdate ? new Date(props.LastUpdate) : new Date(),
          publishedAt: new Date(),
          userId: undefined, // Will be resolved by storage layer attribution system
          properties: {
            ...props,
            // CRITICAL: Ensure emergency incidents are never marked as user reports
            source: 'emergency',
            userReported: false
          }
        };

        return prepareUnifiedIncidentForInsert(incident);
      })
      .filter((incident: InsertUnifiedIncident | null): incident is InsertUnifiedIncident => incident !== null);
  }

  // Pass-through normalizer for already-processed user reports
  private passThrough(data: any): InsertUnifiedIncident[] {
    if (!data.alreadyNormalized || !Array.isArray(data.alreadyNormalized)) return [];
    console.log(`📊 User Reports Pass-through: ${data.alreadyNormalized.length} already normalized incidents`);
    return data.alreadyNormalized;
  }

  private normalizeUserReports(data: any): InsertUnifiedIncident[] {
    if (!data.features || !Array.isArray(data.features)) return [];

    let total = 0;
    let filtered = 0;
    let processed = 0;
    let failed = 0;

    const results = data.features
      .filter(this.filterRecentEvents)
      .map((feature: any) => {
        total++;
        
        const props = feature.properties || {};
        const geometry = feature.geometry;
        
        // Resilient sourceId generation - avoid re-prefixing already processed user IDs
        let sourceId = props.id?.toString() || feature.id?.toString() || `user-${Date.now()}-${Math.random()}`;
        if (!sourceId) {
          filtered++;
          return null;
        }
        
        // If ID already has user: prefix, don't add another one
        if (sourceId.startsWith('user:user:')) {
          // Remove extra prefixes (handle the repeated prefix bug)
          sourceId = sourceId.replace(/^(user:)+/, 'user:');
        }
        
        // CRITICAL: Clean reporterId and userId from malformed prefixes too
        let cleanReporterId: string | null = null;
        let cleanUserId: string | null = null;
        
        if (props.reporterId) {
          cleanReporterId = props.reporterId.toString();
          if (cleanReporterId && cleanReporterId.startsWith('user:user:')) {
            cleanReporterId = cleanReporterId.replace(/^(user:)+/, 'user:');
          }
        }
        
        if (props.userId) {
          cleanUserId = props.userId.toString();
          if (cleanUserId && cleanUserId.startsWith('user:user:')) {
            cleanUserId = cleanUserId.replace(/^(user:)+/, 'user:');
          }
        }
        
        // Resilient centroid computation with fallbacks
        let centroid = this.computeCentroid(geometry);
        
        // Fallback: try to use lat/lng from properties if geometry is missing
        if (!centroid && (props.lat || props.latitude) && (props.lng || props.longitude)) {
          centroid = {
            lat: props.lat || props.latitude,
            lng: props.lng || props.longitude
          };
        }
        
        // Skip if we can't determine location
        if (!centroid) {
          filtered++;
          return null;
        }

        try {
          const regionIds = this.computeRegionIds(centroid.lat, centroid.lng, props);

          const incident: InsertUnifiedIncident = {
            source: 'user', // ALWAYS set to user
            sourceId,
            title: props.title || 'Community Report',
            description: props.description || '',
            location: props.location || '',
            category: props.category || 'other',
            subcategory: props.subcategory || '',
            severity: props.severity || 'medium',
            status: props.status || 'active',
            geometry,
            centroidLat: centroid.lat,
            centroidLng: centroid.lng,
            regionIds,
            geocell: computeGeocellForIncident({ centroidLat: centroid.lat, centroidLng: centroid.lng }),
            incidentTime: props.createdAt ? new Date(props.createdAt) : new Date(),
            lastUpdated: props.updatedAt ? new Date(props.updatedAt) : new Date(),
            publishedAt: new Date(),
            properties: {
              ...props,
              // CRITICAL: Always ensure proper classification
              source: 'user',
              userReported: true,
              categoryId: this.getCategoryId(props.category),
              // CRITICAL: Ensure reporterId is set from cleaned userId for user attribution
              reporterId: cleanReporterId || cleanUserId,
            },
            userId: cleanUserId,
            photoUrl: props.photoUrl,
            verificationStatus: props.verificationStatus || 'unverified'
          };

          const preparedIncident = prepareUnifiedIncidentForInsert(incident);
          processed++;
          return preparedIncident;
        } catch (error) {
          console.error(`❌ Failed to normalize user report ${sourceId}:`, error);
          failed++;
          return null;
        }
      })
      .filter((incident: InsertUnifiedIncident | null): incident is InsertUnifiedIncident => incident !== null);

    // Improved logging with breakdown
    console.log(`📊 User Reports Processing: ${total} total, ${processed} processed, ${filtered} filtered (no geometry/ID), ${failed} failed`);
    
    return results;
  }

  // Helper method to map category names to UUIDs for frontend filtering
  private getCategoryId(categoryName: string): string {
    const categoryMap: Record<string, string> = {
      'Safety & Crime': '792759f4-1b98-4665-b14c-44a54e9969e9',
      'Infrastructure & Hazards': '9b1d58d9-cfd1-4c31-93e9-754276a5f265',
      'Emergency Situations': '54d31da5-fc10-4ad2-8eca-04bac680e668',
      'Wildlife & Nature': 'd03f47a9-10fb-4656-ae73-92e959d7566a',
      'Community Issues': 'deaca906-3561-4f80-b79f-ed99561c3b04',
      'Pets': '4ea3a6f0-c49e-4baf-9ca5-f074ca2811b0',
      'Lost & Found': 'd1dfcd4e-48e9-4e58-9476-4782a2a132f3'
    };
    
    return categoryMap[categoryName] || 'deaca906-3561-4f80-b79f-ed99561c3b04'; // Default to Community Issues
  }

  // ============================================================================
  // INGESTION ORCHESTRATION
  // ============================================================================

  private async ingestSource(sourceId: string): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) return;

    if (source.circuitOpen) {
      console.log(`⚡ Circuit breaker open for ${source.name}, skipping`);
      this.scheduleSourceIngestion(sourceId, POLLING_INTERVALS.circuit);
      return;
    }

    try {
      console.log(`🔄 UNIFIED PIPELINE: Starting ${source.name} ingestion cycle...`);
      console.log(`📡 API Request: ${sourceId === 'tmr-traffic' ? 'TMR Traffic API v2' : sourceId === 'emergency-incidents' ? 'QLD Emergency Services' : 'Database Query'}`);
      source.lastFetch = Date.now();

      // Fetch raw data
      const rawData = await source.fetcher();
      
      // Normalize to unified schema
      const unifiedIncidents = source.normalizer(rawData);
      
      // Upsert into unified store with batching to prevent pool exhaustion
      // Process in batches of 10 to avoid exhausting the 20-connection pool
      const BATCH_SIZE = 10;
      const results: PromiseSettledResult<any>[] = [];
      
      for (let i = 0; i < unifiedIncidents.length; i += BATCH_SIZE) {
        const batch = unifiedIncidents.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.allSettled(
          batch.map(incident => 
            storage.upsertUnifiedIncident(incident.source, incident.sourceId, incident)
          )
        );
        results.push(...batchResults);
      }

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Enhanced logging with specific details
      if (sourceId === 'tmr-traffic') {
        console.log(`✅ UNIFIED TMR INGESTION: ${successful} traffic incidents processed successfully, ${failed} failed`);
        console.log(`📊 TMR Data: ${unifiedIncidents.length} incidents normalized from raw TMR API response`);
      } else if (sourceId === 'emergency-incidents') {
        console.log(`✅ UNIFIED EMERGENCY INGESTION: ${successful} emergency incidents processed successfully, ${failed} failed`);
        console.log(`📊 Emergency Data: ${unifiedIncidents.length} incidents normalized from emergency services`);
      } else if (sourceId === 'user-reports') {
        console.log(`✅ UNIFIED USER REPORTS: ${successful} user reports processed successfully, ${failed} failed`);
        console.log(`📊 User Data: ${unifiedIncidents.length} reports normalized from database`);
      } else {
        console.log(`✅ ${source.name} ingestion: ${successful} incidents processed, ${failed} failed`);
      }
      
      // Always log unified store update
      console.log(`🔄 Unified Store: Updated with ${successful} new/updated incidents from ${source.name}`);

      // Reset error count on success
      source.lastSuccess = Date.now();
      source.errorCount = 0;
      source.circuitOpen = false;

      // Refresh spatial index after successful ingestion
      await this.refreshSpatialIndex();

      // Schedule next ingestion with adaptive interval
      const interval = this.getAdaptiveInterval(sourceId, successful);
      this.scheduleSourceIngestion(sourceId, interval);

    } catch (error) {
      console.error(`❌ UNIFIED PIPELINE ERROR for ${source.name}:`, error);
      
      // Log specific error details for debugging
      if (error instanceof Error) {
        if (error.message.includes('403')) {
          console.error(`🚨 TMR API 403 Error: Check API URL (should be /v2) and API key`);
        } else if (error.message.includes('429')) {
          console.error(`⏳ Rate limited by ${source.name} - implementing backoff`);
        } else if (error.message.includes('500')) {
          console.error(`🔧 Server error from ${source.name} - will retry`);
        }
      }
      
      source.errorCount++;
      console.log(`📊 ${source.name} error count: ${source.errorCount}/3 before circuit breaker`);
      
      // Open circuit breaker after 3 consecutive errors
      if (source.errorCount >= 3) {
        source.circuitOpen = true;
        console.log(`⚡ Circuit breaker OPENED for ${source.name} - cooling down`);
      }

      // Schedule retry with exponential backoff
      const retryInterval = Math.min(
        POLLING_INTERVALS.error * Math.pow(2, source.errorCount - 1),
        POLLING_INTERVALS.circuit
      );
      this.scheduleSourceIngestion(sourceId, retryInterval);
    }
  }

  private scheduleSourceIngestion(sourceId: string, interval: number) {
    // Clear existing timer
    const existingTimer = this.pollingTimers.get(sourceId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule next ingestion
    const timer = setTimeout(() => this.ingestSource(sourceId), interval);
    this.pollingTimers.set(sourceId, timer);

    const source = this.sources.get(sourceId);
    console.log(`⏰ Next ${source?.name} ingestion scheduled in ${(interval / 60000).toFixed(1)} minutes`);
  }

  private getAdaptiveInterval(sourceId: string, itemsProcessed: number): number {
    // Faster polling when more activity is detected
    if (itemsProcessed > 50) return POLLING_INTERVALS.fast;
    if (itemsProcessed > 10) return POLLING_INTERVALS.normal;
    return POLLING_INTERVALS.slow;
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  private filterRecentEvents = (feature: any): boolean => {
    const props = feature.properties || {};
    const publishedDate = props.published || props.CreateDate || props.reportedAt;
    
    if (!publishedDate) return true; // Include if no date available
    
    const eventDate = new Date(publishedDate);
    if (isNaN(eventDate.getTime())) return true;
    
    const daysSince = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 7; // 7-day cutoff
  };

  private computeCentroid(geometry: any): { lat: number; lng: number } | null {
    if (!geometry || !geometry.coordinates) return null;

    try {
      switch (geometry.type) {
        case 'Point':
          return { lng: geometry.coordinates[0], lat: geometry.coordinates[1] };
        
        case 'LineString':
          // Use midpoint of linestring
          const coords = geometry.coordinates;
          const midIndex = Math.floor(coords.length / 2);
          return { lng: coords[midIndex][0], lat: coords[midIndex][1] };
        
        case 'Polygon':
          // Use centroid of first ring
          const ring = geometry.coordinates[0];
          const sumLat = ring.reduce((sum: number, coord: number[]) => sum + coord[1], 0);
          const sumLng = ring.reduce((sum: number, coord: number[]) => sum + coord[0], 0);
          return { lng: sumLng / ring.length, lat: sumLat / ring.length };
        
        case 'MultiPoint':
          // Use centroid of all points
          const points = geometry.coordinates;
          const multiPointSumLat = points.reduce((sum: number, coord: number[]) => sum + coord[1], 0);
          const multiPointSumLng = points.reduce((sum: number, coord: number[]) => sum + coord[0], 0);
          return { lng: multiPointSumLng / points.length, lat: multiPointSumLat / points.length };
        
        case 'MultiLineString':
          // Use midpoint of first linestring
          const firstLine = geometry.coordinates[0];
          const multiLineMidIndex = Math.floor(firstLine.length / 2);
          return { lng: firstLine[multiLineMidIndex][0], lat: firstLine[multiLineMidIndex][1] };
        
        case 'MultiPolygon':
          // Use centroid of first ring of first polygon
          const firstPolygon = geometry.coordinates[0][0];
          const multiPolygonSumLat = firstPolygon.reduce((sum: number, coord: number[]) => sum + coord[1], 0);
          const multiPolygonSumLng = firstPolygon.reduce((sum: number, coord: number[]) => sum + coord[0], 0);
          return { lng: multiPolygonSumLng / firstPolygon.length, lat: multiPolygonSumLat / firstPolygon.length };
        
        case 'GeometryCollection':
          // Use first supported geometry
          for (const subGeom of geometry.geometries) {
            const centroid = this.computeCentroid(subGeom);
            if (centroid) return centroid;
          }
          return null;
        
        default:
          console.warn(`Unsupported geometry type: ${geometry.type}`);
          return null;
      }
    } catch (error) {
      console.warn('Error computing centroid:', error);
      return null;
    }
  }

  private computeRegionIds(lat: number, lng: number, props: any): string[] {
    // SIMPLIFIED: Since we moved to proximity-based filtering, regionIds are optional
    // Focus on coordinate validation and basic region assignment only
    
    try {
      // Basic coordinate-based region lookup (if available)
      const region = getRegionFromCoordinates(lat, lng);
      return region ? [region.id] : [];
    } catch (error) {
      console.warn('Error computing basic regionIds:', error);
      return [];
    }
  }

  private getTMRSubcategory(props: any): string {
    // Handle event_type (remove quotes)
    const type = String(props.event_type || '').toLowerCase().replace(/['"]/g, '');
    
    // Handle impact object properly
    const impactObj = props.impact || {};
    const impactType = String(impactObj.impact_type || '').toLowerCase();
    const impactSubtype = String(impactObj.impact_subtype || '').toLowerCase();
    const delay = String(impactObj.delay || '').toLowerCase();
    
    // Check for road closures first
    if (impactType.includes('blocked') || impactType.includes('closed') || 
        impactSubtype.includes('blocked') || impactSubtype.includes('closed')) {
      return 'road-closure';
    }
    
    // Check for congestion - look in event_type and impact fields
    if (type.includes('congestion') || 
        impactType.includes('congestion') || 
        delay.includes('delays') || 
        delay.includes('congestion')) {
      return 'congestion';
    }
    
    // Check for accidents/crashes
    if (type.includes('accident') || type.includes('crash')) {
      return 'accident';
    }
    
    // Check for roadworks
    if (type.includes('roadwork') || type.includes('construction')) {
      return 'roadwork';
    }
    
    return 'other';
  }

  private getTMRSeverity(props: any): 'low' | 'medium' | 'high' | 'critical' {
    const impact = String(props.impact || '').toLowerCase();
    
    if (impact.includes('blocked') || impact.includes('closed')) return 'critical';
    if (impact.includes('major') || impact.includes('severe')) return 'high';
    if (impact.includes('minor') || impact.includes('light')) return 'low';
    
    return 'medium';
  }

  // Note: Agency user ID resolution has been moved to the centralized attribution system
  // in shared/schema.ts resolveAttribution function. The storage layer now automatically
  // handles attribution for all incident sources during create/upsert operations.

  private getEmergencyCategory(props: any): string {
    const jurisdiction = props.Jurisdiction?.toLowerCase() || '';
    const incidentNumber = props.Master_Incident_Number?.toLowerCase() || '';
    const groupedType = props.GroupedType?.toLowerCase() || '';
    const incidentType = props.Incident_Type?.toLowerCase() || '';
    const description = props.description?.toLowerCase() || '';
    
    // Check specific incident types FIRST (most specific)
    // IMPORTANT: Check for rescue/crash keywords in groupedType, incidentType, AND description
    if (groupedType.includes('rescue') || incidentType.includes('rescue') || description.includes('rescue') ||
        groupedType.includes('crash') || incidentType.includes('crash') || description.includes('crash') ||
        description.includes('road crash') || description.includes('road accident') ||
        (groupedType.includes('road') && (groupedType.includes('accident') || groupedType.includes('incident')))) {
      return 'Rescue Operation';
    }
    if (groupedType.includes('power') || groupedType.includes('gas') || groupedType.includes('electric')) {
      return 'Power/Gas Emergency';
    }
    if (groupedType.includes('storm') || groupedType.includes('flood') || groupedType.includes('weather')) {
      return 'Storm/SES';
    }
    // Only categorize as Medical if it explicitly mentions medical (not just ambulance jurisdiction)
    if (groupedType.includes('medical') && !groupedType.includes('rescue') && !groupedType.includes('crash')) {
      return 'Medical Emergencies';
    }
    if (groupedType.includes('hazmat') || groupedType.includes('chemical')) {
      return 'Chemical/Hazmat';
    }
    if (groupedType.includes('fire')) {
      return 'Fire & Smoke';
    }
    
    // Then check by jurisdiction/source (broader classification)
    // IMPORTANT: Don't let ambulance jurisdiction override rescue operations
    if ((jurisdiction.includes('ambulance') || incidentNumber.includes('qa')) && 
        !groupedType.includes('rescue') && !groupedType.includes('crash')) {
      return 'Medical Emergencies';
    }
    if (jurisdiction.includes('police') || incidentNumber.includes('qp') || groupedType.includes('police') || incidentType.includes('police')) {
      return 'Public Safety';
    }
    if (jurisdiction.includes('fire') || incidentNumber.includes('qf')) {
      return 'Fire & Smoke';
    }
    if (jurisdiction.includes('ses')) {
      return 'Storm/SES';
    }
    
    return 'Emergency Response';
  }

  private getEmergencySeverity(props: any): 'low' | 'medium' | 'high' | 'critical' {
    const status = props.CurrentStatus?.toLowerCase() || '';
    const jurisdiction = props.Jurisdiction?.toLowerCase() || '';
    const vehiclesOnScene = parseInt(props.VehiclesOnScene) || 0;
    const vehiclesOnRoute = parseInt(props.VehiclesOnRoute) || 0;
    
    // Multiple vehicles indicates higher severity
    if (vehiclesOnScene >= 3 || vehiclesOnRoute >= 3) return 'critical';
    if (vehiclesOnScene >= 2 || vehiclesOnRoute >= 2) return 'high';
    
    // Active emergency responses are generally high priority
    if (status.includes('going') || status.includes('responding')) return 'high';
    if (status.includes('arrived') || status.includes('onscene')) return 'critical';
    if (status.includes('returning') || status.includes('finished')) return 'low';
    
    // Fire emergencies generally higher severity
    if (jurisdiction.includes('fire')) return 'high';
    
    return 'medium';
  }

  private indexRebuildInProgress = false;

  private async refreshSpatialIndex(): Promise<void> {
    // Reentrancy guard to prevent overlapping rebuilds
    if (this.indexRebuildInProgress) {
      console.log('🗺️ Spatial index rebuild already in progress, skipping');
      return;
    }

    this.indexRebuildInProgress = true;
    try {
      console.log('🗺️ Spatial index rebuild started');
      await storage.refreshSpatialIndex();
      console.log('🗺️ Spatial index refreshed');
    } catch (error) {
      console.error('Failed to refresh spatial index:', error);
    } finally {
      this.indexRebuildInProgress = false;
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getIngestionStats() {
    const stats: Record<string, any> = {};
    
    for (const [id, source] of Array.from(this.sources.entries())) {
      stats[id] = {
        name: source.name,
        type: source.type,
        lastFetch: source.lastFetch,
        lastSuccess: source.lastSuccess,
        errorCount: source.errorCount,
        circuitOpen: source.circuitOpen,
        uptimeMs: source.lastSuccess ? Date.now() - source.lastSuccess : 0
      };
    }
    
    return stats;
  }

  async forceIngestion(sourceId?: string): Promise<void> {
    if (sourceId) {
      await this.ingestSource(sourceId);
    } else {
      // Ingest all sources
      for (const id of Array.from(this.sources.keys())) {
        await this.ingestSource(id);
      }
    }
  }

  shutdown() {
    for (const timer of Array.from(this.pollingTimers.values())) {
      clearTimeout(timer);
    }
    this.pollingTimers.clear();
    console.log('🛑 Unified Ingestion Pipeline shutdown');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

// Singleton pattern to prevent duplicate engines
export function getUnifiedIngestionEngine(): UnifiedIngestionEngine {
  if (!globalUnifiedEngine) {
    globalUnifiedEngine = new UnifiedIngestionEngine();
    console.log('🏗️ Created new UnifiedIngestionEngine singleton instance');
  }
  return globalUnifiedEngine;
}

// Export singleton instance
export const unifiedIngestion = getUnifiedIngestionEngine();

// Shutdown hook for cleanup
process.on('SIGTERM', () => {
  if (globalUnifiedEngine) {
    globalUnifiedEngine.shutdown();
  }
});```

#### server/ingestion-orchestrator.ts
```typescript
/**
 * ============================================================================
 * INGESTION ORCHESTRATOR
 * ============================================================================
 * 
 * Central orchestrator for syncing staged events to the posts table.
 * This provides a consistent pattern for all API sources:
 * 
 * 1. Source adapters fetch data and write to staging_events table
 * 2. Orchestrator reads unsynced staging events
 * 3. Orchestrator normalizes and upserts to posts table
 * 4. Marks staging events as synced or records errors
 * 
 * This separation allows:
 * - Different polling intervals per source
 * - Consistent deduplication via (source, sourceId) unique constraint
 * - Error tracking and retry logic
 * - Easy addition of new API sources
 */

import { storage } from "./storage";
import { SYSTEM_USER_IDS, type DataSource, type SelectStagingEvent } from "@shared/schema";

// ============================================================================
// CONFIGURATION
// ============================================================================

const SYNC_INTERVAL = 60 * 1000; // 1 minute
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const STAGING_RETENTION_DAYS = 3; // Keep staging events for 3 days

// Map data sources to their system user IDs
const SOURCE_USER_MAP: Record<Exclude<DataSource, 'user'>, string> = {
  tmr: SYSTEM_USER_IDS.TMR,
  nsw_live: SYSTEM_USER_IDS.TMR, // TODO: Create NSW user when adding that source
  vic_roads: SYSTEM_USER_IDS.TMR, // TODO: Create VIC user when adding that source
  emergency: SYSTEM_USER_IDS.QFES,
  qfes: SYSTEM_USER_IDS.QFES,
};

// ============================================================================
// ORCHESTRATOR CLASS
// ============================================================================

class IngestionOrchestrator {
  private syncTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isSyncing = false;

  /**
   * Start the orchestrator
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[Orchestrator] Already running, skipping start');
      return;
    }

    console.log('[Orchestrator] Starting ingestion orchestrator...');
    this.isRunning = true;

    // Initial sync after short delay
    setTimeout(() => this.syncStagingToPosts(), 5000);

    // Set up recurring sync
    this.syncTimer = setInterval(() => {
      this.syncStagingToPosts();
    }, SYNC_INTERVAL);

    // Set up daily cleanup
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldStaging();
    }, CLEANUP_INTERVAL);

    console.log(`[Orchestrator] Started - sync every ${SYNC_INTERVAL / 1000}s, cleanup every ${CLEANUP_INTERVAL / 3600000}h`);
  }

  /**
   * Stop the orchestrator
   */
  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.isRunning = false;
    console.log('[Orchestrator] Stopped');
  }

  /**
   * Sync unsynced staging events to posts table
   */
  private async syncStagingToPosts(): Promise<void> {
    if (this.isSyncing) {
      console.log('[Orchestrator] Sync already in progress, skipping');
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();
    let synced = 0;
    let errors = 0;

    try {
      const unsyncedEvents = await storage.getUnsyncedStagingEvents();
      
      if (unsyncedEvents.length === 0) {
        this.isSyncing = false;
        return; // No events to sync, stay quiet
      }

      console.log(`[Orchestrator] Syncing ${unsyncedEvents.length} staging events to posts...`);

      for (const event of unsyncedEvents) {
        try {
          await this.syncEventToPost(event);
          await storage.markStagingEventSynced(event.id);
          synced++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[Orchestrator] Error syncing event ${event.id}:`, errorMessage);
          await storage.markStagingEventError(event.id, errorMessage);
          errors++;
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[Orchestrator] Sync complete: ${synced} synced, ${errors} errors (${duration}ms)`);

    } catch (error) {
      console.error('[Orchestrator] Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single staging event to posts table
   */
  private async syncEventToPost(event: SelectStagingEvent): Promise<void> {
    const source = event.source as Exclude<DataSource, 'user'>;
    const userId = SOURCE_USER_MAP[source] || SYSTEM_USER_IDS.TMR;

    await storage.upsertPostFromSource(source, event.sourceId, {
      userId,
      title: event.title,
      description: event.description ?? undefined,
      location: event.location ?? undefined,
      categoryId: event.categoryId ?? undefined,
      subcategoryId: event.subcategoryId ?? undefined,
      geometry: event.geometry ?? undefined,
      centroidLat: event.centroidLat ?? undefined,
      centroidLng: event.centroidLng ?? undefined,
      status: (event.status as 'active' | 'resolved' | 'closed') ?? 'active',
      incidentTime: event.incidentTime ?? undefined,
      expiresAt: event.expiresAt ?? undefined,
      properties: {
        ...(event.properties as object || {}),
        severity: event.severity,
        iconType: this.getIconTypeForSource(source),
      },
    });
  }

  /**
   * Get the appropriate icon type for a data source
   */
  private getIconTypeForSource(source: DataSource): string {
    switch (source) {
      case 'tmr':
      case 'nsw_live':
      case 'vic_roads':
        return 'traffic';
      case 'emergency':
      case 'qfes':
        return 'emergency';
      default:
        return 'incident';
    }
  }

  /**
   * Cleanup old staging events
   */
  private async cleanupOldStaging(): Promise<void> {
    try {
      const deleted = await storage.cleanupOldStagingEvents(STAGING_RETENTION_DAYS);
      if (deleted > 0) {
        console.log(`[Orchestrator] Cleaned up ${deleted} old staging events`);
      }
    } catch (error) {
      console.error('[Orchestrator] Cleanup failed:', error);
    }
  }

  /**
   * Get orchestrator status
   */
  getStatus(): { isRunning: boolean; isSyncing: boolean } {
    return {
      isRunning: this.isRunning,
      isSyncing: this.isSyncing,
    };
  }
}

// ============================================================================
// SINGLETON & EXPORTS
// ============================================================================

let orchestrator: IngestionOrchestrator | null = null;

export function startIngestionOrchestrator(): void {
  if (!orchestrator) {
    orchestrator = new IngestionOrchestrator();
  }
  orchestrator.start();
}

export function stopIngestionOrchestrator(): void {
  if (orchestrator) {
    orchestrator.stop();
  }
}

export function getOrchestratorStatus(): { isRunning: boolean; isSyncing: boolean } {
  return orchestrator?.getStatus() ?? { isRunning: false, isSyncing: false };
}

export { IngestionOrchestrator };
```

### server/notification-service.ts
```typescript
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
```

## 5. Client Code

### client/src/main.tsx
```typescript
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

### client/src/App.tsx
```typescript
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, Suspense, lazy } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth-page";
import Feed from "@/pages/feed";
import UserProfile from "@/pages/user-profile";
import Messages from "@/pages/messages";
import CreateAd from "@/pages/create-ad";
import BusinessUpgrade from "@/pages/business-upgrade";
import BusinessDashboard from "@/pages/business-dashboard";
import AccountSetup from "@/pages/account-setup";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin-dashboard";
import EditAd from "@/pages/edit-ad";
import EditIncident from "@/pages/edit-incident";
import IncidentDetail from "@/pages/incident-detail";
import Create from "@/pages/create";
import { TermsAndConditionsModal } from "@/components/terms-and-conditions-modal";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { ViewModeProvider } from "@/contexts/view-mode-context";

const Profile = lazy(() => import("@/pages/profile"));
const Notifications = lazy(() => import("@/pages/notifications"));
const SavedPosts = lazy(() => import("@/pages/saved-posts"));
const MyReactions = lazy(() => import("@/pages/my-reactions"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Help = lazy(() => import("@/pages/help"));

const OVERLAY_ROUTES = ['/profile', '/notifications', '/saved', '/reactions', '/privacy', '/help'];

const PageLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

function Router() {
  const { user, isLoading } = useAuth();
  const isAuthenticated = !!user;
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [location] = useLocation();
  
  // Track the background route to maintain when showing incident modal
  const [backgroundRoute, setBackgroundRoute] = useState<string>('/');
  
  // Check if current route is an incident detail route
  const incidentMatch = location.match(/^\/incident\/(.+)$/);
  const isIncidentRoute = !!incidentMatch;
  
  // Update background route when not on incident route
  useEffect(() => {
    if (!isIncidentRoute && location !== backgroundRoute) {
      setBackgroundRoute(location);
    }
  }, [location, isIncidentRoute, backgroundRoute]);

  // Check if user needs to accept terms or complete onboarding
  useEffect(() => {
    if (user && user.id && !user.termsAccepted) {
      setShowTermsModal(true);
      setShowOnboarding(false);
    } else if (user && user.id && user.termsAccepted && !user.onboardingCompleted) {
      setShowTermsModal(false);
      setShowOnboarding(true);
    } else {
      setShowTermsModal(false);
      setShowOnboarding(false);
    }
  }, [user]);

  // Check if new user needs account setup
  const needsAccountSetup = user && !user.accountType;

  // Preload posts data as soon as app starts
  useEffect(() => {
    // Start fetching posts data immediately for faster loading
    queryClient.prefetchQuery({
      queryKey: ["/api/posts"],
      queryFn: async () => {
        const response = await fetch("/api/posts");
        if (response.ok) return response.json();
        return null;
      },
      staleTime: 1 * 60 * 1000, // 1 minute - posts data changes frequently
    });
  }, []);

  // Show loading state while authentication is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle unauthenticated users first
  if (!isAuthenticated) {
    return (
      <Suspense fallback={<PageLoading />}>
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/help" component={Help} />
          <Route path="/" component={AuthPage} />
          <Route component={AuthPage} />
        </Switch>
      </Suspense>
    );
  }

  // Handle authenticated users  
  // Determine which route to render (use background route if on incident route)
  const routeToRender = isIncidentRoute ? backgroundRoute : location;
  const routePath = routeToRender.split('?')[0];
  
  // Check if we're on an overlay route (profile, notifications, etc.)
  // These pages should render on top of Feed while keeping Feed mounted
  const isOverlayRoute = OVERLAY_ROUTES.includes(routePath);
  
  // Check if we're on a page that needs full unmount (create, admin, business pages, etc.)
  const isFullPageRoute = [
    '/create', '/advertise', '/create-ad', '/business-upgrade', 
    '/business-dashboard', '/account-setup', '/admin', '/login', '/messages'
  ].includes(routePath) || 
    routePath.startsWith('/edit-ad/') || 
    routePath.startsWith('/edit-incident/') || 
    routePath.startsWith('/users/') || 
    routePath.startsWith('/messages/');
  
  // Helper function to render overlay pages with Suspense
  const renderOverlayPage = () => {
    switch (routePath) {
      case '/profile': return <Suspense fallback={<PageLoading />}><Profile /></Suspense>;
      case '/notifications': return <Suspense fallback={<PageLoading />}><Notifications /></Suspense>;
      case '/saved': return <Suspense fallback={<PageLoading />}><SavedPosts /></Suspense>;
      case '/reactions': return <Suspense fallback={<PageLoading />}><MyReactions /></Suspense>;
      case '/privacy': return <Suspense fallback={<PageLoading />}><Privacy /></Suspense>;
      case '/help': return <Suspense fallback={<PageLoading />}><Help /></Suspense>;
      default: return null;
    }
  };
  
  // Helper function to render full page routes  
  const renderFullPageRoute = () => {
    if (needsAccountSetup) {
      return <AccountSetup />;
    }
    
    // Handle parameterized routes by creating a temporary Switch with the background route
    if (routePath.startsWith('/edit-ad/') || routePath.startsWith('/edit-incident/') || 
        routePath.startsWith('/users/') || routePath.startsWith('/messages/')) {
      return (
        <Switch location={routeToRender}>
          <Route path="/edit-ad/:id" component={EditAd} />
          <Route path="/edit-incident/:id" component={EditIncident} />
          <Route path="/users/:userId" component={UserProfile} />
          <Route path="/messages/:conversationId" component={Messages} />
          <Route path="/messages" component={Messages} />
        </Switch>
      );
    }
    
    switch (routePath) {
      case '/create': return <Create />;
      case '/advertise':
      case '/create-ad': return <CreateAd />;
      case '/business-upgrade': return <BusinessUpgrade />;
      case '/business-dashboard': return <BusinessDashboard />;
      case '/account-setup': return <AccountSetup />;
      case '/messages': return <Messages />;
      case '/admin': return <AdminDashboard />;
      case '/login': return <Login />;
      default: return <Feed />;
    }
  };
  
  return (
    <>
      {/* 
        ALWAYS keep Feed mounted unless we're on a full-page route.
        This prevents Leaflet map from being destroyed on navigation to overlay pages.
        Overlay pages render on top of Feed with their own layout.
      */}
      {isFullPageRoute ? (
        renderFullPageRoute()
      ) : (
        <>
          {/* Feed is always visible/mounted for feed, map, and overlay routes */}
          {/* Pass isActive=false when on overlay routes to pause expensive operations */}
          <div className={isOverlayRoute ? "hidden" : undefined}>
            <Feed isActive={!isOverlayRoute} />
          </div>
          
          {/* Overlay pages render on top when active */}
          {isOverlayRoute && renderOverlayPage()}
        </>
      )}
      
      {/* Incident Detail Modal Overlay - Render over any page when on incident route */}
      {isIncidentRoute && incidentMatch && (
        <IncidentDetail incidentId={incidentMatch[1]} />
      )}
      
      {/* Terms and Conditions Modal */}
      <TermsAndConditionsModal
        isOpen={showTermsModal}
        onAccept={() => setShowTermsModal(false)}
      />
      
      {/* Onboarding Wizard for new users */}
      <OnboardingWizard
        open={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ViewModeProvider>
          <Toaster />
          <Router />
        </ViewModeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
```

### Pages
#### client/src/pages/feed.tsx
```typescript
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { MobileNav } from "@/components/mobile-nav";
import { PostCard } from "@/components/post-card";
import { IncidentReportForm, type EntryPoint } from "@/components/incident-report-form";
import { TrafficMap } from "@/components/map/traffic-map";
import { SimpleFilterSidebar } from "@/components/map/simple-filter-sidebar";
import { navigateToIncident } from "@/lib/incident-utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { FilterState } from "@/types/filters";
import { useViewMode } from "@/contexts/view-mode-context";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Bell, 
  MessageCircle, 
  Search, 
  MapPin,
  Settings,
  RefreshCw,
  PenSquare,
  Camera,
  MapPinned,
  Menu,
  User,
  LogOut,
  Map,
  List,
  ChevronRight,
  Shield,
  HelpCircle,
  Heart,
  Bookmark,
  ChevronDown
} from "lucide-react";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { calculateDistance, type Coordinates } from "@/lib/location-utils";

type DistanceFilter = '1km' | '2km' | '5km' | '10km' | '25km' | '50km';

interface FeedProps {
  initialViewMode?: 'feed' | 'map';
  isActive?: boolean; // When false, pause expensive operations (data fetching, computations)
}

export default function Feed({ initialViewMode = 'feed', isActive = true }: FeedProps) {
  const { user, logoutMutation } = useAuth();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [reportEntryPoint, setReportEntryPoint] = useState<EntryPoint>("post");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { viewMode, setViewMode } = useViewMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>('10km');
  const [mapSidebarOpen, setMapSidebarOpen] = useState(false);
  
  // Map filter state - keeps map mounted to prevent crash on mobile
  const [mapFilters, setMapFilters] = useState<FilterState>({
    showTrafficEvents: true,
    showIncidents: true,
    showQFES: true,
    showUserReports: true,
    showUserSafetyCrime: true,
    showUserWildlife: true,
    showUserCommunity: true,
    showUserTraffic: true,
    showUserLostFound: true,
    showUserPets: true,
    showActiveIncidents: true,
    showResolvedIncidents: false,
    showHighPriority: true,
    showMediumPriority: true,
    showLowPriority: true,
    autoRefresh: true,
    distanceFilter: 'all',
    radius: 50,
    locationFilter: true,
    homeLocation: user?.preferredLocation || undefined,
    homeCoordinates: user?.preferredLocationLat && user?.preferredLocationLng 
      ? { lat: user.preferredLocationLat, lon: user.preferredLocationLng }
      : undefined,
    showExpiredIncidents: false,
    agingSensitivity: 'normal',
  });
  
  const handleMapFilterChange = (key: keyof FilterState, value: boolean | string | number | { lat: number; lon: number } | [number, number, number, number] | undefined) => {
    setMapFilters(prev => ({ ...prev, [key]: value }));
  };

  const userLocation = useMemo((): Coordinates | null => {
    if (user?.preferredLocationLat && user?.preferredLocationLng) {
      return {
        lat: user.preferredLocationLat,
        lon: user.preferredLocationLng
      };
    }
    return null;
  }, [user?.preferredLocationLat, user?.preferredLocationLng]);

  const hasLocation = !!userLocation && !!user?.preferredLocation;

  useEffect(() => {
    const validFilters = ['1km', '2km', '5km', '10km', '25km', '50km'];
    if (user?.distanceFilter && validFilters.includes(user.distanceFilter)) {
      setDistanceFilter(user.distanceFilter as DistanceFilter);
    } else if (user && !user.distanceFilter) {
      setDistanceFilter('10km');
    }
  }, [user?.id, user?.distanceFilter]);

  const openReportForm = (entryPoint: EntryPoint) => {
    setReportEntryPoint(entryPoint);
    setReportFormOpen(true);
  };

  const { data: postsData, isLoading, refetch } = useQuery({
    queryKey: ["/api/posts"],
    // Only refetch when active - prevents background polling when on overlay pages
    refetchInterval: isActive ? 60000 : false,
    // Prevent background refetches when inactive
    refetchOnWindowFocus: isActive,
  });

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
    select: (data: any) => data?.count || 0,
  });

  const allPosts = (postsData as any)?.features
    ?.sort((a: any, b: any) => {
      const dateA = new Date(a.properties?.createdAt || 0);
      const dateB = new Date(b.properties?.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    }) || [];

  const posts = useMemo(() => {
    if (!userLocation) {
      return allPosts;
    }

    const maxDistance = parseInt(distanceFilter.replace('km', ''));
    
    return allPosts.filter((post: any) => {
      const geometry = post.geometry;
      if (!geometry?.coordinates) return false;
      
      let lng: number | undefined;
      let lat: number | undefined;
      
      if (geometry.type === 'Point') {
        [lng, lat] = geometry.coordinates;
      } else if (geometry.type === 'MultiPoint' && geometry.coordinates[0]) {
        [lng, lat] = geometry.coordinates[0];
      } else if (geometry.type === 'LineString' && geometry.coordinates[0]) {
        [lng, lat] = geometry.coordinates[0];
      } else if (geometry.type === 'MultiLineString' && geometry.coordinates[0]?.[0]) {
        [lng, lat] = geometry.coordinates[0][0];
      } else if (geometry.type === 'GeometryCollection' && geometry.geometries?.[0]) {
        const pointGeom = geometry.geometries.find((g: any) => g.type === 'Point');
        if (pointGeom?.coordinates) {
          [lng, lat] = pointGeom.coordinates;
        }
      }
      
      if (typeof lng !== 'number' || typeof lat !== 'number') return false;
      
      const postLocation: Coordinates = { lat, lon: lng };
      const distance = calculateDistance(userLocation, postLocation);
      return distance <= maxDistance;
    });
  }, [allPosts, distanceFilter, userLocation]);

  const handleDistanceChange = async (newDistance: DistanceFilter) => {
    setDistanceFilter(newDistance);
    
    if (user) {
      try {
        const response = await fetch('/api/user/location-preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            distanceFilter: newDistance
          })
        });
        
        if (response.ok) {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        }
      } catch (error) {
        console.error('Failed to save distance preference:', error);
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      // Always stop the spinner after a short delay
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleCommentClick = (postId: string) => {
    setLocation(`/incident/${postId}`);
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation("/");
      }
    });
  };

  const menuItems = [
    { icon: User, label: "My Profile", href: "/profile" },
    { icon: MapPin, label: "My Location", href: "/profile" },
    { icon: Bookmark, label: "Saved Posts", href: "/saved" },
    { icon: Heart, label: "My Reactions", href: "/reactions" },
    { icon: Settings, label: "Preferences", href: "/profile" },
    { icon: Shield, label: "Privacy", href: "/privacy" },
    { icon: HelpCircle, label: "Help & Support", href: "/help" },
  ];

  return (
    <div className={`bg-background dark:bg-background ${isMobile ? 'mobile-app-container' : 'min-h-screen'}`}>
      {/* Header */}
      <header className={`${isMobile ? '' : 'sticky top-0'} z-50 bg-card dark:bg-card border-b border-border shadow-sm shrink-0`}>
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-14 gap-2">
            {/* Left: Hamburger Menu */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full"
                  data-testid="button-menu"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      {user?.profileImageUrl && <AvatarImage src={user.profileImageUrl} />}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user?.displayName?.charAt(0) || user?.firstName?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <SheetTitle className="text-left truncate">
                        {user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || "Guest"}
                      </SheetTitle>
                      <p className="text-sm text-muted-foreground truncate">
                        {user?.email || "Not logged in"}
                      </p>
                    </div>
                  </div>
                </SheetHeader>
                
                {/* Location Section */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Your Location</span>
                    </div>
                    <Link href="/profile" onClick={() => setMenuOpen(false)}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary"
                        data-testid="button-change-location-menu"
                      >
                        Change
                      </Button>
                    </Link>
                  </div>
                  <p className="mt-1 font-medium" data-testid="text-current-location">
                    {user?.preferredLocation || "Not set"}
                  </p>
                </div>

                {/* Menu Items */}
                <nav className="p-2">
                  {menuItems.map((item) => (
                    <Link 
                      key={item.label} 
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      data-testid={`link-menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex items-center justify-between px-3 py-3 rounded-lg hover-elevate cursor-pointer">
                        <div className="flex items-center gap-3">
                          <item.icon className="w-5 h-5 text-muted-foreground" />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </nav>

                <Separator className="my-2" />

                {/* Logout */}
                {user && (
                  <div className="p-2">
                    <button
                      onClick={() => {
                        handleLogout();
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover-elevate text-destructive"
                      data-testid="button-logout"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">Log Out</span>
                    </button>
                  </div>
                )}

                {!user && (
                  <div className="p-4">
                    <Link href="/login" onClick={() => setMenuOpen(false)}>
                      <Button className="w-full" data-testid="button-login">
                        Log In
                      </Button>
                    </Link>
                  </div>
                )}
              </SheetContent>
            </Sheet>

            {/* Center: App Title */}
            <h1 className="text-xl font-bold text-primary flex-1 text-center">
              Neighbourhood
            </h1>

            {/* Right: Actions */}
            <div className="flex items-center gap-1">
              {/* Notification Bell */}
              <Link href="/notifications">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full relative"
                  data-testid="button-notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* Messages */}
              <Link href="/messages">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full"
                  data-testid="button-messages"
                >
                  <MessageCircle className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Feed/Map Toggle */}
      {/* Scrollable content area for mobile */}
      <div className={isMobile ? 'mobile-app-content' : ''}>
        <div className={`${isMobile ? '' : 'sticky top-14'} z-40 bg-card dark:bg-card border-b border-border`}>
          <div className="max-w-2xl mx-auto px-4">
            <div className="flex items-center justify-center gap-1 py-2">
              <Button
                variant={viewMode === 'feed' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1 max-w-32 gap-2"
                onClick={() => setViewMode('feed')}
                data-testid="button-view-feed"
              >
                <List className="w-4 h-4" />
                Feed
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1 max-w-32 gap-2"
                onClick={() => setViewMode('map')}
                data-testid="button-view-map"
              >
                <Map className="w-4 h-4" />
                Map
              </Button>
            </div>
          </div>
        </div>

        {/* Map View - stays mounted but hidden to prevent crash on mobile */}
        <div className={viewMode === 'map' ? 'block' : 'hidden'}>
          <SimpleFilterSidebar
            isOpen={mapSidebarOpen}
            filters={mapFilters}
            onFilterChange={handleMapFilterChange}
            onClose={() => setMapSidebarOpen(false)}
            isActive={isActive && viewMode === 'map'}
          />
          <div className={`absolute top-[6.5rem] right-0 bottom-0 transition-all duration-300 ${
            mapSidebarOpen && !isMobile ? 'left-80' : 'left-0'
          }`}>
            <TrafficMap 
              filters={mapFilters}
              onEventSelect={(incident) => navigateToIncident(incident, setLocation)}
              isActive={isActive && viewMode === 'map'}
            />
          </div>
        </div>

        {/* Feed View - Main Content */}
        <main className={`max-w-2xl mx-auto pb-20 ${viewMode === 'feed' ? 'block' : 'hidden'}`}>

        {/* Create Post Card */}
        <Card className="mx-0 sm:mx-4 mt-2 rounded-none sm:rounded-lg border-0 shadow-sm">
          <div className="p-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                {user?.profileImageUrl && <AvatarImage src={user.profileImageUrl} />}
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user?.displayName?.charAt(0) || user?.firstName?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => openReportForm("post")}
                className="flex-1 bg-muted hover:bg-muted/80 rounded-full px-4 py-2.5 text-left text-muted-foreground transition-colors"
                data-testid="button-create-post"
              >
                What's happening in your area?
              </button>
            </div>
            <div className="flex items-center justify-around mt-3 pt-3 border-t border-border">
              <Button
                variant="ghost"
                className="flex-1 gap-2"
                onClick={() => openReportForm("photo")}
                data-testid="button-add-photo"
              >
                <Camera className="w-5 h-5 text-green-500" />
                <span className="text-sm">Photo</span>
              </Button>
              <Button
                variant="ghost"
                className="flex-1 gap-2"
                onClick={() => openReportForm("location")}
                data-testid="button-add-location"
              >
                <MapPinned className="w-5 h-5 text-red-500" />
                <span className="text-sm">Location</span>
              </Button>
              <Button
                variant="ghost"
                className="flex-1 gap-2"
                onClick={() => openReportForm("post")}
                data-testid="button-write-post"
              >
                <PenSquare className="w-5 h-5 text-primary" />
                <span className="text-sm">Post</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Location Filter */}
        <div className="px-4 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground h-auto py-2 whitespace-normal text-left"
                data-testid="button-location-filter"
              >
                <MapPin className={`w-4 h-4 flex-shrink-0 self-start mt-0.5 ${hasLocation ? 'text-blue-500' : 'text-muted-foreground'}`} />
                {hasLocation ? (
                  <span className="text-sm text-left flex-1 break-words">
                    Within {distanceFilter}
                    {user?.preferredLocation && (
                      <span className="text-muted-foreground"> of {user.preferredLocation}</span>
                    )}
                  </span>
                ) : (
                  <span className="text-sm">Set Location</span>
                )}
                <ChevronDown className="w-3 h-3 flex-shrink-0 self-start mt-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {hasLocation ? (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Show posts
                  </div>
                  <DropdownMenuRadioGroup 
                    value={distanceFilter} 
                    onValueChange={(value) => handleDistanceChange(value as DistanceFilter)}
                  >
                    <DropdownMenuRadioItem value="1km" data-testid="radio-distance-1km">
                      Within 1km
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="2km" data-testid="radio-distance-2km">
                      Within 2km
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="5km" data-testid="radio-distance-5km">
                      Within 5km
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="10km" data-testid="radio-distance-10km">
                      Within 10km
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="25km" data-testid="radio-distance-25km">
                      Within 25km
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="50km" data-testid="radio-distance-50km">
                      Within 50km
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <Link href="/profile" className="block">
                    <div className="px-2 py-1.5 text-sm text-primary hover:bg-accent rounded-sm cursor-pointer">
                      Change location
                    </div>
                  </Link>
                </>
              ) : (
                <div className="p-3">
                  <p className="text-sm text-muted-foreground mb-2">
                    Set your location to filter posts by distance
                  </p>
                  <Link href="/profile">
                    <Button size="sm" className="w-full" data-testid="button-set-location">
                      Set Location
                    </Button>
                  </Link>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {posts.length !== allPosts.length && (
            <Badge variant="secondary" className="text-xs">
              {posts.length} of {allPosts.length}
            </Badge>
          )}
        </div>

        {/* Refresh Button */}
        <div className="px-4 py-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleRefresh}
            disabled={isRefreshing}
            data-testid="button-refresh-feed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? "Refreshing..." : "Refresh Feed"}
          </Button>
        </div>

        {/* Posts Feed */}
        <div className="mt-2 space-y-2">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="mx-0 sm:mx-4 p-4 border-0 rounded-none sm:rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <Skeleton className="h-48 w-full rounded-lg" />
              </Card>
            ))
          ) : posts.length === 0 ? (
            <Card className="mx-4 p-8 text-center border-0 rounded-lg">
              <div className="text-muted-foreground mb-4">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No posts yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Be the first to share what's happening in your neighborhood!
              </p>
              <Button onClick={() => openReportForm("post")} data-testid="button-first-post">
                Create a Post
              </Button>
            </Card>
          ) : (
            posts.map((post: any) => (
              <PostCard
                key={post.id}
                post={post}
                onCommentClick={() => handleCommentClick(post.id)}
              />
            ))
          )}
        </div>
      </main>
      </div>

      {/* Mobile Navigation */}
      {isMobile && <MobileNav />}

      {/* Report Form Modal */}
      <IncidentReportForm
        isOpen={reportFormOpen}
        onClose={() => {
          setReportFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
        }}
        entryPoint={reportEntryPoint}
        initialLocation={user?.preferredLocation || undefined}
      />
    </div>
  );
}
```

#### client/src/pages/incident-detail.tsx
```typescript
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, X, MapPin, Clock, AlertTriangle, Shield, ShieldAlert, Car, Flame, Heart, Users, Construction, Trees, Search, Zap, MessageCircle, Share, Pencil, Trash, Timer, CarFront, CloudLightning, Siren, Eye, Building, Bug, Volume2, CheckCircle, PawPrint } from "lucide-react";
import { decodeIncidentId } from "@/lib/incident-utils";
import { ReporterAttribution } from "@/components/ReporterAttribution";
import { InlineComments } from "@/components/inline-comments";
import { getIncidentCategory, getIncidentSubcategory, getReporterUserId, getIncidentIconProps } from "@/lib/incident-utils";
import { getIncidentTitle, getIncidentLocation } from "@/lib/incident-utils";
import { getAgencyInfo } from "@/lib/agency-info";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}

export interface IncidentDetailPageProps {
  /** Whether to render as a modal overlay (default) or full page */
  asModal?: boolean;
  /** Incident ID to display - if provided, overrides URL params */
  incidentId?: string;
}

function IncidentDetailPage({ asModal = true, incidentId: propIncidentId }: IncidentDetailPageProps) {
  const { incidentId: urlIncidentId } = useParams<{ incidentId: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Use prop incidentId if provided, otherwise use URL param
  const incidentId = propIncidentId || urlIncidentId;
  
  // Social interaction state
  const [showComments, setShowComments] = useState(false);
  
  // Decode the URL-encoded incident ID
  const decodedId = incidentId ? decodeIncidentId(incidentId) : null;
  
  // Delete mutation
  const deleteIncidentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/posts/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Post Deleted",
        description: "Your post has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete post. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Fetch posts data - ensure this always fetches when needed
  const { data: postsData, isLoading, error } = useQuery({
    queryKey: ["/api/posts"],
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnMount: true, // Always check for fresh data when modal opens
  });
  
  // Log any query errors for debugging
  if (error) {
    console.error('Failed to fetch posts for incident detail:', error);
  }
  
  // Find the specific post by ID
  const incident = (postsData as any)?.features?.find((feature: any) => {
    if (!decodedId) return false;
    
    // Direct ID match
    if (feature.id === decodedId) {
      return true;
    }
    
    // Also check properties.id for backward compatibility
    if (feature.properties?.id === decodedId) {
      return true;
    }
    
    // Handle prefixed IDs (tmr:xxx, esq:xxx, etc.)
    // The decodedId might be "tmr:abc123" but feature.id is just "abc123"
    if (decodedId.includes(':')) {
      const idWithoutPrefix = decodedId.split(':').slice(1).join(':');
      if (feature.id === idWithoutPrefix || feature.properties?.id === idWithoutPrefix) {
        return true;
      }
    }
    
    // Also check if the feature uses the prefixed format
    const featureId = feature.id || feature.properties?.id;
    const featureSource = feature.properties?.source;
    if (featureSource && featureId) {
      const prefixedFeatureId = `${featureSource}:${featureId}`;
      if (prefixedFeatureId === decodedId) {
        return true;
      }
    }
    
    return false;
  }) || null;
  

  // Fetch comments count
  const { data: commentsData } = useQuery({
    queryKey: ["/api/incidents", decodedId, "comments"],
    queryFn: async () => {
      if (!decodedId) return null;
      const response = await fetch(`/api/incidents/${decodedId}/social/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: !!decodedId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });


  // Social interaction handlers

  const handleCommentsToggle = () => {
    setShowComments(!showComments);
  };

  const handleShareClick = async () => {
    if (!incident) return;
    
    const shareUrl = `${window.location.origin}/incident/${incidentId}`;
    const shareTitle = getIncidentTitle(incident);
    const shareText = `${shareTitle} - ${getIncidentLocation(incident)}`;

    // Try native Web Share API first (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        toast({
          title: "Shared successfully",
          description: "Incident shared successfully.",
        });
        return;
      } catch (error) {
        // User cancelled or error occurred - fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied",
        description: "Incident link copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Share failed",
        description: "Unable to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };
  
  // Handle close - navigate back or to home
  const handleClose = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };
  
  // If query errored, show error
  if (error) {
    return (
      <Dialog open={true} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Error Loading Incident</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center">
            <p className="text-muted-foreground mb-4">
              There was an error loading the incident. Please try again.
            </p>
            <Button onClick={handleClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // If no incident found, show error
  if (!isLoading && !incident) {
    return (
      <Dialog open={true} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Incident Not Found</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center">
            <p className="text-muted-foreground mb-4">
              The incident you're looking for could not be found.
            </p>
            <Button onClick={handleClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Loading state
  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading incident details...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Extract incident details
  const title = getIncidentTitle(incident);
  const location = getIncidentLocation(incident);
  const category = getIncidentCategory(incident);
  const subcategory = getIncidentSubcategory(incident);
  const reporterUserId = getReporterUserId(incident);
  const { iconName, color } = getIncidentIconProps(incident);
  
  // Extract source and determine if it's user-reported
  const source = incident?.source || incident?.properties?.source || 'unknown';
  const isUserReport = source === 'user' || incident?.properties?.userReported;
  
  // Check if current user is the incident creator
  const isIncidentCreator = user && reporterUserId && user.id === reporterUserId;
  
  // Extract description
  const description = incident?.properties?.description || 
                     incident?.properties?.Event_Type || 
                     incident?.properties?.details || 
                     'No description available';
  
  // Extract timestamp
  const timestamp = incident?.properties?.incidentTime || 
                   incident?.properties?.lastUpdated || 
                   incident?.properties?.publishedAt ||
                   incident?.properties?.createdAt;
  
  // Helper function to get the appropriate icon - matches map marker icons
  const getIcon = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      'Car': Car,
      'AlertTriangle': AlertTriangle,
      'Shield': Shield,
      'ShieldAlert': ShieldAlert,
      'Flame': Flame,
      'Heart': Heart,
      'Users': Users,
      'Construction': Construction,
      'Trees': Trees,
      'Search': Search,
      'Zap': Zap,
      'Timer': Timer,
      'Crash': CarFront,
      'CloudLightning': CloudLightning,
      'Siren': Siren,
      'Eye': Eye,
      'Building': Building,
      'Bug': Bug,
      'Volume2': Volume2,
      'MapPin': MapPin,
      'CheckCircle': CheckCircle,
      'PawPrint': PawPrint
    };
    return iconMap[iconName] || AlertTriangle;
  };

  const IconComponent = getIcon(iconName);

  const content = (
    <div className="relative">
      {/* Main Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-gray-50/30 to-white">
        <CardHeader className={`pb-3 pt-4 px-3 md:px-6 rounded-t-lg ${
          source === 'emergency' ? 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200' :
          source === 'tmr' ? 'bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200' :
          source === 'user' ? 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200' :
          'bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200'
        }`}>
          {/* Header Section */}
          <div className="flex items-start gap-3">
            {/* Incident Icon */}
            <div className={`flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center shadow-lg ring-2 ${
              source === 'emergency' ? 'bg-gradient-to-br from-red-500 to-red-600 ring-red-200' :
              source === 'tmr' ? 'bg-gradient-to-br from-orange-500 to-orange-600 ring-orange-200' :
              source === 'user' ? 'bg-gradient-to-br from-purple-500 to-purple-600 ring-purple-200' :
              'bg-gradient-to-br from-gray-500 to-gray-600 ring-gray-200'
            }`}>
              <IconComponent className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            
            {/* Title and Meta */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight flex-1" data-testid="incident-title">
                  {title}
                </h1>
                
                {/* Edit and Delete buttons for incident creator */}
                {isIncidentCreator && isUserReport && (
                  <div className="flex gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLocation(`/edit-incident/${incidentId}`)}
                      className="h-8 px-2 hover:bg-purple-100 hover:text-purple-700"
                      data-testid="button-edit-incident"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this incident? This action cannot be undone.')) {
                          deleteIncidentMutation.mutate(decodedId!);
                        }
                      }}
                      className="h-8 px-2 hover:bg-red-100 hover:text-red-700"
                      data-testid="button-delete-incident"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Location with icon */}
              <div className="flex items-center gap-1.5 text-gray-700">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-sm font-medium" data-testid="incident-location">{location}</span>
              </div>
              
              {/* Compact Category Badge - Combined categories into single pill */}
              {category && (
                <Badge variant="secondary" className={`${
                  source === 'emergency' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                  source === 'tmr' ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' :
                  source === 'user' ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' :
                  'bg-gray-100 text-gray-800 hover:bg-gray-200'
                } text-xs font-medium`}>
                  {category}{subcategory ? ` • ${subcategory}` : ''}
                </Badge>
              )}
              
              {/* Inline Official Source Chip - Moved from separate section */}
              {(() => {
                const agencyInfo = getAgencyInfo(incident);
                if (agencyInfo) {
                  return (
                    <div className="flex items-center gap-2 text-xs">
                      <Avatar className={`h-6 w-6 ${agencyInfo.color} text-white`}>
                        <AvatarFallback className="bg-transparent text-white text-[10px] font-semibold">
                          {agencyInfo.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-gray-900">{agencyInfo.name}</span>
                    </div>
                  );
                } else if (reporterUserId) {
                  return (
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Community Report</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-3 md:p-6">
          {/* Reporter attribution - only show for user reports that need detailed attribution */}
          {reporterUserId && !getAgencyInfo(incident) && (
            <div className="rounded-xl p-3 md:p-4 border-l-4 bg-purple-50 border-purple-200">
              <p className="text-xs md:text-sm font-medium text-gray-600 mb-2">
                Reported by
              </p>
              <ReporterAttribution 
                userId={reporterUserId} 
                variant="default"
                showAccountType={true}
              />
            </div>
          )}
          
          {/* Photo Card - for user incidents with photos */}
          {(incident?.photoUrl || incident?.properties?.photoUrl) && (
            <Card className="border border-gray-200/60 shadow-sm">
              <CardContent className="p-0">
                <img
                  src={incident.photoUrl || incident.properties?.photoUrl}
                  alt="Incident photo"
                  className="w-full h-64 object-cover rounded-lg"
                  loading="lazy"
                  onError={(e) => {
                    // Hide card if image fails to load
                    const card = (e.target as HTMLImageElement).closest('.border-gray-200\\/60');
                    if (card) (card as HTMLElement).style.display = 'none';
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Description Card */}
          <Card className="border border-gray-200/60 shadow-sm">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Description</h3>
              </div>
              <p className="text-sm md:text-base text-gray-800 leading-relaxed whitespace-pre-wrap" data-testid="incident-description">
                {description}
              </p>
            </CardContent>
          </Card>
          
          {/* Timestamp Card */}
          {timestamp && (
            <Card className="border border-gray-200/60 shadow-sm">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Time</h3>
                </div>
                <p className="text-sm md:text-base text-gray-800">
                  {new Date(timestamp).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatRelativeTime(timestamp)}
                </p>
              </CardContent>
            </Card>
          )}
          
          {/* Social Interaction Bar - Sticky on mobile */}
          <div className="sticky bottom-0 -mx-3 md:mx-0 md:static">
            <Card className="border-t md:border border-gray-200/60 shadow-sm rounded-none md:rounded-lg">
              <CardContent className="p-2 md:p-3">
                <div className="flex items-center gap-2 md:gap-3">
                  {/* Comments Button - 48px touch target */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 transition-colors px-4 py-3 h-12 text-sm font-medium ${
                      showComments 
                        ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                        : 'hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    onClick={handleCommentsToggle}
                    data-testid={`button-comments-${decodedId}`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Comments</span>
                    <span className="text-muted-foreground ml-1">({commentsData?.count || 0})</span>
                  </Button>
                  
                  {/* Share Button - 48px touch target */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 transition-colors px-4 py-3 h-12 text-sm font-medium hover:text-green-600 hover:bg-green-50"
                    onClick={handleShareClick}
                    data-testid={`button-share-${decodedId}`}
                  >
                    <Share className="w-4 h-4" />
                    <span>Share</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comments Section - Bottom sheet style */}
          {showComments && (
            <div className="-mx-3 md:mx-0 bg-blue-50/50 border-t border-blue-200 md:rounded-lg md:border">
              <div className="p-3 md:p-4 border-b border-blue-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-900">
                      Comments ({commentsData?.count || 0})
                    </h3>
                  </div>
                  {/* Close button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowComments(false)}
                    className="h-8 w-8 p-0"
                    data-testid="close-comments"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="bg-white">
                <InlineComments 
                  incident={incident} 
                  onClose={() => setShowComments(false)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
  
  // Render as modal or full page
  if (asModal) {
    return (
      <Dialog open={true} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[95vh] flex flex-col p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Incident Details</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-3 md:p-6">
            {content}
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <div className="container max-w-3xl mx-auto p-3 md:p-6">
      {content}
    </div>
  );
}

// Route wrapper component that matches wouter expectations
export default function IncidentDetailRoute(props: IncidentDetailPageProps) {
  return <IncidentDetailPage asModal={true} {...props} />;
}```

#### client/src/pages/create.tsx
```typescript
import { useState, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { IncidentReportForm } from "@/components/incident-report-form";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";

export default function Create() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [isOpen, setIsOpen] = useState(true);

  const returnPath = useMemo(() => {
    const params = new URLSearchParams(searchString);
    const from = params.get("from");
    if (from && from !== "/create") {
      return decodeURIComponent(from);
    }
    return "/feed";
  }, [searchString]);

  const handleClose = () => {
    setIsOpen(false);
    queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    setLocation(returnPath);
  };

  return (
    <IncidentReportForm
      isOpen={isOpen}
      onClose={handleClose}
      entryPoint="post"
      initialLocation={user?.preferredLocation || undefined}
    />
  );
}
```

#### client/src/pages/profile.tsx
```typescript
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { ArrowLeft, MapPin, Shield, Users, Phone, UserCheck, Camera, Bell, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, subscribe: subscribePush, unsubscribe: unsubscribePush, permission: pushPermission } = usePushNotifications();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    preferredLocation: user?.preferredLocation || "",
    preferredLocationLat: user?.preferredLocationLat || null as number | null,
    preferredLocationLng: user?.preferredLocationLng || null as number | null,
    preferredLocationBounds: user?.preferredLocationBounds || null as [number, number, number, number] | null,
    phoneNumber: user?.phoneNumber || "",
    bio: user?.bio || "",
    // Business fields
    businessName: user?.businessName || "",
    businessCategory: user?.businessCategory || "",
    businessDescription: user?.businessDescription || "",
    businessWebsite: user?.businessWebsite || "",
    businessPhone: user?.businessPhone || "",
    businessAddress: user?.businessAddress || ""
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: typeof formData) => {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        body: JSON.stringify(profileData),
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (photoURL: string) => {
      const response = await fetch("/api/user/profile-photo", {
        method: "PUT",
        body: JSON.stringify({ photoURL }),
        headers: { 
          "Content-Type": "application/json",
        }
      });
      if (!response.ok) throw new Error('Failed to update profile photo');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Photo updated",
        description: "Your profile photo has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to update profile photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch categories for notification preferences
  const { data: categoriesData } = useQuery({
    queryKey: ["/api/categories"],
  });
  const dbCategories = (categoriesData as any[]) || [];
  
  // Add TMR Traffic as a special source option alongside regular categories
  const TMR_SOURCE = { id: 'tmr', name: 'Traffic Alerts', isSource: true };
  const categories = [TMR_SOURCE, ...dbCategories];

  // Local state for optimistic UI updates
  const [localNotificationsEnabled, setLocalNotificationsEnabled] = useState<boolean | null>(null);
  const [localNotificationCategories, setLocalNotificationCategories] = useState<string[] | null>(null);
  const [localNotificationRadius, setLocalNotificationRadius] = useState<string | null>(null);

  // Get effective values (local state takes precedence for immediate UI feedback)
  const effectiveNotificationsEnabled = localNotificationsEnabled ?? user?.notificationsEnabled ?? true;
  const effectiveNotificationCategories = localNotificationCategories ?? (user?.notificationCategories as string[]) ?? [];
  const effectiveNotificationRadius = localNotificationRadius ?? user?.notificationRadius ?? '10km';

  // Notification preferences mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (prefs: { 
      notificationsEnabled?: boolean; 
      notificationCategories?: string[] | null;
      notificationRadius?: string;
    }) => {
      const response = await fetch("/api/user/notification-preferences", {
        method: "PATCH",
        body: JSON.stringify(prefs),
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });
      if (!response.ok) throw new Error('Failed to update notification preferences');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Clear local state after successful server update
      setLocalNotificationsEnabled(null);
      setLocalNotificationCategories(null);
      setLocalNotificationRadius(null);
    },
    onError: () => {
      // Revert local state on error
      setLocalNotificationsEnabled(null);
      setLocalNotificationCategories(null);
      setLocalNotificationRadius(null);
      toast({
        title: "Update failed",
        description: "Failed to update notification preferences.",
        variant: "destructive",
      });
    },
  });

  const handleToggleNotifications = async (enabled: boolean) => {
    setLocalNotificationsEnabled(enabled);
    
    if (enabled) {
      // When enabling, request browser permission and subscribe to push
      if (pushSupported) {
        const subscribed = await subscribePush();
        if (!subscribed) {
          // If subscription failed, revert the toggle
          setLocalNotificationsEnabled(false);
          return;
        }
      }
    } else {
      // When disabling, unsubscribe from push
      if (pushSupported && pushSubscribed) {
        await unsubscribePush();
      }
    }
    
    updateNotificationsMutation.mutate({ notificationsEnabled: enabled });
  };

  const handleToggleCategory = (categoryId: string) => {
    const currentCategories = effectiveNotificationCategories;
    let newCategories: string[];
    
    if (currentCategories.length === 0) {
      // Currently receiving all - switch to all except this one
      newCategories = categories
        .filter((c: any) => c.id !== categoryId)
        .map((c: any) => c.id);
    } else if (currentCategories.includes(categoryId)) {
      // Remove this category
      newCategories = currentCategories.filter(id => id !== categoryId);
    } else {
      // Add this category
      newCategories = [...currentCategories, categoryId];
    }
    
    // Update local state immediately for responsive UI
    setLocalNotificationCategories(newCategories);
    updateNotificationsMutation.mutate({ notificationCategories: newCategories.length > 0 ? newCategories : null });
  };

  const handleRadiusChange = (radius: string) => {
    setLocalNotificationRadius(radius);
    updateNotificationsMutation.mutate({ notificationRadius: radius });
  };

  const isCategoryEnabled = (categoryId: string): boolean => {
    if (effectiveNotificationCategories.length === 0) return true; // All enabled
    return effectiveNotificationCategories.includes(categoryId);
  };

  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) throw new Error('Failed to get upload URL');
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handlePhotoUploadComplete = (result: any) => {
    if (result.successful && result.successful[0]) {
      const uploadURL = result.successful[0].uploadURL;
      uploadPhotoMutation.mutate(uploadURL);
    }
  };

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      preferredLocation: user?.preferredLocation || "",
      preferredLocationLat: user?.preferredLocationLat || null,
      preferredLocationLng: user?.preferredLocationLng || null,
      preferredLocationBounds: user?.preferredLocationBounds || null,
      phoneNumber: user?.phoneNumber || "",
      bio: user?.bio || "",
      // Business fields
      businessName: user?.businessName || "",
      businessCategory: user?.businessCategory || "",
      businessDescription: user?.businessDescription || "",
      businessWebsite: user?.businessWebsite || "",
      businessPhone: user?.businessPhone || "",
      businessAddress: user?.businessAddress || ""
    });
    setIsEditing(false);
  };
  
  const handleLocationChange = (
    location: string, 
    coordinates?: { lat: number; lon: number },
    boundingBox?: [number, number, number, number]
  ) => {
    setFormData(prev => ({
      ...prev,
      preferredLocation: location,
      preferredLocationLat: coordinates?.lat || null,
      preferredLocationLng: coordinates?.lon || null,
      preferredLocationBounds: boundingBox || null
    }));
  };
  
  const handleLocationClear = () => {
    setFormData(prev => ({
      ...prev,
      preferredLocation: "",
      preferredLocationLat: null,
      preferredLocationLng: null,
      preferredLocationBounds: null
    }));
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-6">
      {/* Mobile-optimized header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border sm:relative sm:border-0">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="sm:hidden" data-testid="button-back-home-mobile">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" className="hidden sm:flex" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Feed
              </Button>
            </Link>
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">Profile</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Profile Card */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || 'User'} />
                        <AvatarFallback className="text-lg">
                          {user.firstName ? user.firstName[0].toUpperCase() : user.email ? user.email[0].toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2">
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={5242880} // 5MB
                          onGetUploadParameters={handleGetUploadParameters}
                          onComplete={handlePhotoUploadComplete}
                          buttonClassName="rounded-full w-8 h-8 p-0 bg-primary hover:bg-primary/90"
                        >
                          <Camera className="w-4 h-4" />
                        </ObjectUploader>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-xl truncate" data-testid="text-user-name">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user.firstName || user.email
                        }
                      </CardTitle>
                      <CardDescription className="block">
                        <span className="block truncate" data-testid="text-user-email">{user.email}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Member
                          </Badge>
                        </div>
                      </CardDescription>
                      {user.preferredLocation && (
                        <div className="flex items-start gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span className="break-words" data-testid="text-user-location">{user.preferredLocation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!isEditing && (
                    <Button 
                      onClick={() => setIsEditing(true)} 
                      className="w-full sm:w-auto flex-shrink-0"
                      data-testid="button-edit-profile"
                    >
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                          data-testid="input-first-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                          data-testid="input-last-name"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="preferredLocation">Your Location</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Search for your suburb or city to filter posts near you
                      </p>
                      <LocationAutocomplete
                        value={formData.preferredLocation}
                        onChange={handleLocationChange}
                        onClear={handleLocationClear}
                        placeholder="Search for your suburb or city..."
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        placeholder="e.g., +61 4XX XXX XXX"
                        data-testid="input-phone"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Input
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell others about yourself..."
                        data-testid="input-bio"
                      />
                    </div>

                    {/* Business Information Section for Business Accounts */}
                    {user.accountType === 'business' && (
                      <>
                        <Separator className="my-6" />
                        <h3 className="text-lg font-semibold mb-4">Business Information</h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="businessName">Business Name</Label>
                            <Input
                              id="businessName"
                              value={formData.businessName}
                              onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                              placeholder="Your business name"
                              data-testid="input-business-name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="businessCategory">Business Category</Label>
                            <Input
                              id="businessCategory"
                              value={formData.businessCategory}
                              onChange={(e) => setFormData(prev => ({ ...prev, businessCategory: e.target.value }))}
                              placeholder="e.g., Restaurant & Food"
                              data-testid="input-business-category"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="businessDescription">Business Description</Label>
                          <Input
                            id="businessDescription"
                            value={formData.businessDescription}
                            onChange={(e) => setFormData(prev => ({ ...prev, businessDescription: e.target.value }))}
                            placeholder="Describe your business..."
                            data-testid="input-business-description"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="businessWebsite">Business Website</Label>
                            <Input
                              id="businessWebsite"
                              value={formData.businessWebsite}
                              onChange={(e) => setFormData(prev => ({ ...prev, businessWebsite: e.target.value }))}
                              placeholder="https://yourbusiness.com"
                              data-testid="input-business-website"
                            />
                          </div>
                          <div>
                            <Label htmlFor="businessPhone">Business Phone</Label>
                            <Input
                              id="businessPhone"
                              value={formData.businessPhone}
                              onChange={(e) => setFormData(prev => ({ ...prev, businessPhone: e.target.value }))}
                              placeholder="(07) 1234 5678"
                              data-testid="input-business-phone"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="businessAddress">Business Address</Label>
                          <Input
                            id="businessAddress"
                            value={formData.businessAddress}
                            onChange={(e) => setFormData(prev => ({ ...prev, businessAddress: e.target.value }))}
                            placeholder="123 Business Street, City QLD 4000"
                            data-testid="input-business-address"
                          />
                        </div>
                      </>
                    )}
                    
                    <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
                      <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto" data-testid="button-cancel-edit">
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSave} 
                        disabled={updateProfileMutation.isPending}
                        className="w-full sm:w-auto"
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {user.bio && (
                      <div>
                        <h4 className="font-medium mb-2">About</h4>
                        <p className="text-sm text-muted-foreground" data-testid="text-user-bio">{user.bio}</p>
                      </div>
                    )}
                    
                    {user.phoneNumber && (
                      <div>
                        <h4 className="font-medium mb-2">Contact</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span data-testid="text-user-phone">{user.phoneNumber}</span>
                        </div>
                      </div>
                    )}

                    {/* Business Information Display for Business Accounts */}
                    {user.accountType === 'business' && (
                      <>
                        <Separator className="my-4" />
                        <div>
                          <h4 className="font-medium mb-3">Business Information</h4>
                          <div className="space-y-3">
                            {user.businessName && (
                              <div>
                                <span className="text-sm text-muted-foreground">Business Name</span>
                                <p className="font-medium" data-testid="text-business-name">{user.businessName}</p>
                              </div>
                            )}
                            {user.businessCategory && (
                              <div>
                                <span className="text-sm text-muted-foreground">Category</span>
                                <p className="font-medium" data-testid="text-business-category">{user.businessCategory}</p>
                              </div>
                            )}
                            {user.businessDescription && (
                              <div>
                                <span className="text-sm text-muted-foreground">Description</span>
                                <p className="text-sm text-muted-foreground" data-testid="text-business-description">{user.businessDescription}</p>
                              </div>
                            )}
                            {user.businessWebsite && (
                              <div>
                                <span className="text-sm text-muted-foreground">Website</span>
                                <p className="font-medium" data-testid="text-business-website">
                                  <a href={user.businessWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    {user.businessWebsite}
                                  </a>
                                </p>
                              </div>
                            )}
                            {user.businessPhone && (
                              <div>
                                <span className="text-sm text-muted-foreground">Business Phone</span>
                                <p className="font-medium" data-testid="text-business-phone">{user.businessPhone}</p>
                              </div>
                            )}
                            {user.businessAddress && (
                              <div>
                                <span className="text-sm text-muted-foreground">Address</span>
                                <p className="font-medium" data-testid="text-business-address">{user.businessAddress}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats & Info Sidebar */}
          <div className="space-y-6">
            {/* Community Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Community Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reputation Score</span>
                  <Badge variant="secondary" data-testid="text-reputation-score">
                    <Shield className="w-3 h-3 mr-1" />
                    {user.reputationScore || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reports Submitted</span>
                  <span className="font-medium" data-testid="text-reports-count">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Comments Posted</span>
                  <span className="font-medium" data-testid="text-comments-count">0</span>
                </div>
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Member Since</span>
                  <span className="text-sm font-medium" data-testid="text-member-since">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Account Status</span>
                  <Badge variant="default" data-testid="badge-account-status">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Privacy Level</span>
                  <span className="text-sm font-medium" data-testid="text-privacy-level">
                    Public
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Push Notification Status */}
                {!pushSupported && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      Push notifications are not supported on this browser. Try adding this app to your home screen on mobile.
                    </p>
                  </div>
                )}
                
                {pushSupported && pushPermission === 'denied' && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Notifications are blocked. Please enable them in your browser settings.
                    </p>
                  </div>
                )}

                {pushSupported && pushSubscribed && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Push notifications are enabled
                    </p>
                  </div>
                )}

                {/* Master Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Enable Notifications</span>
                    <p className="text-xs text-muted-foreground">
                      {pushSupported && !pushSubscribed && pushPermission !== 'denied' 
                        ? "Tap to enable push notifications" 
                        : "Receive alerts for nearby posts"}
                    </p>
                  </div>
                  <Switch
                    checked={effectiveNotificationsEnabled}
                    onCheckedChange={handleToggleNotifications}
                    disabled={pushPermission === 'denied'}
                    data-testid="switch-notifications-enabled"
                  />
                </div>

                {effectiveNotificationsEnabled && (
                  <>
                    <Separator />
                    
                    {/* Proximity Radius */}
                    <div>
                      <span className="text-sm font-medium block mb-2">Notification Radius</span>
                      <p className="text-xs text-muted-foreground mb-2">
                        Only notify for posts within this distance
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {['1km', '2km', '5km', '10km', '25km', '50km'].map((radius) => (
                          <Button
                            key={radius}
                            variant={effectiveNotificationRadius === radius ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleRadiusChange(radius)}
                            data-testid={`button-radius-${radius}`}
                          >
                            {radius}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Category Selection */}
                    <div>
                      <span className="text-sm font-medium block mb-2">Categories</span>
                      <p className="text-xs text-muted-foreground mb-2">
                        Choose which types of posts to be notified about
                      </p>
                      <div className="space-y-2">
                        {categories.map((category: any) => (
                          <button
                            key={category.id}
                            onClick={() => handleToggleCategory(category.id)}
                            className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${
                              isCategoryEnabled(category.id)
                                ? 'bg-primary/10 text-foreground'
                                : 'bg-muted/50 text-muted-foreground'
                            }`}
                            data-testid={`button-category-${category.id}`}
                          >
                            <span>{category.name}</span>
                            {isCategoryEnabled(category.id) && (
                              <Check className="w-4 h-4 text-primary" />
                            )}
                          </button>
                        ))}
                        {categories.length === 0 && (
                          <p className="text-xs text-muted-foreground">Loading categories...</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/feed">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-view-feed">
                    <Users className="w-4 h-4 mr-2" />
                    View Activity Feed
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/api/logout'}
                  data-testid="button-sign-out"
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}```

#### client/src/pages/notifications.tsx
```typescript
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/map/app-header";
import { NotificationSettings } from "@/components/notification-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, ArrowLeft, Settings, Inbox, Check, CheckCheck, MessageCircle, AlertTriangle, MapPin, Heart, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  entityId: string | null;
  entityType: string | null;
  isRead: boolean;
  createdAt: string;
  fromUserId: string | null;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'new_post':
      return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    case 'comment':
      return <MessageCircle className="w-5 h-5 text-blue-500" />;
    case 'like':
      return <Heart className="w-5 h-5 text-red-500" />;
    case 'nearby':
      return <MapPin className="w-5 h-5 text-green-500" />;
    case 'mention':
      return <Users className="w-5 h-5 text-purple-500" />;
    default:
      return <Bell className="w-5 h-5 text-muted-foreground" />;
  }
}

export default function Notifications() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: isAuthenticated,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiRequest('PATCH', `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('PATCH', '/api/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    
    if (notification.entityType === 'post' && notification.entityId) {
      setLocation(`/feed?highlight=${notification.entityId}`);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader onMenuToggle={() => {}} />
        <div className="max-w-2xl mx-auto px-4 pt-20 pb-6">
          <div className="text-center py-16">
            <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-6">
              Please sign in to view your notifications.
            </p>
            <Button asChild>
              <Link href="/api/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onMenuToggle={() => {}} />
      
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-6">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Back to Feed
            </Button>
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Notifications
          </h1>
          <p className="text-muted-foreground">
            Stay updated on activity in your area.
          </p>
        </div>

        <Tabs defaultValue="inbox" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inbox" className="gap-2" data-testid="tab-inbox">
              <Inbox className="w-4 h-4" />
              Inbox
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2" data-testid="tab-settings">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="space-y-4">
            {/* Mark All Read Button */}
            {unreadCount > 0 && (
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                  data-testid="button-mark-all-read"
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark all as read
                </Button>
              </div>
            )}

            {/* Notifications List */}
            {isLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <Card className="p-8 text-center">
                <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
                <p className="text-muted-foreground">
                  When there's activity in your area, you'll see it here.
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <Card 
                    key={notification.id}
                    className={`p-4 cursor-pointer transition-colors hover-elevate ${
                      !notification.isRead ? 'bg-primary/5 border-primary/20' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                    data-testid={`notification-item-${notification.id}`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notification.isRead ? 'font-semibold' : ''}`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <NotificationSettings />
            
            {/* Additional Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About Safety Notifications</CardTitle>
                <CardDescription>
                  How we keep you informed about incidents in your area
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-1">
                      Emergency Incidents
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Real-time alerts from QLD Emergency Services about active incidents requiring immediate attention.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-1">
                      Traffic Events
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Major road closures, crashes, and traffic disruptions that may affect your travel.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-1">
                      Community Reports
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Verified reports from your neighbors about safety concerns, suspicious activity, and local incidents.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground mb-2">
                    Your Privacy
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Notifications are sent based on your selected location preferences. We never share your exact location or personal information. You can disable notifications at any time.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
```

#### client/src/pages/auth-page.tsx
```typescript
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, MessageCircle, MapPin, User, Building, Bell, Heart } from "lucide-react";
import { insertUserSchema } from "@shared/schema";
import { Redirect } from "wouter";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = insertUserSchema.pick({
  password: true,
  email: true,
  firstName: true,
  lastName: true,
  preferredLocation: true,
  accountType: true,
  businessName: true,
  businessCategory: true,
  businessDescription: true,
  businessWebsite: true,
  businessPhone: true,
  businessAddress: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  preferredLocation: z.string().min(1, "Home suburb is required"),
  accountType: z.enum(['regular', 'business']).default('regular'),
  businessName: z.string().optional(),
  businessCategory: z.string().optional(),
  businessDescription: z.string().optional(),
  businessWebsite: z.string().optional(),
  businessPhone: z.string().optional(),
  businessAddress: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.accountType === 'business') {
    return data.businessName && data.businessName.trim().length > 0;
  }
  return true;
}, {
  message: "Business name is required for business accounts",
  path: ["businessName"],
}).refine((data) => {
  if (data.accountType === 'business') {
    return data.businessCategory && data.businessCategory.length > 0;
  }
  return true;
}, {
  message: "Business category is required for business accounts",
  path: ["businessCategory"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("login");

  if (!isLoading && user) {
    return <Redirect to="/" />;
  }

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
      email: "",
      firstName: "",
      lastName: "",
      preferredLocation: "",
      accountType: 'regular',
      businessName: "",
      businessCategory: "",
      businessDescription: "",
      businessWebsite: "",
      businessPhone: "",
      businessAddress: "",
    },
  });

  const businessCategories = [
    "Restaurant & Food",
    "Retail & Shopping", 
    "Health & Fitness",
    "Beauty & Wellness",
    "Professional Services",
    "Home & Garden",
    "Education & Training",
    "Entertainment & Events",
    "Automotive",
    "Technology",
    "Other"
  ];

  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormData) => {
    const { confirmPassword, ...userData } = data;
    registerMutation.mutate(userData);
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Hero Section - Left Side */}
        <div className="lg:w-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-background dark:from-primary/20 dark:via-primary/10 dark:to-background p-8 lg:p-16 flex flex-col justify-center">
          <div className="max-w-lg mx-auto lg:mx-0">
            <div className="mb-8">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">
                Community Connect
              </h1>
              <p className="text-lg text-muted-foreground">
                Your local community network for safety updates, lost & found, and neighbourhood news across Australia.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-card border">
                <div className="p-2 rounded-full bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Real-time Alerts</h3>
                  <p className="text-sm text-muted-foreground">Get notified about incidents and updates in your area</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-card border">
                <div className="p-2 rounded-full bg-primary/10">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Community Posts</h3>
                  <p className="text-sm text-muted-foreground">Share and discover local updates from neighbours</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-card border">
                <div className="p-2 rounded-full bg-primary/10">
                  <Heart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Lost & Found</h3>
                  <p className="text-sm text-muted-foreground">Help reunite pets and belongings with their owners</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-card border">
                <div className="p-2 rounded-full bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Local Focus</h3>
                  <p className="text-sm text-muted-foreground">See what matters most in your suburb and nearby areas</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Forms - Right Side */}
        <div className="lg:w-1/2 p-8 lg:p-16 flex items-center justify-center bg-background">
          <div className="w-full max-w-md">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Card className="border-0 shadow-none lg:border lg:shadow-sm">
                  <CardHeader className="px-0 lg:px-6">
                    <CardTitle className="text-2xl">Welcome back</CardTitle>
                    <CardDescription>
                      Sign in to stay connected with your community
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 lg:px-6">
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          data-testid="input-login-email"
                          type="email"
                          {...loginForm.register("email")}
                          placeholder="you@example.com"
                        />
                        {loginForm.formState.errors.email && (
                          <p className="text-sm text-destructive" data-testid="error-login-email">
                            {loginForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <Input
                          id="login-password"
                          data-testid="input-login-password"
                          type="password"
                          {...loginForm.register("password")}
                          placeholder="Your password"
                        />
                        {loginForm.formState.errors.password && (
                          <p className="text-sm text-destructive" data-testid="error-login-password">
                            {loginForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginMutation.isPending}
                        data-testid="button-login"
                      >
                        {loginMutation.isPending ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="register">
                <Card className="border-0 shadow-none lg:border lg:shadow-sm">
                  <CardHeader className="px-0 lg:px-6">
                    <CardTitle className="text-2xl">Join your community</CardTitle>
                    <CardDescription>
                      Create an account to share updates and stay informed
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 lg:px-6">
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <div className="space-y-3">
                        <Label>Account Type</Label>
                        <RadioGroup 
                          value={registerForm.watch("accountType")} 
                          onValueChange={(value: 'regular' | 'business') => registerForm.setValue("accountType", value)}
                          className="grid grid-cols-2 gap-3"
                        >
                          <div className={`flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${registerForm.watch("accountType") === 'regular' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                            <RadioGroupItem value="regular" id="personal" className="sr-only" />
                            <Label htmlFor="personal" className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                              <User className="w-4 h-4" />
                              Personal
                            </Label>
                          </div>

                          <div className={`flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${registerForm.watch("accountType") === 'business' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                            <RadioGroupItem value="business" id="business" className="sr-only" />
                            <Label htmlFor="business" className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                              <Building className="w-4 h-4" />
                              Business
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="register-firstName">First Name</Label>
                          <Input
                            id="register-firstName"
                            data-testid="input-register-firstName"
                            {...registerForm.register("firstName")}
                            placeholder="First name"
                          />
                          {registerForm.formState.errors.firstName && (
                            <p className="text-sm text-destructive" data-testid="error-register-firstName">
                              {registerForm.formState.errors.firstName.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="register-lastName">Last Name</Label>
                          <Input
                            id="register-lastName"
                            data-testid="input-register-lastName"
                            {...registerForm.register("lastName")}
                            placeholder="Last name"
                          />
                          {registerForm.formState.errors.lastName && (
                            <p className="text-sm text-destructive" data-testid="error-register-lastName">
                              {registerForm.formState.errors.lastName.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-email">Email</Label>
                        <Input
                          id="register-email"
                          data-testid="input-register-email"
                          type="email"
                          {...registerForm.register("email")}
                          placeholder="you@example.com"
                        />
                        {registerForm.formState.errors.email && (
                          <p className="text-sm text-destructive" data-testid="error-register-email">
                            {registerForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-preferredLocation">Your Suburb</Label>
                        <LocationAutocomplete
                          value={registerForm.watch("preferredLocation") || ""}
                          onChange={(location) => registerForm.setValue("preferredLocation", location)}
                          placeholder="Start typing your suburb..."
                          data-testid="input-register-preferredLocation"
                        />
                        {registerForm.formState.errors.preferredLocation && (
                          <p className="text-sm text-destructive" data-testid="error-register-preferredLocation">
                            {registerForm.formState.errors.preferredLocation.message}
                          </p>
                        )}
                      </div>

                      {registerForm.watch("accountType") === 'business' && (
                        <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                          <h3 className="font-medium text-sm flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            Business Details
                          </h3>

                          <div className="grid grid-cols-1 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="register-businessName">Business Name</Label>
                              <Input
                                id="register-businessName"
                                data-testid="input-register-businessName"
                                {...registerForm.register("businessName")}
                                placeholder="Your Business Name"
                              />
                              {registerForm.formState.errors.businessName && (
                                <p className="text-sm text-destructive" data-testid="error-register-businessName">
                                  {registerForm.formState.errors.businessName.message}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="register-businessCategory">Category</Label>
                              <Select value={registerForm.watch("businessCategory")} onValueChange={(value) => registerForm.setValue("businessCategory", value)}>
                                <SelectTrigger data-testid="select-register-businessCategory">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {businessCategories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                      {category}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {registerForm.formState.errors.businessCategory && (
                                <p className="text-sm text-destructive" data-testid="error-register-businessCategory">
                                  {registerForm.formState.errors.businessCategory.message}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="register-businessDescription">Description</Label>
                              <Textarea
                                id="register-businessDescription"
                                data-testid="textarea-register-businessDescription"
                                {...registerForm.register("businessDescription")}
                                placeholder="Brief description..."
                                rows={2}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label htmlFor="register-businessWebsite">Website</Label>
                                <Input
                                  id="register-businessWebsite"
                                  data-testid="input-register-businessWebsite"
                                  {...registerForm.register("businessWebsite")}
                                  placeholder="https://..."
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="register-businessPhone">Phone</Label>
                                <Input
                                  id="register-businessPhone"
                                  data-testid="input-register-businessPhone"
                                  {...registerForm.register("businessPhone")}
                                  placeholder="04XX XXX XXX"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="register-businessAddress">Address</Label>
                              <LocationAutocomplete
                                value={registerForm.watch("businessAddress") || ""}
                                onChange={(location) => registerForm.setValue("businessAddress", location)}
                                placeholder="Business address..."
                                data-testid="input-register-businessAddress"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="register-password">Password</Label>
                          <Input
                            id="register-password"
                            data-testid="input-register-password"
                            type="password"
                            {...registerForm.register("password")}
                            placeholder="Create password"
                          />
                          {registerForm.formState.errors.password && (
                            <p className="text-sm text-destructive" data-testid="error-register-password">
                              {registerForm.formState.errors.password.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="register-confirmPassword">Confirm</Label>
                          <Input
                            id="register-confirmPassword"
                            data-testid="input-register-confirmPassword"
                            type="password"
                            {...registerForm.register("confirmPassword")}
                            placeholder="Confirm password"
                          />
                          {registerForm.formState.errors.confirmPassword && (
                            <p className="text-sm text-destructive" data-testid="error-register-confirmPassword">
                              {registerForm.formState.errors.confirmPassword.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                        data-testid="button-register"
                      >
                        {registerMutation.isPending ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### client/src/pages/admin-dashboard.tsx
```typescript
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Building, MapPin, DollarSign, ArrowLeft, Home, Flag, MessageSquare, AlertTriangle, Eye, Archive, Tag, Plus, Percent, Calendar, Users } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";

interface AdCampaign {
  id: string;
  businessName: string;
  title: string;
  content: string;
  imageUrl: string | null;
  websiteUrl: string | null;
  address: string | null;
  suburb: string;
  cta: string;
  targetSuburbs: string[];
  dailyBudget: string | null;
  totalBudget: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ContentReport {
  id: string;
  reporterId: string;
  entityType: string;
  entityId: string;
  reason: string;
  description: string | null;
  status: string;
  moderatorId: string | null;
  moderatorNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  reporterName: string;
  entityInfo: {
    title?: string;
    content?: string;
    userName?: string;
  } | null;
}

interface FeedbackItem {
  id: string;
  userId: string | null;
  email: string | null;
  category: string;
  subject: string;
  message: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  userName: string;
}

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discountType: "percentage" | "fixed" | "free_month";
  discountValue: number | null;
  durationDays: number | null;
  maxRedemptions: number | null;
  perBusinessLimit: number;
  currentRedemptions: number;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("ads");
  const [reportModeratorNotes, setReportModeratorNotes] = useState("");
  const [feedbackAdminNotes, setFeedbackAdminNotes] = useState("");
  const [showCreateDiscount, setShowCreateDiscount] = useState(false);
  const [newDiscountCode, setNewDiscountCode] = useState({
    code: "",
    description: "",
    discountType: "percentage" as "percentage" | "fixed" | "free_month",
    discountValue: "",
    durationDays: "",
    maxRedemptions: "",
    perBusinessLimit: "1",
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: "",
  });

  // Only run access checks when component actually mounts (user is on /admin page)
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    
    if (!isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
    
    if (user && (user as any).role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access this page.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      return;
    }
  }, []); // Only run once on mount - this component should only mount when user visits /admin

  const { data: pendingAds, isLoading, error } = useQuery<AdCampaign[]>({
    queryKey: ['/api/admin/ads/pending'],
    retry: false,
    enabled: isAuthenticated && (user as any)?.role === 'admin',
  });

  const { data: contentReports = [] } = useQuery<ContentReport[]>({
    queryKey: ['/api/content-reports'],
    retry: false,
    enabled: isAuthenticated && (user as any)?.role === 'admin',
  });

  const { data: feedbackList = [] } = useQuery<FeedbackItem[]>({
    queryKey: ['/api/feedback'],
    retry: false,
    enabled: isAuthenticated && (user as any)?.role === 'admin',
  });

  const { data: discountCodes = [] } = useQuery<DiscountCode[]>({
    queryKey: ['/api/admin/discount-codes'],
    retry: false,
    enabled: isAuthenticated && (user as any)?.role === 'admin',
  });

  const createDiscountMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", '/api/admin/discount-codes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discount-codes'] });
      setShowCreateDiscount(false);
      setNewDiscountCode({
        code: "",
        description: "",
        discountType: "percentage",
        discountValue: "",
        durationDays: "",
        maxRedemptions: "",
        perBusinessLimit: "1",
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: "",
      });
      toast({
        title: "Discount Code Created",
        description: "The discount code has been created successfully.",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error?.message || "Failed to create discount code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deactivateDiscountMutation = useMutation({
    mutationFn: async (codeId: string) => {
      return apiRequest("DELETE", `/api/admin/discount-codes/${codeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discount-codes'] });
      toast({
        title: "Discount Code Deactivated",
        description: "The discount code has been deactivated.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to deactivate discount code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (adId: string) => {
      return apiRequest("PUT", `/api/admin/ads/${adId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ads/pending'] });
      toast({
        title: "Ad Approved",
        description: "The advertisement has been approved and is now live.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to approve advertisement. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ adId, reason }: { adId: string; reason: string }) => {
      return apiRequest("PUT", `/api/admin/ads/${adId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ads/pending'] });
      setRejectionReason("");
      setSelectedAdId(null);
      toast({
        title: "Ad Rejected",
        description: "The advertisement has been rejected.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to reject advertisement. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, status, moderatorNotes }: { reportId: string; status: string; moderatorNotes?: string }) => {
      return apiRequest("PUT", `/api/content-reports/${reportId}`, { status, moderatorNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-reports'] });
      setReportModeratorNotes("");
      toast({
        title: "Report Updated",
        description: "The report status has been updated.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateFeedbackMutation = useMutation({
    mutationFn: async ({ feedbackId, status, adminNotes }: { feedbackId: string; status: string; adminNotes?: string }) => {
      return apiRequest("PUT", `/api/feedback/${feedbackId}`, { status, adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      setFeedbackAdminNotes("");
      toast({
        title: "Feedback Updated",
        description: "The feedback status has been updated.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated || (user as any)?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400">Admin privileges required</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error Loading Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  const handleApprove = (adId: string) => {
    approveMutation.mutate(adId);
  };

  const handleReject = (adId: string, reason: string) => {
    if (!reason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejecting this ad.",
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate({ adId, reason });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2"
            data-testid="button-back-to-home"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/feed'}
            className="flex items-center gap-2"
            data-testid="button-back-to-feed"
          >
            <Home className="w-4 h-4" />
            Feed
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage advertisements, content reports, and feedback
          </p>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Badge variant="outline" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {pendingAds?.length || 0} Pending Ads
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2">
              <Flag className="w-4 h-4" />
              {contentReports.filter(r => r.status === 'pending').length} Pending Reports
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {feedbackList.filter(f => f.status === 'new').length} New Feedback
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              {discountCodes.filter(d => d.isActive).length} Active Discounts
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="ads" className="flex items-center gap-2" data-testid="tab-ads">
              <Building className="w-4 h-4" />
              Ads
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2" data-testid="tab-reports">
              <Flag className="w-4 h-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2" data-testid="tab-feedback">
              <MessageSquare className="w-4 h-4" />
              Feedback
            </TabsTrigger>
            <TabsTrigger value="discounts" className="flex items-center gap-2" data-testid="tab-discounts">
              <Tag className="w-4 h-4" />
              Discounts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ads">
        {!pendingAds || pendingAds.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                All caught up!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                There are no pending advertisements to review.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {pendingAds.map((ad: AdCampaign) => (
              <Card key={ad.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="w-5 h-5" />
                        {ad.businessName}
                      </CardTitle>
                      <CardDescription className="text-lg font-medium mt-1">
                        {ad.title}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {new Date(ad.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Ad Preview */}
                    <div>
                      <h4 className="font-semibold mb-3">Ad Preview</h4>
                      <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
                        {ad.imageUrl && (
                          <img
                            src={ad.imageUrl}
                            alt={ad.title}
                            className="w-full h-48 object-cover rounded-lg mb-4"
                          />
                        )}
                        <h5 className="font-bold text-lg mb-2">{ad.title}</h5>
                        <p className="text-gray-600 dark:text-gray-400 mb-3">
                          {ad.content}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">by {ad.businessName}</span>
                          <Button size="sm" variant="outline">
                            {ad.cta}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Ad Details */}
                    <div>
                      <h4 className="font-semibold mb-3">Ad Details</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">
                            {ad.address ? `${ad.address}, ` : ""}{ad.suburb}
                          </span>
                        </div>
                        
                        {ad.websiteUrl && (
                          <div className="text-sm">
                            <strong>Website:</strong>{" "}
                            <a 
                              href={ad.websiteUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {ad.websiteUrl}
                            </a>
                          </div>
                        )}

                        {ad.targetSuburbs && ad.targetSuburbs.length > 0 && (
                          <div className="text-sm">
                            <strong>Target Areas:</strong>{" "}
                            {ad.targetSuburbs.join(", ")}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm">
                          {ad.dailyBudget && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              <span>Daily: ${ad.dailyBudget}</span>
                            </div>
                          )}
                          {ad.totalBudget && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              <span>Total: ${ad.totalBudget}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 mt-6">
                        <Button
                          onClick={() => handleApprove(ad.id)}
                          disabled={approveMutation.isPending}
                          className="flex items-center gap-2"
                          data-testid={`button-approve-${ad.id}`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          {approveMutation.isPending ? "Approving..." : "Approve"}
                        </Button>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="destructive"
                              className="flex items-center gap-2"
                              onClick={() => setSelectedAdId(ad.id)}
                              data-testid={`button-reject-${ad.id}`}
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject Advertisement</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Please provide a reason for rejecting this advertisement:
                              </p>
                              <Textarea
                                placeholder="Reason for rejection..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                data-testid="textarea-rejection-reason"
                              />
                              <div className="flex gap-3">
                                <Button
                                  onClick={() => handleReject(ad.id, rejectionReason)}
                                  disabled={rejectMutation.isPending}
                                  variant="destructive"
                                  data-testid="button-confirm-reject"
                                >
                                  {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setRejectionReason("");
                                    setSelectedAdId(null);
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </TabsContent>

          <TabsContent value="reports">
            {contentReports.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No reports yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    There are no content reports to review.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {contentReports.map((report) => (
                  <Card key={report.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            Report: {report.reason.replace('_', ' ').toUpperCase()}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            Reported by {report.reporterName} on {new Date(report.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={report.status === 'pending' ? 'destructive' : report.status === 'resolved' ? 'default' : 'secondary'}
                        >
                          {report.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {report.entityInfo && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-1">Reported Content:</p>
                            {report.entityInfo.title && (
                              <p className="font-semibold">{report.entityInfo.title}</p>
                            )}
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {report.entityInfo.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Posted by: {report.entityInfo.userName}
                            </p>
                          </div>
                        )}
                        
                        {report.description && (
                          <div>
                            <p className="text-sm font-medium mb-1">Reporter's Note:</p>
                            <p className="text-sm text-muted-foreground">{report.description}</p>
                          </div>
                        )}

                        {report.status === 'pending' && (
                          <div className="flex items-center gap-2 pt-4 border-t flex-wrap">
                            <Button
                              size="sm"
                              onClick={() => updateReportMutation.mutate({ reportId: report.id, status: 'resolved' })}
                              disabled={updateReportMutation.isPending}
                              data-testid={`button-resolve-report-${report.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Resolve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateReportMutation.mutate({ reportId: report.id, status: 'reviewed' })}
                              disabled={updateReportMutation.isPending}
                              data-testid={`button-review-report-${report.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Mark Reviewed
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateReportMutation.mutate({ reportId: report.id, status: 'dismissed' })}
                              disabled={updateReportMutation.isPending}
                              data-testid={`button-dismiss-report-${report.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Dismiss
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="feedback">
            {feedbackList.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No feedback yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    There is no user feedback to review.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {feedbackList.map((item) => (
                  <Card key={item.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <MessageSquare className="w-5 h-5 text-blue-500" />
                            {item.subject}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {item.category.charAt(0).toUpperCase() + item.category.slice(1)} from {item.userName}
                            {item.email && ` (${item.email})`} on {new Date(item.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={item.status === 'new' ? 'destructive' : item.status === 'responded' ? 'default' : 'secondary'}
                        >
                          {item.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm whitespace-pre-wrap">{item.message}</p>
                        </div>

                        {item.adminNotes && (
                          <div>
                            <p className="text-sm font-medium mb-1">Admin Notes:</p>
                            <p className="text-sm text-muted-foreground">{item.adminNotes}</p>
                          </div>
                        )}

                        {(item.status === 'new' || item.status === 'read') && (
                          <div className="flex items-center gap-2 pt-4 border-t flex-wrap">
                            <Button
                              size="sm"
                              onClick={() => updateFeedbackMutation.mutate({ feedbackId: item.id, status: 'responded' })}
                              disabled={updateFeedbackMutation.isPending}
                              data-testid={`button-respond-feedback-${item.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Mark Responded
                            </Button>
                            {item.status === 'new' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateFeedbackMutation.mutate({ feedbackId: item.id, status: 'read' })}
                                disabled={updateFeedbackMutation.isPending}
                                data-testid={`button-read-feedback-${item.id}`}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Mark Read
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateFeedbackMutation.mutate({ feedbackId: item.id, status: 'archived' })}
                              disabled={updateFeedbackMutation.isPending}
                              data-testid={`button-archive-feedback-${item.id}`}
                            >
                              <Archive className="w-4 h-4 mr-1" />
                              Archive
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="discounts">
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-lg font-semibold">Discount Codes</h3>
                  <p className="text-sm text-muted-foreground">Create and manage promotional discount codes for business advertisers</p>
                </div>
                <Dialog open={showCreateDiscount} onOpenChange={setShowCreateDiscount}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2" data-testid="button-create-discount">
                      <Plus className="w-4 h-4" />
                      Create Discount Code
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Discount Code</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="code">Code</Label>
                        <Input
                          id="code"
                          placeholder="e.g., FREEMONTH2024"
                          value={newDiscountCode.code}
                          onChange={(e) => setNewDiscountCode({ ...newDiscountCode, code: e.target.value.toUpperCase() })}
                          data-testid="input-discount-code"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description (optional)</Label>
                        <Textarea
                          id="description"
                          placeholder="Internal notes about this code..."
                          value={newDiscountCode.description}
                          onChange={(e) => setNewDiscountCode({ ...newDiscountCode, description: e.target.value })}
                          data-testid="input-discount-description"
                        />
                      </div>
                      <div>
                        <Label htmlFor="discountType">Discount Type</Label>
                        <Select
                          value={newDiscountCode.discountType}
                          onValueChange={(value: "percentage" | "fixed" | "free_month") => setNewDiscountCode({ ...newDiscountCode, discountType: value })}
                        >
                          <SelectTrigger data-testid="select-discount-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage Off</SelectItem>
                            <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                            <SelectItem value="free_month">Free Period</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {newDiscountCode.discountType !== "free_month" && (
                        <div>
                          <Label htmlFor="discountValue">
                            {newDiscountCode.discountType === "percentage" ? "Percentage (%)" : "Amount ($)"}
                          </Label>
                          <Input
                            id="discountValue"
                            type="number"
                            placeholder={newDiscountCode.discountType === "percentage" ? "e.g., 20" : "e.g., 50"}
                            value={newDiscountCode.discountValue}
                            onChange={(e) => setNewDiscountCode({ ...newDiscountCode, discountValue: e.target.value })}
                            data-testid="input-discount-value"
                          />
                        </div>
                      )}
                      {newDiscountCode.discountType === "free_month" && (
                        <div>
                          <Label htmlFor="durationDays">Free Days</Label>
                          <Input
                            id="durationDays"
                            type="number"
                            placeholder="e.g., 30"
                            value={newDiscountCode.durationDays}
                            onChange={(e) => setNewDiscountCode({ ...newDiscountCode, durationDays: e.target.value })}
                            data-testid="input-duration-days"
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="maxRedemptions">Max Total Uses</Label>
                          <Input
                            id="maxRedemptions"
                            type="number"
                            placeholder="Unlimited"
                            value={newDiscountCode.maxRedemptions}
                            onChange={(e) => setNewDiscountCode({ ...newDiscountCode, maxRedemptions: e.target.value })}
                            data-testid="input-max-redemptions"
                          />
                        </div>
                        <div>
                          <Label htmlFor="perBusinessLimit">Per Business Limit</Label>
                          <Input
                            id="perBusinessLimit"
                            type="number"
                            placeholder="1"
                            value={newDiscountCode.perBusinessLimit}
                            onChange={(e) => setNewDiscountCode({ ...newDiscountCode, perBusinessLimit: e.target.value })}
                            data-testid="input-per-business-limit"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="validFrom">Valid From</Label>
                          <Input
                            id="validFrom"
                            type="date"
                            value={newDiscountCode.validFrom}
                            onChange={(e) => setNewDiscountCode({ ...newDiscountCode, validFrom: e.target.value })}
                            data-testid="input-valid-from"
                          />
                        </div>
                        <div>
                          <Label htmlFor="validUntil">Expires On (optional)</Label>
                          <Input
                            id="validUntil"
                            type="date"
                            value={newDiscountCode.validUntil}
                            onChange={(e) => setNewDiscountCode({ ...newDiscountCode, validUntil: e.target.value })}
                            data-testid="input-valid-until"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button
                          onClick={() => {
                            const data: any = {
                              code: newDiscountCode.code,
                              description: newDiscountCode.description || null,
                              discountType: newDiscountCode.discountType,
                              perBusinessLimit: parseInt(newDiscountCode.perBusinessLimit) || 1,
                              validFrom: new Date(newDiscountCode.validFrom).toISOString(),
                              createdBy: (user as any)?.id,
                            };
                            if (newDiscountCode.discountType !== "free_month" && newDiscountCode.discountValue) {
                              data.discountValue = parseFloat(newDiscountCode.discountValue);
                            }
                            if (newDiscountCode.discountType === "free_month" && newDiscountCode.durationDays) {
                              data.durationDays = parseInt(newDiscountCode.durationDays);
                            }
                            if (newDiscountCode.maxRedemptions) {
                              data.maxRedemptions = parseInt(newDiscountCode.maxRedemptions);
                            }
                            if (newDiscountCode.validUntil) {
                              data.validUntil = new Date(newDiscountCode.validUntil).toISOString();
                            }
                            createDiscountMutation.mutate(data);
                          }}
                          disabled={createDiscountMutation.isPending || !newDiscountCode.code}
                          data-testid="button-submit-discount"
                        >
                          {createDiscountMutation.isPending ? "Creating..." : "Create Code"}
                        </Button>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {discountCodes.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Tag className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      No discount codes yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Create your first discount code to offer promotions to business advertisers.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {discountCodes.map((discount) => (
                    <Card key={discount.id} className={!discount.isActive ? "opacity-60" : ""}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <CardTitle className="flex items-center gap-2 text-base font-mono">
                              <Tag className="w-5 h-5 text-blue-500" />
                              {discount.code}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {discount.description || "No description"}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={discount.isActive ? "default" : "secondary"}>
                              {discount.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline">
                              {discount.discountType === "percentage" && `${discount.discountValue}% off`}
                              {discount.discountType === "fixed" && `$${discount.discountValue} off`}
                              {discount.discountType === "free_month" && `${discount.durationDays} free days`}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {discount.currentRedemptions}
                              {discount.maxRedemptions ? ` / ${discount.maxRedemptions}` : ""} used
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Percent className="w-4 h-4 text-muted-foreground" />
                            <span>{discount.perBusinessLimit} per business</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {discount.validUntil 
                                ? `Expires ${new Date(discount.validUntil).toLocaleDateString()}`
                                : "Never expires"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>Created {new Date(discount.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {discount.isActive && (
                          <div className="mt-4 pt-4 border-t">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deactivateDiscountMutation.mutate(discount.id)}
                              disabled={deactivateDiscountMutation.isPending}
                              data-testid={`button-deactivate-discount-${discount.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Deactivate
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}```

#### client/src/pages/business-dashboard.tsx
```typescript
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Eye, MousePointer, TrendingUp, DollarSign, Calendar, Settings, PauseCircle, PlayCircle, CreditCard, Receipt } from "lucide-react";
import type { AdCampaign, BillingPlan, Payment, CampaignAnalytics, BillingCycle } from "@shared/schema";

// Helper interface for analytics display (maps from CampaignAnalytics schema)
interface DisplayAnalytics {
  campaignId: string;
  views: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpm: number;
}

export default function BusinessDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch user's ad campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<AdCampaign[]>({
    queryKey: ['/api/ads/my-campaigns'],
    enabled: isAuthenticated && user?.accountType === 'business',
  });

  // Fetch campaign analytics (raw from backend)
  const { data: rawAnalytics = [], isLoading: analyticsLoading } = useQuery<CampaignAnalytics[]>({
    queryKey: ['/api/ads/analytics'],
    enabled: isAuthenticated && user?.accountType === 'business',
  });

  // Fetch billing plans
  const { data: billingPlans = [], isLoading: plansLoading } = useQuery<BillingPlan[]>({
    queryKey: ['/api/billing/plans'],
    enabled: isAuthenticated && user?.accountType === 'business',
  });

  // Fetch payment history
  const { data: paymentHistory = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ['/api/billing/history'],
    enabled: isAuthenticated && user?.accountType === 'business',
  });

  // Fetch billing cycles for current plan logic
  const { data: billingCycles = [], isLoading: cyclesLoading } = useQuery<BillingCycle[]>({
    queryKey: ['/api/billing/cycles'],
    enabled: isAuthenticated && user?.accountType === 'business',
  });

  // Transform raw analytics to display format
  const analytics: DisplayAnalytics[] = rawAnalytics.map((item: CampaignAnalytics) => ({
    campaignId: item.campaignId,
    views: item.totalViews ?? 0,
    clicks: item.totalClicks ?? 0,
    spend: parseFloat(item.totalSpent ?? '0'),
    ctr: parseFloat(item.ctr ?? '0'),
    cpm: (item.totalViews ?? 0) > 0 ? (parseFloat(item.totalSpent ?? '0') / (item.totalViews ?? 1)) * 1000 : 0,
  }));

  // Get current active plan from billing cycles
  const currentActiveCycle = billingCycles.find(cycle => cycle.status === 'active');
  const currentPlan = currentActiveCycle ? 
    billingPlans.find(plan => plan.id === currentActiveCycle.planId) : 
    null;

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
        <p className="text-gray-600 mb-6">Please log in to access your business dashboard.</p>
        <Link href="/auth">
          <Button>Log In</Button>
        </Link>
      </div>
    );
  }

  if (user?.accountType !== 'business') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <h1 className="text-2xl font-bold mb-4">Business Account Required</h1>
        <p className="text-gray-600 mb-6">This dashboard is only available for business accounts.</p>
        <Link href="/business-upgrade">
          <Button>Upgrade to Business Account</Button>
        </Link>
      </div>
    );
  }

  // Calculate totals from analytics
  const totalViews = analytics.reduce((sum: number, item: DisplayAnalytics) => sum + item.views, 0);
  const totalClicks = analytics.reduce((sum: number, item: DisplayAnalytics) => sum + item.clicks, 0);
  const totalSpend = analytics.reduce((sum: number, item: DisplayAnalytics) => sum + item.spend, 0);
  const averageCTR = analytics.length > 0 ? analytics.reduce((sum: number, item: DisplayAnalytics) => sum + item.ctr, 0) / analytics.length : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCampaignAnalytics = (campaignId: string) => {
    return analytics.find((item: DisplayAnalytics) => item.campaignId === campaignId);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Feed
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Business Dashboard</h1>
            <p className="text-gray-600">
              Welcome back, {user.businessName || user.firstName}
            </p>
          </div>
        </div>
        <Link href="/create-ad">
          <Button data-testid="button-create-new-ad">
            <Plus className="w-4 h-4 mr-2" />
            Create New Ad
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  Total Views
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
                <p className="text-xs text-gray-600">All campaigns</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MousePointer className="w-4 h-4 text-green-600" />
                  Total Clicks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
                <p className="text-xs text-gray-600">All campaigns</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  Click Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageCTR.toFixed(2)}%</div>
                <p className="text-xs text-gray-600">Average CTR</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-orange-600" />
                  Total Spend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalSpend.toFixed(2)}</div>
                <p className="text-xs text-gray-600">All campaigns</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Campaigns</CardTitle>
              <CardDescription>Your latest advertising campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading campaigns...</p>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No campaigns yet</p>
                  <Link href="/create-ad">
                    <Button>Create Your First Ad</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.slice(0, 3).map((campaign: AdCampaign) => {
                    const campaignAnalytics = getCampaignAnalytics(campaign.id);
                    return (
                      <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{campaign.title}</h3>
                            <Badge className={getStatusColor(campaign.status ?? 'pending')}>
                              {campaign.status ?? 'pending'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{campaign.content}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Budget: ${campaign.dailyBudget}/day</span>
                            <span>Target: {campaign.suburb}</span>
                            {campaignAnalytics && (
                              <>
                                <span>Views: {campaignAnalytics.views}</span>
                                <span>Clicks: {campaignAnalytics.clicks}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Settings className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Campaigns</CardTitle>
              <CardDescription>Manage your advertising campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading campaigns...</p>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No campaigns yet</p>
                  <Link href="/create-ad">
                    <Button>Create Your First Ad</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign: AdCampaign) => {
                    const campaignAnalytics = getCampaignAnalytics(campaign.id);
                    return (
                      <div key={campaign.id} className="border rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{campaign.title}</h3>
                              <Badge className={getStatusColor(campaign.status ?? 'pending')}>
                                {campaign.status ?? 'pending'}
                              </Badge>
                            </div>
                            <p className="text-gray-600 mb-3">{campaign.content}</p>
                            
                            {/* Show rejection reason for rejected ads */}
                            {campaign.status === 'rejected' && campaign.rejectionReason && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                                <div className="flex items-start gap-2">
                                  <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                  <div>
                                    <h4 className="text-sm font-medium text-red-800 mb-1">Ad Rejected</h4>
                                    <p className="text-sm text-red-700">{campaign.rejectionReason}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Daily Budget:</span>
                                <div className="font-semibold">${campaign.dailyBudget}</div>
                              </div>
                              <div>
                                <span className="text-gray-500">Target Area:</span>
                                <div className="font-semibold">{campaign.suburb}</div>
                              </div>
                              {campaignAnalytics && (
                                <>
                                  <div>
                                    <span className="text-gray-500">Views:</span>
                                    <div className="font-semibold">{campaignAnalytics.views}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Clicks:</span>
                                    <div className="font-semibold">{campaignAnalytics.clicks}</div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            {campaign.status === 'active' ? (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                data-testid={`button-pause-${campaign.id}`}
                                onClick={() => {
                                  // TODO: Add pause campaign functionality
                                  alert('Pause campaign functionality coming soon!');
                                }}
                              >
                                <PauseCircle className="w-4 h-4 mr-1" />
                                Pause
                              </Button>
                            ) : campaign.status === 'paused' ? (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                data-testid={`button-resume-${campaign.id}`}
                                onClick={() => {
                                  // TODO: Add resume campaign functionality
                                  alert('Resume campaign functionality coming soon!');
                                }}
                              >
                                <PlayCircle className="w-4 h-4 mr-1" />
                                Resume
                              </Button>
                            ) : campaign.status === 'rejected' ? (
                              <Button 
                                variant="default" 
                                size="sm" 
                                data-testid={`button-resubmit-${campaign.id}`}
                                onClick={() => window.location.href = `/edit-ad/${campaign.id}`}
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit & Resubmit
                              </Button>
                            ) : null}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              data-testid={`button-edit-${campaign.id}`}
                              onClick={() => {
                                console.log('Edit button clicked for campaign:', campaign.id);
                                setLocation(`/edit-ad/${campaign.id}`);
                              }}
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Analytics</CardTitle>
              <CardDescription>Detailed performance metrics for your campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Detailed analytics coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          {/* Billing Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Current Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {plansLoading ? (
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ) : (
                  billingPlans.filter(plan => plan.isActive)[0] ? (
                    <div>
                      <div className="text-lg font-bold">{billingPlans.filter(plan => plan.isActive)[0].name}</div>
                      <p className="text-sm text-gray-600">${billingPlans.filter(plan => plan.isActive)[0].pricePerDay}/day</p>
                      <p className="text-xs text-gray-500 mt-1">{billingPlans.filter(plan => plan.isActive)[0].minimumDays || 7} day minimum</p>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No active plan</div>
                  )
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  Total Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <div>
                    <div className="text-lg font-bold">
                      ${paymentHistory.filter(p => p.status === 'completed').reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}
                    </div>
                    <p className="text-sm text-gray-600">
                      {paymentHistory.filter(p => p.status === 'completed').length} completed payments
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  Days Purchased
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <div>
                    <div className="text-lg font-bold">
                      {paymentHistory.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.daysCharged ?? 0), 0)}
                    </div>
                    <p className="text-sm text-gray-600">Total advertising days</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment History
              </CardTitle>
              <CardDescription>View your billing and payment records</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-24"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded animate-pulse w-16"></div>
                    </div>
                  ))}
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No payments yet</h3>
                  <p className="text-gray-500">Your payment history will appear here once you make your first purchase.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`payment-${payment.id}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">${payment.amount} {payment.currency}</span>
                              <Badge variant={payment.status === 'completed' ? 'default' : 
                                payment.status === 'pending' ? 'secondary' : 
                                payment.status === 'failed' ? 'destructive' : 'outline'}
                                data-testid={`status-${payment.status}`}
                              >
                                {payment.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {payment.daysCharged ?? 0} days • {payment.periodStart ? new Date(payment.periodStart).toLocaleDateString() : 'N/A'} - {payment.periodEnd ? new Date(payment.periodEnd).toLocaleDateString() : 'N/A'}
                            </div>
                            <div className="text-xs text-gray-400">
                              Payment: {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A'} via {payment.paymentMethod}
                            </div>
                          </div>
                          <div className="text-right">
                            {payment.paidAt && (
                              <div className="text-sm text-green-600">
                                Paid {new Date(payment.paidAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing Plans */}
          <Card>
            <CardHeader>
              <CardTitle>Available Plans</CardTitle>
              <CardDescription>Choose the advertising plan that works for your business</CardDescription>
            </CardHeader>
            <CardContent>
              {plansLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse mb-4"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : billingPlans.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No plans available</h3>
                  <p className="text-gray-500">Billing plans will be available soon.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {billingPlans.map((plan) => {
                    const isCurrentPlan = currentPlan?.id === plan.id;
                    const planFeatures = Array.isArray(plan.features) ? plan.features : [];
                    return (
                      <div key={plan.id} className={`border rounded-lg p-4 ${isCurrentPlan ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`} data-testid={`plan-${plan.id}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold">{plan.name}</h3>
                          {isCurrentPlan && <Badge>Current Plan</Badge>}
                        </div>
                        <p className="text-gray-600 mb-3">{plan.description}</p>
                        <div className="text-2xl font-bold text-blue-600 mb-2">
                          ${plan.pricePerDay}<span className="text-sm font-normal text-gray-500">/day</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">{plan.minimumDays || 7} day minimum purchase</p>
                        
                        {planFeatures && planFeatures.length > 0 && (
                          <div className="space-y-1 mb-4">
                            {planFeatures.map((feature, index) => (
                              <div key={index} className="flex items-center text-sm text-gray-600">
                                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                {feature}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          Payments processed securely via Stripe
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Settings</CardTitle>
              <CardDescription>Manage your business account settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Business Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Business Name:</span>
                    <div className="font-semibold">{user.businessName || 'Not set'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Category:</span>
                    <div className="font-semibold">{user.businessCategory || 'Not set'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Website:</span>
                    <div className="font-semibold">{user.businessWebsite || 'Not set'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <div className="font-semibold">{user.businessPhone || 'Not set'}</div>
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                data-testid="button-edit-business-info"
                onClick={() => {
                  setLocation('/profile');
                }}
              >
                Edit Business Information
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}```

### Key Components
#### client/src/components/map/traffic-map.tsx
```typescript
// Traffic Map Component
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTrafficData } from "@/hooks/use-traffic-data";
import { useClusteredMarkers, type MarkerData } from "@/hooks/use-clustered-markers";

// Safe property accessor for unified and legacy data structures
const getProperty = (properties: any, key: string, fallback: any = '') => {
  // Try unified structure first (top-level properties)
  if (properties && properties[key] !== undefined) {
    return properties[key];
  }
  // Try original properties for source-specific data
  if (properties && properties.originalProperties && properties.originalProperties[key] !== undefined) {
    return properties.originalProperties[key];
  }
  // Return fallback
  return fallback;
};

// Safe string accessor with toLowerCase
const getSafeString = (properties: any, key: string, fallback: string = '') => {
  const value = getProperty(properties, key, fallback);
  return typeof value === 'string' ? value.toLowerCase() : fallback;
};

// Import QFES detection function from the hook
const isQFESIncident = (incident: any) => {
  const props = incident.properties || {};
  const incidentType = getSafeString(props, 'incidentType');
  const groupedType = getSafeString(props, 'GroupedType');
  const description = getSafeString(props, 'description');
  
  return incidentType.includes('fire') || 
         groupedType.includes('fire') ||
         description.includes('fire') ||
         description.includes('qfes') ||
         description.includes('ambulance') ||
         description.includes('rescue');
};
import type { FilterState } from "@/types/filters";
import { findRegionBySuburb } from "@/lib/regions";
import { extractCoordinatesFromGeometry } from "@/lib/location-utils";
import { calculateIncidentAging, getAgedColor, type IncidentAgingData } from "@/lib/incident-aging";

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface TrafficMapProps {
  filters: FilterState;
  onEventSelect: (incident: any) => void;
  isActive?: boolean;
}

export function TrafficMap({ filters, onEventSelect, isActive = true }: TrafficMapProps) {
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const clusterLayerRef = useRef<L.LayerGroup | null>(null);
  const viewportDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(8);
  
  // Seed initial viewport bounds from localStorage or Brisbane metro for faster first load
  const [viewportBounds, setViewportBounds] = useState<{ southwest: [number, number], northeast: [number, number] } | undefined>(() => {
    // Try to restore saved viewport from localStorage
    const savedMapState = localStorage.getItem('qldSafetyMap_position');
    if (savedMapState) {
      try {
        const { lat, lng, zoom } = JSON.parse(savedMapState);
        // Calculate approximate bounds from saved center and zoom
        // At zoom 8, roughly 2 degrees latitude/longitude visible
        const latRange = 2.0 / Math.pow(2, Math.max(0, zoom - 8));
        const lngRange = 2.5 / Math.pow(2, Math.max(0, zoom - 8));
        return {
          southwest: [lat - latRange, lng - lngRange],
          northeast: [lat + latRange, lng + lngRange]
        };
      } catch (e) {
        // Fall through to default
      }
    }
    // Default to Brisbane metro area (much smaller than full Queensland)
    return {
      southwest: [-27.8, 152.7],  // SW of Brisbane metro
      northeast: [-27.1, 153.4]   // NE of Brisbane metro  
    };
  });

  // 🎯 OPTIMIZED: Fetch only when map is active and has viewport bounds
  // When isActive is false, skip expensive data processing
  const effectiveBounds = isActive ? viewportBounds : undefined;
  const { filteredEvents, filteredIncidents } = useTrafficData(filters, effectiveBounds);
  
  // Convert to expected format for backward compatibility  
  const eventsData = { features: filteredEvents || [] };
  const incidentsData = { features: filteredIncidents || [] };
  
  const eventsLoading = false;
  const incidentsLoading = false;

  // Helper functions for marker data transformation (moved outside useEffect for reuse)
  const getTimestamp = useCallback((feature: any) => {
    const candidates = [
      feature?.properties?.tmrStartTime,
      feature?.incidentTime,
      feature?.lastUpdated,
      feature?.publishedAt,
      feature?.properties?.incidentTime,
      feature?.properties?.updatedAt,
      feature?.properties?.lastUpdated,
      feature?.properties?.LastUpdate,
      feature?.properties?.publishedAt,
      feature?.properties?.firstSeenAt,
      feature?.properties?.datetime,
      feature?.properties?.occurredAt,
      feature?.properties?.Response_Date,
      feature?.properties?.duration?.start,
      feature?.properties?.published,
      feature?.properties?.last_updated,
      feature?.properties?.updated_at,
      feature?.properties?.createdAt,
      feature?.properties?.created_at,
    ];
    
    for (const candidate of candidates) {
      if (candidate) {
        const timestamp = new Date(candidate).getTime();
        if (!isNaN(timestamp)) return timestamp;
      }
    }
    return new Date('1970-01-01T00:00:00Z').getTime();
  }, []);

  // Transform events and incidents into MarkerData format for clustering
  const allMarkerData = useMemo((): MarkerData[] => {
    const markers: MarkerData[] = [];
    
    // Process events
    if (eventsData?.features) {
      for (const feature of eventsData.features) {
        if (!feature.geometry) continue;
        
        let coords: [number, number] | null = null;
        if (feature.geometry.type === 'Point' && feature.geometry.coordinates) {
          coords = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
        } else if (feature.geometry.type === 'MultiPoint' && feature.geometry.coordinates?.[0]) {
          const point = feature.geometry.coordinates[0];
          coords = [point[1], point[0]];
        } else if (feature.geometry.type === 'GeometryCollection' && feature.geometry.geometries?.[0]) {
          const pointGeometry = feature.geometry.geometries.find((g: any) => g.type === 'Point');
          if (pointGeometry?.coordinates) {
            coords = [pointGeometry.coordinates[1], pointGeometry.coordinates[0]];
          }
        } else if (feature.geometry.geometries?.[0]?.coordinates) {
          const geometry = feature.geometry.geometries[0];
          if (geometry.type === 'Point') {
            coords = [geometry.coordinates[1], geometry.coordinates[0]];
          } else if (geometry.type === 'MultiLineString' || geometry.type === 'LineString') {
            const firstLine = geometry.type === 'MultiLineString' ? geometry.coordinates[0] : geometry.coordinates;
            if (firstLine && firstLine[0]) {
              coords = [firstLine[0][1], firstLine[0][0]];
            }
          }
        }
        
        if (coords) {
          const postId = feature.id || feature.properties?.id || feature.properties?.guid || feature.properties?.eventId || JSON.stringify(coords);
          
          // Calculate aging for this event
          const agingData = calculateIncidentAging({
            category: 'traffic',
            source: 'tmr',
            lastUpdated: feature.properties?.tmrStartTime || feature.properties?.lastUpdated || new Date().toISOString(),
            incidentTime: feature.properties?.tmrStartTime,
            properties: feature.properties,
          });
          
          // Skip expired events
          if (!agingData.isVisible) continue;
          
          markers.push({
            id: `event-${postId}`,
            lat: coords[0],
            lng: coords[1],
            markerType: 'traffic',
            color: '#f97316', // Orange for traffic
            feature: feature,
            timestamp: getTimestamp(feature),
            agePercentage: agingData.agePercentage,
          });
        }
      }
    }
    
    // Process incidents
    if (incidentsData?.features) {
      for (const feature of incidentsData.features) {
        const source = feature.source || feature.properties?.source;
        if (source === 'tmr') continue; // Skip TMR - handled in events
        
        if (!feature.geometry?.coordinates) continue;
        
        let coords: [number, number] | null = null;
        if (feature.geometry.type === 'Point') {
          coords = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
        } else if (feature.geometry.type === 'MultiPoint' && feature.geometry.coordinates?.[0]) {
          const point = feature.geometry.coordinates[0];
          coords = [point[1], point[0]];
        }
        
        if (coords) {
          // Determine marker type and color based on incident type
          let markerType = 'emergency';
          let color = '#4f46e5'; // Blue default
          
          const props = feature.properties || {};
          const categoryId = props.categoryId || props.categoryUuid;
          const incidentType = (props.incidentType || '').toLowerCase();
          const groupedType = (props.GroupedType || '').toLowerCase();
          
          // QFES detection
          if (incidentType.includes('fire') || groupedType.includes('fire') || 
              (props.description || '').toLowerCase().includes('fire')) {
            markerType = 'fire';
            color = '#dc2626'; // Red
          } else if (categoryId === 'fdff3a2e-a031-4909-936b-875affbc69ba') {
            markerType = 'crime';
            color = '#9333ea'; // Purple
          } else if (categoryId === '3cbcb810-508f-4619-96c2-0357ca517cca') {
            markerType = 'pets';
            color = '#e11d48'; // Pink
          } else if (categoryId === '6cfdf282-1f8d-44c8-9661-24b73a88a834') {
            markerType = 'wildlife';
            color = '#16a34a'; // Green
          } else if (categoryId === '1f57674d-0cbd-47be-950f-3c94c4f14e41') {
            markerType = 'community';
            color = '#0d9488'; // Teal
          } else if (categoryId === '10e3cad6-d03a-4101-99b0-91199b5f9928') {
            markerType = 'lostfound';
            color = '#d97706'; // Amber
          }
          
          const postId = feature.id || feature.properties?.id || feature.properties?.incidentId || feature.properties?.guid || JSON.stringify(coords);
          
          // Calculate aging for this incident (reuse existing props variable)
          const agingData = calculateIncidentAging({
            category: markerType,
            source: props.source || 'community',
            severity: props.severity,
            status: props.status,
            lastUpdated: props.lastUpdated || props.updatedAt || props.createdAt || new Date().toISOString(),
            incidentTime: props.incidentTime || props.publishedAt,
            properties: props,
          });
          
          // Skip expired incidents
          if (!agingData.isVisible) continue;
          
          markers.push({
            id: `incident-${postId}`,
            lat: coords[0],
            lng: coords[1],
            markerType,
            color,
            feature,
            timestamp: getTimestamp(feature),
            agePercentage: agingData.agePercentage,
          });
        }
      }
    }
    
    return markers;
  }, [eventsData, incidentsData, getTimestamp]);

  // Use Supercluster for high-performance marker clustering
  const { getClusters, getClusterExpansionZoom } = useClusteredMarkers(allMarkerData, {
    radius: 60,
    maxZoom: 17,  // Align with map maxZoom (18) - 1 for better cluster expansion
    minZoom: 6,   // Lowered from 11 - clustering handles large marker counts efficiently
  });

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Try to restore saved map position and zoom from localStorage
    const savedMapState = localStorage.getItem('qldSafetyMap_position');
    let centerCoords: [number, number] = [-27.4698, 153.0251]; // Brisbane default
    let zoomLevel = 8; // State-wide view - clustering handles large marker counts
    
    if (savedMapState) {
      try {
        const { lat, lng, zoom } = JSON.parse(savedMapState);
        centerCoords = [lat, lng];
        zoomLevel = zoom;
      } catch (e) {
        console.log('Failed to parse saved map state, using defaults');
      }
    } else if (filters.homeCoordinates) {
      // Only use home coordinates if no saved state exists
      centerCoords = [filters.homeCoordinates.lat, filters.homeCoordinates.lon];
      zoomLevel = 14; // Suburb-level view for home location
    }

    // Queensland geographical bounds to restrict panning
    const queenslandBounds = L.latLngBounds(
      [-29.5, 137.0], // Southwest corner
      [-9.0, 154.0]   // Northeast corner
    );

    const map = L.map(mapRef.current, {
      minZoom: 6, // Lowered from 11 - clustering handles large marker counts efficiently
      maxZoom: 18, // Increased from 16 for more street-level detail
      maxBounds: queenslandBounds, // Restrict panning to Queensland
      maxBoundsViscosity: 1.0, // Firm boundary - no bouncing past limits
      // Improved touch handling
      tapTolerance: 15,
      touchZoom: true,
      doubleClickZoom: true,
      scrollWheelZoom: true,
      dragging: true,
      zoomControl: true,
      // Better mobile interaction
      boxZoom: false,
      keyboard: false
    }).setView(centerCoords, zoomLevel);
    
    // Apply tap: false after initialization to prevent ghost clicks on iOS
    (map as any).tap = false;
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors, © CARTO',
      minZoom: 6, // Match map's minimum zoom
      maxZoom: 18 // Match map's maximum zoom
    }).addTo(map);

    mapInstanceRef.current = map;

    // Save map position and update viewport bounds when user moves or zooms
    // DEBOUNCED to prevent rapid refetches during pan/zoom animations
    const updateViewport = () => {
      if (mapInstanceRef.current) {
        const center = mapInstanceRef.current.getCenter();
        const zoom = mapInstanceRef.current.getZoom();
        const mapState = {
          lat: center.lat,
          lng: center.lng,
          zoom: zoom
        };
        localStorage.setItem('qldSafetyMap_position', JSON.stringify(mapState));
        
        // Clear any pending debounce
        if (viewportDebounceRef.current) {
          clearTimeout(viewportDebounceRef.current);
        }
        
        // Debounce viewport bounds update to prevent flicker during pan/zoom
        viewportDebounceRef.current = setTimeout(() => {
          if (mapInstanceRef.current) {
            const bounds = mapInstanceRef.current.getBounds();
            setViewportBounds({
              southwest: [bounds.getSouth(), bounds.getWest()],
              northeast: [bounds.getNorth(), bounds.getEast()]
            });
          }
        }, 200);
      }
    };

    // Add event listeners
    map.on('moveend', updateViewport);
    map.on('zoomend', updateViewport);
    
    // Track zoom level changes for clustering
    map.on('zoomend', () => {
      if (mapInstanceRef.current) {
        setCurrentZoom(mapInstanceRef.current.getZoom());
      }
    });
    
    // Create a layer group for clustered markers (enables bulk operations)
    clusterLayerRef.current = L.layerGroup().addTo(map);
    
    // Set initial viewport bounds immediately (no debounce for first load)
    if (mapInstanceRef.current) {
      const bounds = mapInstanceRef.current.getBounds();
      setViewportBounds({
        southwest: [bounds.getSouth(), bounds.getWest()],
        northeast: [bounds.getNorth(), bounds.getEast()]
      });
      setCurrentZoom(mapInstanceRef.current.getZoom());
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [filters.homeCoordinates]);

  // Update loading state - only wait for incidents, not slow traffic events
  useEffect(() => {
    setIsLoading(incidentsLoading);
  }, [incidentsLoading]);

  // FIX: Recalculate map dimensions when becoming visible
  // Leaflet needs invalidateSize() when container was hidden during initialization
  useEffect(() => {
    if (isActive && mapInstanceRef.current) {
      // Small delay to ensure CSS transitions complete
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
        // Also update viewport bounds after resize
        if (mapInstanceRef.current) {
          const bounds = mapInstanceRef.current.getBounds();
          setViewportBounds({
            southwest: [bounds.getSouth(), bounds.getWest()],
            northeast: [bounds.getNorth(), bounds.getEast()]
          });
          setCurrentZoom(mapInstanceRef.current.getZoom());
        }
      }, 100);
    }
  }, [isActive]);

  // OPTIMIZED: Update markers using Supercluster for high-performance clustering
  // Uses bulk layer operations for 10-50x faster rendering with 3000+ markers
  useEffect(() => {
    if (!mapInstanceRef.current || !clusterLayerRef.current || !viewportBounds) return;

    // BULK CLEAR: Remove all markers at once (faster than individual removal)
    clusterLayerRef.current.clearLayers();
    markersRef.current.clear();

    // Get clusters for current viewport and zoom level
    const bounds = {
      west: viewportBounds.southwest[1],
      south: viewportBounds.southwest[0],
      east: viewportBounds.northeast[1],
      north: viewportBounds.northeast[0],
    };
    
    const clusters = getClusters(bounds, currentZoom);
    
    // Create markers array for bulk addition
    const newMarkers: L.Marker[] = [];
    
    for (const clusterOrPoint of clusters) {
      const [lng, lat] = clusterOrPoint.geometry.coordinates;
      const coords: [number, number] = [lat, lng];
      
      if (clusterOrPoint.properties.cluster) {
        // Render cluster marker with count
        const cluster = clusterOrPoint as any;
        const count = cluster.properties.point_count;
        const dominantColor = cluster.properties.dominantColor || '#6b7280';
        
        // Create cluster icon with count
        const clusterIcon = createClusterIcon(count, dominantColor);
        const marker = L.marker(coords, { 
          icon: clusterIcon,
          zIndexOffset: 1000 // Clusters on top
        });
        
        // Click cluster to zoom in
        marker.on('click', () => {
          const expansionZoom = getClusterExpansionZoom(cluster.properties.cluster_id);
          mapInstanceRef.current?.setView(coords, Math.min(expansionZoom, 18));
        });
        
        newMarkers.push(marker);
        markersRef.current.set(`cluster-${cluster.properties.cluster_id}`, marker);
      } else {
        // Render individual marker with aging effect
        const point = clusterOrPoint as any;
        const feature = point.properties.feature;
        const markerType = point.properties.markerType;
        const baseColor = point.properties.color;
        const agePercentage = point.properties.agePercentage || 0;
        
        // Apply aged color - fresh markers are vibrant, older ones fade to grey
        const agedColor = getAgedColor(baseColor, agePercentage);
        
        // Calculate opacity based on age (1.0 at fresh, 0.5 at expired)
        const opacity = 1.0 - (agePercentage * 0.5);
        
        const marker = L.marker(coords, {
          icon: createCustomMarker(markerType, agedColor, opacity),
          zIndexOffset: Math.floor(point.properties.timestamp / 1000)
        });
        
        marker.on('click', () => {
          onEventSelect(feature);
        });
        
        newMarkers.push(marker);
        markersRef.current.set(point.properties.id, marker);
      }
    }
    
    // BULK ADD: Add all markers at once (10x faster than individual adds)
    for (const marker of newMarkers) {
      clusterLayerRef.current.addLayer(marker);
    }
  }, [getClusters, getClusterExpansionZoom, currentZoom, viewportBounds, onEventSelect]);

  // Create cluster icon with marker count
  const createClusterIcon = (count: number, color: string) => {
    // Size based on count
    const size = count < 10 ? 32 : count < 100 ? 40 : 48;
    const fontSize = count < 10 ? 12 : count < 100 ? 14 : 16;
    
    return L.divIcon({
      className: 'cluster-marker',
      html: `<div style="
        background: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${fontSize}px;
        cursor: pointer;
      ">${count}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  };


  // Incident categorization function
  // UUIDs match actual database category IDs
  const categorizeIncident = (incident: any) => {
    const props = incident.properties || {};
    
    const datasource = getProperty(props, 'datasource')?.source_name || getProperty(props, 'source') || getProperty(props, 'datasource', 'unknown');
    const providedBy = getProperty(props, 'datasource')?.provided_by || '';
    
    // Handle traffic events from QLD Traffic API
    const trafficEventType = getProperty(props, 'event_type') || getProperty(props, 'eventType') || getProperty(props, 'type');
    if (trafficEventType) {
      const eventTypeLower = getSafeString(props, 'event_type') || getSafeString(props, 'eventType') || getSafeString(props, 'type');
      // All traffic events go to Infrastructure & Hazards
      if (eventTypeLower === 'crash' || eventTypeLower === 'hazard' || 
          eventTypeLower === 'roadworks' || eventTypeLower === 'special_event' ||
          eventTypeLower === 'special event') {
        return 'ec2f7fc1-ffe3-4efb-bd42-ab1a2645325e'; // Infrastructure & Hazards
      }
    }
    
    // For user-reported incidents, use their categoryId
    if (getProperty(props, 'userReported') && getProperty(props, 'categoryId')) {
      return getProperty(props, 'categoryId');
    }
    
    // Handle ESQ (Emergency Services Queensland) incidents
    if (datasource === 'ESQ' || providedBy?.includes('Emergency') || getProperty(props, 'source') === 'ESQ' || getProperty(props, 'source') === 'emergency') {
      return '0a250604-2cd7-4a7c-8d98-5567c403e514'; // Emergency Situations
    }
    
    // Handle TMR (Transport and Main Roads) incidents  
    if (datasource === 'TMR' || datasource === 'EPS' || providedBy?.includes('Transport') || providedBy?.includes('Main Roads') || getProperty(props, 'source') === 'TMR') {
      return 'ec2f7fc1-ffe3-4efb-bd42-ab1a2645325e'; // Infrastructure & Hazards
    }
    
    // Handle QPS (Queensland Police Service) incidents
    if (datasource === 'QPS' || providedBy?.includes('Police') || getProperty(props, 'source') === 'QPS') {
      return '5e39584c-de45-45d6-ae4b-a0fb048a70f1'; // Safety & Crime
    }
    
    // For QFES incidents, categorize based on GroupedType and other properties
    const groupedType = getSafeString(props, 'GroupedType');
    const eventType = getSafeString(props, 'Event_Type');
    const description = getSafeString(props, 'description');
    const title = getSafeString(incident, 'title');
    
    // Safety & Crime - Police incidents, suspicious activity, break-ins
    if (groupedType.includes('police') || 
        eventType.includes('police') ||
        description.includes('suspicious') ||
        description.includes('break') ||
        description.includes('theft') ||
        description.includes('crime') ||
        title.includes('police')) {
      return '5e39584c-de45-45d6-ae4b-a0fb048a70f1'; // Safety & Crime
    }
    
    // Emergency Situations - Fire, Medical, Ambulance, Rescue
    if (groupedType.includes('fire') || 
        groupedType.includes('medical') ||
        groupedType.includes('ambulance') ||
        groupedType.includes('rescue') ||
        eventType.includes('fire') ||
        eventType.includes('medical') ||
        eventType.includes('rescue') ||
        description.includes('fire') ||
        description.includes('medical') ||
        description.includes('emergency') ||
        description.includes('rescue') ||
        title.includes('fire') ||
        title.includes('medical') ||
        title.includes('rescue')) {
      return '0a250604-2cd7-4a7c-8d98-5567c403e514'; // Emergency Situations
    }
    
    // Infrastructure & Hazards - Road hazards, infrastructure issues, traffic
    if (description.includes('hazard') ||
        description.includes('infrastructure') ||
        description.includes('road') ||
        description.includes('traffic') ||
        title.includes('hazard') ||
        title.includes('infrastructure') ||
        title.includes('road')) {
      return 'ec2f7fc1-ffe3-4efb-bd42-ab1a2645325e'; // Infrastructure & Hazards
    }
    
    // Wildlife & Nature - Animal related incidents
    if (description.includes('snake') ||
        description.includes('python') ||
        description.includes('animal') ||
        description.includes('wildlife') ||
        title.includes('animal') ||
        title.includes('wildlife')) {
      return '84218599-712d-49c3-8458-7a9153519e5d'; // Wildlife & Nature
    }
    
    // Default to Community Issues for uncategorized incidents
    return '0c3251ec-e3aa-4bef-8c17-960d73f8cbdc'; // Community Issues
  };

  const getMarkerColor = (markerType: string, properties?: any) => {
    // Only grey out explicitly completed/closed incidents
    // Time-based aging is now handled by the new aging system via opacity
    if (properties) {
      const status = getSafeString(properties, 'status') || getSafeString(properties, 'CurrentStatus');
      
      // Check for explicitly completed statuses (user-reported incidents)
      if (status === 'completed' || status === 'closed' || status === 'resolved' || status === 'cleared' || status === 'patrolled') {
        return '#9ca3af'; // Grey for completed incidents
      }
    }
    
    // Active incident colors
    switch(markerType.toLowerCase()) {
      // Traffic events - all get orange (TMR)
      case 'crash':
      case 'hazard': 
      case 'restriction':
      case 'incident':
      case 'traffic':
      case 'roadworks':
      case 'special event':
      case 'congestion':
        return '#f97316'; // Orange - matches TMR filter icon
      // Crime and safety - purple
      case 'crime':
      case 'suspicious':
        return '#9333ea'; // Purple - matches safety filter icon
      // Pets - pink/rose
      case 'pets':
        return '#e11d48'; // Pink/Rose - matches modal heart icon color
      // Emergency - blue for ESQ
      case 'emergency':
        return '#4f46e5'; // Blue - matches emergency filter icon
      // QFES Emergency Categories - category-specific colors
      case 'fire':
        return '#dc2626'; // Red - fire incidents
      case 'rescue':
      case 'ambulance':
        return '#f97316'; // Orange - rescue operations
      case 'medical':
        return '#16a34a'; // Green - medical emergencies
      case 'hazmat':
        return '#eab308'; // Yellow - hazmat/chemical
      case 'power':
      case 'gas':
        return '#a855f7'; // Purple - power/gas emergencies
      case 'storm':
      case 'ses':
        return '#3b82f6'; // Blue - storm/SES
      case 'siren':
        return '#dc2626'; // Red - generic emergency response
      // QFES fallback - red for fire services
      case 'qfes':
        return '#dc2626'; // Red - matches QFES fire services
      // Wildlife - green
      case 'wildlife':
        return '#16a34a'; // Green - matches wildlife filter icon
      // Community issues - teal
      case 'community':
        return '#0d9488'; // Teal - distinct from completion grey
      // Lost & Found - amber/gold
      case 'lostfound':
        return '#d97706'; // Amber - matches database color for search/find
      // Default
      default:
        return '#6b7280'; // Gray
    }
  };

  const createCustomMarker = (markerType: string, color: string, opacity: number = 1.0) => {
    const getIconSvg = (type: string) => {
      switch(type.toLowerCase()) {
        // Traffic events - all get car/traffic icon
        case 'congestion':
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>`;
        case 'crash':
        case 'restriction':
        case 'incident':
        case 'roadworks':
        case 'special_event':
        case 'special event':
        case 'traffic':
        case 'multi-vehicle':
        case 'road damage':
        case 'recurring':
          // Car icon for TMR traffic events only
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="${color}"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`;
        case 'hazard':
          // Warning triangle for user-reported infrastructure/hazard issues
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;
        // Community reports get specific icons
        case 'crime':
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>`;
        case 'suspicious':
          // Eye icon for suspicious activity (watching/surveillance)
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
        case 'pets':
          // Paw print icon for pets (natural animal association)
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="${color}" stroke="none">
            <ellipse cx="12" cy="16" rx="3.5" ry="4"/>
            <ellipse cx="7" cy="11" rx="2" ry="2.5"/>
            <ellipse cx="10.5" cy="8" rx="2" ry="2.5"/>
            <ellipse cx="13.5" cy="8" rx="2" ry="2.5"/>
            <ellipse cx="17" cy="11" rx="2" ry="2.5"/>
          </svg>`;
        case 'emergency':
          // Emergency beacon - same as siren for consistency
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="${color}" stroke="${color}" stroke-width="1.5">
            <path d="M12 2L12 4" stroke-linecap="round"/>
            <path d="M4.93 4.93L6.34 6.34" stroke-linecap="round"/>
            <path d="M19.07 4.93L17.66 6.34" stroke-linecap="round"/>
            <path d="M2 12L4 12" stroke-linecap="round"/>
            <path d="M20 12L22 12" stroke-linecap="round"/>
            <circle cx="12" cy="12" r="5" fill="${color}"/>
            <rect x="8" y="17" width="8" height="5" rx="1" fill="${color}" opacity="0.7"/>
          </svg>`;
        // QFES Emergency Categories - specific icons
        case 'qfes':
        case 'fire':
          // Flame icon for fire incidents
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;
        case 'rescue':
        case 'ambulance':
          // Crash icon for rescue operations (filled car with impact burst)
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="${color}">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
            <path d="M6.2 8.8l-1.3-2.5 2.5 1.3 1.3-2.5 1.3 2.5 2.5-1.3-1.3 2.5 2.5 1.3-2.5 1.3 1.3 2.5-2.5-1.3-1.3 2.5-1.3-2.5-2.5 1.3 1.3-2.5z"/>
          </svg>`;
        case 'medical':
          // Medical cross/plus icon for medical emergencies
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2h8v6h6v8h-6v6H8v-6H2v-8h6V2z"/></svg>`;
        case 'hazmat':
          // Alert triangle for hazmat/chemical
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;
        case 'power':
        case 'gas':
          // Lightning/Zap icon for power/gas emergencies
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
        case 'storm':
        case 'ses':
          // Cloud with lightning for storm/SES
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/></svg>`;
        case 'siren':
          // Emergency beacon/light icon - clear and recognizable
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="${color}" stroke="${color}" stroke-width="1.5">
            <path d="M12 2L12 4" stroke-linecap="round"/>
            <path d="M4.93 4.93L6.34 6.34" stroke-linecap="round"/>
            <path d="M19.07 4.93L17.66 6.34" stroke-linecap="round"/>
            <path d="M2 12L4 12" stroke-linecap="round"/>
            <path d="M20 12L22 12" stroke-linecap="round"/>
            <circle cx="12" cy="12" r="5" fill="${color}"/>
            <rect x="8" y="17" width="8" height="5" rx="1" fill="${color}" opacity="0.7"/>
          </svg>`;
        case 'wildlife':
          // Leaf icon for wildlife/nature (matches database icon)
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`;
        case 'community':
          // Megaphone icon for community announcements
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>`;
        case 'lostfound':
          // Magnifying glass with question mark for lost & found
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8a2 2 0 0 0-2 2"/><path d="M11 14h.01"/></svg>`;
        default:
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v8"/><path d="m8 12 4 4 4-4"/></svg>`;
      }
    };

    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: rgba(255, 255, 255, ${opacity}); width: 24px; height: 24px; border-radius: 50%; border: 2px solid ${color}; box-shadow: 0 2px 4px rgba(0,0,0,${0.2 * opacity}); display: flex; align-items: center; justify-content: center; opacity: ${opacity};">${getIconSvg(markerType)}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  };

  const formatEventTime = (dateStr: string) => {
    if (!dateStr) return "Unknown time";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleString('en-AU', { 
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTimeWithRelative = (dateStr: string) => {
    if (!dateStr) return "Unknown time";
    const relativeTime = formatEventTime(dateStr);
    const actualTime = formatDateTime(dateStr);
    if (!actualTime) return relativeTime;
    return `${actualTime} (${relativeTime})`;
  };

  const createEventPopup = (properties: any) => {
    // Get event type and limit to 25 characters with ellipsis
    const eventType = properties.event_type || properties.description || 'Traffic Event';
    const shortTitle = eventType.length > 25 ? eventType.substring(0, 25) + '...' : eventType;
    const roadName = properties.road_summary?.road_name || properties.location || 'Unknown Road';
    
    return `
      <div class="relative p-4 min-w-[320px] max-w-[380px] bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl shadow-2xl border border-gray-100 font-sans overflow-hidden backdrop-blur-sm">
        <!-- Decorative Background Elements -->
        <div class="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-200/30 to-red-200/30 rounded-full blur-xl"></div>
        <div class="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full blur-lg"></div>
        
        <!-- Header -->
        <div class="relative flex items-center gap-3 mb-4">
          <div class="relative">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 flex items-center justify-center shadow-lg ring-2 ring-orange-200">
              <span class="text-white font-bold text-sm">TMR</span>
            </div>

          </div>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-gray-900 text-base">TMR Queensland</div>
            <div class="flex items-center gap-2 text-sm text-gray-600">
              <div class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>
                <span class="font-medium">${formatTimeWithRelative(properties.last_updated || properties.published || properties.Response_Date || properties.createdAt || properties.timeReported)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Content -->
        <div class="relative mb-4">
          <div class="p-4 rounded-xl bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200/50">
            <h4 class="font-bold text-gray-900 text-lg mb-3 leading-tight">${shortTitle}</h4>
            <div class="flex items-center gap-2 text-sm text-gray-700">
              <div class="p-1.5 bg-orange-500 rounded-lg">
                <svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <span class="font-semibold">${roadName}</span>
            </div>
          </div>
        </div>
        
        <!-- Enhanced Footer -->
        <div class="relative flex items-center justify-between pt-3 border-t border-gray-200/50">
          <div class="flex items-center gap-4">
            <button onclick="window.likeIncident('${properties.id}', 'traffic', event)" class="group flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md like-button" data-incident-id="${properties.id}">
              <svg class="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
              </svg>
              <span class="like-count text-sm font-semibold text-gray-700 group-hover:text-blue-600">0</span>
            </button>
            <button onclick="window.showIncidentDetails('${properties.id}', 'traffic')" class="group flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 transition-all duration-200 shadow-sm hover:shadow-md">
              <svg class="w-4 h-4 text-gray-500 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
              <span class="text-sm font-semibold text-gray-700 group-hover:text-purple-600">0</span>
            </button>
            <button onclick="window.shareIncident('${properties.id}', 'traffic')" class="group flex items-center gap-1 px-3 py-2 rounded-xl bg-white/80 hover:bg-green-50 border border-gray-200 hover:border-green-300 transition-all duration-200 shadow-sm hover:shadow-md">
              <svg class="w-4 h-4 text-gray-500 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
              </svg>
            </button>
          </div>
          <button onclick="window.showIncidentDetails('${properties.id}', 'traffic')" class="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
            View Details
          </button>
        </div>
      </div>
    `;
  };


  const createIncidentPopup = (properties: any) => {
    // Check if this is a user-reported incident
    if (properties?.userReported) {
      const photoUrl = properties?.photoUrl;
      const compressedPhotoUrl = photoUrl ? `/api/compress-image?path=${encodeURIComponent(photoUrl.startsWith('/') ? photoUrl : '/' + photoUrl)}&size=thumbnail&format=auto` : null;
      const photoThumbnail = compressedPhotoUrl ? `
        <div class="mb-3 rounded-lg overflow-hidden border border-gray-200">
          <img src="${compressedPhotoUrl}" alt="Incident photo" class="w-full h-24 object-cover hover:scale-105 transition-transform cursor-pointer" onclick="window.showIncidentDetails('${properties.id}', 'user-reported')" />
        </div>
      ` : '';
      
      const typeColor = getIncidentTypeColor(properties.incidentType);
      const priorityText = properties?.severity || 'Community Report';
      
      return `
        <div class="relative p-4 min-w-[340px] max-w-[400px] bg-gradient-to-br from-white via-purple-50/30 to-white rounded-2xl shadow-2xl border border-gray-100 font-sans overflow-hidden backdrop-blur-sm">
          <!-- Decorative Background Elements -->
          <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-200/40 to-indigo-200/40 rounded-full blur-xl"></div>
          <div class="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-br from-pink-200/30 to-purple-200/30 rounded-full blur-lg"></div>
          
          <!-- User Header -->
          <div class="relative flex items-center gap-3 mb-4">
            <div class="relative">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg ring-2 ring-purple-200">
                <span class="text-white font-bold text-sm">${(properties.reporterName || 'User').slice(0, 2).toUpperCase()}</span>
              </div>
  
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-gray-900 text-base">${properties.reporterName || 'Community Reporter'}</div>
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <div class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                  </svg>
                  <span class="font-medium">${formatTimeWithRelative(properties.timeReported || properties.createdAt || properties.Response_Date)}</span>
                </div>
                <span class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Community</span>
              </div>
            </div>
          </div>
          
          <!-- Content -->
          <div class="relative mb-4">
            <div class="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/50">
              <h4 class="font-bold text-gray-900 text-lg mb-3 leading-tight">${(properties.title || properties.incidentType || 'Community Report').length > 30 ? (properties.title || properties.incidentType || 'Community Report').substring(0, 30) + '...' : (properties.title || properties.incidentType || 'Community Report')}</h4>
              <div class="flex items-center gap-2 text-sm text-gray-700">
                <div class="p-1.5 bg-purple-500 rounded-lg">
                  <svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <span class="font-semibold">${properties.locationDescription || 'Community Location'}</span>
              </div>
            </div>
            
            ${properties.description ? `
              <div class="mt-3 p-3 bg-white/80 rounded-xl border border-gray-200">
                <div class="font-bold text-gray-800 mb-2 text-sm">Description:</div>
                <div class="text-sm text-gray-700 leading-relaxed">${properties.description.substring(0, 120) + (properties.description.length > 120 ? '...' : '')}</div>
              </div>
            ` : ''}
          </div>
          
          <!-- Photo if available -->
          ${photoThumbnail ? `
            <div class="mb-4">
              ${photoThumbnail.replace('class="mb-3', 'class="mb-0')}
            </div>
          ` : ''}
          
          <!-- Enhanced Footer -->
          <div class="relative flex items-center justify-between pt-3 border-t border-gray-200/50">
            <div class="flex items-center gap-4">
              <button onclick="window.likeIncident('${properties.id}', 'user-reported', event)" class="group flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md like-button" data-incident-id="${properties.id}">
                <svg class="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                </svg>
                <span class="like-count text-sm font-semibold text-gray-700 group-hover:text-blue-600">0</span>
              </button>
              <button onclick="window.showIncidentDetails('${properties.id}', 'user-reported')" class="group flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 transition-all duration-200 shadow-sm hover:shadow-md">
                <svg class="w-4 h-4 text-gray-500 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
                <span class="text-sm font-semibold text-gray-700 group-hover:text-purple-600">0</span>
              </button>
              <button onclick="window.shareIncident('${properties.id}', 'user-reported')" class="group flex items-center gap-1 px-3 py-2 rounded-xl bg-white/80 hover:bg-green-50 border border-gray-200 hover:border-green-300 transition-all duration-200 shadow-sm hover:shadow-md">
                <svg class="w-4 h-4 text-gray-500 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                </svg>
              </button>
            </div>
            <button onclick="window.showIncidentDetails('${properties.id}', 'user-reported')" class="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
              View Details
            </button>
          </div>
        </div>
      `;
    }
    
    // Official emergency incident - get correct agency info
    const getAgencyInfo = (eventType: string) => {
      const eventTypeLower = (eventType || '').toLowerCase();
      
      if (eventTypeLower.includes('fire') || eventTypeLower.includes('hazmat')) {
        return { name: 'QFES', avatar: 'QFE', color: 'from-red-500 to-red-600' };
      } else if (eventTypeLower.includes('police') || eventTypeLower.includes('crime')) {
        return { name: 'QPS', avatar: 'QPS', color: 'from-blue-700 to-blue-800' };
      } else if (eventTypeLower.includes('medical') || eventTypeLower.includes('ambulance')) {
        return { name: 'QAS', avatar: 'QAS', color: 'from-green-600 to-green-700' };
      } else {
        return { name: 'ESQ', avatar: 'ESQ', color: 'from-red-500 to-red-600' };
      }
    };
    
    const groupedType = getProperty(properties, 'GroupedType') || '';
    const agencyInfo = getAgencyInfo(groupedType);
    const shortIncidentDesc = groupedType.substring(0, 60) + (groupedType.length > 60 ? '...' : '');
    
    return `
      <div class="relative p-4 min-w-[340px] max-w-[400px] bg-gradient-to-br from-white via-red-50/30 to-white rounded-2xl shadow-2xl border border-gray-100 font-sans overflow-hidden backdrop-blur-sm">
        <!-- Decorative Background Elements -->
        <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-200/40 to-orange-200/40 rounded-full blur-xl"></div>
        <div class="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-br from-blue-200/30 to-red-200/30 rounded-full blur-lg"></div>
        
        <!-- Agency Header -->
        <div class="relative flex items-center gap-3 mb-4">
          <div class="relative">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br ${agencyInfo.color} flex items-center justify-center shadow-lg ring-2 ring-red-200">
              <span class="text-white font-bold text-sm">${agencyInfo.avatar}</span>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-gray-900 text-base">${agencyInfo.name}</div>
            <div class="flex items-center gap-2 text-sm text-gray-600">
              <div class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>
                <span class="font-medium">${formatTimeWithRelative(getProperty(properties, 'Response_Date') || getProperty(properties, 'createdAt') || getProperty(properties, 'published'))}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Content -->
        <div class="relative mb-4">
          <div class="p-4 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/50">
            <h4 class="font-bold text-gray-900 text-lg mb-3 leading-tight">${shortIncidentDesc.length > 30 ? shortIncidentDesc.substring(0, 30) + '...' : shortIncidentDesc}</h4>
            <div class="flex items-center gap-2 text-sm text-gray-700">
              <div class="p-1.5 bg-red-500 rounded-lg">
                <svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <span class="font-semibold">${properties.Location || properties.Locality || 'Emergency Location'}</span>
            </div>
          </div>
          
          <!-- Emergency Details -->
          ${properties.Priority && properties.Priority !== 'Unknown' ? `
            <div class="mt-3 p-3 bg-white/80 rounded-xl border border-amber-200">
              <div class="font-bold text-gray-800 mb-2 text-sm">Priority Level:</div>
              <div class="text-amber-700 font-bold text-lg">${properties.Priority}</div>
            </div>
          ` : ''}
          
          ${properties.Status && properties.Status !== 'Unknown' ? `
            <div class="mt-3 p-3 bg-white/80 rounded-xl border border-gray-200">
              <div class="font-bold text-gray-800 mb-1 text-sm">Status:</div>
              <div class="text-gray-700 font-semibold">${properties.Status}</div>
            </div>
          ` : ''}
        </div>
        
        <!-- Enhanced Footer -->
        <div class="relative flex items-center justify-between pt-3 border-t border-gray-200/50">
          <div class="flex items-center gap-4">
            <button onclick="window.likeIncident('${getProperty(properties, 'Master_Incident_Number') || getProperty(properties, 'id')}', 'emergency', event)" class="group flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md like-button" data-incident-id="${getProperty(properties, 'Master_Incident_Number') || getProperty(properties, 'id')}">
              <svg class="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
              </svg>
              <span class="like-count text-sm font-semibold text-gray-700 group-hover:text-blue-600">0</span>
            </button>
            <button onclick="window.showIncidentDetails('${properties.Master_Incident_Number || properties.id}', 'emergency')" class="group flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 transition-all duration-200 shadow-sm hover:shadow-md">
              <svg class="w-4 h-4 text-gray-500 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
              <span class="text-sm font-semibold text-gray-700 group-hover:text-purple-600">0</span>
            </button>
            <button onclick="window.shareIncident('${properties.Master_Incident_Number || properties.id}', 'emergency')" class="group flex items-center gap-1 px-3 py-2 rounded-xl bg-white/80 hover:bg-green-50 border border-gray-200 hover:border-green-300 transition-all duration-200 shadow-sm hover:shadow-md">
              <svg class="w-4 h-4 text-gray-500 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
              </svg>
            </button>
          </div>
          <button onclick="window.showIncidentDetails('${properties.Master_Incident_Number || properties.id}', 'emergency')" class="px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
            View Details
          </button>
        </div>
      </div>
    `;
  };

  const getPriorityColor = (priority: string) => {
    const p = priority?.toLowerCase();
    if (p === 'high' || p === 'red alert') return 'text-red-600';
    if (p === 'medium') return 'text-yellow-600';
    return 'text-green-600';
  };

  const getIncidentTypeColor = (incidentType: string) => {
    switch (incidentType?.toLowerCase()) {
      case 'crime':
      case 'theft':
      case 'violence':
      case 'vandalism':
        return 'bg-red-100 text-red-800';
      case 'suspicious':
        return 'bg-yellow-100 text-yellow-800';
      case 'public safety':
      case 'road hazard':
        return 'bg-blue-100 text-blue-800';
      case 'fire':
        return 'bg-orange-100 text-orange-800';
      case 'utility':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };


  // Setup global functions for popup interactions
  useEffect(() => {
    // Add like functionality
    (window as any).likeIncident = (incidentId: string, incidentType: string, event: Event) => {
      // Simple like functionality - could be enhanced to save to database
      const button = event.target as HTMLElement;
      const thumbsIcon = button.querySelector('svg') || button.closest('button')?.querySelector('svg');
      const countSpan = button.closest('button')?.querySelector('.like-count');
      
      if (thumbsIcon) {
        if (thumbsIcon.classList.contains('text-gray-500') || thumbsIcon.parentElement?.classList.contains('text-gray-500')) {
          // Change to liked state (blue)
          thumbsIcon.setAttribute('fill', 'currentColor');
          thumbsIcon.classList.remove('text-gray-500', 'text-gray-600');
          thumbsIcon.classList.add('text-blue-500');
          if (thumbsIcon.parentElement) {
            thumbsIcon.parentElement.classList.remove('text-gray-500', 'text-gray-600', 'hover:text-blue-500');
            thumbsIcon.parentElement.classList.add('text-blue-500');
          }
          // Increment count
          if (countSpan) {
            const currentCount = parseInt(countSpan.textContent || '0');
            countSpan.textContent = (currentCount + 1).toString();
          }
        } else {
          // Change to unliked state (gray)
          thumbsIcon.setAttribute('fill', 'none');
          thumbsIcon.classList.remove('text-blue-500');
          thumbsIcon.classList.add('text-gray-500', 'hover:text-blue-500');
          if (thumbsIcon.parentElement) {
            thumbsIcon.parentElement.classList.remove('text-blue-500');
            thumbsIcon.parentElement.classList.add('text-gray-500', 'hover:text-blue-500');
          }
          // Decrement count
          if (countSpan) {
            const currentCount = parseInt(countSpan.textContent || '0');
            countSpan.textContent = Math.max(0, currentCount - 1).toString();
          }
        }
      }
    };
    
    // Add share functionality
    (window as any).shareIncident = (incidentId: string, incidentType: string) => {
      // Simple share functionality
      const url = window.location.href;
      if (navigator.share) {
        navigator.share({
          title: 'Community Connect Australia - Incident Alert',
          text: `Check out this ${incidentType} incident on Community Connect Australia`,
          url: url
        });
      } else {
        // Fallback to clipboard copy
        navigator.clipboard.writeText(url).then(() => {
          alert('Incident link copied to clipboard!');
        });
      }
    };
    
    (window as any).showIncidentDetails = (incidentId: string, incidentType: string) => {
      // Find the incident data and pass it to the modal
      let incident = null;
      
      if (incidentType === 'traffic') {
        const event = (eventsData as any)?.features?.find((f: any) => f.properties.id?.toString() === incidentId);
        if (event) {
          incident = { ...event, type: 'traffic' };
        }
      } else if (incidentType === 'user-reported' || incidentType === 'emergency') {
        const incidentData = (incidentsData as any)?.features?.find((f: any) => 
          f.properties.id?.toString() === incidentId || 
          f.properties.Master_Incident_Number?.toString() === incidentId
        );
        if (incidentData) {
          incident = { ...incidentData, type: incidentType };
        }
      }
      
      if (incident) {
        onEventSelect(incident);
      }
    };
  }, [onEventSelect, eventsData, incidentsData]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full z-10" data-testid="map-container" />
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-30">
          <div className="bg-card p-6 rounded-lg shadow-lg flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin"></div>
            <span className="text-foreground">Loading safety data...</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### client/src/components/map/simple-filter-sidebar.tsx
```typescript
// Filter Sidebar Component
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronDown, ChevronRight, Car, Shield, Users, MapPin, Flame, Zap, Trees, AlertTriangle, RefreshCw, Target, Heart, Clock, Eye } from "lucide-react";
import type { FilterState } from "@/types/filters";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { useTrafficData } from "@/hooks/use-traffic-data";

interface SimpleFilterSidebarProps {
  isOpen: boolean;
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: boolean | string | number | { lat: number; lon: number } | [number, number, number, number] | undefined) => void;
  onClose: () => void;
  isActive?: boolean;
}

export function SimpleFilterSidebar({ isOpen, filters, onFilterChange, onClose, isActive = true }: SimpleFilterSidebarProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState({
    'Agency Data': true,
    'User Reports': true,
  });
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };
  
  // Use shared data processing hook - only fetch when active to prevent duplicate processing
  const { counts } = useTrafficData(filters, undefined, isActive && isOpen);

  const handleRefresh = async () => {
    try {
      // Force refetch by invalidating the query cache
      window.location.reload();
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        ${isMobile 
          ? 'fixed top-0 left-0 w-80 h-full z-50' 
          : 'w-80 h-full'
        }
        bg-background border-r border-border shadow-lg flex flex-col
      `}>
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/50">
          <h1 className="text-lg font-semibold text-foreground">Safety Filters</h1>
          <Button
            onClick={handleRefresh}
            className="text-muted-foreground hover:text-foreground"
          >
            Refresh
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Agency Data Sources */}
          <div className="mb-4">
            <button
              onClick={() => toggleSection('Agency Data')}
              className="flex items-center justify-between w-full p-2 text-left hover:bg-muted/50 rounded-md transition-colors"
            >
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-medium text-foreground">Agency Data</h3>
              </div>
              {expandedSections['Agency Data'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {expandedSections['Agency Data'] && (
              <div className="mt-3 ml-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-tmr"
                    checked={filters.showTrafficEvents === true}
                    onCheckedChange={(checked: boolean) => onFilterChange('showTrafficEvents', !!checked)}
                    data-testid="checkbox-filter-tmr"
                  />
                  <Car className="w-4 h-4 text-orange-500" />
                  <Label htmlFor="filter-tmr" className="text-sm text-foreground flex-1">
                    TMR Traffic Events
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-esq"
                    checked={filters.showIncidents === true}
                    onCheckedChange={(checked: boolean) => onFilterChange('showIncidents', !!checked)}
                    data-testid="checkbox-filter-esq"
                  />
                  <Zap className="w-4 h-4 text-blue-500" />
                  <Label htmlFor="filter-esq" className="text-sm text-foreground flex-1">
                    ESQ Emergency Data
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-qfes"
                    checked={filters.showQFES === true}
                    onCheckedChange={(checked: boolean) => onFilterChange('showQFES', !!checked)}
                    data-testid="checkbox-filter-qfes"
                  />
                  <Flame className="w-4 h-4 text-red-500" />
                  <Label htmlFor="filter-qfes" className="text-sm text-foreground flex-1">
                    QFES Fire & Emergency
                  </Label>
                </div>
              </div>
            )}
          </div>

          {/* User Reports */}
          <div className="mb-4">
            <button
              onClick={() => toggleSection('User Reports')}
              className="flex items-center justify-between w-full p-2 text-left hover:bg-muted/50 rounded-md transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-green-500" />
                <h3 className="text-sm font-medium text-foreground">User Reports</h3>
              </div>
              {expandedSections['User Reports'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {expandedSections['User Reports'] && (
              <div className="mt-3 ml-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-user-safety"
                    checked={filters.showUserSafetyCrime === true}
                    onCheckedChange={(checked: boolean) => onFilterChange('showUserSafetyCrime', !!checked)}
                    data-testid="checkbox-filter-user-safety"
                  />
                  <Shield className="w-4 h-4 text-purple-500" />
                  <Label htmlFor="filter-user-safety" className="text-sm text-foreground flex-1">
                    Safety & Crime
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-user-wildlife"
                    checked={filters.showUserWildlife === true}
                    onCheckedChange={(checked: boolean) => onFilterChange('showUserWildlife', !!checked)}
                    data-testid="checkbox-filter-user-wildlife"
                  />
                  <Trees className="w-4 h-4 text-green-600" />
                  <Label htmlFor="filter-user-wildlife" className="text-sm text-foreground flex-1">
                    Wildlife & Nature
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-user-community"
                    checked={filters.showUserCommunity === true}
                    onCheckedChange={(checked: boolean) => onFilterChange('showUserCommunity', !!checked)}
                    data-testid="checkbox-filter-user-community"
                  />
                  <Users className="w-4 h-4 text-teal-600" />
                  <Label htmlFor="filter-user-community" className="text-sm text-foreground flex-1">
                    Community Issues
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-user-traffic"
                    checked={filters.showUserTraffic === true}
                    onCheckedChange={(checked: boolean) => onFilterChange('showUserTraffic', !!checked)}
                    data-testid="checkbox-filter-user-traffic"
                  />
                  <Car className="w-4 h-4 text-orange-500" />
                  <Label htmlFor="filter-user-traffic" className="text-sm text-foreground flex-1">
                    Road & Traffic
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-user-lost-found"
                    checked={filters.showUserLostFound === true}
                    onCheckedChange={(checked: boolean) => onFilterChange('showUserLostFound', !!checked)}
                    data-testid="checkbox-filter-user-lost-found"
                  />
                  <Target className="w-4 h-4 text-amber-500" />
                  <Label htmlFor="filter-user-lost-found" className="text-sm text-foreground flex-1">
                    Lost & Found
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-user-pets"
                    checked={filters.showUserPets === true}
                    onCheckedChange={(checked: boolean) => onFilterChange('showUserPets', !!checked)}
                    data-testid="checkbox-filter-user-pets"
                  />
                  <Heart className="w-4 h-4 text-pink-500" />
                  <Label htmlFor="filter-user-pets" className="text-sm text-foreground flex-1">
                    Pets
                  </Label>
                </div>
              </div>
            )}
          </div>

          {/* Aging Options Section */}
          <div className="pt-4 border-t border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Aging Options
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="filter-show-expired"
                  checked={filters.showExpiredIncidents === true}
                  onCheckedChange={(checked: boolean) => onFilterChange('showExpiredIncidents', !!checked)}
                  data-testid="checkbox-filter-show-expired"
                />
                <Eye className="w-4 h-4 text-gray-500" />
                <Label htmlFor="filter-show-expired" className="text-sm text-foreground flex-1">
                  Show Expired Incidents
                </Label>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Aging Sensitivity:</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="aging-normal"
                      name="agingSensitivity"
                      value="normal"
                      checked={filters.agingSensitivity === 'normal'}
                      onChange={() => onFilterChange('agingSensitivity', 'normal')}
                      className="text-blue-500"
                      data-testid="radio-aging-normal"
                    />
                    <Label htmlFor="aging-normal" className="text-sm text-foreground">
                      Normal (standard timing)
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="aging-extended"
                      name="agingSensitivity"
                      value="extended"
                      checked={filters.agingSensitivity === 'extended'}
                      onChange={() => onFilterChange('agingSensitivity', 'extended')}
                      className="text-blue-500"
                      data-testid="radio-aging-extended"
                    />
                    <Label htmlFor="aging-extended" className="text-sm text-foreground">
                      Extended (50% longer visibility)
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="aging-disabled"
                      name="agingSensitivity"
                      value="disabled"
                      checked={filters.agingSensitivity === 'disabled'}
                      onChange={() => onFilterChange('agingSensitivity', 'disabled')}
                      className="text-blue-500"
                      data-testid="radio-aging-disabled"
                    />
                    <Label htmlFor="aging-disabled" className="text-sm text-foreground">
                      Disabled (no aging)
                    </Label>
                  </div>
                </div>
              </div>
              
              <div className="bg-muted/50 p-3 rounded-md">
                <div className="text-xs text-muted-foreground">
                  <strong>Aging System:</strong> Critical incidents (fire, medical, rescue) remain visible longer than routine reports. Incidents gradually fade as they age.
                </div>
              </div>
            </div>
          </div>
          
          {/* Location Setting Section */}
          <div className="pt-4 border-t border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              Your Location
            </h2>
            
            <div className="space-y-4">              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Set your home suburb:</Label>
                <LocationAutocomplete
                  value={filters.homeLocation || ''}
                  onChange={(location, coordinates, boundingBox) => {
                    onFilterChange('homeLocation', location);
                    if (coordinates) {
                      onFilterChange('homeCoordinates', coordinates);
                    }
                    if (boundingBox) {
                      onFilterChange('homeBoundingBox', boundingBox);
                    }
                  }}
                  onClear={() => {
                    onFilterChange('homeLocation', '');
                    onFilterChange('homeCoordinates', undefined);
                    onFilterChange('homeBoundingBox', undefined);
                  }}
                  placeholder="Enter your suburb..."
                  disabled={false}
                />
              </div>
              
              {/* Radius Control */}
              {filters.homeCoordinates && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Search Radius:</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 5, 10, 25, 50, 100, 200].map((radius) => (
                        <Button
                          key={radius}
                          variant={filters.radius === radius ? "default" : "outline"}
                          size="sm"
                          onClick={() => onFilterChange('radius', radius)}
                          className="text-xs"
                          data-testid={`button-radius-${radius}`}
                        >
                          {radius}km
                        </Button>
                      ))}
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-medium text-foreground">
                        Current: {filters.radius || 50}km radius
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {filters.homeLocation && (
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-sm text-foreground">
                    <strong>Home Location:</strong>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {filters.homeLocation}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Showing events within {filters.radius || 50}km radius
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}```

#### client/src/components/map/app-header.tsx
```typescript
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { Map, List, Bell, MessageCircle, Filter, Plus, MapPin, Menu, LogOut, Settings, Megaphone, BarChart3, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { IncidentReportForm } from "@/components/incident-report-form";
import { useIsMobile } from "@/hooks/use-mobile";
import { useViewMode } from "@/contexts/view-mode-context";

interface AppHeaderProps {
  onMenuToggle: () => void;
  onFilterToggle?: () => void;
  showFilterButton?: boolean;
}

export function AppHeader({ onMenuToggle, onFilterToggle, showFilterButton }: AppHeaderProps) {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocationUrl] = useLocation();
  const isMobile = useIsMobile();
  const { viewMode, setViewMode } = useViewMode();
  
  // Check if we're on a feed/map page
  const isOnFeedPage = location === "/" || location === "/feed" || location === "/map";
  
  const handleViewSwitch = (mode: 'map' | 'feed') => {
    if (isOnFeedPage) {
      // Just toggle view mode - instant!
      setViewMode(mode);
    } else {
      // Navigate to feed page and set view mode
      setViewMode(mode);
      setLocationUrl('/feed');
    }
  };
  const [isLocationDrawerOpen, setIsLocationDrawerOpen] = useState(false);
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(() => 
    typeof window !== 'undefined' ? localStorage.getItem('homeLocation') || '' : ''
  );

  // Fetch notifications for authenticated users
  const { data: notifications } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: isAuthenticated,
    retry: false,
  });
  
  const unreadNotifications = (notifications as any[])?.filter((n: any) => !n.isRead)?.length || 0;
  const unreadMessages = 0;

  const handleLocationChange = (location: string, coordinates?: { lat: number; lon: number }, boundingBox?: [number, number, number, number]) => {
    setCurrentLocation(location);
    
    // Save to localStorage to sync with other pages
    if (coordinates) {
      localStorage.setItem('homeLocation', location);
      localStorage.setItem('homeCoordinates', JSON.stringify(coordinates));
      localStorage.setItem('locationFilter', 'true');
      if (boundingBox) {
        localStorage.setItem('homeBoundingBox', JSON.stringify(boundingBox));
      }
      
      // Dispatch custom event to notify other pages
      window.dispatchEvent(new CustomEvent('locationChanged', {
        detail: { location, coordinates, boundingBox }
      }));
    }
    
    setIsLocationDrawerOpen(false);
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-20 bg-card border-b border-border">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
            <circle cx="12" cy="12" r="6" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
            <path strokeLinecap="round" strokeWidth="2" d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
          </svg>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Mobile Navigation - Compact and Responsive */}
          {isMobile ? (
            <div className="flex items-center gap-2">
              {/* Core Navigation - Always visible */}
              <div className="flex items-center bg-muted p-1 rounded-lg gap-1">
                <Button
                  onClick={() => handleViewSwitch('map')}
                  variant={isOnFeedPage && viewMode === 'map' ? "default" : "ghost"}
                  size="sm"
                  className="h-11 w-11 p-0 text-xs"
                  data-testid="button-map-view"
                >
                  <Map className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => handleViewSwitch('feed')}
                  variant={isOnFeedPage && viewMode === 'feed' ? "default" : "ghost"}
                  size="sm"
                  className="h-11 w-11 p-0 text-xs"
                  data-testid="button-feed-view"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Link href="/messages">
                  <Button
                    variant={location === "/messages" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 px-2 text-xs relative"
                    data-testid="button-messages-view"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {unreadMessages > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-3 w-3 p-0 text-[10px] flex items-center justify-center"
                      >
                        {unreadMessages}
                      </Badge>
                    )}
                  </Button>
                </Link>
              </div>

              {/* Business Navigation - Dropdown for space efficiency */}
              {user?.accountType === 'business' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={
                        location === "/business-dashboard" || 
                        location === "/advertise" || 
                        location === "/create-ad" 
                          ? "default" 
                          : "ghost"
                      }
                      size="sm"
                      className="h-11 w-11 p-0"
                      data-testid="button-business-menu"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem asChild>
                      <Link href="/business-dashboard" className="w-full">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/advertise" className="w-full">
                        <Megaphone className="w-4 h-4 mr-2" />
                        Advertise
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* User Menu - Only for authenticated users */}
              {isAuthenticated && user && (
                <div className="flex items-center gap-2">
                  {/* Report Button */}
                  <Button
                    onClick={() => setReportFormOpen(true)}
                    size="sm"
                    className="h-11 w-11 p-0"
                    data-testid="button-report-mobile"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>

                  {/* Profile Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Avatar className="w-11 h-11 cursor-pointer hover:opacity-80 transition-opacity">
                        <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || 'User'} />
                        <AvatarFallback className="text-xs">
                          {user.accountType === 'business' && user.businessName 
                            ? user.businessName[0].toUpperCase() 
                            : user.firstName 
                              ? user.firstName[0].toUpperCase() 
                              : user.email 
                                ? user.email[0].toUpperCase() 
                                : 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setIsLocationDrawerOpen(true)}>
                        <MapPin className="w-4 h-4 mr-2" />
                        Set Location
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="flex items-center w-full">
                          <Settings className="w-4 h-4 mr-2" />
                          Profile Settings
                        </Link>
                      </DropdownMenuItem>
                      {/* Admin Dashboard - Only show for admin users */}
                      {user && (user as any).role === 'admin' && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="flex items-center w-full">
                            <Shield className="w-4 h-4 mr-2" />
                            Admin Dashboard
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => window.location.href = '/api/logout'} className="text-red-600">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          ) : (
            /* Desktop Navigation */
            <div className="flex items-center space-x-4">
              {/* Filter Button for Desktop Map Mode */}
              {showFilterButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onFilterToggle}
                  className="h-8"
                  data-testid="button-toggle-filter"
                >
                  <Filter className="w-4 h-4 mr-1" />
                  Filter
                </Button>
              )}
              
              {/* Desktop View Toggle */}
              <div className="flex items-center bg-muted p-1.5 rounded-lg gap-1">
                <Button
                  onClick={() => handleViewSwitch('map')}
                  variant={isOnFeedPage && viewMode === 'map' ? "default" : "ghost"}
                  size="sm"
                  className="h-9 px-4 font-medium"
                  data-testid="button-map-view"
                >
                  <Map className="w-4 h-4 mr-2" />
                  Map
                </Button>
                <Button
                  onClick={() => handleViewSwitch('feed')}
                  variant={isOnFeedPage && viewMode === 'feed' ? "default" : "ghost"}
                  size="sm"
                  className="h-9 px-4 font-medium"
                  data-testid="button-feed-view"
                >
                  <List className="w-4 h-4 mr-2" />
                  Feed
                </Button>
                <Link href="/messages">
                  <Button
                    variant={location === "/messages" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 px-3 relative"
                    data-testid="button-messages-view"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Messages
                    {unreadMessages > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                      >
                        {unreadMessages}
                      </Badge>
                    )}
                  </Button>
                </Link>
                {user?.accountType === 'business' && (
                  <>
                    <Link href="/business-dashboard">
                      <Button
                        variant={location === "/business-dashboard" ? "default" : "ghost"}
                        size="sm"
                        className="h-9 px-4 font-medium"
                        data-testid="button-dashboard-view-desktop"
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Dashboard
                      </Button>
                    </Link>
                    <Link href="/advertise">
                      <Button
                        variant={location === "/advertise" || location === "/create-ad" ? "default" : "ghost"}
                        size="sm"
                        className="h-9 px-4 font-medium"
                        data-testid="button-advertise-view"
                      >
                        <Megaphone className="w-4 h-4 mr-2" />
                        Advertise
                      </Button>
                    </Link>
                  </>
                )}
              </div>
              
              {/* Desktop User Menu */}
              {isAuthenticated && user && (
                <div className="flex items-center space-x-2">
                  {/* Notifications */}
                  <Link href="/notifications">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="relative h-8 w-8 p-0"
                      data-testid="button-notifications"
                    >
                      <Bell className="w-4 h-4" />
                      {unreadNotifications > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                        >
                          {unreadNotifications}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                  
                  {/* Profile Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="flex items-center space-x-2 p-1 hover:bg-muted rounded-lg transition-colors cursor-pointer" data-testid="link-user-profile">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || 'User'} />
                          <AvatarFallback className="text-xs">
                            {user.accountType === 'business' && user.businessName 
                              ? user.businessName[0].toUpperCase() 
                              : user.firstName 
                                ? user.firstName[0].toUpperCase() 
                                : user.email 
                                  ? user.email[0].toUpperCase() 
                                  : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-foreground hidden lg:block">
                          {user.accountType === 'business' && user.businessName 
                            ? user.businessName 
                            : user.firstName || user.email}
                        </span>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setIsLocationDrawerOpen(true)}>
                        <MapPin className="w-4 h-4 mr-2" />
                        Set Location
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="flex items-center w-full">
                          <Settings className="w-4 h-4 mr-2" />
                          Profile Settings
                        </Link>
                      </DropdownMenuItem>
                      {/* Admin Dashboard - Only show for admin users */}
                      {user && (user as any).role === 'admin' && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="flex items-center w-full">
                            <Shield className="w-4 h-4 mr-2" />
                            Admin Dashboard
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => window.location.href = '/api/logout'} className="text-red-600">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              
              {/* Menu Button */}
              <button 
                onClick={onMenuToggle}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                data-testid="button-menu-toggle"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Location Dialog */}
      <Dialog open={isLocationDrawerOpen} onOpenChange={setIsLocationDrawerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Set Your Location
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Search for your area
              </label>
              <LocationAutocomplete
                value=""
                onChange={handleLocationChange}
                placeholder="Enter suburb, postcode, or area..."
              />
              <p className="text-xs text-muted-foreground">
                This helps filter safety alerts and incidents to your local area
              </p>
            </div>
            
            {currentLocation && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Current Location
                </label>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{currentLocation}</p>
                      <p className="text-xs text-muted-foreground">Regional filtering enabled</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      localStorage.removeItem('homeLocation');
                      localStorage.removeItem('homeCoordinates');
                      localStorage.removeItem('homeBoundingBox');
                      localStorage.setItem('locationFilter', 'false');
                      setCurrentLocation('');
                      window.dispatchEvent(new CustomEvent('locationChanged', {
                        detail: { location: '', coordinates: null, boundingBox: null }
                      }));
                      setIsLocationDrawerOpen(false);
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Incident Report Form */}
      <IncidentReportForm
        isOpen={reportFormOpen}
        onClose={() => setReportFormOpen(false)}
      />
    </header>
  );
}
```

#### client/src/components/post-card.tsx
```typescript
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReportModal } from "@/components/report-modal";
import { 
  ThumbsUp, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  MapPin,
  Clock,
  Heart,
  Frown,
  AlertTriangle,
  Laugh,
  HeartHandshake
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PostCardProps {
  post: any;
  onCommentClick?: () => void;
}

const reactionTypes = [
  { type: "like", icon: ThumbsUp, label: "Like", color: "text-blue-500" },
  { type: "love", icon: Heart, label: "Love", color: "text-red-500" },
  { type: "care", icon: HeartHandshake, label: "Care", color: "text-orange-500" },
  { type: "wow", icon: Laugh, label: "Wow", color: "text-yellow-500" },
  { type: "sad", icon: Frown, label: "Sad", color: "text-purple-500" },
  { type: "angry", icon: AlertTriangle, label: "Angry", color: "text-red-600" },
];

export function PostCard({ post, onCommentClick }: PostCardProps) {
  const { user } = useAuth();
  const [showReactions, setShowReactions] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const incidentId = post.id || post.properties?.id;
  const props = post.properties || {};
  
  // Use the reactionsCount from post data for initial display (avoids N+1 queries)
  // Only fetch detailed reactions when user wants to interact
  const { data: reactionData } = useQuery({
    queryKey: ["/api/reactions", incidentId],
    queryFn: async () => {
      const res = await fetch(`/api/reactions/${incidentId}`);
      if (!res.ok) return { count: props.reactionsCount || 0, userReaction: null, reactions: {} };
      return res.json();
    },
    // Only fetch when user has interacted (hovered over reactions or wants to react)
    enabled: !!incidentId && hasInteracted,
    // Use stale data while fetching to prevent loading states
    staleTime: 30000,
  });

  // Use commentsCount from post data if available (avoids N+1 queries)
  const postCommentCount = props.commentsCount || 0;
  
  const { data: commentCount = postCommentCount } = useQuery({
    queryKey: ["/api/incidents", incidentId, "comments-count"],
    queryFn: async () => {
      const res = await fetch(`/api/incidents/${incidentId}/comments-count`);
      if (!res.ok) return postCommentCount;
      const data = await res.json();
      return data.count || 0;
    },
    // Only fetch detailed count when user has interacted
    enabled: !!incidentId && hasInteracted,
    staleTime: 30000,
  });

  const reactMutation = useMutation({
    mutationFn: async (reactionType: string) => {
      const res = await fetch(`/api/reactions/${incidentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reactionType }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to react");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reactions", incidentId] });
    },
  });

  const getTimeAgo = (timestamp: string | undefined) => {
    if (!timestamp) return "Just now";
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes === 1) return "1 minute ago";
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours === 1) return "1 hour ago";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1 day ago";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks === 1) return "1 week ago";
    if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`;
    
    // For older posts, show the actual date
    return date.toLocaleDateString();
  };

  const title = props.title || "Community Update";
  const description = props.description || "";
  const location = props.location || props.locationDescription || "";
  const photoUrl = props.photoUrl;
  const timestamp = props.tmrStartTime || props.createdAt || props.incidentTime || props.lastUpdated || props.publishedAt;
  const category = props.category || "Community";
  
  const posterName = props.reporterName || props.userName || "Community Member";
  const posterAvatar = props.reporterAvatar || props.userAvatar;
  const posterId = props.userId || props.reporterId;

  const handleReaction = (type: string) => {
    setHasInteracted(true);
    // On mobile first tap, userReaction may not be loaded yet
    // Server handles idempotency - if user already reacted, it will toggle/replace
    reactMutation.mutate(type);
    setShowReactions(false);
  };
  
  // For mobile: trigger interaction on touch start to preload reaction data
  const handleInteractionStart = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
  };

  // Use reactionData if fetched, otherwise fall back to post's reactionsCount
  const userReaction = reactionData?.userReaction;
  const totalReactions = reactionData?.count ?? props.reactionsCount ?? 0;

  return (
    <Card className="border-0 shadow-sm bg-card rounded-none sm:rounded-lg mb-2">
      <CardContent className="p-0">
        {/* Post Header */}
        <div className="flex items-start justify-between p-3 sm:p-4 pb-2">
          <div className="flex items-center gap-3">
            <Link href={posterId ? `/users/${posterId}` : "#"}>
              <Avatar className="h-10 w-10 sm:h-11 sm:w-11 cursor-pointer">
                {posterAvatar && <AvatarImage src={posterAvatar} />}
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {posterName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={posterId ? `/users/${posterId}` : "#"}>
                <p className="font-semibold text-sm text-foreground hover:underline cursor-pointer">
                  {posterName}
                </p>
              </Link>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{getTimeAgo(timestamp)}</span>
                {location && (
                  <>
                    <span>·</span>
                    <MapPin className="w-3 h-3" />
                    <span className="truncate max-w-[120px] sm:max-w-[150px]">{location}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem data-testid="menu-save-post">Save post</DropdownMenuItem>
              <DropdownMenuItem data-testid="menu-hide-post">Hide post</DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive" 
                onClick={() => setShowReportModal(true)}
                data-testid="menu-report-post"
              >
                Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Category Badge */}
        <div className="px-3 sm:px-4 pb-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {category}
          </span>
        </div>

        {/* Post Content - Clickable to open full post */}
        <Link href={`/incident/${incidentId}`}>
          <div className="px-3 sm:px-4 pb-3 cursor-pointer hover-elevate active-elevate-2 rounded-sm">
            <h3 className="font-semibold text-foreground mb-1">{title}</h3>
            {description && (
              <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{description}</p>
            )}
          </div>
        </Link>

        {/* Post Image */}
        {photoUrl && (
          <Link href={`/incident/${incidentId}`}>
            <div className="relative cursor-pointer">
              <img
                src={photoUrl}
                alt={title}
                className="w-full object-cover max-h-[400px]"
                loading="lazy"
              />
            </div>
          </Link>
        )}

        {/* Reaction & Comment Counts */}
        {(totalReactions > 0 || commentCount > 0) && (
          <div className="flex items-center justify-between px-3 py-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              {totalReactions > 0 && (
                <>
                  <div className="flex -space-x-1">
                    {reactionTypes
                      .filter(r => reactionData?.reactions?.[r.type] > 0)
                      .slice(0, 3)
                      .map((reaction) => {
                        const Icon = reaction.icon;
                        const bgColor = reaction.type === 'like' ? 'bg-blue-500' 
                          : reaction.type === 'love' ? 'bg-red-500'
                          : reaction.type === 'care' ? 'bg-orange-500'
                          : reaction.type === 'wow' ? 'bg-yellow-500'
                          : reaction.type === 'sad' ? 'bg-purple-500'
                          : 'bg-red-600';
                        return (
                          <span 
                            key={reaction.type}
                            className={`w-5 h-5 ${bgColor} rounded-full flex items-center justify-center`}
                          >
                            <Icon className="w-3 h-3 text-white" />
                          </span>
                        );
                      })}
                  </div>
                  <span className="ml-1">{totalReactions}</span>
                </>
              )}
            </div>
            {commentCount > 0 && (
              <button 
                onClick={onCommentClick}
                className="hover:underline"
              >
                {commentCount} {commentCount === 1 ? "comment" : "comments"}
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="border-t border-border">
          <div className="flex items-center justify-around py-1">
            {/* Like Button with Reactions */}
            <Popover open={showReactions} onOpenChange={setShowReactions}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "flex-1 gap-2 h-10 rounded-none",
                    userReaction && reactionTypes.find(r => r.type === userReaction)?.color
                  )}
                  onMouseEnter={() => {
                    setHasInteracted(true);
                    setShowReactions(true);
                  }}
                  onTouchStart={handleInteractionStart}
                  onClick={() => handleReaction(userReaction ? "remove" : "like")}
                  data-testid="button-like"
                >
                  {userReaction ? (
                    (() => {
                      const reaction = reactionTypes.find(r => r.type === userReaction);
                      const Icon = reaction?.icon || ThumbsUp;
                      return <Icon className="w-5 h-5" />;
                    })()
                  ) : (
                    <ThumbsUp className="w-5 h-5" />
                  )}
                  <span className="text-sm font-medium">
                    {userReaction 
                      ? reactionTypes.find(r => r.type === userReaction)?.label || "Like"
                      : "Like"
                    }
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-auto p-2 flex gap-1" 
                side="top"
                onMouseLeave={() => setShowReactions(false)}
              >
                {reactionTypes.map((reaction) => {
                  const Icon = reaction.icon;
                  return (
                    <button
                      key={reaction.type}
                      onClick={() => handleReaction(reaction.type)}
                      className={cn(
                        "p-2 rounded-full hover:bg-muted transition-all hover:scale-110",
                        reaction.color
                      )}
                      title={reaction.label}
                      data-testid={`button-reaction-${reaction.type}`}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>

            {/* Comment Button */}
            <Button
              variant="ghost"
              className="flex-1 gap-2 h-10 sm:h-11 rounded-none text-muted-foreground"
              onClick={onCommentClick}
              data-testid="button-comment"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Comment</span>
            </Button>

            {/* Share Button */}
            <Button
              variant="ghost"
              className="flex-1 gap-2 h-10 sm:h-11 rounded-none text-muted-foreground"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: title,
                    text: description,
                    url: `${window.location.origin}/incident/${incidentId}`,
                  });
                }
              }}
              data-testid="button-share"
            >
              <Share2 className="w-5 h-5" />
              <span className="text-sm font-medium">Share</span>
            </Button>
          </div>
        </div>
      </CardContent>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        entityType="incident"
        entityId={incidentId}
        entityTitle={title}
      />
    </Card>
  );
}
```

#### client/src/components/incident-report-form.tsx
```typescript
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Navigation, Camera, Upload, Image, CheckCircle, MapPin, PenSquare, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { ObjectUploader } from "@/components/ObjectUploader";

const reportIncidentSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  subcategoryId: z.string().min(1, "Subcategory is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  policeNotified: z.enum(["yes", "no", "not_needed", "unsure"]).optional(),
  photoUrl: z.string().optional(),
});

type ReportIncidentData = z.infer<typeof reportIncidentSchema>;

export type EntryPoint = "photo" | "location" | "post";

interface IncidentReportFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialLocation?: string;
  entryPoint?: EntryPoint;
}

const entryPointConfig = {
  photo: {
    icon: Camera,
    label: "Share Photo",
    color: "bg-green-500",
    description: "Add a photo and share what you've seen",
  },
  location: {
    icon: MapPin,
    label: "Report Location",
    color: "bg-red-500",
    description: "Report something at a specific location",
  },
  post: {
    icon: PenSquare,
    label: "Create Post",
    color: "bg-primary",
    description: "Share what's happening in your area",
  },
};

export function IncidentReportForm({ isOpen, onClose, initialLocation, entryPoint = "post" }: IncidentReportFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string>("");
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [hasAutoTriggeredGPS, setHasAutoTriggeredGPS] = useState(false);
  const [lastEntryPoint, setLastEntryPoint] = useState<EntryPoint>(entryPoint);
  
  // Simple state for categories and subcategories
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  
  const config = entryPointConfig[entryPoint];
  const IconComponent = config.icon;
  
  const form = useForm<ReportIncidentData>({
    resolver: zodResolver(reportIncidentSchema),
    defaultValues: {
      categoryId: "",
      subcategoryId: "",
      title: "",
      description: "",
      location: initialLocation || "",
      policeNotified: "unsure",
      photoUrl: "",
    },
  });
  
  // Load categories when modal opens
  useEffect(() => {
    if (isOpen && categories.length === 0) {
      loadCategories();
    }
  }, [isOpen]);
  
  // Handle entry point changes and modal open/close
  useEffect(() => {
    if (isOpen) {
      // Reset GPS trigger if entry point changed
      if (entryPoint !== lastEntryPoint) {
        setHasAutoTriggeredGPS(false);
        setLastEntryPoint(entryPoint);
      }
      
      // Focus title input when entry point is "post"
      if (entryPoint === "post") {
        setTimeout(() => {
          form.setFocus("title");
        }, 100);
      }
      
      // Auto-trigger GPS when entry point is "location"
      if (entryPoint === "location" && !hasAutoTriggeredGPS) {
        setHasAutoTriggeredGPS(true);
        // Prefill with initialLocation if available
        if (initialLocation && !form.getValues("location")) {
          form.setValue("location", initialLocation);
        }
        setTimeout(() => {
          handleGetCurrentLocation();
        }, 300);
      }
    } else {
      // Reset when modal closes
      setHasAutoTriggeredGPS(false);
    }
  }, [isOpen, entryPoint]);
  
  // Load subcategories when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      loadSubcategories(selectedCategoryId);
    } else {
      setSubcategories([]);
    }
  }, [selectedCategoryId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setUploadedPhotoUrl("");
      setSelectedCategoryId("");
    }
  }, [isOpen]);
  
  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setCategoriesLoading(false);
    }
  };
  
  const loadSubcategories = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/subcategories?categoryId=${categoryId}`);
      if (response.ok) {
        const data = await response.json();
        setSubcategories(data);
      }
    } catch (error) {
      console.error("Failed to load subcategories:", error);
      setSubcategories([]);
    }
  };

  // Photo upload functions
  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const responseData = await response.json();
    return {
      method: "PUT" as const,
      url: responseData.uploadURL,
    };
  };

  const handlePhotoUploadStart = () => {
    setIsPhotoUploading(true);
  };

  const handlePhotoUploadComplete = async (result: any) => {
    setIsPhotoUploading(false);
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      
      try {
        const response = await fetch('/api/objects/process-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            uploadURL,
            type: 'incident-photo'
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to process upload');
        }
        
        const data = await response.json();
        const viewURL = data.viewURL;
        
        setUploadedPhotoUrl(viewURL);
        form.setValue("photoUrl", viewURL);
        toast({
          title: "Photo Uploaded",
          description: "Your photo has been uploaded successfully.",
        });
      } catch (error) {
        console.error('Photo processing error:', error);
        toast({
          title: "Upload Processing Failed",
          description: "Failed to process photo. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Upload Failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const reportIncidentMutation = useMutation({
    mutationFn: async (data: ReportIncidentData) => {
      await apiRequest("POST", "/api/posts", data);
    },
    onSuccess: () => {
      toast({
        title: "Post Shared!",
        description: "Your post is now visible to the community.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      form.reset();
      setUploadedPhotoUrl("");
      setSelectedCategoryId("");
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Login Required",
          description: "You need to be logged in to share posts. Redirecting to login...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1500);
        return;
      }
      
      toast({
        title: "Post Failed",
        description: error instanceof Error ? error.message : "Failed to share post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not available",
        description: "Your device doesn't support GPS location services.",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLocation(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      try {
        const response = await fetch(`/api/location/reverse?lat=${lat}&lon=${lon}`);
        if (response.ok) {
          const data = await response.json();
          
          const parts = [];
          if (data.road) parts.push(data.road);
          if (data.suburb) parts.push(data.suburb);
          if (data.postcode) parts.push(data.postcode);
          
          const address = parts.length > 0 ? parts.join(', ') : `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
          form.setValue('location', address);
          
          toast({
            title: "Location found!",
            description: `Set to: ${address}`,
          });
        } else {
          throw new Error('Address lookup failed');
        }
      } catch (error) {
        const coords = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        form.setValue('location', coords);
        toast({
          title: "Location found!",
          description: `Set to coordinates: ${coords}`,
        });
      }
    } catch (error) {
      let errorMessage = "Unable to get your location.";
      
      if ((error as GeolocationPositionError).code === 1) {
        errorMessage = "Location access denied. Please enable location services.";
      } else if ((error as GeolocationPositionError).code === 2) {
        errorMessage = "Location unavailable. Please check your GPS.";
      } else if ((error as GeolocationPositionError).code === 3) {
        errorMessage = "Location request timed out. Please try again.";
      }

      toast({
        title: "Location failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGettingLocation(false);
    }
  };

  const onSubmit = (data: ReportIncidentData) => {
    reportIncidentMutation.mutate(data);
  };

  // Watch form values for preview
  const locationValue = form.watch("location");
  const titleValue = form.watch("title");
  const categoryValue = form.watch("categoryId");
  const subcategoryValue = form.watch("subcategoryId");
  const hasPhoto = !!uploadedPhotoUrl;
  
  // Count required fields completed
  const completedRequired = [
    !!locationValue,
    !!titleValue,
    !!categoryValue,
    !!subcategoryValue,
  ].filter(Boolean).length;

  // Photo Section - memoized to prevent re-renders
  const photoSection = useMemo(() => (
    <div key="photo-section" className={`p-4 ${entryPoint === "photo" ? "bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500" : "bg-muted/30"}`}>
      <div className="flex items-center gap-2 mb-3">
        <Camera className="w-5 h-5 text-green-600 dark:text-green-400" />
        <span className="font-medium">Photo</span>
        {hasPhoto && <Badge variant="secondary" className="text-xs">Added</Badge>}
      </div>
      <FormField
        control={form.control}
        name="photoUrl"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="space-y-3">
                {uploadedPhotoUrl ? (
                  <div className="relative">
                    <div className="relative overflow-hidden rounded-xl border border-border">
                      <img
                        src={uploadedPhotoUrl}
                        alt="Uploaded photo"
                        className="w-full h-32 object-cover"
                        data-testid="img-uploaded-photo"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setUploadedPhotoUrl("");
                          form.setValue("photoUrl", "");
                        }}
                        className="absolute top-2 right-2"
                        data-testid="button-remove-photo"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-xl p-4 text-center bg-background">
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Add a photo (optional)
                    </p>
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={5242880}
                      onGetUploadParameters={handleGetUploadParameters}
                      onStart={handlePhotoUploadStart}
                      onComplete={handlePhotoUploadComplete}
                      buttonClassName="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm"
                    >
                      <Camera className="w-4 h-4" />
                      Choose Photo
                    </ObjectUploader>
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  ), [entryPoint, hasPhoto, uploadedPhotoUrl, form.control]);

  // Location Section - memoized to prevent re-renders
  const locationSection = useMemo(() => (
    <div key="location-section" className={`p-4 ${entryPoint === "location" ? "bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500" : "bg-muted/30"}`}>
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-5 h-5 text-red-600 dark:text-red-400" />
        <span className="font-medium">Location</span>
        <span className="text-xs text-destructive">*required</span>
        {locationValue && <Badge variant="secondary" className="text-xs ml-auto">Set</Badge>}
      </div>
      <FormField
        control={form.control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="space-y-2">
                <LocationAutocomplete
                  value={field.value}
                  onChange={(location) => {
                    field.onChange(location);
                  }}
                  onClear={() => {
                    field.onChange("");
                  }}
                  placeholder="Enter address or landmark..."
                  disabled={false}
                />
                <Button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={isGettingLocation}
                  variant="outline"
                  className="w-full gap-2"
                  data-testid="button-use-gps-location"
                >
                  {isGettingLocation ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Finding your location...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4" />
                      Use My Current Location
                    </>
                  )}
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  ), [entryPoint, locationValue, isGettingLocation, form.control]);

  // Details Section - memoized to prevent re-renders
  const detailsSection = useMemo(() => (
    <div key="details-section" className={`p-4 space-y-4 ${entryPoint === "post" ? "bg-primary/5 border-l-4 border-primary" : "bg-muted/30"}`}>
      <div className="flex items-center gap-2">
        <PenSquare className="w-5 h-5 text-primary" />
        <span className="font-medium">Post Details</span>
        <span className="text-xs text-destructive">*required</span>
      </div>
      
      {/* Title */}
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>What's happening?</FormLabel>
            <FormControl>
              <Input
                placeholder="Brief description..."
                {...field}
                data-testid="input-incident-title"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Category Selection */}
      <FormField
        control={form.control}
        name="categoryId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Category</FormLabel>
            <Select 
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                setSelectedCategoryId(value);
                form.setValue("subcategoryId", "");
              }}
            >
              <FormControl>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
              </FormControl>
              <SelectContent position="popper" sideOffset={4} className="z-[9999]" side="bottom" align="start">
                {categoriesLoading ? (
                  <div className="px-2 py-2 text-sm text-muted-foreground">Loading...</div>
                ) : categories.length > 0 ? (
                  categories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-2 text-sm text-muted-foreground">No categories</div>
                )}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Subcategory Selection */}
      {selectedCategoryId && (
        <FormField
          control={form.control}
          name="subcategoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger data-testid="select-subcategory">
                    <SelectValue placeholder="Choose type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent position="popper" sideOffset={4} className="z-[9999]" side="bottom" align="start">
                  {(subcategories as any[]).map((subcategory: any) => (
                    <SelectItem key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Description */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Additional Details (Optional)</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Add more context..."
                className="min-h-16"
                {...field}
                data-testid="textarea-incident-description"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Police Notified */}
      <FormField
        control={form.control}
        name="policeNotified"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Authorities notified? (if applicable)</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger data-testid="select-police-notified">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
              </FormControl>
              <SelectContent position="popper" sideOffset={4} className="z-[9999]" side="bottom" align="start">
                <SelectItem value="yes">Yes - Authorities notified</SelectItem>
                <SelectItem value="no">No - Not yet contacted</SelectItem>
                <SelectItem value="not_needed">Not applicable</SelectItem>
                <SelectItem value="unsure">Unsure</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  ), [entryPoint, selectedCategoryId, categories, subcategories, categoriesLoading, form.control]);

  // Render sections in order based on entry point
  const renderSections = () => {
    switch (entryPoint) {
      case "photo":
        return (
          <>
            {photoSection}
            {locationSection}
            {detailsSection}
          </>
        );
      case "location":
        return (
          <>
            {locationSection}
            {detailsSection}
            {photoSection}
          </>
        );
      case "post":
      default:
        return (
          <>
            {detailsSection}
            {locationSection}
            {photoSection}
          </>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-lg lg:max-w-xl max-h-[90vh] flex flex-col p-0">
        {/* Custom Header with Entry Point Indicator */}
        <div className="flex-shrink-0 p-4 pb-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${config.color}`}>
                <IconComponent className="w-4 h-4 text-white" />
              </div>
              <DialogTitle className="text-lg">{config.label}</DialogTitle>
            </div>
            <Badge variant={completedRequired === 4 ? "default" : "secondary"} className="text-xs">
              {completedRequired}/4 required
            </Badge>
          </div>
          <DialogDescription className="text-sm">
            {config.description}
          </DialogDescription>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0 divide-y divide-border">
              {renderSections()}

              {/* Submit Buttons */}
              <div className="flex gap-3 p-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  data-testid="button-cancel-report"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={reportIncidentMutation.isPending || isPhotoUploading}
                  className="flex-1"
                  data-testid="button-submit-report"
                >
                  {reportIncidentMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sharing...
                    </div>
                  ) : isPhotoUploading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </div>
                  ) : (
                    "Share Post"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### client/src/components/mobile-nav.tsx
```typescript
import { Link, useLocation } from "wouter";
import { Home, Map, PlusCircle, User, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useViewMode } from "@/contexts/view-mode-context";

export function MobileNav() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { viewMode, setViewMode } = useViewMode();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
    refetchInterval: 30000,
  });
  
  const unreadCount = unreadData?.count || 0;

  const currentPath = location === "/" ? "/feed" : location;
  
  // Check if we're on a feed/map page (where view mode applies)
  const isOnFeedPage = location === "/" || location === "/feed" || location === "/map";
  
  const handleNavClick = (target: string) => {
    if (target === "/feed") {
      if (isOnFeedPage) {
        // Just toggle view mode without navigation - instant!
        setViewMode('feed');
      } else {
        // Navigate to feed page and set view mode
        setViewMode('feed');
        setLocation('/feed');
      }
    } else if (target === "/map") {
      if (isOnFeedPage) {
        // Just toggle view mode without navigation - instant!
        setViewMode('map');
      } else {
        // Navigate to feed page and set view mode
        setViewMode('map');
        setLocation('/feed');
      }
    }
  };

  // Determine active state based on view mode when on feed page
  const isHomeActive = isOnFeedPage && viewMode === 'feed';
  const isMapActive = isOnFeedPage && viewMode === 'map';

  return (
    <nav className="mobile-bottom-nav bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {/* Home/Feed Button - Uses context for instant switching */}
        <button
          onClick={() => handleNavClick('/feed')}
          data-testid="nav-home"
          className={cn(
            "flex flex-col items-center justify-center w-16 h-full relative transition-colors",
            isHomeActive 
              ? "text-blue-600 dark:text-blue-400" 
              : "text-gray-500 dark:text-gray-400"
          )}
        >
          <div className="relative">
            <Home className={cn("w-6 h-6", isHomeActive && "stroke-[2.5px]")} />
          </div>
          <span className={cn(
            "text-[10px] mt-1 font-medium",
            isHomeActive && "font-semibold"
          )}>
            Home
          </span>
        </button>

        {/* Map Button - Uses context for instant switching */}
        <button
          onClick={() => handleNavClick('/map')}
          data-testid="nav-map"
          className={cn(
            "flex flex-col items-center justify-center w-16 h-full relative transition-colors",
            isMapActive 
              ? "text-blue-600 dark:text-blue-400" 
              : "text-gray-500 dark:text-gray-400"
          )}
        >
          <div className="relative">
            <Map className={cn("w-6 h-6", isMapActive && "stroke-[2.5px]")} />
          </div>
          <span className={cn(
            "text-[10px] mt-1 font-medium",
            isMapActive && "font-semibold"
          )}>
            Map
          </span>
        </button>

        {/* Create Post Button - Standard navigation */}
        <Link href={`/create?from=${encodeURIComponent(currentPath)}`}>
          <button
            data-testid="nav-post"
            className="flex flex-col items-center justify-center w-16 h-full relative transition-colors text-gray-500 dark:text-gray-400"
          >
            <div className="relative">
              <PlusCircle className="w-6 h-6" />
            </div>
            <span className="text-[10px] mt-1 font-medium">Post</span>
          </button>
        </Link>

        {/* Notifications Button - Standard navigation */}
        <Link href="/notifications">
          <button
            data-testid="nav-alerts"
            className={cn(
              "flex flex-col items-center justify-center w-16 h-full relative transition-colors",
              location === "/notifications"
                ? "text-blue-600 dark:text-blue-400" 
                : "text-gray-500 dark:text-gray-400"
            )}
          >
            <div className="relative">
              <Bell className={cn("w-6 h-6", location === "/notifications" && "stroke-[2.5px]")} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <span className={cn(
              "text-[10px] mt-1 font-medium",
              location === "/notifications" && "font-semibold"
            )}>
              Alerts
            </span>
          </button>
        </Link>

        {/* Profile Button - Standard navigation */}
        <Link href="/profile">
          <button
            data-testid="nav-profile"
            className={cn(
              "flex flex-col items-center justify-center w-16 h-full relative transition-colors",
              location === "/profile"
                ? "text-blue-600 dark:text-blue-400" 
                : "text-gray-500 dark:text-gray-400"
            )}
          >
            <div className="relative">
              <User className={cn("w-6 h-6", location === "/profile" && "stroke-[2.5px]")} />
            </div>
            <span className={cn(
              "text-[10px] mt-1 font-medium",
              location === "/profile" && "font-semibold"
            )}>
              Profile
            </span>
          </button>
        </Link>
      </div>
    </nav>
  );
}
```

#### client/src/components/inline-comments.tsx
```typescript
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageCircle, Heart, Send, X, Reply, Image as ImageIcon } from "lucide-react";
import { getIncidentId } from "@/lib/incident-utils";

interface InlineCommentsProps {
  incident: any;
  onClose: () => void;
}

// Recursive comment component for threaded display - moved outside to prevent re-creation
const Comment = ({ 
  comment, 
  depth = 0, 
  replyingTo, 
  setReplyingTo, 
  replyContent, 
  setReplyContent, 
  handleSubmitReply, 
  user, 
  isAuthenticated, 
  createCommentMutation, 
  getTimeAgo 
}: { 
  comment: any; 
  depth?: number; 
  replyingTo: string | null; 
  setReplyingTo: (id: string | null) => void; 
  replyContent: string; 
  setReplyContent: (content: string) => void; 
  handleSubmitReply: (id: string) => void; 
  user: any; 
  isAuthenticated: boolean; 
  createCommentMutation: any; 
  getTimeAgo: (dateString: string) => string; 
}) => {
  const maxDepth = 3; // Limit nesting depth to avoid UI breaking
  const actualDepth = Math.min(depth, maxDepth);
  
  return (
    <div key={comment.id} className={`${actualDepth > 0 ? 'ml-6 md:ml-8' : ''}`}>
      <div className="flex gap-3">
        <Avatar className="w-9 h-9 md:w-8 md:h-8 flex-shrink-0">
          {comment.user?.profileImageUrl ? (
            <img src={comment.user.profileImageUrl} alt={comment.user?.displayName || 'User'} className="w-full h-full object-cover" />
          ) : (
            <AvatarFallback className="bg-primary text-primary-foreground text-xs md:text-sm">
              {(comment.user?.displayName || comment.user?.firstName || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-background rounded-lg px-3 py-2 md:px-4 md:py-3 shadow-sm border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm md:text-base">
                {comment.user?.firstName && comment.user?.lastName 
                  ? `${comment.user.firstName} ${comment.user.lastName}`
                  : comment.user?.displayName || comment.user?.firstName || 'Anonymous'}
              </span>
              <span className="text-xs md:text-sm text-muted-foreground">
                {getTimeAgo(comment.createdAt)}
              </span>
            </div>
            <p className="text-sm md:text-base text-foreground break-words leading-relaxed">{comment.content}</p>
            
            {/* Photo attachments */}
            {comment.photoUrls && comment.photoUrls.length > 0 && (
              <div className={`mt-3 grid gap-2 ${
                comment.photoUrls.length === 1 ? 'grid-cols-1' : 
                comment.photoUrls.length === 2 ? 'grid-cols-2' : 
                'grid-cols-2 md:grid-cols-3'
              }`}>
                {comment.photoUrls.map((url: string, index: number) => (
                  <img 
                    key={index}
                    src={url} 
                    alt={`Photo ${index + 1}`}
                    className="w-full h-32 md:h-40 object-cover rounded border border-border cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(url, '_blank');
                    }}
                    data-testid={`img-comment-photo-${comment.id}-${index}`}
                  />
                ))}
              </div>
            )}
            
            {/* Reply button */}
            {actualDepth < maxDepth && (
              <div className="mt-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setReplyingTo(replyingTo === comment.id ? null : comment.id);
                  }}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  data-testid={`button-reply-${comment.id}`}
                >
                  <Reply className="w-3 h-3 mr-1" />
                  Reply
                </Button>
              </div>
            )}
          </div>
          
          {/* Reply form */}
          {replyingTo === comment.id && (
            <div className="mt-3 flex gap-2">
              <Avatar className="w-7 h-7 flex-shrink-0">
                {user?.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt={user?.displayName || 'You'} className="w-full h-full object-cover" />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {(user?.displayName || user?.firstName || 'Y').charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Write a reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSubmitReply(comment.id);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  disabled={!isAuthenticated || createCommentMutation.isPending}
                  className="flex-1 px-2 py-1 text-sm rounded border border-border bg-background focus:ring-1 focus:ring-primary focus:border-transparent outline-none disabled:opacity-50"
                  data-testid={`input-reply-${comment.id}`}
                />
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleSubmitReply(comment.id);
                  }}
                  disabled={!isAuthenticated || !replyContent.trim() || createCommentMutation.isPending}
                  size="sm"
                  className="h-8 w-8 px-0"
                  data-testid={`button-submit-reply-${comment.id}`}
                >
                  {createCommentMutation.isPending ? (
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Render replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply: any) => (
            <Comment 
              key={reply.id} 
              comment={reply} 
              depth={actualDepth + 1} 
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              handleSubmitReply={handleSubmitReply}
              user={user}
              isAuthenticated={isAuthenticated}
              createCommentMutation={createCommentMutation}
              getTimeAgo={getTimeAgo}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export function InlineComments({ incident, onClose }: InlineCommentsProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const incidentId = getIncidentId(incident);

  // Fetch comments
  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: [`/api/incidents/${incidentId}/social/comments`],
    queryFn: async () => {
      const response = await fetch(`/api/incidents/${incidentId}/social/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: !!incidentId
  });

  const comments = commentsData?.comments || [];

  // Photo upload handler
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (selectedPhotos.length + files.length > 3) {
      toast({
        title: "Too many photos",
        description: "Maximum 3 photos allowed per comment",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file sizes
    const invalidFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast({
        title: "File too large",
        description: "Each photo must be less than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const compressAndConvertPhoto = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        const maxWidth = 1200;
        const maxHeight = 1200;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const convertPhotosToBase64 = async (): Promise<string[]> => {
    if (selectedPhotos.length === 0) return [];
    
    const base64Photos: string[] = [];
    
    for (const photo of selectedPhotos) {
      try {
        const compressedBase64 = await compressAndConvertPhoto(photo);
        base64Photos.push(compressedBase64);
      } catch (error) {
        console.error('Error compressing photo:', error);
      }
    }
    
    return base64Photos;
  };

  // Comment submission
  const createCommentMutation = useMutation({
    mutationFn: async ({ content, parentCommentId, base64Photos }: { content: string; parentCommentId?: string; base64Photos?: string[] }) => {
      return apiRequest("POST", `/api/incidents/${incidentId}/social/comments`, { 
        content, 
        parentCommentId: parentCommentId || null,
        base64Photos: base64Photos || []
      });
    },
    onSuccess: () => {
      setNewComment("");
      setReplyContent("");
      setReplyingTo(null);
      setSelectedPhotos([]);
      setUploadedPhotoUrls([]);
      queryClient.invalidateQueries({ queryKey: [`/api/incidents/${incidentId}/social/comments`] });
      toast({
        title: "Comment posted",
        description: "Your comment has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post comment",
        variant: "destructive",
      });
    },
  });

  const handleSubmitComment = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to log in to comment",
        variant: "destructive",
      });
      return;
    }
    
    if (!newComment.trim()) return;
    
    try {
      setIsUploadingPhotos(true);
      // Convert photos to base64 and send with the comment
      const base64Photos = await convertPhotosToBase64();
      
      // Submit comment with base64 photos
      createCommentMutation.mutate({ 
        content: newComment.trim(),
        base64Photos 
      });
    } catch (error) {
      console.error('Error preparing photos:', error);
      toast({
        title: "Error",
        description: "Failed to process photos",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const handleSubmitReply = (parentCommentId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to log in to reply",
        variant: "destructive",
      });
      return;
    }
    
    if (!replyContent.trim()) return;
    createCommentMutation.mutate({ 
      content: replyContent.trim(), 
      parentCommentId 
    });
  };

  // Organize comments into threaded structure
  const organizeComments = (comments: any[]) => {
    const commentMap = new Map();
    const rootComments: any[] = [];
    
    // First pass: create comment objects with replies array
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });
    
    // Second pass: organize into tree structure
    comments.forEach(comment => {
      if (comment.parentCommentId && commentMap.has(comment.parentCommentId)) {
        // This is a reply, add it to parent's replies
        commentMap.get(comment.parentCommentId).replies.push(commentMap.get(comment.id));
      } else {
        // This is a root comment
        rootComments.push(commentMap.get(comment.id));
      }
    });
    
    return rootComments;
  };

  const getTimeAgo = (dateString: string) => {
    if (!dateString) return 'Unknown time';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };


  const organizedComments = organizeComments(comments);

  return (
    <div className="border-t border-border/50 bg-muted/20">
      <div className="p-4">
        {/* Close button for mobile only */}
        <div className="flex justify-end mb-4 md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-10 w-10 p-0 hover:bg-background min-h-[44px]"
            data-testid="button-close-comments"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Comments List */}
        <div className="space-y-3 md:space-y-4 mb-4">
          {commentsLoading ? (
            <div className="text-center py-4 md:py-6">
              <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm md:text-base text-muted-foreground">Loading comments...</p>
            </div>
          ) : organizedComments.length === 0 ? (
            <div className="text-center py-6 md:py-8">
              <MessageCircle className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm md:text-base text-muted-foreground">No comments yet</p>
              <p className="text-xs md:text-sm text-muted-foreground">Be the first to comment!</p>
            </div>
          ) : (
            organizedComments.map((comment: any) => (
              <Comment 
                key={comment.id} 
                comment={comment} 
                depth={0} 
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                replyContent={replyContent}
                setReplyContent={setReplyContent}
                handleSubmitReply={handleSubmitReply}
                user={user}
                isAuthenticated={isAuthenticated}
                createCommentMutation={createCommentMutation}
                getTimeAgo={getTimeAgo}
              />
            ))
          )}
        </div>

        {/* Comment Input */}
        <div className="flex gap-3">
          <Avatar className="w-9 h-9 md:w-8 md:h-8 flex-shrink-0 mt-1">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt={user?.displayName || 'You'} className="w-full h-full object-cover" />
            ) : (
              <AvatarFallback className="bg-primary text-primary-foreground text-xs md:text-sm">
                {(user?.displayName || user?.firstName || 'Y').charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1">
            <div onClick={(e) => e.stopPropagation()}>
              {/* Photo previews */}
              {selectedPhotos.length > 0 && (
                <div className="mb-2 flex gap-2 flex-wrap">
                  {selectedPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={URL.createObjectURL(photo)} 
                        alt={`Upload ${index + 1}`}
                        className="w-20 h-20 object-cover rounded border border-border"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`button-remove-photo-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Textarea and action buttons */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Textarea
                    placeholder={isAuthenticated ? "Write a comment..." : "Please log in to comment"}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment();
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    disabled={!isAuthenticated || createCommentMutation.isPending || isUploadingPhotos}
                    className="min-h-[100px] resize-none text-sm md:text-base"
                    data-testid="input-comment"
                  />
                  
                  {/* Photo upload button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                    data-testid="input-photo-upload"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!isAuthenticated || selectedPhotos.length >= 3 || createCommentMutation.isPending || isUploadingPhotos}
                    className="mt-2 h-8 text-xs text-muted-foreground hover:text-foreground"
                    data-testid="button-add-photo"
                  >
                    <ImageIcon className="w-4 h-4 mr-1" />
                    Add Photo {selectedPhotos.length > 0 && `(${selectedPhotos.length}/3)`}
                  </Button>
                </div>
                
                <Button
                  onClick={handleSubmitComment}
                  disabled={!isAuthenticated || !newComment.trim() || createCommentMutation.isPending || isUploadingPhotos}
                  size="sm"
                  className="h-12 w-12 md:h-10 md:w-10 px-0 min-h-[44px] md:min-h-[40px] mb-[2px]"
                  data-testid="button-submit-comment"
                >
                  {createCommentMutation.isPending || isUploadingPhotos ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}```

### Hooks
#### client/src/hooks/useAuth.ts
```typescript
import { useQuery, useMutation } from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type LoginData = Pick<InsertUser, "email" | "password">;

export function useAuth() {
  const { toast } = useToast();
  
  const { data: user, error, isLoading } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", {
        credentials: "include",
      });
      
      // For auth endpoint, 401 is expected when not logged in
      if (res.status === 401) {
        return null;
      }
      
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      
      return await res.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      
      // Refresh posts data to ensure fresh information after login
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      
      toast({
        title: "Signed in successfully",
        description: "Loading latest safety data...",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      
      // Refresh posts data for new users
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      
      toast({
        title: "Account created!",
        description: "Loading latest safety data...",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    },
  });

  return {
    user: user ?? null,
    isLoading,
    error,
    isAuthenticated: !!user,
    loginMutation,
    logoutMutation,
    registerMutation,
  };
}```

#### client/src/hooks/use-traffic-data.ts
```typescript
import { useQuery } from "@tanstack/react-query";
import type { FilterState } from "@/types/filters";
import { findRegionBySuburb } from '@/lib/regions';

export interface ProcessedTrafficData {
  events: any[]; // All Queensland data for map
  incidents: any[]; // All Queensland data for map
  regionalEvents: any[]; // User's region data for feed
  regionalIncidents: any[]; // User's region data for feed
  counts: {
    total: number;
    trafficEvents: number;
    emergencyIncidents: number;
    qfesIncidents: number;
    userSafetyCrime: number;
    userWildlife: number;
    userCommunity: number;
    userTraffic: number;
  };
  filteredEvents: any[];
  filteredIncidents: any[];
}

// Shared helper function to identify QFES incidents
const isQFESIncident = (incident: any) => {
  const incidentType = incident.properties?.incidentType?.toLowerCase() || '';
  const groupedType = incident.properties?.GroupedType?.toLowerCase() || '';
  const description = incident.properties?.description?.toLowerCase() || '';
  
  return incidentType.includes('fire') || 
         incidentType.includes('smoke') || 
         incidentType.includes('chemical') || 
         incidentType.includes('hazmat') ||
         groupedType.includes('fire') || 
         groupedType.includes('smoke') || 
         groupedType.includes('chemical') || 
         groupedType.includes('hazmat') ||
         description.includes('fire') || 
         description.includes('smoke');
};

export function useTrafficData(filters: FilterState, viewportBounds?: { southwest: [number, number], northeast: [number, number] }, allowFetchWithoutViewport: boolean = false): ProcessedTrafficData {
  // OPTIMIZED: Fetch viewport-visible posts for map, or all posts for feed
  const { data: unifiedData } = useQuery({
    queryKey: ["/api/posts", viewportBounds],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        // Build query params for viewport filtering (only if bounds provided)
        const params = new URLSearchParams();
        if (viewportBounds) {
          params.set('southwest', `${viewportBounds.southwest[0]},${viewportBounds.southwest[1]}`);
          params.set('northeast', `${viewportBounds.northeast[0]},${viewportBounds.northeast[1]}`);
        }
        
        const response = await fetch(`/api/posts?${params.toString()}`, {
          credentials: 'include',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('Failed to fetch posts');
        return response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    select: (data: any) => data || { type: 'FeatureCollection', features: [] },
    // Enable if viewport bounds available OR if caller allows fetch without viewport (feed page)
    enabled: !!viewportBounds || allowFetchWithoutViewport,
    refetchInterval: filters.autoRefresh ? 30000 : 60 * 1000,
    staleTime: 30000,
    gcTime: 60000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData: any) => previousData,
  });

  // Extract and process all unified features
  const allFeatures = unifiedData?.features || [];
  
  // Separate by source type for backward compatibility
  // Check feature.source first (top-level), then fall back to properties.source
  const allEventsData = allFeatures.filter((feature: any) => {
    const source = feature.source || feature.properties?.source;
    return source === 'tmr'; // Traffic events from TMR source
  });
  
  const allIncidentsData = allFeatures.filter((feature: any) => {
    const source = feature.source || feature.properties?.source;
    // Include emergency, user, or posts without a source (default to user posts)
    return source === 'emergency' || source === 'user' || !source;
  });
  
  // CLIENT-SIDE PROXIMITY-BASED FILTERING - Primary filtering method
  const defaultRadius = 50; // Default 50km radius
  const filterRadius = typeof filters.radius === 'number' ? filters.radius : defaultRadius;
  
  // PROXIMITY-BASED FILTERING: Use distance calculation as primary and only method
  const isWithinProximity = (feature: any) => {
    // If distanceFilter is 'all', include everything
    if (filters.distanceFilter === 'all') {
      return true;
    }
    
    // Require home coordinates for filtering
    if (!filters.homeCoordinates) {
      return false;
    }
    
    // Extract coordinates from incident
    let lng, lat;
    
    // First try to use pre-computed centroid from properties
    if (feature.properties?.centroidLng && feature.properties?.centroidLat) {
      lng = feature.properties.centroidLng;
      lat = feature.properties.centroidLat;
    } else if (feature.geometry?.coordinates) {
      // Fallback to extracting from geometry
      if (feature.geometry.type === 'Point') {
        [lng, lat] = feature.geometry.coordinates;
      } else if (feature.geometry.type === 'MultiPoint' && feature.geometry.coordinates[0]) {
        [lng, lat] = feature.geometry.coordinates[0];
      } else if (feature.geometry.type === 'MultiLineString' && feature.geometry.coordinates[0]?.[0]) {
        [lng, lat] = feature.geometry.coordinates[0][0];
      } else if (feature.geometry.type === 'LineString' && feature.geometry.coordinates[0]) {
        [lng, lat] = feature.geometry.coordinates[0];
      } else {
        return false;
      }
    } else {
      return false;
    }
    
    // Validate extracted coordinates
    if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
      return false;
    }
    
    const homeLng = filters.homeCoordinates.lon;
    const homeLat = filters.homeCoordinates.lat;
    
    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (lat - homeLat) * Math.PI / 180;
    const dLng = (lng - homeLng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(homeLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Check if within configured radius
    const withinRadius = distance <= filterRadius;
    return withinRadius;
  };

  // Apply proximity-based filtering for feed data
  const regionalEventsData = filters.homeCoordinates ? allEventsData.filter(isWithinProximity) : [];
  const regionalIncidentsData = filters.homeCoordinates ? allIncidentsData.filter(isWithinProximity) : [];

  // All data for map display (shows everything)
  const allEvents = Array.isArray(allEventsData) ? allEventsData : [];
  const allIncidents = Array.isArray(allIncidentsData) ? allIncidentsData : [];
  
  // Regional data for feed and counts
  const regionalEvents = Array.isArray(regionalEventsData) ? regionalEventsData : [];
  const regionalIncidents = Array.isArray(regionalIncidentsData) ? regionalIncidentsData : [];
  
  // Categorize REGIONAL incidents for counting in sidebar (user's area only)
  const regionalNonUserIncidents = regionalIncidents.filter((i: any) => !i.properties?.userReported);
  const regionalQfesIncidents = regionalNonUserIncidents.filter(isQFESIncident);
  const regionalEsqIncidents = regionalNonUserIncidents.filter(incident => !isQFESIncident(incident));
  
  // Calculate counts based on REGIONAL data (for filter sidebar)
  const trafficEvents = regionalEvents.length;
  const emergencyIncidents = regionalEsqIncidents.length;
  const qfesIncidentsCount = regionalQfesIncidents.length;
  const userSafetyCrime = regionalIncidents.filter((i: any) => {
    const categoryUuid = i.properties?.categoryUuid || i.properties?.categoryId;
    return i.properties?.userReported && categoryUuid === 'fdff3a2e-a031-4909-936b-875affbc69ba';
  }).length;
  const userWildlife = regionalIncidents.filter((i: any) => {
    const categoryUuid = i.properties?.categoryUuid || i.properties?.categoryId;
    return i.properties?.userReported && categoryUuid === '6cfdf282-1f8d-44c8-9661-24b73a88a834';
  }).length;
  const userCommunity = regionalIncidents.filter((i: any) => {
    const categoryUuid = i.properties?.categoryUuid || i.properties?.categoryId;
    return i.properties?.userReported && categoryUuid === '1f57674d-0cbd-47be-950f-3c94c4f14e41';
  }).length;
  const userTraffic = regionalIncidents.filter((i: any) => {
    const categoryUuid = i.properties?.categoryUuid || i.properties?.categoryId;
    return i.properties?.userReported && categoryUuid === 'dca6e799-6d6b-420b-9ed2-d63fc16594d3';
  }).length;
  const userLostFound = regionalIncidents.filter((i: any) => {
    const categoryUuid = i.properties?.categoryUuid || i.properties?.categoryId;
    return i.properties?.userReported && categoryUuid === '10e3cad6-d03a-4101-99b0-91199b5f9928';
  }).length;
  const userPets = regionalIncidents.filter((i: any) => {
    const categoryUuid = i.properties?.categoryUuid || i.properties?.categoryId;
    return i.properties?.userReported && categoryUuid === '3cbcb810-508f-4619-96c2-0357ca517cca';
  }).length;
  
  const counts = {
    total: trafficEvents + emergencyIncidents + qfesIncidentsCount + userSafetyCrime + userWildlife + userCommunity + userTraffic + userLostFound + userPets,
    trafficEvents,
    emergencyIncidents,
    qfesIncidents: qfesIncidentsCount,
    userSafetyCrime,
    userWildlife,
    userCommunity,
    userTraffic,
    userLostFound,
    userPets,
  };

  // Apply filtering for display based on ALL data (for map)
  const filteredEvents = filters.showTrafficEvents ? allEvents : [];
  
  const filteredIncidents = allIncidents.filter((incident: any) => {
    const isUserReported = incident.properties?.userReported;
    
    if (isUserReported) {
      const categoryUuid = incident.properties?.categoryUuid || incident.properties?.categoryId;
      
      if (categoryUuid === 'fdff3a2e-a031-4909-936b-875affbc69ba') { // Safety & Crime
        return filters.showUserSafetyCrime === true;
      } else if (categoryUuid === '6cfdf282-1f8d-44c8-9661-24b73a88a834') { // Wildlife & Nature
        return filters.showUserWildlife === true;
      } else if (categoryUuid === 'dca6e799-6d6b-420b-9ed2-d63fc16594d3') { // Infrastructure & Hazards (Traffic)
        return filters.showUserTraffic === true;
      } else if (categoryUuid === '1f57674d-0cbd-47be-950f-3c94c4f14e41') { // Community Issues
        return filters.showUserCommunity === true;
      } else if (categoryUuid === '10e3cad6-d03a-4101-99b0-91199b5f9928') { // Lost & Found
        return filters.showUserLostFound === true;
      } else if (categoryUuid === '3cbcb810-508f-4619-96c2-0357ca517cca') { // Pets
        return filters.showUserPets === true;
      } else if (categoryUuid === '4e2fb550-3288-45f7-8e0f-dcc2e18783bb') { // Emergency Situations
        return filters.showIncidents === true;
      } else {
        // Fallback for unknown categories - show with community issues
        return filters.showUserCommunity === true;
      }
    } else {
      // Official incidents
      const isQFES = isQFESIncident(incident);
      if (isQFES) {
        return filters.showQFES === true;
      } else {
        return filters.showIncidents === true;
      }
    }
  });

  // 🎯 UNIFIED DATA PIPELINE: Both map and feed use the same source data
  // Feed will filter this data at the component level for personalization
  const unifiedEvents = allEvents;
  const unifiedIncidents = allIncidents;

  return {
    // UNIFIED: Both map and feed get the same source data
    events: unifiedEvents,
    incidents: unifiedIncidents,
    // Legacy support for regional data (now used only for filtering)
    regionalEvents,
    regionalIncidents,
    counts,
    filteredEvents,
    filteredIncidents,
    // NEW: Flag to indicate which data should be used  
    // dataSource: 'unified' as const
  };
}```

#### client/src/hooks/use-clustered-markers.ts
```typescript
import { useMemo, useRef, useCallback } from 'react';
import Supercluster from 'supercluster';

export interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  markerType: string;
  color: string;
  feature: any;
  timestamp: number;
  agePercentage: number; // 0 = fresh, 1 = expired (for fade-out effect)
}

export interface ClusterPoint {
  type: 'Feature';
  properties: {
    cluster: false;
    id: string;
    markerType: string;
    color: string;
    feature: any;
    timestamp: number;
    agePercentage: number;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface ClusterData {
  type: 'Feature';
  properties: {
    cluster: true;
    cluster_id: number;
    point_count: number;
    point_count_abbreviated: string | number;
    dominantType: string;
    dominantColor: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export type ClusterOrPoint = ClusterData | ClusterPoint;

interface UseClusteredMarkersOptions {
  radius?: number;
  maxZoom?: number;
  minZoom?: number;
}

export function useClusteredMarkers(
  markers: MarkerData[],
  options: UseClusteredMarkersOptions = {}
) {
  const { radius = 60, maxZoom = 16, minZoom = 0 } = options;
  
  const superclusterRef = useRef<Supercluster | null>(null);

  const points = useMemo(() => {
    return markers.map((marker): ClusterPoint => ({
      type: 'Feature',
      properties: {
        cluster: false,
        id: marker.id,
        markerType: marker.markerType,
        color: marker.color,
        feature: marker.feature,
        timestamp: marker.timestamp,
        agePercentage: marker.agePercentage,
      },
      geometry: {
        type: 'Point',
        coordinates: [marker.lng, marker.lat],
      },
    }));
  }, [markers]);

  const supercluster = useMemo(() => {
    const index = new Supercluster({
      radius,
      maxZoom,
      minZoom,
      // Preserve ALL original properties, plus add aggregation fields for clusters
      map: (props: any) => ({
        // Preserve original point properties for non-cluster rendering
        id: props.id,
        markerType: props.markerType,
        color: props.color,
        feature: props.feature,
        timestamp: props.timestamp,
        agePercentage: props.agePercentage,
        cluster: false,
        // Aggregation fields for cluster stats
        count: 1,
        typeCounts: { [props.markerType]: 1 },
        colorCounts: { [props.color]: 1 },
      }),
      reduce: (accumulated: any, props: any) => {
        accumulated.count = (accumulated.count || 0) + (props.count || 1);
        if (!accumulated.typeCounts) {
          accumulated.typeCounts = {};
        }
        if (props.typeCounts) {
          for (const [type, count] of Object.entries(props.typeCounts)) {
            accumulated.typeCounts[type] = (accumulated.typeCounts[type] || 0) + (count as number);
          }
        }
        if (!accumulated.colorCounts) {
          accumulated.colorCounts = {};
        }
        if (props.colorCounts) {
          for (const [color, count] of Object.entries(props.colorCounts)) {
            accumulated.colorCounts[color] = (accumulated.colorCounts[color] || 0) + (count as number);
          }
        }
      },
    });
    
    index.load(points);
    superclusterRef.current = index;
    return index;
  }, [points, radius, maxZoom, minZoom]);

  const getClusters = useCallback(
    (bounds: { west: number; south: number; east: number; north: number }, zoom: number): ClusterOrPoint[] => {
      if (!supercluster) return [];
      
      const clusters = supercluster.getClusters(
        [bounds.west, bounds.south, bounds.east, bounds.north],
        Math.floor(zoom)
      );

      return clusters.map((cluster: any) => {
        if (cluster.properties.cluster) {
          const typeCounts = cluster.properties.typeCounts || {};
          const colorCounts = cluster.properties.colorCounts || {};
          
          let dominantType = 'traffic';
          let maxTypeCount = 0;
          for (const [type, count] of Object.entries(typeCounts)) {
            if ((count as number) > maxTypeCount) {
              maxTypeCount = count as number;
              dominantType = type;
            }
          }
          
          let dominantColor = '#6b7280';
          let maxColorCount = 0;
          for (const [color, count] of Object.entries(colorCounts)) {
            if ((count as number) > maxColorCount) {
              maxColorCount = count as number;
              dominantColor = color;
            }
          }

          return {
            type: 'Feature',
            properties: {
              cluster: true,
              cluster_id: cluster.properties.cluster_id,
              point_count: cluster.properties.point_count,
              point_count_abbreviated: cluster.properties.point_count_abbreviated,
              dominantType,
              dominantColor,
            },
            geometry: cluster.geometry,
          } as ClusterData;
        } else {
          return cluster as ClusterPoint;
        }
      });
    },
    [supercluster]
  );

  const getClusterExpansionZoom = useCallback(
    (clusterId: number): number => {
      if (!supercluster) return 16;
      try {
        return supercluster.getClusterExpansionZoom(clusterId);
      } catch {
        return 16;
      }
    },
    [supercluster]
  );

  const getClusterLeaves = useCallback(
    (clusterId: number, limit: number = 100): ClusterPoint[] => {
      if (!supercluster) return [];
      try {
        return supercluster.getLeaves(clusterId, limit) as ClusterPoint[];
      } catch {
        return [];
      }
    },
    [supercluster]
  );

  return {
    getClusters,
    getClusterExpansionZoom,
    getClusterLeaves,
    pointCount: points.length,
  };
}
```

#### client/src/hooks/use-push-notifications.ts
```typescript
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      checkSubscriptionStatus();
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported on this device.",
        variant: "destructive",
      });
      return false;
    }

    if (permission === 'granted') {
      return true;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      toast({
        title: "Notifications Enabled",
        description: "You'll now receive safety alerts for your area.",
      });
      return true;
    } else if (result === 'denied') {
      toast({
        title: "Notifications Blocked",
        description: "Please enable notifications in your browser settings to receive safety alerts.",
        variant: "destructive",
      });
      return false;
    }

    return false;
  };

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported || permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    setIsLoading(true);

    try {
      console.log('[Push] Starting subscription process...');
      
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[Push] Service worker registered');
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('[Push] Service worker ready');

      // Get VAPID public key from API (works in both dev and production)
      console.log('[Push] Fetching VAPID key from API...');
      const vapidResponse = await fetch('/api/push/vapid-key');
      if (!vapidResponse.ok) {
        throw new Error('VAPID public key not configured - push notifications unavailable');
      }
      const { publicKey: vapidPublicKey } = await vapidResponse.json();
      console.log('[Push] VAPID key available:', !!vapidPublicKey);

      // Get or create push subscription
      console.log('[Push] Creating push subscription...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      console.log('[Push] Push subscription created:', subscription.endpoint.substring(0, 50) + '...');

      // Send subscription to backend
      console.log('[Push] Sending subscription to backend...');
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
              auth: arrayBufferToBase64(subscription.getKey('auth')!)
            }
          }
        })
      });

      console.log('[Push] Backend response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Push] Backend error:', errorText);
        throw new Error(`Failed to save subscription: ${response.status} - ${errorText}`);
      }

      setIsSubscribed(true);
      toast({
        title: "Notifications Enabled",
        description: "You'll receive safety alerts for incidents in your area.",
      });
      
      console.log('[Push] Subscription complete!');
      return true;
    } catch (error: any) {
      console.error('[Push] Error subscribing to push notifications:', error);
      console.error('[Push] Error details:', error?.message, error?.stack);
      toast({
        title: "Subscription Failed",
        description: error?.message || "Unable to enable push notifications. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push notifications
        await subscription.unsubscribe();
        
        // Remove subscription from backend
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            endpoint: subscription.endpoint
          })
        });
      }

      setIsSubscribed(false);
      toast({
        title: "Notifications Disabled",
        description: "You will no longer receive push notifications.",
      });
      
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast({
        title: "Unsubscribe Failed",
        description: "Unable to disable push notifications. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    requestPermission
  };
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}```

### Lib/Utilities
#### client/src/lib/incident-aging.ts
```typescript
/**
 * Smart incident aging system - determines how long incidents remain visible
 * and their opacity based on category, severity, and time elapsed
 */

// Unified 12-hour aging system with gradual visual stages
export const AGING_TIERS = {
  standard: 12, // 12 hours for all incidents with gradual fading
  major: 12     // 12 hours for all incidents (unified timeline)
};

/**
 * Choose aging tier based on incident significance
 */
export function chooseTier(incident: {
  category: string;
  severity?: string;
  status?: string;
  source?: string;
  properties?: any;
}): 'standard' | 'major' {
  // Normalize status for case-insensitive comparison
  const normalizedStatus = incident.status?.toLowerCase();
  const normalizedSeverity = incident.severity?.toLowerCase();
  
  // Major tier for clearly significant incidents
  if (
    // Emergency services with active status
    (incident.source === 'emergency' || incident.source === 'qfes') && normalizedStatus === 'active' ||
    // Multiple vehicles on scene
    incident.properties?.VehiclesOnScene >= 3 ||
    // High impact traffic events
    incident.properties?.impact_type === 'major' ||
    // High/critical severity
    normalizedSeverity === 'high' || normalizedSeverity === 'critical'
  ) {
    return 'major';
  }
  
  // Everything else uses standard tier
  return 'standard';
}


export interface IncidentAgingData {
  agePercentage: number;
  isVisible: boolean;
  timeRemaining: number; // minutes
  shouldAutoHide: boolean;
}

/**
 * Calculate aging data for an incident based on its properties
 */
export function calculateIncidentAging(incident: {
  category: string;
  severity?: string;
  status?: string;
  source?: string;
  lastUpdated: string;
  incidentTime?: string;
  properties?: any;
}, options?: {
  agingSensitivity?: 'normal' | 'extended' | 'disabled';
  showExpiredIncidents?: boolean;
}): IncidentAgingData {
  // Handle aging sensitivity options
  const agingSensitivity = options?.agingSensitivity || 'normal';
  const showExpiredIncidents = options?.showExpiredIncidents || false;
  
  // If aging is disabled, always show indefinitely
  if (agingSensitivity === 'disabled') {
    return {
      agePercentage: 0,
      isVisible: true,
      timeRemaining: Infinity,
      shouldAutoHide: false
    };
  }
  
  // Choose tier and get base TTL hours
  const tier = chooseTier(incident);
  const ttlHours = AGING_TIERS[tier];
  
  // Apply aging sensitivity multiplier
  let sensitivityMultiplier = 1.0;
  if (agingSensitivity === 'extended') {
    sensitivityMultiplier = 1.5; // 50% longer visibility
  }
  
  // Calculate total duration in milliseconds
  const totalDurationHours = ttlHours * sensitivityMultiplier;
  const totalDurationMs = totalDurationHours * 60 * 60 * 1000;
  
  // Calculate time elapsed since incident
  const referenceTime = incident.incidentTime || incident.lastUpdated;
  const timeElapsed = Date.now() - new Date(referenceTime).getTime();
  
  // Calculate age percentage
  const agePercentage = Math.max(0, Math.min(timeElapsed / totalDurationMs, 1.0));
  
  // Calculate time remaining
  const timeRemainingMs = Math.max(0, totalDurationMs - timeElapsed);
  const timeRemainingMinutes = Math.floor(timeRemainingMs / (60 * 1000));
  
  // Determine visibility - auto-hide all incidents past aging duration
  const shouldAutoHide = agePercentage >= 1.0 && !showExpiredIncidents;
  const isVisible = !shouldAutoHide;
  
  return {
    agePercentage,
    isVisible,
    timeRemaining: timeRemainingMinutes,
    shouldAutoHide
  };
}

/**
 * Get aging summary for display in UI
 */
export function getAgingSummary(agingData: IncidentAgingData): string {
  if (!agingData.isVisible) {
    return 'Hidden (expired)';
  }
  
  if (agingData.timeRemaining > 60) {
    const hoursRemaining = Math.floor(agingData.timeRemaining / 60);
    return `${hoursRemaining}h remaining`;
  } else if (agingData.timeRemaining > 0) {
    return `${agingData.timeRemaining}m remaining`;
  } else {
    return 'Expiring soon';
  }
}

/**
 * Check if an incident should be refreshed based on its age
 */
export function shouldRefreshIncident(incident: {
  lastUpdated: string;
  status: string;
}): boolean {
  const timeSinceUpdate = Date.now() - new Date(incident.lastUpdated).getTime();
  const hoursSinceUpdate = timeSinceUpdate / (60 * 60 * 1000);
  
  // Refresh active incidents more frequently
  if (incident.status === 'active') {
    return hoursSinceUpdate > 0.5; // 30 minutes
  }
  
  // Refresh other incidents less frequently
  return hoursSinceUpdate > 2; // 2 hours
}

/**
 * Color interpolation utilities for aging system
 */

// Convert hex color to RGB values
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Convert RGB values to hex color
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) => {
    const hex = Math.round(value).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Interpolate between two colors based on percentage (0-1)
export function interpolateColors(color1: string, color2: string, percentage: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) {
    return color1; // fallback to original color if parsing fails
  }
  
  // Clamp percentage to 0-1 range
  const t = Math.max(0, Math.min(1, percentage));
  
  // Linear interpolation for each color component
  const r = rgb1.r + (rgb2.r - rgb1.r) * t;
  const g = rgb1.g + (rgb2.g - rgb1.g) * t;
  const b = rgb1.b + (rgb2.b - rgb1.b) * t;
  
  return rgbToHex(r, g, b);
}

// Get aged color that gradually shifts from original to grey
export function getAgedColor(originalColor: string, agePercentage: number): string {
  const greyColor = '#e5e7eb'; // Light grey color for aged incidents - much more subtle
  
  // Use a smoother curve for color aging - slower at first, faster later
  const colorAgePercentage = Math.pow(agePercentage, 1.5);
  
  return interpolateColors(originalColor, greyColor, colorAgePercentage);
}```

#### client/src/lib/incident-utils.ts
```typescript
/**
 * Utility functions for handling incident data
 */

export function getIncidentId(incident: any): string | null {
  if (!incident) return null;

  // Try different possible ID fields from the unified structure
  if (incident.id) return incident.id;
  if (incident.properties?.id) return incident.properties.id;
  
  // For TMR incidents - check for TMR source and get ID from properties
  if (incident.source === 'tmr' || incident.properties?.source === 'tmr') {
    const tmrId = incident.properties?.id;
    if (tmrId) {
      return `tmr:${tmrId}`;
    }
  }
  
  // For emergency incidents
  if (incident.properties?.Master_Incident_Number) {
    return `esq:${incident.properties.Master_Incident_Number}`;
  }
  if (incident.properties?.Incident_Number) {
    return `esq:${incident.properties.Incident_Number}`;
  }
  if (incident.properties?.IncidentNumber) {
    return `esq:${incident.properties.IncidentNumber}`;
  }
  
  // For user reports
  if (incident.properties?.userReported && incident.properties?.reporterId) {
    return incident.properties.reporterId;
  }
  
  // Fallback: create a deterministic ID from available data
  const eventType = incident.properties?.Event_Type || incident.properties?.event_type || '';
  const description = incident.properties?.description || '';
  const location = incident.properties?.Location || incident.properties?.location || '';
  
  if (eventType || description || location) {
    return `generated:${eventType}-${description}-${location}`.replace(/[^a-zA-Z0-9:-]/g, '-');
  }
  
  return null;
}

export function getIncidentTitle(incident: any): string {
  if (!incident) return 'Unknown Incident';
  
  // Use the unified structure title if available
  if (incident.properties?.title) {
    return incident.properties.title;
  }
  
  // Fallback to other title fields
  if (incident.title) return incident.title;
  if (incident.properties?.Event_Type) return incident.properties.Event_Type;
  if (incident.properties?.event_type) return incident.properties.event_type;
  if (incident.properties?.description) return incident.properties.description;
  
  return 'Incident';
}

export function getIncidentLocation(incident: any): string {
  if (!incident) return 'Unknown Location';
  
  // Use the unified structure location if available
  if (incident.properties?.location) {
    return incident.properties.location;
  }
  
  // Fallback to other location fields
  if (incident.location) return incident.location;
  if (incident.properties?.Location) return incident.properties.Location;
  if (incident.properties?.Locality) return incident.properties.Locality;
  
  // For traffic events, try road summary
  const roadInfo = incident.properties?.road_summary;
  if (roadInfo?.road_name && roadInfo?.locality) {
    return `${roadInfo.road_name}, ${roadInfo.locality}`;
  }
  if (roadInfo?.road_name) return roadInfo.road_name;
  if (roadInfo?.locality) return roadInfo.locality;
  
  return 'Location not specified';
}

// Category UUID to human name mappings based on actual database UUIDs
const CATEGORY_MAPPINGS: Record<string, string> = {
  '5e39584c-de45-45d6-ae4b-a0fb048a70f1': 'Safety & Crime',
  'ec2f7fc1-ffe3-4efb-bd42-ab1a2645325e': 'Infrastructure & Hazards',
  '0a250604-2cd7-4a7c-8d98-5567c403e514': 'Emergency Situations',
  '84218599-712d-49c3-8458-7a9153519e5d': 'Wildlife & Nature',
  '0c3251ec-e3aa-4bef-8c17-960d73f8cbdc': 'Community Issues',
  '1f45d947-a688-4fa7-b8bd-e80c9f91a4d9': 'Pets',
  '796a25d1-58b1-444e-8520-7ed8a169b5ad': 'Lost & Found'
};

const SUBCATEGORY_MAPPINGS: Record<string, string> = {
  // Safety & Crime
  '4bf4f9e3-8b4e-4ed7-87f2-df13d92ad598': 'Violence & Threats',
  '14e7c586-54b0-48f7-900a-efe0465afce2': 'Theft & Property Crime',
  'bdf75914-8a51-449c-b63e-905eb36b9ce2': 'Suspicious Activity',
  '782d8d63-6877-4a7f-ac6c-097188c5645c': 'Public Disturbances',
  
  // Infrastructure & Hazards
  '7282c862-0977-472d-a795-b33355fc04a8': 'Road Hazards',
  '32284643-ea49-4b2c-a23a-2a18da14f7d8': 'Utility Issues',
  'a0b701b9-9ed4-4ef9-897f-0cf9d348b3ac': 'Building Problems',
  '72426b0d-b297-4d64-af14-627c4562336a': 'Environmental Hazards',
  
  // Emergency Situations
  '8f4abb73-e944-48c3-98c7-5c96b4f6e57e': 'Fire & Smoke',
  'd10959cd-6da7-4a9a-bc9e-0f27c346b30e': 'Medical Emergencies',
  '4f2ae0bc-65e8-4e76-a045-6ce97f83afda': 'Natural Disasters',
  '1287eadf-5a31-496d-8233-8e879b4ba99d': 'Chemical/Hazmat',
  
  // Wildlife & Nature
  'bbdb5e60-3582-4c33-96c7-3899df86615c': 'Dangerous Animals',
  '3380e790-e3f5-47b8-8409-79523c922720': 'Animal Welfare',
  '017aa46f-1a36-4db4-9d51-87f2bca35442': 'Environmental Issues',
  'be8839dc-58c9-4713-9f5e-aa4fca26ea81': 'Pest Problems',
  
  // Community Issues
  '55c207c9-1e65-4541-9d4d-3c1f48d04c79': 'Noise Complaints',
  '374a4c8c-7c56-4963-b14b-736e461eafcd': 'Traffic Issues',
  '8538f32a-4128-4535-9ae3-66eb2b5f3ca7': 'Public Space Problems',
  'd8af0a90-a3af-4842-a211-772463cbe2e7': 'Events & Gatherings',
  
  // Pets
  '717add8e-7168-4de2-bd06-acb57ac9884d': 'Missing Pets',
  '13745b7c-cdda-40af-a133-d600882ee2d1': 'Found Pets',
  
  // Lost & Found
  '2183c2b4-36cb-4de8-8a6c-36106c0cf426': 'Lost Items',
  'b48cbcb0-5971-44f5-b277-4a0eb06fd52b': 'Found Items'
};

export function getIncidentCategory(incident: any): string {
  if (!incident) return '';
  
  // Get the raw category ID first
  let categoryId = '';
  
  if (incident.properties?.categoryId) {
    categoryId = incident.properties.categoryId;
  } else if (incident.properties?.category) {
    categoryId = incident.properties.category;
  } else if (incident.category) {
    categoryId = incident.category;
  }
  
  // If we have a UUID, try to map it to human name
  if (categoryId && CATEGORY_MAPPINGS[categoryId]) {
    return CATEGORY_MAPPINGS[categoryId];
  }
  
  // If it's already a human name, return as-is
  if (categoryId && !categoryId.includes('-')) {
    return categoryId;
  }
  
  return '';
}

export function getIncidentSubcategory(incident: any): string {
  if (!incident) return '';
  
  // Get the raw subcategory ID first
  let subcategoryId = '';
  
  if (incident.properties?.subcategoryId) {
    subcategoryId = incident.properties.subcategoryId;
  } else if (incident.properties?.subcategory) {
    subcategoryId = incident.properties.subcategory;
  } else if (incident.subcategory) {
    subcategoryId = incident.subcategory;
  }
  
  // If we have a UUID, try to map it to human name
  if (subcategoryId && SUBCATEGORY_MAPPINGS[subcategoryId]) {
    return SUBCATEGORY_MAPPINGS[subcategoryId];
  }
  
  // If it's already a human name, return as-is
  if (subcategoryId && !subcategoryId.includes('-')) {
    return subcategoryId;
  }
  
  return '';
}

// Helper to get the reporter's user ID consistently across both modals
export function getReporterUserId(incident: any): string | null {
  if (!incident) return null;
  
  // Extract user ID - prioritize top-level userId from unified API response
  const userId = incident.userId || incident.properties?.reporterId || incident.properties?.userId;
  
  // Return null if empty string or null/undefined
  return userId && userId.trim() !== '' ? userId : null;
}

// Unified incident navigation system for consolidating map and feed modals
export function getCanonicalIncidentId(incident: any): string | null {
  if (!incident) return null;
  
  // Use the existing getIncidentId logic to get the primary identifier
  const primaryId = getIncidentId(incident);
  if (!primaryId) return null;
  
  // Ensure the ID is URL-safe by encoding special characters
  return encodeURIComponent(primaryId);
}

export function decodeIncidentId(encodedId: string): string {
  try {
    return decodeURIComponent(encodedId);
  } catch (e) {
    console.warn('Failed to decode incident ID:', encodedId);
    return encodedId;
  }
}

export function createIncidentUrl(incident: any): string | null {
  const canonicalId = getCanonicalIncidentId(incident);
  if (!canonicalId) return null;
  
  return `/incident/${canonicalId}`;
}

// Helper function for navigating to incidents from map or feed
export function navigateToIncident(incident: any, setLocation: (url: string) => void): void {
  const url = createIncidentUrl(incident);
  if (url) {
    setLocation(url);
  } else {
    console.warn('Could not create URL for incident:', incident);
  }
}

// Get appropriate icon for incident based on source and category
export function getIncidentIconProps(incident: any): { iconName: string, color: string } {
  if (!incident) return { iconName: 'AlertTriangle', color: 'text-gray-500' };
  
  const source = incident.source || incident.properties?.source;
  
  if (source === 'tmr') {
    // TMR Traffic Events
    const eventType = incident.properties?.event_type?.toLowerCase() || '';
    if (eventType.includes('congestion')) {
      return { iconName: 'Timer', color: 'text-orange-600' }; // Timer for congestion
    }
    return { iconName: 'Car', color: 'text-orange-600' }; // Car for other traffic events
  }
  
  if (source === 'emergency') {
    // QFES Emergency Services - Single icon type for ALL emergency incidents
    // This keeps the map clean and easy to understand
    return { iconName: 'Siren', color: 'text-red-600' };
  }
  
  if (source === 'user') {
    // User Reports - Check SUBCATEGORY first for specific icons
    const subcategoryId = incident.subcategory || incident.properties?.subcategory || '';
    const subcategory = getIncidentSubcategory(incident); // Convert UUID to human name
    
    // Subcategory-specific icons for community reports
    switch (subcategory) {
      // Safety & Crime subcategories
      case 'Violence & Threats':
        return { iconName: 'Shield', color: 'text-red-600' };
      case 'Theft & Property Crime':
        return { iconName: 'ShieldAlert', color: 'text-red-600' };
      case 'Suspicious Activity':
        return { iconName: 'Eye', color: 'text-orange-600' };
      case 'Public Disturbances':
        return { iconName: 'AlertTriangle', color: 'text-yellow-600' };
      
      // Infrastructure & Hazards subcategories
      case 'Road Hazards':
        return { iconName: 'Construction', color: 'text-orange-600' };
      case 'Utility Issues':
        return { iconName: 'Zap', color: 'text-yellow-600' };
      case 'Building Problems':
        return { iconName: 'Building', color: 'text-gray-600' };
      case 'Environmental Hazards':
        return { iconName: 'AlertTriangle', color: 'text-red-600' };
      
      // Emergency Situations subcategories
      case 'Fire & Smoke':
        return { iconName: 'Flame', color: 'text-red-600' };
      case 'Medical Emergencies':
        return { iconName: 'Heart', color: 'text-red-600' };
      case 'Natural Disasters':
        return { iconName: 'CloudLightning', color: 'text-blue-600' };
      case 'Chemical/Hazmat':
        return { iconName: 'AlertTriangle', color: 'text-purple-600' };
      
      // Wildlife & Nature subcategories
      case 'Dangerous Animals':
        return { iconName: 'Bug', color: 'text-red-600' };
      case 'Animal Welfare':
        return { iconName: 'Heart', color: 'text-green-600' };
      case 'Environmental Issues':
        return { iconName: 'Trees', color: 'text-green-600' };
      case 'Pest Problems':
        return { iconName: 'Bug', color: 'text-orange-600' };
      
      // Community Issues subcategories
      case 'Noise Complaints':
        return { iconName: 'Volume2', color: 'text-blue-600' };
      case 'Traffic Issues':
        return { iconName: 'Car', color: 'text-orange-600' };
      case 'Public Space Problems':
        return { iconName: 'MapPin', color: 'text-gray-600' };
      case 'Events & Gatherings':
        return { iconName: 'Users', color: 'text-blue-600' };
      
      // Pets subcategories
      case 'Missing Pets':
        return { iconName: 'PawPrint', color: 'text-pink-600' };
      case 'Found Pets':
        return { iconName: 'PawPrint', color: 'text-green-600' };
      
      // Lost & Found subcategories
      case 'Lost Items':
        return { iconName: 'Search', color: 'text-orange-600' };
      case 'Found Items':
        return { iconName: 'CheckCircle', color: 'text-green-600' };
    }
    
    // Fall back to category-specific icons if no subcategory match
    const categoryId = incident.properties?.categoryId || incident.category;
    
    switch (categoryId) {
      case '5e39584c-de45-45d6-ae4b-a0fb048a70f1': // Safety & Crime
        return { iconName: 'Shield', color: 'text-red-600' };
      case 'ec2f7fc1-ffe3-4efb-bd42-ab1a2645325e': // Infrastructure & Hazards  
        return { iconName: 'Construction', color: 'text-yellow-600' };
      case '0a250604-2cd7-4a7c-8d98-5567c403e514': // Emergency Situations
        return { iconName: 'Zap', color: 'text-red-500' };
      case '84218599-712d-49c3-8458-7a9153519e5d': // Wildlife & Nature
        return { iconName: 'Trees', color: 'text-green-600' };
      case '0c3251ec-e3aa-4bef-8c17-960d73f8cbdc': // Community Issues
        return { iconName: 'Users', color: 'text-blue-600' };
      case '1f45d947-a688-4fa7-b8bd-e80c9f91a4d9': // Pets
        return { iconName: 'PawPrint', color: 'text-pink-600' };
      case '796a25d1-58b1-444e-8520-7ed8a169b5ad': // Lost & Found
        return { iconName: 'Search', color: 'text-indigo-600' };
      default:
        return { iconName: 'Users', color: 'text-purple-600' }; // Default for user reports
    }
  }
  
  // Fallback for legacy data
  if (incident.type === 'traffic' || incident.properties?.category === 'traffic') {
    return { iconName: 'Car', color: 'text-orange-600' };
  }
  
  if (incident.properties?.userReported) {
    return { iconName: 'Users', color: 'text-purple-600' };
  }
  
  // Default emergency icon
  return { iconName: 'AlertTriangle', color: 'text-red-600' };
}```

#### client/src/lib/queryClient.ts
```typescript
import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Refresh when window gets focus
      staleTime: 5 * 60 * 1000, // 5 minutes - consider data stale after this
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for this long
      retry: 1, // Retry once on failure
    },
    mutations: {
      retry: false,
    },
  },
});
```

#### client/src/lib/regions.ts
```typescript
// Queensland regions and their suburbs mapping
export interface Region {
  id: string;
  name: string;
  suburbs: string[];
  // Polygon boundary coordinates [lng, lat] for precise geographical filtering
  boundary?: Array<[number, number]>;
}

export const QLD_REGIONS: Region[] = [
  {
    id: 'sunshine-coast',
    name: 'Sunshine Coast',
    suburbs: [
      'Caloundra', 'Caloundra West', 'Golden Beach', 'Pelican Waters',
      'Maroochydore', 'Mooloolaba', 'Alexandra Headland', 'Mooloolah Valley',
      'Noosa', 'Noosa Heads', 'Noosaville', 'Tewantin', 'Sunrise Beach',
      'Nambour', 'Palmwoods', 'Maleny', 'Montville', 'Yandina',
      'Cooroy', 'Pomona', 'Eumundi', 'Peregian Beach', 'Coolum Beach',
      'Buderim', 'Sippy Downs', 'Chancellor Park', 'Birtinya',
      'Kawana', 'Kawana Forest', 'Currimundi', 'Dicky Beach', 'Kings Beach', 'Bulcock Beach',
      'Bells Creek'
    ],
    boundary: [
      [152.7, -26.9],   // North-west (inland near Cooroy)
      [153.1, -26.4],   // North-east (Noosa Heads coastal)
      [153.15, -26.65], // East (Coolum Beach area)
      [153.16, -26.8],  // South-east (Caloundra coastal - extended to include coastline)
      [152.9, -26.85],  // South-west (inland Caloundra)
      [152.75, -26.82], // West (Nambour-Maleny area)
      [152.7, -26.9]    // Close polygon
    ]
  },
  {
    id: 'gold-coast',
    name: 'Gold Coast',
    suburbs: [
      'Surfers Paradise', 'Broadbeach', 'Main Beach', 'Southport',
      'Nerang', 'Robina', 'Varsity Lakes', 'Burleigh Heads',
      'Currumbin', 'Tugun', 'Coolangatta', 'Tweed Heads',
      'Miami', 'Mermaid Beach', 'Nobby Beach', 'Palm Beach',
      'Elanora', 'Tallebudgera', 'West Burleigh', 'Burleigh Waters',
      'Mudgeeraba', 'Springbrook', 'Advancetown', 'Coomera',
      'Upper Coomera', 'Oxenford', 'Hope Island', 'Sanctuary Cove'
    ],
    boundary: [
      [153.05, -27.75],  // North-west (Hope Island area)
      [153.45, -27.8],   // North-east (coastal Southport)
      [153.55, -28.17],  // South-east (Coolangatta)
      [153.25, -28.25],  // South-west (inland Currumbin)
      [153.0, -28.1],    // West (Springbrook area)
      [152.9, -27.9],    // West (Nerang inland)
      [153.05, -27.75]   // Close polygon
    ]
  },
  {
    id: 'brisbane',
    name: 'Greater Brisbane',
    suburbs: [
      'Brisbane', 'Brisbane City', 'South Brisbane', 'West End', 'Fortitude Valley',
      'New Farm', 'Paddington', 'Red Hill', 'Spring Hill', 'Petrie Terrace',
      'Toowong', 'St Lucia', 'Indooroopilly', 'Taringa', 'Chapel Hill',
      'Kenmore', 'Fig Tree Pocket', 'Brookfield', 'Pullenvale',
      'Ashgrove', 'The Gap', 'Enoggera', 'Kelvin Grove', 'Herston',
      'Woolloongabba', 'Annerley', 'Fairfield', 'Yeronga', 'Yeerongpilly',
      'Moorooka', 'Rocklea', 'Acacia Ridge', 'Sunnybank', 'Sunnybank Hills',
      'Calamvale', 'Stretton', 'Karawatha', 'Algester', 'Parkinson',
      'Forest Lake', 'Inala', 'Richlands', 'Darra', 'Oxley',
      'Corinda', 'Sherwood', 'Graceville', 'Chelmer', 'Jindalee',
      'Mount Ommaney', 'Jamboree Heights', 'Westlake', 'Riverhills',
      'Chermside', 'Aspley', 'Carseldine', 'Bridgeman Downs', 'Bald Hills',
      'Strathpine', 'Lawnton', 'Petrie', 'Kallangur', 'Murrumba Downs',
      'Griffin', 'North Lakes', 'Mango Hill', 'Rothwell', 'Redcliffe',
      'Clontarf', 'Margate', 'Woody Point', 'Scarborough', 'Newport',
      'Deception Bay', 'Narangba', 'Burpengary', 'Caboolture', 'Morayfield',
      'Ipswich', 'Springfield', 'Springfield Central', 'Augustine Heights',
      'Redbank', 'Goodna', 'Bellbird Park', 'Collingwood Park', 'Redbank Plains',
      'Logan', 'Logan Central', 'Springwood', 'Daisy Hill', 'Shailer Park',
      'Beenleigh', 'Eagleby', 'Waterford', 'Holmview', 'Bahrs Scrub'
    ],
    boundary: [
      [152.5, -27.0],    // North-west (Caboolture area)
      [153.2, -27.1],    // North-east (Redcliffe Peninsula)
      [153.25, -27.65],  // South-east (Logan area)
      [152.8, -27.75],   // South-west (Ipswich area)
      [152.6, -27.5],    // West (Springfield area)
      [152.5, -27.0]     // Close polygon
    ]
  },
  {
    id: 'ipswich',
    name: 'Ipswich',
    suburbs: [
      'Ipswich', 'Ipswich CBD', 'Booval', 'Bundamba', 'Dinmore',
      'Riverview', 'Karalee', 'Springfield', 'Springfield Central',
      'Springfield Lakes', 'Augustine Heights', 'Redbank', 'Goodna',
      'Collingwood Park', 'Redbank Plains', 'Bellbird Park', 'Brookwater',
      'Ripley', 'Bellvista', 'Providence', 'Deebing Heights'
    ]
  },
  {
    id: 'logan',
    name: 'Logan',
    suburbs: [
      'Logan', 'Logan Central', 'Logan Village', 'Springwood', 'Daisy Hill',
      'Shailer Park', 'Beenleigh', 'Eagleby', 'Waterford', 'Holmview',
      'Bahrs Scrub', 'Windaroo', 'Yarrabilba', 'Park Ridge', 'Jimboomba',
      'Beaudesert', 'Tamborine', 'Mount Tamborine', 'Canungra'
    ]
  },
  {
    id: 'moreton-bay',
    name: 'Moreton Bay',
    suburbs: [
      'Caboolture', 'Morayfield', 'Burpengary', 'Narangba', 'Deception Bay',
      'Redcliffe', 'Clontarf', 'Margate', 'Woody Point', 'Scarborough',
      'Newport', 'Rothwell', 'North Lakes', 'Mango Hill', 'Griffin',
      'Murrumba Downs', 'Kallangur', 'Petrie', 'Lawnton', 'Strathpine'
    ]
  },
  {
    id: 'cairns',
    name: 'Cairns',
    suburbs: [
      'Cairns', 'Cairns City', 'Cairns North', 'Edge Hill', 'Whitfield',
      'Redlynch', 'Stratford', 'Freshwater', 'Brinsmead', 'Kamerunga',
      'Smithfield', 'Trinity Beach', 'Palm Cove', 'Ellis Beach',
      'Port Douglas', 'Mossman', 'Kuranda', 'Mareeba', 'Atherton'
    ]
  },
  {
    id: 'townsville',
    name: 'Townsville',
    suburbs: [
      'Townsville', 'Townsville City', 'South Townsville', 'West End',
      'North Ward', 'Railway Estate', 'Hermit Park', 'Aitkenvale',
      'Mysterton', 'Cranbrook', 'Annandale', 'Kirwan', 'Thuringowa',
      'Condon', 'Deeragun', 'Bohle Plains', 'Mount Louisa', 'Douglas'
    ]
  },
  {
    id: 'toowoomba',
    name: 'Toowoomba',
    suburbs: [
      'Toowoomba', 'Toowoomba City', 'South Toowoomba', 'East Toowoomba',
      'West Toowoomba', 'North Toowoomba', 'Newtown', 'Harristown',
      'Kearneys Spring', 'Mount Lofty', 'Highfields', 'Crows Nest',
      'Dalby', 'Chinchilla', 'Miles', 'Wandoan'
    ]
  },
  {
    id: 'rockhampton',
    name: 'Rockhampton',
    suburbs: [
      'Rockhampton', 'Rockhampton City', 'North Rockhampton', 'West Rockhampton',
      'South Rockhampton', 'Berserker', 'Norman Gardens', 'Kawana',
      'Park Avenue', 'Frenchville', 'Mount Archer', 'Yeppoon',
      'Emu Park', 'Rosslyn Bay', 'Keppel Sands'
    ]
  }
];

// Find which region a suburb belongs to
export function findRegionBySuburb(suburb: string): Region | null {
  const normalizedSuburb = suburb.toLowerCase().trim();
  
  for (const region of QLD_REGIONS) {
    // Check if the input matches the region name directly
    if (region.name.toLowerCase().includes(normalizedSuburb) || 
        normalizedSuburb.includes(region.name.toLowerCase())) {
      return region;
    }
    
    // Check if the input matches any suburb within the region
    const matchingSuburb = region.suburbs.find(s => 
      s.toLowerCase().includes(normalizedSuburb) || 
      normalizedSuburb.includes(s.toLowerCase())
    );
    
    if (matchingSuburb) {
      return region;
    }
  }
  
  return null;
}

// Get all suburbs in the same region as the given suburb
export function getRegionalSuburbs(suburb: string): string[] {
  const region = findRegionBySuburb(suburb);
  return region ? region.suburbs : [suburb];
}

// Check if two suburbs are in the same region
export function areInSameRegion(suburb1: string, suburb2: string): boolean {
  const region1 = findRegionBySuburb(suburb1);
  const region2 = findRegionBySuburb(suburb2);
  
  return !!(region1 && region2 && region1.id === region2.id);
}

// Point-in-polygon algorithm using ray casting
export function isPointInPolygon(point: [number, number], polygon: Array<[number, number]>): boolean {
  const [lng, lat] = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

// Get region from coordinates (lat/lng) with text fallback
export function getRegionFromCoordinates(
  lat: number, 
  lng: number, 
  textFallback?: string
): Region | null {
  // First try coordinate-based matching
  for (const region of QLD_REGIONS) {
    if (region.boundary && isPointInPolygon([lng, lat], region.boundary)) {
      return region;
    }
  }
  
  // Fallback to text-based matching if coordinates don't match
  if (textFallback) {
    return findRegionBySuburb(textFallback);
  }
  
  return null;
}

// Extract coordinates from GeoJSON geometry
export function extractCoordinatesFromGeometry(geometry: any): [number, number] | null {
  if (!geometry) return null;
  
  try {
    if (geometry.type === 'Point' && geometry.coordinates) {
      const [lng, lat] = geometry.coordinates;
      return [lat, lng];
    }
    
    if (geometry.type === 'MultiPoint' && geometry.coordinates?.[0]) {
      const [lng, lat] = geometry.coordinates[0];
      return [lat, lng];
    }
    
    if (geometry.type === 'GeometryCollection' && geometry.geometries) {
      const pointGeometry = geometry.geometries.find((g: any) => g.type === 'Point');
      if (pointGeometry?.coordinates) {
        const [lng, lat] = pointGeometry.coordinates;
        return [lat, lng];
      }
    }
    
    // Handle legacy format from your traffic map component
    if (geometry.geometries?.[0]?.coordinates) {
      const coords = geometry.geometries[0].coordinates;
      if (coords.length === 2) {
        const [lng, lat] = coords;
        return [lat, lng];
      }
    }
  } catch (error) {
    console.warn('Error extracting coordinates from geometry:', error);
  }
  
  return null;
}```

### Contexts
#### client/src/contexts/view-mode-context.tsx
```typescript
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";

type ViewMode = 'feed' | 'map';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  navigateToView: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType | null>(null);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  
  // Check if we're on a feed/map page where view mode applies
  const isOnFeedMapPage = location === '/' || location === '/feed' || location === '/map';
  
  // Derive view mode from current location - this is the source of truth
  // When on /map route, show map. Otherwise show feed.
  const derivedMode: ViewMode = location === '/map' ? 'map' : 'feed';
  
  // Local state for when user toggles view without changing URL (instant switching)
  const [overrideMode, setOverrideMode] = useState<ViewMode | null>(null);
  
  // Track previous location to detect navigation changes
  const [prevLocation, setPrevLocation] = useState(location);
  
  // Only reset override when navigating AWAY from feed/map pages
  // This preserves the override when switching between views or arriving from other pages
  useEffect(() => {
    if (location !== prevLocation) {
      setPrevLocation(location);
      
      // Only reset if we're leaving the feed/map context entirely
      // (e.g., going to /profile, /notifications, etc.)
      const wasOnFeedMapPage = prevLocation === '/' || prevLocation === '/feed' || prevLocation === '/map';
      if (wasOnFeedMapPage && !isOnFeedMapPage) {
        setOverrideMode(null);
      }
    }
  }, [location, prevLocation, isOnFeedMapPage]);
  
  // Use override if set, otherwise use derived mode from URL
  const viewMode = overrideMode !== null ? overrideMode : derivedMode;

  const setViewMode = useCallback((mode: ViewMode) => {
    // Set override mode for instant switching without URL change
    setOverrideMode(mode);
  }, []);

  const navigateToView = useCallback((mode: ViewMode) => {
    setOverrideMode(mode);
    // Update URL without causing remount - navigate to feed page with the view mode
    setLocation('/feed');
  }, [setLocation]);

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, navigateToView }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}
```

### Types
#### client/src/types/filters.ts
```typescript
export interface FilterState {
  showTrafficEvents: boolean;
  showIncidents: boolean;
  showQFES: boolean;
  showUserReports: boolean;
  showUserSafetyCrime: boolean;
  showUserWildlife: boolean;
  showUserCommunity: boolean;
  showUserTraffic: boolean;
  showUserLostFound: boolean;
  showUserPets: boolean;
  showActiveIncidents: boolean;
  showResolvedIncidents: boolean;
  showHighPriority: boolean;
  showMediumPriority: boolean;
  showLowPriority: boolean;
  autoRefresh: boolean;
  distanceFilter: 'all' | '1km' | '2km' | '5km' | '10km' | '25km' | '50km';
  radius?: number;
  locationFilter: boolean;
  homeLocation?: string;
  homeCoordinates?: { lat: number; lon: number };
  homeBoundingBox?: [number, number, number, number];
  showExpiredIncidents: boolean;
  agingSensitivity: 'normal' | 'extended' | 'disabled';
  [key: string]: boolean | string | number | { lat: number; lon: number } | [number, number, number, number] | undefined;
}
```

#### client/src/types/traffic.ts
```typescript
export interface TrafficEvent {
  id: string;
  event_type: string;
  event_subtype?: string;
  event_priority: string;
  description: string;
  information?: string;
  advice?: string;
  status: string;
  published: string;
  last_updated: string;
  road_summary: {
    road_name: string;
    locality: string;
    postcode: string;
    local_government_area: string;
    district: string;
  };
  impact: {
    direction: string;
    towards: string;
    impact_type: string;
    impact_subtype: string;
    delay: string;
  };
  duration: {
    start: string;
    end: string;
    active_days: string[];
  };
  source: {
    source_name: string;
    provided_by: string;
    provided_by_url?: string;
  };
  geometry: {
    type: string;
    geometries: Array<{
      type: string;
      coordinates: number[][];
    }>;
  };
}

export interface TrafficCamera {
  id: string;
  name: string;
  location: string;
  status: string;
  image_url?: string;
  last_updated: string;
  geometry: {
    type: string;
    coordinates: number[];
  };
}

export interface QldTrafficResponse {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: any;
    properties: any;
  }>;
  published: string;
  rights: {
    owner: string;
    disclaimer: string;
    copyright: string;
  };
}
```

## 6. Configuration Files

### vite.config.ts
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
```

### drizzle.config.ts
```typescript
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
```

### tailwind.config.ts
```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
```

