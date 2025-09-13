// Traffic Map Component
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTrafficData } from "@/hooks/use-traffic-data";

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
import type { FilterState } from "@/pages/home";
import { findRegionBySuburb } from "@/lib/regions";
import { extractCoordinatesFromGeometry } from "@/lib/location-utils";
import { calculateIncidentAging, type IncidentAgingData } from "@/lib/incident-aging";

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
}

export function TrafficMap({ filters, onEventSelect }: TrafficMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🎯 UNIFIED PIPELINE: MAP shows ALL Queensland data for big picture view
  const { events, incidents } = useTrafficData(filters);
  
  // Convert to expected format for backward compatibility  
  const eventsData = { features: events || [] };
  const incidentsData = { features: incidents || [] };
  
  console.log('🗺️ MAP: Rendering', events?.length || 0, 'events,', incidents?.length || 0, 'incidents');
  const eventsLoading = false;
  const incidentsLoading = false;


  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Try to restore saved map position and zoom from localStorage
    const savedMapState = localStorage.getItem('qldSafetyMap_position');
    let centerCoords: [number, number] = [-27.4698, 153.0251]; // Brisbane default
    let zoomLevel = 11; // Regional view - within our restricted range
    
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
      minZoom: 10, // Tighter restriction - roughly Queensland region level
      maxZoom: 16, // Allow more detail for local areas
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
      minZoom: 10, // Match map's minimum zoom
      maxZoom: 16 // Match map's maximum zoom
    }).addTo(map);

    mapInstanceRef.current = map;

    // Save map position and zoom when user moves or zooms the map
    const saveMapState = () => {
      if (mapInstanceRef.current) {
        const center = mapInstanceRef.current.getCenter();
        const zoom = mapInstanceRef.current.getZoom();
        const mapState = {
          lat: center.lat,
          lng: center.lng,
          zoom: zoom
        };
        localStorage.setItem('qldSafetyMap_position', JSON.stringify(mapState));
      }
    };

    // Add event listeners to save state on map interactions
    map.on('moveend', saveMapState);
    map.on('zoomend', saveMapState);

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

  // Update markers when data or filters change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current?.removeLayer(marker);
    });
    markersRef.current = [];

    const newMarkers: L.Marker[] = [];
    
    // Events are already filtered by region on the backend when homeLocation is set
    let filteredEventsData = eventsData;
    let filteredIncidentsData = incidentsData;

    // Add event markers (already filtered by shared hook)
    if ((filteredEventsData as any)?.features) {
      (filteredEventsData as any).features.forEach((feature: any) => {
        const eventType = getSafeString(feature.properties, 'event_type');
        
        // Calculate aging for traffic events
        const agingData = calculateIncidentAging({
          category: 'traffic',
          severity: feature.properties?.priority || feature.properties?.impact_type || 'medium',
          status: feature.properties?.status || 'active',
          lastUpdated: feature.properties?.last_updated || feature.properties?.published || new Date().toISOString(),
          incidentTime: feature.properties?.duration?.start || feature.properties?.published,
          properties: feature.properties
        });
        
        // Skip events that should be hidden due to aging
        if (!agingData.isVisible) {
          return;
        }

        if (feature.geometry) {
          let coords: [number, number] | null = null;
          
          // Handle different geometry types
          if (feature.geometry.type === 'Point' && feature.geometry.coordinates) {
            // Simple Point geometry (most common case)
            coords = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
          } else if (feature.geometry.type === 'MultiPoint' && feature.geometry.coordinates?.[0]) {
            // MultiPoint: use first point
            const point = feature.geometry.coordinates[0];
            coords = [point[1], point[0]];
          } else if (feature.geometry.type === 'GeometryCollection' && feature.geometry.geometries?.[0]) {
            // GeometryCollection: find first Point geometry
            const pointGeometry = feature.geometry.geometries.find((g: any) => g.type === 'Point');
            if (pointGeometry?.coordinates) {
              coords = [pointGeometry.coordinates[1], pointGeometry.coordinates[0]];
            }
          } else if (feature.geometry.geometries?.[0]?.coordinates) {
            // Legacy handling for other geometry collections
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
            const marker = L.marker(coords, {
              icon: createCustomMarker(eventType, getMarkerColor(eventType, feature.properties), agingData.opacity)
            });

            // Use enhanced EventModal instead of Leaflet popup
            marker.on('click', () => {
              onEventSelect(feature);
            });

            marker.addTo(mapInstanceRef.current!);
            newMarkers.push(marker);
          }
        }
      });
    }


    // Add incident markers (already filtered by shared hook)
    if ((filteredIncidentsData as any)?.features) {
      (filteredIncidentsData as any).features.forEach((feature: any) => {
        if (feature.geometry?.coordinates) {
          let coords: [number, number] | null = null;
          let markerType = 'incident';
          let incidentCategory = 'emergency'; // Default category for aging
          
          // Determine incident category for marker styling and aging
          const properties = feature.properties;
          const isUserReported = properties?.userReported;
          
          if (isUserReported) {
            // User-reported incidents - determine marker type based on incident type
            const incidentType = properties?.incidentType;
            
            if (incidentType === 'traffic') {
              markerType = 'traffic';
              incidentCategory = 'traffic';
            } else if (incidentType === 'crime' || incidentType === 'suspicious_activity') {
              markerType = 'crime';
              incidentCategory = 'crime';
            } else if (incidentType === 'emergency') {
              markerType = 'emergency';
              incidentCategory = 'emergency';
            } else if (incidentType === 'wildlife') {
              markerType = 'wildlife';
              incidentCategory = 'wildlife';
            } else {
              // Infrastructure, generic user reports, and other types fall into community category
              // This includes "USER_REPORT", "User Report", and other community issues
              markerType = 'community';
              incidentCategory = 'community';
            }
          } else {
            // Official emergency incidents - distinguish QFES from ESQ
            if (isQFESIncident(feature)) {
              markerType = 'qfes';
              incidentCategory = 'fire';
            } else {
              markerType = 'emergency';
              incidentCategory = 'emergency';
            }
          }
          
          // Calculate aging for incidents
          const agingData = calculateIncidentAging({
            category: incidentCategory,
            severity: properties?.severity || properties?.priority || 'medium',
            status: properties?.status || properties?.CurrentStatus || 'active',
            lastUpdated: properties?.lastUpdated || properties?.LastUpdate || properties?.updated_at || new Date().toISOString(),
            incidentTime: properties?.incidentTime || properties?.Response_Date || properties?.created_at,
            properties: properties
          });
          
          // Skip incidents that should be hidden due to aging
          if (!agingData.isVisible) {
            return;
          }
          
          // Handle different geometry types for incidents (data already filtered)
          if (feature.geometry.type === 'Point') {
            coords = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
          } else if (feature.geometry.type === 'MultiPoint' && feature.geometry.coordinates?.[0]) {
            const point = feature.geometry.coordinates[0];
            coords = [point[1], point[0]];
          }
          
          if (coords) {
            const marker = L.marker(coords, {
              icon: createCustomMarker(markerType, getMarkerColor(markerType, feature.properties), agingData.opacity)
            });

            // Use enhanced EventModal instead of Leaflet popup
            marker.on('click', () => {
              onEventSelect(feature);
            });

            marker.addTo(mapInstanceRef.current!);
            newMarkers.push(marker);
          }
        }
      });
    }

    markersRef.current = newMarkers;
  }, [eventsData, incidentsData, filters]);

  // Incident categorization function
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
        return '9b1d58d9-cfd1-4c31-93e9-754276a5f265'; // Infrastructure & Hazards
      }
    }
    
    // For user-reported incidents, use their categoryId
    if (getProperty(props, 'userReported') && getProperty(props, 'categoryId')) {
      return getProperty(props, 'categoryId');
    }
    
    // Handle ESQ (Emergency Services Queensland) incidents
    if (datasource === 'ESQ' || providedBy?.includes('Emergency') || getProperty(props, 'source') === 'ESQ') {
      return '54d31da5-fc10-4ad2-8eca-04bac680e668'; // Emergency Situations
    }
    
    // Handle TMR (Transport and Main Roads) incidents  
    if (datasource === 'TMR' || datasource === 'EPS' || providedBy?.includes('Transport') || providedBy?.includes('Main Roads') || getProperty(props, 'source') === 'TMR') {
      return '9b1d58d9-cfd1-4c31-93e9-754276a5f265'; // Infrastructure & Hazards
    }
    
    // Handle QPS (Queensland Police Service) incidents
    if (datasource === 'QPS' || providedBy?.includes('Police') || getProperty(props, 'source') === 'QPS') {
      return '792759f4-1b98-4665-b14c-44a54e9969e9'; // Safety & Crime
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
      return '792759f4-1b98-4665-b14c-44a54e9969e9'; // Safety & Crime
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
      return '54d31da5-fc10-4ad2-8eca-04bac680e668'; // Emergency Situations
    }
    
    // Infrastructure & Hazards - Road hazards, infrastructure issues, traffic
    if (description.includes('hazard') ||
        description.includes('infrastructure') ||
        description.includes('road') ||
        description.includes('traffic') ||
        title.includes('hazard') ||
        title.includes('infrastructure') ||
        title.includes('road')) {
      return '9b1d58d9-cfd1-4c31-93e9-754276a5f265'; // Infrastructure & Hazards
    }
    
    // Wildlife & Nature - Animal related incidents
    if (description.includes('snake') ||
        description.includes('python') ||
        description.includes('animal') ||
        description.includes('wildlife') ||
        title.includes('animal') ||
        title.includes('wildlife')) {
      return 'd03f47a9-10fb-4656-ae73-92e959d7566a'; // Wildlife & Nature
    }
    
    // Default to Community Issues for uncategorized incidents
    return 'deaca906-3561-4f80-b79f-ed99561c3b04'; // Community Issues
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
      // Emergency - blue for ESQ
      case 'emergency':
        return '#4f46e5'; // Blue - matches emergency filter icon
      // QFES - red for fire services
      case 'qfes':
        return '#dc2626'; // Red - matches QFES fire services
      // Wildlife - green
      case 'wildlife':
        return '#16a34a'; // Green - matches wildlife filter icon
      // Community issues - teal
      case 'community':
        return '#0d9488'; // Teal - distinct from completion grey
      // Default
      default:
        return '#6b7280'; // Gray
    }
  };

  const createCustomMarker = (markerType: string, color: string, opacity: number = 1.0) => {
    const getIconSvg = (type: string) => {
      switch(type.toLowerCase()) {
        // Traffic events - all get car/traffic icon
        case 'crash':
        case 'hazard': 
        case 'restriction':
        case 'incident':
        case 'congestion':
        case 'roadworks':
        case 'special_event':
        case 'special event':
        case 'traffic':
        case 'multi-vehicle':
        case 'road damage':
        case 'recurring':
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18.7 10H15l2.9-1.9c.5-.3.8-.8.8-1.4 0-.8-.7-1.4-1.5-1.4H12c-.8 0-1.5.6-1.5 1.4 0 .6.3 1.1.8 1.4L14.3 10H10.7L8.9 8.1c.5-.3.8-.8.8-1.4 0-.8-.7-1.4-1.5-1.4H3.8c-.8 0-1.5.6-1.5 1.4 0 .6.3 1.1.8 1.4L5 10.3C4.2 11 3.5 12 3.5 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`;
        // Community reports get specific icons
        case 'crime':
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>`;
        case 'suspicious':
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;
        case 'emergency':
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
        case 'qfes':
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;
        case 'wildlife':
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17z"/></svg>`;
        case 'community':
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m22 21-3-3m0 0-3-3m3 3 3 3m-3-3-3 3"/></svg>`;
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
                <span class="font-medium">${formatEventTime(properties.last_updated || properties.published || properties.Response_Date || properties.createdAt || properties.timeReported)}</span>
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
                  <span class="font-medium">${formatEventTime(properties.timeReported || properties.createdAt || properties.Response_Date)}</span>
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
                <span class="font-medium">${formatEventTime(getProperty(properties, 'Response_Date') || getProperty(properties, 'createdAt') || getProperty(properties, 'published'))}</span>
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
          title: 'QLD Safety Monitor - Incident Alert',
          text: `Check out this ${incidentType} incident on QLD Safety Monitor`,
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
