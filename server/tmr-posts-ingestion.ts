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
