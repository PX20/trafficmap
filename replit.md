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

5. **Tile Rendering Fix**: Calls `map.invalidateSize()` when map transitions from hidden to visible to fix Leaflet initialization bug