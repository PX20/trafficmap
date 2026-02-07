# Community Connect Australia - Complete Feature Specification

## Project Overview
Community Connect Australia is a Facebook-style community social network focused on safety and incident reporting across Australia. Users can report incidents, view real-time traffic and emergency data on an interactive map, engage with posts through reactions and comments, and connect with their local community. The platform also supports business advertising with a complete billing and discount code system.

**Live URL:** https://community-connect-australia.replit.app
**Tech Stack:** React + TypeScript (frontend), Express.js + TypeScript (backend), PostgreSQL + Drizzle ORM (database), Leaflet (maps)

---

## 1. Authentication & User Management

### 1.1 Authentication System
- Session-based authentication with PostgreSQL session storage
- Login/register flow with email and password
- OAuth support (previously via Replit Auth, needs replacement for migration)
- Session persistence across browser restarts (7-day TTL)
- Secure cookie configuration (httpOnly, secure in production)

### 1.2 User Accounts
- **Regular Users:** Can report incidents, comment, react, save posts
- **Business Users:** Can create ad campaigns, access business dashboard, analytics
- **Admin Users:** Can moderate content, approve/reject ads, manage discount codes
- **Agency Accounts:** System-created accounts for official sources (TMR, QFES) - auto-initialized on startup

### 1.3 User Profile
- Profile photo upload (stored in object storage)
- First name, last name, email
- Location preferences (suburb, state, coordinates, radius)
- Notification preferences (push notifications, email, categories to receive)
- Display preferences
- Terms of service acceptance tracking (versioned)

### 1.4 Onboarding
- First-time user onboarding wizard
- Terms and conditions modal (must accept before using app)
- Account setup flow for completing profile

---

## 2. Interactive Map System

### 2.1 Map Display
- **Library:** Leaflet with OpenStreetMap tiles
- **Coverage:** Primarily Queensland, Australia (Brisbane metro default view)
- **Zoom Range:** minZoom 6 (state-wide) to maxZoom 18 (street-level)
- **Tile Provider:** OpenStreetMap

### 2.2 Data Sources (3000+ markers)
- **TMR (Transport and Main Roads):** Traffic events, road closures, incidents from QLD Traffic API
- **QFES (Queensland Fire and Emergency Services):** Emergency incidents from ArcGIS Feature Server
- **Community Reports:** User-submitted incidents and safety reports

### 2.3 Marker Clustering
- Uses **Supercluster** library for high-performance client-side clustering
- Bulk layer operations for 10-50x faster rendering
- Cluster expansion aligned to maxZoom 18
- Custom color-coded markers by category (traffic=blue, emergency=red, crime=orange, etc.)

### 2.4 Incident Aging System
- 12-hour unified aging timeline for all incidents
- Expired incidents (>12 hours) automatically filtered out
- Fresh markers have vibrant colors, older markers fade to grey
- Opacity reduces from 1.0 to 0.5 based on age
- Implemented in `client/src/lib/incident-aging.ts`

### 2.5 Map Filtering
- Filter by category (traffic, emergency, crime, suspicious activity, community)
- Filter by subcategory
- Filter by time range
- Filter by impact level
- Quick proximity filter (nearby incidents based on user location)
- Viewport-based fetching (only loads markers visible on screen)

### 2.6 Map Performance Optimizations
- Saved map position restored from localStorage on load
- Falls back to Brisbane metro area bounds (not full Queensland)
- Database-level spatial filtering
- HTTP caching with ETags
- `map.invalidateSize()` called when map transitions from hidden to visible

---

## 3. Feed System

### 3.1 Post Feed
- Scrollable feed showing all community posts and incidents
- Each post shows: title, description, category, location, reporter, time, photo
- Reaction counts and comment counts displayed
- Pull-to-refresh functionality
- Toggle between feed view and map view

### 3.2 Post Types
Posts are categorized with a hierarchical category/subcategory system:
- **Traffic:** Road closures, accidents, roadwork, congestion, hazards
- **Emergency:** Fire, flood, storm, medical, evacuation
- **Crime:** Theft, break-in, assault, vandalism
- **Suspicious Activity:** Suspicious person, vehicle, package
- **Lost & Found:** Lost pets, found items
- **Community:** Local events, neighborhood watch, general safety

### 3.3 Creating Posts/Incidents
- Title and description fields
- Category and subcategory selection
- Location input with autocomplete (Nominatim geocoding API)
- Photo upload with compression
- Automatic geocoding of address to coordinates
- Posts can be edited or deleted by the owner

### 3.4 Social Engagement
- **Reactions:** Multiple reaction types per post (like, love, sad, angry, etc.)
- **Comments:** Threaded comments on posts with photo attachments
- **Comment Voting:** Upvote/downvote system on comments
- **Save/Bookmark:** Users can save posts for later
- **Follow-ups:** Users can add follow-up updates to incidents

### 3.5 Persistent Feed Architecture (Performance)
- Feed component stays mounted when navigating to overlay pages (profile, notifications, saved, reactions, privacy, help)
- Overlay pages render on top of hidden Feed (prevents Leaflet map reinitializing)
- `isActive` prop optimization: when Feed is hidden, auto-refetching and polling stop
- Full-page routes (create, admin, business) unmount Feed normally

---

## 4. Data Ingestion Pipeline

### 4.1 TMR (Traffic) Ingestion
- Fetches from QLD Traffic API (`https://api.qldtraffic.qld.gov.au`)
- Requires `QLD_TRAFFIC_API_KEY`
- Polls at regular intervals for new traffic events
- Maps API data to unified incident format
- Change detection to avoid duplicate processing

### 4.2 QFES (Emergency) Ingestion
- Fetches from ArcGIS Feature Server
- Real-time emergency incident data
- Maps to unified incident format
- Auto-creates incidents with QFES agency attribution

### 4.3 Unified Ingestion Pipeline
- Combines all data sources into a unified format
- Staging table for raw events before processing
- Deduplication and change detection
- Staggered background tasks (2s, 5s, 8s, 10s, 15s delays) to prevent DB pool exhaustion
- Idempotent initialization guard prevents duplicate runs during hot reload

### 4.4 Server Boot Sequence
1. Express server starts listening immediately
2. `isServerReady = true` set before deferred tasks
3. Background tasks run in sequence with delays
4. Ingestion services have internal guards to prevent double-starts
5. Heavy startup tasks deferred AFTER server is ready to accept requests

---

## 5. Notification System

### 5.1 Web Push Notifications
- VAPID key-based web push notifications
- Users can subscribe/unsubscribe to push notifications
- Push subscription stored in database
- Test notification endpoint for verification

### 5.2 In-App Notifications
- Notification bell with unread count badge
- Notifications page listing all notifications
- Mark individual or all notifications as read
- Notification types: new comments, reactions, nearby incidents, follow-ups

### 5.3 Notification Preferences
- Per-category notification settings
- Radius-based location notifications
- Push notification toggle

---

## 6. Messaging System

### 6.1 Direct Messages
- User-to-user private conversations
- Real-time message delivery
- Unread message count
- Conversation list with last message preview
- Mark conversations as read

---

## 7. Business & Advertising System

### 7.1 Business Upgrades
- Regular users can upgrade to business accounts
- Business profile with additional fields

### 7.2 Ad Campaigns
- Create ad campaigns with:
  - Business name, headline, description
  - Target audience/location
  - Budget and duration
  - Call-to-action URL
  - Campaign photo/image
- Campaign statuses: pending, approved, active, paused, completed, rejected
- Admin approval required before campaigns go live

### 7.3 Ad Display
- Sponsored posts shown in the feed (SponsoredPost component)
- Ad view tracking (impressions)
- Ad click tracking
- Analytics dashboard for campaign performance

### 7.4 Campaign Analytics
- Views, clicks, CTR (click-through rate)
- Daily analytics breakdown
- Campaign performance over time

---

## 8. Billing & Payments

### 8.1 Billing Plans
- Multiple advertising plans with different features
- Plan comparison and selection

### 8.2 Payment Processing
- Stripe integration for payment processing
- Create payment intents
- Webhook handling for payment confirmation
- Billing history tracking
- Payment records with status tracking

### 8.3 Discount Code System
- **Admin CRUD:** Create, read, update, delete discount codes
- **Code Types:**
  - `percentage` - Percentage discount (0-100%)
  - `fixed` - Fixed dollar amount discount
  - `free_month` - Free advertising period (specified in days)
- **Code Properties:**
  - Unique code string
  - Description
  - Max redemptions limit
  - Expiry date
  - Active/inactive status
  - Current redemption count tracking
- **Validation:** Check if code is valid, not expired, not maxed out
- **Redemption:** Apply code to a campaign, track who redeemed
- **Quote with Discount:** Calculate billing amount with discount applied
- **User Redemption History:** Users can see their past discount usage

---

## 9. Content Moderation

### 9.1 Content Reports
- Users can report inappropriate content
- Report types: spam, harassment, misinformation, inappropriate
- Report includes reason and optional description
- Admin can review and act on reports

### 9.2 Admin Dashboard
- View pending ad approvals
- Approve/reject ad campaigns
- Manage discount codes
- View content reports
- Moderate user content

### 9.3 Feedback System
- Users can submit feedback about the app
- Feedback stored in database
- Admin can view and respond to feedback

---

## 10. Community Features

### 10.1 Neighborhood Groups
- Create community groups by neighborhood
- Join/leave groups
- Group-based content filtering

### 10.2 Emergency Contacts
- Store personal emergency contacts
- Quick access during incidents

### 10.3 Safety Check-ins
- Check in as safe during incidents
- View check-in status per incident
- Community safety monitoring

### 10.4 Stories
- Short-lived community stories (similar to social media stories)
- Photo/text content
- Story view tracking
- Auto-expiration

### 10.5 User Badges
- Achievement/recognition badges for active users
- Badge display on user profiles

---

## 11. Location Services

### 11.1 Geocoding
- Forward geocoding: Address/suburb to coordinates (Nominatim API)
- Reverse geocoding: Coordinates to address
- Location search with autocomplete suggestions

### 11.2 Spatial Features
- Viewport-based data fetching
- Proximity filtering (incidents near user)
- Region-based data organization
- Database-level spatial queries

---

## 12. Mobile Optimization

### 12.1 Responsive Design
- Mobile-first layout with collapsible sidebar
- Bottom navigation bar on mobile (MobileNav component)
- Compact headers on mobile
- Larger touch targets for mobile interactions
- Bottom-sheet style comments on mobile

### 12.2 View Mode Toggle
- ViewModeContext for instant switching between feed and map views
- No route remounting on switch (prevents 30-second mobile delays)
- Override reset logic: only clears when navigating away from feed/map

### 12.3 Performance
- Lazy loading for overlay pages (React.lazy + Suspense)
- Reduced N+1 queries (counts from post data, details on interaction)
- Background polling stops when Feed is hidden (isActive prop)
- Supercluster for marker clustering performance

---

## 13. Database Schema (38 Tables)

| Table | Purpose |
|-------|---------|
| `users` | User accounts with profile data, role, preferences |
| `sessions` | PostgreSQL session storage |
| `posts` | Community posts/incidents (core content) |
| `unified_incidents` | Normalized incidents from all sources |
| `staging_events` | Raw ingestion staging area |
| `traffic_events` | TMR traffic event data |
| `incidents` | Legacy incident table |
| `categories` | Post categories (traffic, emergency, crime, etc.) |
| `subcategories` | Post subcategories |
| `comments` | Post comments |
| `incident_comments` | Comments on incidents (with photo support) |
| `comment_votes` | Upvote/downvote on comments |
| `post_reactions` | Reactions (like, love, sad, etc.) on posts |
| `saved_posts` | User bookmarked posts |
| `stories` | Short-lived community stories |
| `story_views` | Story view tracking |
| `user_badges` | Achievement badges |
| `neighborhood_groups` | Community groups by area |
| `user_neighborhood_groups` | Group membership |
| `emergency_contacts` | Personal emergency contacts |
| `safety_check_ins` | Safety check-in during incidents |
| `incident_follow_ups` | Follow-up updates to incidents |
| `conversations` | Direct message conversations |
| `messages` | Individual messages |
| `notifications` | In-app notifications |
| `notification_deliveries` | Notification delivery tracking |
| `push_subscriptions` | Web push notification subscriptions |
| `reports` | Content reports for moderation |
| `feedback` | User feedback submissions |
| `ad_campaigns` | Business advertising campaigns |
| `ad_views` | Ad impression tracking |
| `ad_clicks` | Ad click tracking |
| `campaign_analytics` | Daily campaign performance metrics |
| `billing_plans` | Available advertising plans |
| `billing_cycles` | Active billing periods |
| `payments` | Payment transaction records |
| `discount_codes` | Admin-created discount codes |
| `discount_redemptions` | Discount code usage tracking |

---

## 14. API Endpoints Summary (80+ endpoints)

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login with email/password |
| POST | `/api/auth/logout` | No | Logout |
| GET | `/api/auth/user` | Yes | Get current user |
| GET | `/api/auth/status` | No | Check auth status |
| POST | `/api/auth/dev-login` | No | Dev-only login |

### Posts & Incidents
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/posts` | No | Get all posts as GeoJSON FeatureCollection |
| GET | `/api/posts/:id` | No | Get single post |
| POST | `/api/posts` | Yes | Create new post |
| PUT | `/api/posts/:id` | Yes | Update post (owner only) |
| DELETE | `/api/posts/:id` | Yes | Delete post (owner only) |
| GET | `/api/unified` | No | Get unified incidents |
| PUT | `/api/unified-incidents/:id` | Yes | Update unified incident |
| DELETE | `/api/unified-incidents/:id` | Yes | Delete unified incident |
| POST | `/api/incidents/report` | Yes | Report new incident |
| PATCH | `/api/incidents/:id/status` | Yes | Update incident status |
| POST | `/api/incidents/refresh` | No | Trigger incident data refresh |
| GET | `/api/cached/incidents` | No | Get cached incident data |

### Social Features
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reactions/:incidentId` | No | Get reactions for incident |
| POST | `/api/reactions/:incidentId` | Yes | Add/toggle reaction |
| GET | `/api/my-reactions` | Yes | Get posts user reacted to |
| GET | `/api/saved-posts` | Yes | Get user's saved posts |
| POST | `/api/posts/:postId/save` | Yes | Save/bookmark post |
| DELETE | `/api/posts/:postId/save` | Yes | Unsave post |
| GET | `/api/posts/:postId/saved` | Yes | Check if post is saved |

### Comments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/incidents/:id/social/comments` | No | Get comments |
| POST | `/api/incidents/:id/social/comments` | Yes | Add comment |
| POST | `/api/incidents/:id/social/comments/with-photo` | Yes | Comment with photo |
| DELETE | `/api/incidents/:id/social/comments/:commentId` | Yes | Delete comment |
| PATCH | `/api/comments/:commentId` | Yes | Edit comment |
| POST | `/api/comments/:commentId/vote` | Yes | Vote on comment |
| GET | `/api/comments/:commentId/user-vote` | Yes | Get user's vote |

### User Profile
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PUT | `/api/user/profile` | Yes | Update profile |
| PUT | `/api/user/profile-photo` | Yes | Update profile photo |
| PATCH | `/api/user/location-preferences` | Yes | Update location settings |
| PATCH | `/api/user/notification-preferences` | Yes | Update notification settings |
| POST | `/api/user/accept-terms` | Yes | Accept terms of service |
| PATCH | `/api/users/me` | Yes | Update user data |
| POST | `/api/users/complete-setup` | Yes | Complete account setup |
| POST | `/api/users/upgrade-to-business` | Yes | Upgrade to business |
| GET | `/api/users/:userId` | No | Get user profile |
| GET | `/api/users/suburb/:suburb` | No | Get users by suburb |
| GET | `/api/batch-users` | No | Batch fetch user data |

### Messaging
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/conversations` | Yes | Get conversations |
| POST | `/api/conversations` | Yes | Create conversation |
| GET | `/api/conversations/:id/messages` | Yes | Get messages |
| POST | `/api/conversations/:id/messages` | Yes | Send message |
| PATCH | `/api/conversations/:id/read` | Yes | Mark read |
| GET | `/api/messages/unread-count` | Yes | Get unread count |

### Notifications
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | Yes | Get notifications |
| GET | `/api/notifications/unread-count` | Yes | Get unread count |
| PATCH | `/api/notifications/:id/read` | Yes | Mark as read |
| PATCH | `/api/notifications/read-all` | Yes | Mark all read |
| PUT | `/api/notifications/:id/read` | Yes | Mark notification read |

### Push Notifications
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/push/vapid-key` | No | Get VAPID public key |
| POST | `/api/push/subscribe` | Yes | Subscribe to push |
| POST | `/api/push/unsubscribe` | Yes | Unsubscribe |
| POST | `/api/push/test` | Yes | Send test notification |

### Advertising & Business
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/ads` | No | Get active ads |
| POST | `/api/ads/create` | Yes | Create ad campaign |
| GET | `/api/ads/my-campaigns` | Yes | Get user's campaigns |
| GET | `/api/ads/analytics` | Yes | Get campaign analytics |
| GET | `/api/ads/:id` | Yes | Get single ad |
| PUT | `/api/ads/:id` | Yes | Update ad |
| POST | `/api/ads/track-view` | No | Track ad impression |
| POST | `/api/ads/track-click` | No | Track ad click |

### Billing & Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/billing/plans` | No | Get available plans |
| POST | `/api/billing/quote` | Yes | Get billing quote |
| POST | `/api/billing/quote-with-discount` | Yes | Quote with discount |
| POST | `/api/billing/create-payment-intent` | Yes | Create Stripe payment |
| GET | `/api/billing/history` | Yes | Get billing history |
| POST | `/api/stripe/webhook` | No | Stripe webhook handler |

### Discount Codes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/discount-codes` | Admin | Create discount code |
| GET | `/api/admin/discount-codes` | Admin | List all codes |
| GET | `/api/admin/discount-codes/:id` | Admin | Get single code |
| PUT | `/api/admin/discount-codes/:id` | Admin | Update code |
| DELETE | `/api/admin/discount-codes/:id` | Admin | Delete code |
| POST | `/api/discount-codes/validate` | Yes | Validate a code |
| POST | `/api/discount-codes/redeem` | Yes | Redeem a code |
| GET | `/api/discount-codes/my-redemptions` | Yes | User's redemptions |

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/ads/pending` | Admin | Get pending ads |
| PUT | `/api/admin/ads/:id/approve` | Admin | Approve ad |
| PUT | `/api/admin/ads/:id/reject` | Admin | Reject ad |

### Community Features
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/neighborhood-groups` | No | List groups |
| POST | `/api/neighborhood-groups` | Yes | Create group |
| POST | `/api/neighborhood-groups/:id/join` | Yes | Join group |
| DELETE | `/api/neighborhood-groups/:id/leave` | Yes | Leave group |
| GET | `/api/emergency-contacts` | Yes | Get contacts |
| POST | `/api/emergency-contacts` | Yes | Add contact |
| DELETE | `/api/emergency-contacts/:id` | Yes | Remove contact |
| POST | `/api/safety-checkins` | Yes | Check in safe |
| GET | `/api/safety-checkins/incident/:id` | No | Get check-ins for incident |
| GET | `/api/safety-checkins/user` | Yes | Get user's check-ins |
| GET | `/api/stories` | No | Get stories |
| POST | `/api/stories` | Yes | Create story |
| POST | `/api/stories/:id/view` | Yes | Mark story viewed |

### Content Moderation
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/content-reports` | Yes | Report content |
| GET | `/api/content-reports` | Yes | Get reports (admin) |
| PUT | `/api/content-reports/:id` | Yes | Update report status |
| POST | `/api/feedback` | No | Submit feedback |
| GET | `/api/feedback` | Yes | Get feedback (admin) |
| PUT | `/api/feedback/:id` | Yes | Update feedback |

### Location & Data
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/location/search` | No | Search locations |
| GET | `/api/location/reverse` | No | Reverse geocode |
| GET | `/api/categories` | No | Get categories |
| GET | `/api/subcategories` | No | Get subcategories |
| GET | `/api/traffic/events` | No | Get traffic events |
| GET | `/api/traffic/status` | No | Get ingestion status |

### File Upload
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/upload/photo` | Yes | Upload incident photo |
| POST | `/api/upload/comment-photos` | Yes | Upload comment photos |
| GET | `/api/photos/comment-photos/:filename` | No | Get comment photo |
| GET | `/api/compress-image` | No | Compress image |

---

## 15. Environment Variables Required

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Session encryption key |
| `QLD_TRAFFIC_API_KEY` | Yes | QLD Traffic API access key |
| `VAPID_PUBLIC_KEY` | Yes | Web push VAPID public key |
| `VAPID_PRIVATE_KEY` | Yes | Web push VAPID private key |
| `VITE_VAPID_PUBLIC_KEY` | Yes | VAPID key for frontend |
| `STRIPE_SECRET_KEY` | Optional | Stripe payments (disabled if missing) |
| `NODE_ENV` | Auto | development or production |
| `PORT` | Auto | Server port (default 5000) |

---

## 16. Frontend Architecture

### Framework & Libraries
- **React** with TypeScript
- **Wouter** for routing
- **TanStack Query v5** for server state management
- **Shadcn/ui** (Radix UI) for UI components
- **Tailwind CSS** for styling
- **Leaflet** for maps
- **Supercluster** for marker clustering
- **Vite** for build tooling

### Key Frontend Files
| File | Purpose |
|------|---------|
| `client/src/App.tsx` | Main app with routing and persistent feed architecture |
| `client/src/pages/feed.tsx` | Feed/map view with toggle |
| `client/src/pages/incident-detail.tsx` | Incident detail modal |
| `client/src/pages/create.tsx` | Create new post/incident |
| `client/src/pages/profile.tsx` | User profile settings |
| `client/src/pages/admin-dashboard.tsx` | Admin management panel |
| `client/src/pages/business-dashboard.tsx` | Business campaign management |
| `client/src/pages/create-ad.tsx` | Create ad campaign |
| `client/src/components/map/traffic-map.tsx` | Interactive Leaflet map |
| `client/src/components/map/simple-filter-sidebar.tsx` | Map filter controls |
| `client/src/components/post-card.tsx` | Post display card |
| `client/src/components/mobile-nav.tsx` | Mobile bottom navigation |
| `client/src/components/sponsored-post.tsx` | Ad display in feed |
| `client/src/contexts/view-mode-context.tsx` | Feed/map view state |
| `client/src/lib/incident-aging.ts` | Marker aging/fading logic |
| `client/src/lib/incident-utils.ts` | Incident ID handling |
| `client/src/hooks/use-clustered-markers.ts` | Supercluster integration |

### Routing Architecture
- **Overlay Routes** (Feed stays mounted, hidden): `/profile`, `/notifications`, `/saved`, `/reactions`, `/privacy`, `/help`
- **Full Page Routes** (Feed unmounts): `/create`, `/admin`, `/business-dashboard`, `/create-ad`, `/messages`, `/account-setup`
- **Modal Route**: `/incident/:id` renders as modal overlay on any page

---

## 17. File Storage
- Object storage for photos (profile, incident, comment photos)
- Image compression endpoint
- Secure upload with authentication
- Files served via `/objects/:objectPath` endpoint

---

## 18. Security Features
- CSRF protection via session-based auth
- Secure file upload with validation
- Admin-only routes with `isAdmin` middleware
- Authenticated routes with `isAuthenticated` middleware
- Secure logging (no sensitive data in logs)
- Input validation with Zod schemas
- SQL injection prevention via Drizzle ORM parameterized queries

---

## 19. External API Integrations

| Service | Purpose | API |
|---------|---------|-----|
| QLD Traffic | Traffic events | `https://api.qldtraffic.qld.gov.au` |
| QLD Emergency Services | Emergency incidents | ArcGIS Feature Server |
| OpenStreetMap | Map tiles | Tile server |
| Nominatim | Geocoding/reverse geocoding | OSM Nominatim API |
| Stripe | Payment processing | Stripe API |
| Web Push (VAPID) | Push notifications | Web Push Protocol |
