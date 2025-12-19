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
