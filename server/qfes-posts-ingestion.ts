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
