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

const EMERGENCY_API_URL = "https://services8.arcgis.com/ll1QQ2mI4WMXIXdm/arcgis/rest/services/QPS_Current_Incidents/FeatureServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=geojson";

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

    // Load existing unified incidents into spatial lookup
    await this.refreshSpatialIndex();

    // Start polling for each source with staggered timing
    this.scheduleSourceIngestion('tmr-traffic', 5000);        // Start immediately
    this.scheduleSourceIngestion('emergency-incidents', 15000); // 15 seconds later
    this.scheduleSourceIngestion('user-reports', 30000);       // 30 seconds later

    this.isInitialized = true;
    console.log('✅ Unified Ingestion Pipeline initialized');
  }

  // ============================================================================
  // DATA FETCHERS
  // ============================================================================

  private async fetchTMRTrafficEvents(): Promise<any> {
    const url = `${QLD_TRAFFIC_BASE_URL}/events?apikey=${QLD_TRAFFIC_API_KEY}`;
    
    const response = await fetchWithRetry(url, {
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 30000
    });

    if (!response.ok) {
      throw new Error(`TMR API HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
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
    // Fetch recent user-reported incidents from database
    const incidents = await storage.getIncidents();
    
    // Return in GeoJSON-like format for consistent processing
    return {
      type: 'FeatureCollection',
      features: incidents.map(incident => ({
        type: 'Feature',
        id: incident.id,
        geometry: incident.location,
        properties: {
          ...incident,
          source: 'user',
          reportedAt: incident.publishedDate
        }
      }))
    };
  }

  // ============================================================================
  // DATA NORMALIZERS
  // ============================================================================

  private normalizeTMREvents(data: any): InsertUnifiedIncident[] {
    if (!data.features || !Array.isArray(data.features)) return [];

    return data.features
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
          sourceId: feature.id?.toString() || props.incident_id || `tmr-${Date.now()}`,
          title: props.headline || props.summary || 'Traffic Event',
          description: props.description || props.advice || '',
          location: props.location || '',
          category: 'traffic',
          subcategory: this.getTMRSubcategory(props),
          severity: this.getTMRSeverity(props),
          status: props.status === 'RESOLVED' ? 'resolved' : 'active',
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
      .filter((incident: InsertUnifiedIncident | null): incident is InsertUnifiedIncident => incident !== null);
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
          title: props.Category || props.IncidentType || 'Emergency Incident',
          description: props.Location || props.Description || '',
          location: props.Locality || props.Address || '',
          category: this.getEmergencyCategory(props),
          subcategory: props.SubCategory || props.IncidentType || '',
          severity: this.getEmergencySeverity(props),
          status: props.Status === 'Closed' ? 'resolved' : 'active',
          geometry,
          centroidLat: centroid.lat,
          centroidLng: centroid.lng,
          regionIds,
          geocell: computeGeocellForIncident({ centroidLat: centroid.lat, centroidLng: centroid.lng }),
          incidentTime: props.CreateDate ? new Date(props.CreateDate) : new Date(),
          lastUpdated: props.EditDate ? new Date(props.EditDate) : new Date(),
          publishedAt: new Date(),
          properties: props
        };

        return prepareUnifiedIncidentForInsert(incident);
      })
      .filter((incident: InsertUnifiedIncident | null): incident is InsertUnifiedIncident => incident !== null);
  }

  private normalizeUserReports(data: any): InsertUnifiedIncident[] {
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
          source: 'user',
          sourceId: props.id?.toString() || `user-${Date.now()}`,
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
          properties: props,
          userId: props.userId,
          photoUrl: props.photoUrl,
          verificationStatus: props.verificationStatus || 'unverified'
        };

        return prepareUnifiedIncidentForInsert(incident);
      })
      .filter((incident: InsertUnifiedIncident | null): incident is InsertUnifiedIncident => incident !== null);
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
        
        default:
          return null;
      }
    } catch (error) {
      console.warn('Error computing centroid:', error);
      return null;
    }
  }

  private computeRegionIds(lat: number, lng: number, props: any): string[] {
    const regionIds: string[] = [];
    
    // Use existing region detection logic
    const region = getRegionFromCoordinates(lat, lng, props.location || props.Locality);
    if (region) {
      regionIds.push(region.id);
    }

    return regionIds;
  }

  private getTMRSubcategory(props: any): string {
    const impact = props.impact || '';
    const type = props.event_type || '';
    
    if (impact.includes('blocked') || impact.includes('closed')) return 'road-closure';
    if (impact.includes('congestion') || impact.includes('delays')) return 'congestion';
    if (type.includes('accident') || type.includes('crash')) return 'accident';
    if (type.includes('roadwork') || type.includes('construction')) return 'roadwork';
    
    return 'other';
  }

  private getTMRSeverity(props: any): 'low' | 'medium' | 'high' | 'critical' {
    const impact = props.impact?.toLowerCase() || '';
    
    if (impact.includes('blocked') || impact.includes('closed')) return 'critical';
    if (impact.includes('major') || impact.includes('severe')) return 'high';
    if (impact.includes('minor') || impact.includes('light')) return 'low';
    
    return 'medium';
  }

  private getEmergencyCategory(props: any): string {
    const category = props.Category?.toLowerCase() || '';
    const type = props.IncidentType?.toLowerCase() || '';
    
    if (category.includes('fire') || type.includes('fire')) return 'fire';
    if (category.includes('medical') || type.includes('ambulance')) return 'medical';
    if (category.includes('police') || type.includes('crime')) return 'crime';
    if (category.includes('rescue')) return 'rescue';
    
    return 'emergency';
  }

  private getEmergencySeverity(props: any): 'low' | 'medium' | 'high' | 'critical' {
    const priority = props.Priority?.toLowerCase() || '';
    const status = props.Status?.toLowerCase() || '';
    
    if (priority.includes('urgent') || priority.includes('critical')) return 'critical';
    if (priority.includes('high') || status.includes('active')) return 'high';
    if (priority.includes('low') || status.includes('monitoring')) return 'low';
    
    return 'medium';
  }

  private async refreshSpatialIndex(): Promise<void> {
    try {
      await storage.refreshSpatialIndex();
      console.log('🗺️ Spatial index refreshed');
    } catch (error) {
      console.error('Failed to refresh spatial index:', error);
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