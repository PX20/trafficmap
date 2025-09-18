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
import { getRegionFromCoordinates } from "./region-utils";
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
const QLD_TRAFFIC_API_KEY = process.env.QLD_TRAFFIC_API_KEY || "3e83add325cbb69ac4d8e5bf433d770b";

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
    // TMR Traffic Events Source
    this.sources.set('tmr-traffic', {
      name: 'TMR Traffic Events',
      type: 'tmr',
      fetcher: this.fetchTMRTrafficEvents.bind(this),
      normalizer: this.normalizeTMREvents.bind(this),
      lastFetch: 0,
      lastSuccess: 0,
      errorCount: 0,
      circuitOpen: false
    });

    // Emergency Services Source
    this.sources.set('emergency-incidents', {
      name: 'Emergency Services',
      type: 'emergency',
      fetcher: this.fetchEmergencyIncidents.bind(this),
      normalizer: this.normalizeEmergencyIncidents.bind(this),
      lastFetch: 0,
      lastSuccess: 0,
      errorCount: 0,
      circuitOpen: false
    });

    // User Reports Source (database-based, no external API)
    this.sources.set('user-reports', {
      name: 'User Reports',
      type: 'user',
      fetcher: this.fetchUserReports.bind(this),
      normalizer: this.normalizeUserReports.bind(this),
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
    
    // Filter for user reports only - EXCLUDE emergency incidents even if marked as source='user'
    const userReports = unifiedIncidents.filter(incident => {
      // Only include if source is 'user' AND it's not an emergency incident
      if (incident.source !== 'user') return false;
      
      // Exclude if it has emergency characteristics (these are misclassified emergency incidents)
      const title = incident.title?.toLowerCase() || '';
      const props = incident.properties || {};
      
      // Exclude incidents with emergency-related titles or properties
      const isEmergencyIncident = 
        title.includes('fire') ||
        title.includes('rescue') ||
        title.includes('ambulance') ||
        title.includes('medical emergency') ||
        props.Jurisdiction ||
        props.Master_Incident_Number ||
        props.OBJECTID;
        
      return !isEmergencyIncident;
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
    
    // Combine both unified and legacy incidents
    const allFeatures = [
      // Existing unified incidents - ENSURE userReported flag is set
      ...userReports.map(incident => ({
        id: incident.sourceId,
        type: 'Feature',
        geometry: incident.geometry,
        properties: {
          ...(incident.properties || {}),
          id: incident.sourceId,
          title: incident.title,
          description: incident.description,
          location: incident.location,
          category: incident.category,
          subcategory: incident.subcategory,
          severity: incident.severity,
          status: incident.status,
          createdAt: incident.incidentTime,
          updatedAt: incident.lastUpdated,
          userId: incident.userId,
          photoUrl: incident.photoUrl,
          verificationStatus: incident.verificationStatus,
          // CRITICAL: Ensure proper classification flags
          source: 'user',
          userReported: true
        }
      })),
      // Legacy incidents converted to features
      ...legacyIncidents
        .filter(incident => incident.geometry) // Only include incidents with geometry
        .map(incident => ({
          id: incident.id,
          type: 'Feature',
          geometry: incident.geometry,
          properties: {
            id: incident.id,
            title: incident.title,
            description: incident.description || '',
            location: incident.location,
            category: incident.categoryId || 'Community Issues',
            subcategory: incident.subcategoryId || '',
            severity: 'medium', // Legacy incidents don't have severity
            status: incident.status === 'Reported' ? 'active' : incident.status || 'active',
            createdAt: incident.publishedDate || new Date(),
            updatedAt: incident.publishedDate || new Date(),
            userId: null, // Legacy incidents don't have userId field
            photoUrl: incident.photoUrl || null,
            verificationStatus: 'unverified',
            source: 'legacy',
            userReported: true
          }
        }))
    ];
    
    console.log(`📊 User Reports Fetch: ${userReports.length} unified + ${legacyIncidents.filter(i => i.geometry).length} legacy = ${allFeatures.length} total user incidents (emergency incidents excluded from user pipeline)`);
    
    // Return in GeoJSON-like format for consistent processing
    return {
      type: 'FeatureCollection',
      features: allFeatures
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
        const incident: InsertUnifiedIncident = {
          source: 'tmr',
          sourceId: feature.id?.toString() || props.id || `tmr-${Date.now()}`,
          title: `${props.event_type || 'Traffic'} - ${props.event_subtype || 'Event'}`,
          description: [props.description, props.advice, props.information].filter(Boolean).join('. '),
          location: props.road_summary ? `${props.road_summary.road_name}, ${props.road_summary.locality}` : 'Queensland',
          category: 'traffic',
          subcategory: this.getTMRSubcategory(props),
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

        const incident: InsertUnifiedIncident = {
          source: 'emergency',
          sourceId: feature.id?.toString() || props.OBJECTID?.toString() || `emg-${Date.now()}`,
          title: props.Master_Incident_Number || props.Incident_Number || 'Emergency Incident',
          description: `${props.GroupedType || 'Emergency incident'} in ${props.Locality || props.Location || 'Queensland'}. Status: ${props.CurrentStatus || 'Active'}. Vehicles: ${props.VehiclesOnScene || 0} on scene, ${props.VehiclesOnRoute || 0} en route.`,
          location: props.Locality ? `${props.Location}, ${props.Locality}` : (props.Location || 'Queensland'),
          category: this.getEmergencyCategory(props),
          subcategory: props.Incident_Type || props.Type || 'emergency',
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
        
        // Resilient sourceId generation
        const sourceId = props.id?.toString() || feature.id?.toString() || `user-${Date.now()}-${Math.random()}`;
        if (!sourceId) {
          filtered++;
          return null;
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
            },
            userId: props.userId,
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
      'Emergency Situations': 'deaca906-3561-4f80-b79f-ed99561c3b04',
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
      
      // Upsert into unified store
      const results = await Promise.allSettled(
        unifiedIncidents.map(incident => 
          storage.upsertUnifiedIncident(incident.source, incident.sourceId, incident)
        )
      );

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
    const regionIds: string[] = [];
    
    // Stage 1: Try coordinate-based match
    let region = getRegionFromCoordinates(lat, lng);
    
    // Stage 2: If coordinate fails, try with text fallback
    if (!region) {
      const textFallback = props.location || props.suburb || props.Locality || props.Location || props.road_summary?.locality;
      if (textFallback) {
        region = getRegionFromCoordinates(lat, lng, textFallback);
      }
    }
    
    // Stage 3: If still null and targetRegionId is valid, use it as fallback
    if (!region && props.targetRegionId) {
      // Import regions to validate targetRegionId
      const { QLD_REGIONS } = require('./region-utils');
      const validRegion = QLD_REGIONS.find((r: any) => r.id === props.targetRegionId);
      if (validRegion) {
        regionIds.push(props.targetRegionId);
        return regionIds;
      }
    }
    
    // Return found region or empty array
    if (region) {
      regionIds.push(region.id);
    }

    return regionIds;
  }

  private getTMRSubcategory(props: any): string {
    const impact = String(props.impact || '').toLowerCase();
    const type = String(props.event_type || '').toLowerCase();
    
    if (impact.includes('blocked') || impact.includes('closed')) return 'road-closure';
    if (impact.includes('congestion') || impact.includes('delays')) return 'congestion';
    if (type.includes('accident') || type.includes('crash')) return 'accident';
    if (type.includes('roadwork') || type.includes('construction')) return 'roadwork';
    
    return 'other';
  }

  private getTMRSeverity(props: any): 'low' | 'medium' | 'high' | 'critical' {
    const impact = String(props.impact || '').toLowerCase();
    
    if (impact.includes('blocked') || impact.includes('closed')) return 'critical';
    if (impact.includes('major') || impact.includes('severe')) return 'high';
    if (impact.includes('minor') || impact.includes('light')) return 'low';
    
    return 'medium';
  }

  private getEmergencyCategory(props: any): string {
    const jurisdiction = props.Jurisdiction?.toLowerCase() || '';
    const incidentNumber = props.Master_Incident_Number?.toLowerCase() || '';
    const groupedType = props.GroupedType?.toLowerCase() || '';
    
    // Detect category from jurisdiction and incident patterns
    if (jurisdiction.includes('fire') || incidentNumber.includes('qf') || groupedType.includes('fire')) return 'fire';
    if (jurisdiction.includes('ambulance') || incidentNumber.includes('qa') || groupedType.includes('medical')) return 'medical';
    if (jurisdiction.includes('police') || incidentNumber.includes('qp') || groupedType.includes('police')) return 'crime';
    if (jurisdiction.includes('ses') || jurisdiction.includes('rescue') || groupedType.includes('rescue')) return 'rescue';
    
    return 'emergency';
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
});