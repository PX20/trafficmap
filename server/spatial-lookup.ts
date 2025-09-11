/**
 * ============================================================================
 * 3-STAGE SPATIAL LOOKUP SYSTEM
 * ============================================================================
 * 
 * High-performance spatial queries using:
 * Stage 1: Grid Hash Lookup - Quick spatial bucketing via geocells
 * Stage 2: Bounding Box Query - Efficient coordinate filtering  
 * Stage 3: Point-in-Polygon - Precise regional matching
 * 
 * Features LRU cache for frequent viewport/regional queries
 */

import { SelectUnifiedIncident } from "@shared/schema";
import { isPointInPolygon } from "./region-utils";

// ============================================================================
// GEOCELL GRID SYSTEM - Stage 1
// ============================================================================

/**
 * Generate hierarchical geocell for spatial indexing
 * Uses lat/lng quantization for efficient spatial bucketing
 */
export function generateGeocell(lat: number, lng: number, precision: number = 3): string {
  // Quantize coordinates to create grid cells
  const latStep = Math.pow(10, -precision);
  const lngStep = Math.pow(10, -precision);
  
  const quantizedLat = Math.floor(lat / latStep) * latStep;
  const quantizedLng = Math.floor(lng / lngStep) * lngStep;
  
  // Generate hierarchical geocell: precision_lat_lng
  return `${precision}_${quantizedLat.toFixed(precision)}_${quantizedLng.toFixed(precision)}`;
}

/**
 * Get all geocells within a bounding box for bulk queries
 */
export function getGeoceellsInBoundingBox(
  southWest: [number, number], 
  northEast: [number, number], 
  precision: number = 3
): string[] {
  const [swLat, swLng] = southWest;
  const [neLat, neLng] = northEast;
  
  const latStep = Math.pow(10, -precision);
  const lngStep = Math.pow(10, -precision);
  
  const geocells: string[] = [];
  
  // Generate grid of geocells covering the bounding box
  for (let lat = Math.floor(swLat / latStep) * latStep; lat <= neLat; lat += latStep) {
    for (let lng = Math.floor(swLng / lngStep) * lngStep; lng <= neLng; lng += lngStep) {
      geocells.push(generateGeocell(lat, lng, precision));
    }
  }
  
  return geocells;
}

// ============================================================================
// LRU CACHE SYSTEM
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  hits: number;
  misses: number;
  totalRequests: number;
}

class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private maxAge: number; // in milliseconds
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number = 100, maxAgeMinutes: number = 5) {
    this.maxSize = maxSize;
    this.maxAge = maxAgeMinutes * 60 * 1000;
  }

  set(key: string, value: T): void {
    // Remove expired entries
    this.cleanup();
    
    // Remove oldest entry if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return undefined;
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }
    
    // Cache hit - update access info
    this.hits++;
    entry.accessCount++;
    entry.timestamp = Date.now();
    
    return entry.data;
  }

  private cleanup(): void {
    const now = Date.now();
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    });
  }

  private getOldestKey(): string | undefined {
    let oldestKey: string | undefined;
    let oldestTime = Date.now();
    
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    });
    
    return oldestKey;
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      hits: this.hits,
      misses: this.misses,
      totalRequests
    };
  }
}

// ============================================================================
// 3-STAGE SPATIAL LOOKUP ENGINE
// ============================================================================

export interface BoundingBox {
  southWest: [number, number];
  northEast: [number, number];
}

export interface SpatialQuery {
  boundingBox?: BoundingBox;
  regionId?: string;
  category?: string;
  source?: 'tmr' | 'emergency' | 'user';
  since?: Date;
  activeOnly?: boolean;
}

export interface SpatialQueryResult {
  incidents: SelectUnifiedIncident[];
  stats: {
    totalFound: number;
    stage1Filtered: number; // Grid hash results
    stage2Filtered: number; // Bounding box results
    stage3Filtered: number; // Point-in-polygon results
    cacheHit: boolean;
    queryTimeMs: number;
  };
}

class SpatialLookupEngine {
  private cache = new LRUCache<SpatialQueryResult>(50, 2); // 50 entries, 2 min TTL
  private incidents: SelectUnifiedIncident[] = [];
  private lastDataHash: string = '';
  
  /**
   * Load incidents into the spatial engine
   * Only clears cache when data actually changes
   */
  loadIncidents(incidents: SelectUnifiedIncident[]): void {
    // Create hash of incident data to detect changes
    const dataHash = this.createDataHash(incidents);
    
    // Only reload if data has actually changed
    if (dataHash !== this.lastDataHash) {
      this.incidents = incidents;
      this.lastDataHash = dataHash;
      this.cache.clear(); // Only clear cache when data changes
      this.ensureGeoceells(); // Ensure all incidents have geocells
    }
  }
  
  /**
   * Create a simple hash of incident data for change detection
   */
  private createDataHash(incidents: SelectUnifiedIncident[]): string {
    // Simple hash based on count and last updated timestamps
    const timestamps = incidents.map(i => i.lastUpdated.getTime()).sort();
    return `${incidents.length}_${timestamps[0] || 0}_${timestamps[timestamps.length - 1] || 0}`;
  }

  /**
   * Execute 3-stage spatial lookup with caching
   */
  query(query: SpatialQuery): SpatialQueryResult {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(query);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        stats: {
          ...cached.stats,
          cacheHit: true,
          queryTimeMs: Date.now() - startTime
        }
      };
    }

    // Execute 3-stage lookup
    const result = this.executeQuery(query);
    result.stats.queryTimeMs = Date.now() - startTime;
    result.stats.cacheHit = false;
    
    // Cache the result
    this.cache.set(cacheKey, result);
    
    return result;
  }

  private executeQuery(query: SpatialQuery): SpatialQueryResult {
    let candidates = this.incidents;
    let stage1Count = candidates.length;
    let stage2Count = candidates.length;
    let stage3Count = candidates.length;

    // STAGE 1: Grid Hash Lookup (if bounding box provided)
    if (query.boundingBox) {
      const geocells = getGeoceellsInBoundingBox(
        query.boundingBox.southWest,
        query.boundingBox.northEast,
        3 // precision
      );
      
      // Filter incidents with geocells that match the bounding box
      // Keep incidents without geocells for Stage 2 fallback to prevent false negatives
      candidates = candidates.filter(incident => 
        !incident.geocell || geocells.includes(incident.geocell)
      );
      stage1Count = candidates.length;
    }

    // STAGE 2: Bounding Box Filtering (precise coordinate check)
    if (query.boundingBox) {
      const [swLat, swLng] = query.boundingBox.southWest;
      const [neLat, neLng] = query.boundingBox.northEast;
      
      candidates = candidates.filter(incident => 
        incident.centroidLat >= swLat &&
        incident.centroidLat <= neLat &&
        incident.centroidLng >= swLng &&
        incident.centroidLng <= neLng
      );
      stage2Count = candidates.length;
    }

    // STAGE 3: Point-in-Polygon (regional precision)
    if (query.regionId) {
      candidates = candidates.filter(incident => 
        incident.regionIds && incident.regionIds.includes(query.regionId!)
      );
      stage3Count = candidates.length;
    }

    // Additional filters
    if (query.category) {
      candidates = candidates.filter(incident => incident.category === query.category);
    }

    if (query.source) {
      candidates = candidates.filter(incident => incident.source === query.source);
    }

    if (query.since) {
      candidates = candidates.filter(incident => 
        incident.lastUpdated && new Date(incident.lastUpdated) >= query.since!
      );
    }

    if (query.activeOnly) {
      candidates = candidates.filter(incident => 
        incident.status === 'active' || incident.status === 'monitoring'
      );
    }

    return {
      incidents: candidates,
      stats: {
        totalFound: candidates.length,
        stage1Filtered: stage1Count,
        stage2Filtered: stage2Count,
        stage3Filtered: stage3Count,
        cacheHit: false,
        queryTimeMs: 0 // Set by caller
      }
    };
  }

  private generateCacheKey(query: SpatialQuery): string {
    const parts = [
      query.boundingBox ? `bbox:${query.boundingBox.southWest.join(',')}-${query.boundingBox.northEast.join(',')}` : '',
      query.regionId ? `region:${query.regionId}` : '',
      query.category ? `cat:${query.category}` : '',
      query.source ? `src:${query.source}` : '',
      query.since ? `since:${query.since.getTime()}` : '',
      query.activeOnly ? 'active' : ''
    ].filter(Boolean);
    
    return parts.join('|');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Update geocells for incidents missing them
   */
  ensureGeoceells(): void {
    for (const incident of this.incidents) {
      if (!incident.geocell && incident.centroidLat && incident.centroidLng) {
        incident.geocell = generateGeocell(incident.centroidLat, incident.centroidLng);
      }
    }
  }
  
  /**
   * Check if spatial index has data loaded
   */
  hasData(): boolean {
    return this.incidents.length > 0;
  }
  
  /**
   * Get current data statistics
   */
  getDataStats(): { incidentCount: number; withGeocells: number; dataHash: string } {
    const withGeocells = this.incidents.filter(i => i.geocell).length;
    return {
      incidentCount: this.incidents.length,
      withGeocells,
      dataHash: this.lastDataHash
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const spatialLookup = new SpatialLookupEngine();

// ============================================================================
// UTILITIES FOR STORAGE INTEGRATION
// ============================================================================

/**
 * Generate geocell for an incident based on its centroid
 */
export function computeGeocellForIncident(incident: { centroidLat: number; centroidLng: number }): string {
  return generateGeocell(incident.centroidLat, incident.centroidLng);
}

/**
 * Batch update geocells for incidents
 */
export function batchComputeGeocells(incidents: SelectUnifiedIncident[]): SelectUnifiedIncident[] {
  return incidents.map(incident => ({
    ...incident,
    geocell: incident.geocell || computeGeocellForIncident(incident)
  }));
}