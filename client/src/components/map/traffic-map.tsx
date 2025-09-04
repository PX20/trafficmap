import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTrafficData } from "@/hooks/use-traffic-data";
import type { FilterState } from "@/pages/home";
import { findRegionBySuburb } from "@/lib/regions";
import { extractCoordinatesFromGeometry } from "@/lib/location-utils";

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

  // Use shared data processing hook for perfect synchronization with filter sidebar
  const { filteredEvents, filteredIncidents } = useTrafficData(filters);
  
  // Convert to expected format for backward compatibility
  const eventsData = { features: filteredEvents };
  const incidentsData = { features: filteredIncidents };
  const eventsLoading = false;
  const incidentsLoading = false;


  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Use home location if available, otherwise default to Brisbane
    let centerCoords: [number, number] = [-27.4698, 153.0251]; // Brisbane default
    let zoomLevel = 10; // State-wide view
    
    if (filters.homeCoordinates) {
      centerCoords = [filters.homeCoordinates.lat, filters.homeCoordinates.lon];
      zoomLevel = 13; // Suburb-level view for home location
    }

    const map = L.map(mapRef.current).setView(centerCoords, zoomLevel);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapInstanceRef.current = map;

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
        const eventType = feature.properties.event_type?.toLowerCase();

        if (feature.geometry) {
          let coords: [number, number] | null = null;
          
          // Handle different geometry types
          if (feature.geometry.type === 'MultiPoint' && feature.geometry.coordinates?.[0]) {
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
              icon: createCustomMarker(eventType, getMarkerColor(eventType))
            });

            const popupContent = createEventPopup(feature.properties);
            marker.bindPopup(popupContent);

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
          
          // Determine incident category for marker styling
          const properties = feature.properties;
          const isUserReported = properties?.userReported;
          
          if (isUserReported) {
            // User-reported incidents - determine marker type based on incident content
            const incidentType = properties?.incidentType;
            const description = properties?.description?.toLowerCase() || '';
            const title = properties?.title?.toLowerCase() || '';
            
            if (incidentType === 'traffic' || description.includes('traffic') || title.includes('traffic')) {
              markerType = 'traffic';
            } else if (incidentType === 'crime' || incidentType === 'suspicious_activity' || 
                       description.includes('suspicious') || title.includes('suspicious') ||
                       description.includes('break') || title.includes('break')) {
              markerType = 'crime';
            } else if (description.includes('emergency') || title.includes('emergency')) {
              markerType = 'emergency';
            } else {
              markerType = 'incident'; // default
            }
          } else {
            // Official emergency incidents - all are emergency type
            markerType = 'emergency';
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
              icon: createCustomMarker(markerType, getMarkerColor(markerType))
            });

            const popupContent = createIncidentPopup(feature.properties);
            marker.bindPopup(popupContent);

            marker.addTo(mapInstanceRef.current!);
            newMarkers.push(marker);
          }
        }
      });
    }

    markersRef.current = newMarkers;
  }, [eventsData, incidentsData, filters]);

  // Incident categorization function (same logic as filter sidebar)
  const categorizeIncident = (incident: any) => {
    const props = incident.properties || {};
    
    const datasource = props.datasource?.source_name || props.source || props.datasource || 'unknown';
    const providedBy = props.datasource?.provided_by || '';
    
    // Handle traffic events from QLD Traffic API
    const trafficEventType = props.event_type || props.eventType || props.type;
    if (trafficEventType) {
      const eventTypeLower = trafficEventType.toLowerCase();
      // All traffic events go to Infrastructure & Hazards
      if (eventTypeLower === 'crash' || eventTypeLower === 'hazard' || 
          eventTypeLower === 'roadworks' || eventTypeLower === 'special_event' ||
          eventTypeLower === 'special event') {
        return '9b1d58d9-cfd1-4c31-93e9-754276a5f265'; // Infrastructure & Hazards
      }
    }
    
    // For user-reported incidents, use their categoryId
    if (props.userReported && props.categoryId) {
      return props.categoryId;
    }
    
    // Handle ESQ (Emergency Services Queensland) incidents
    if (datasource === 'ESQ' || providedBy?.includes('Emergency') || props.source === 'ESQ') {
      return '54d31da5-fc10-4ad2-8eca-04bac680e668'; // Emergency Situations
    }
    
    // Handle TMR (Transport and Main Roads) incidents  
    if (datasource === 'TMR' || datasource === 'EPS' || providedBy?.includes('Transport') || providedBy?.includes('Main Roads') || props.source === 'TMR') {
      return '9b1d58d9-cfd1-4c31-93e9-754276a5f265'; // Infrastructure & Hazards
    }
    
    // Handle QPS (Queensland Police Service) incidents
    if (datasource === 'QPS' || providedBy?.includes('Police') || props.source === 'QPS') {
      return '792759f4-1b98-4665-b14c-44a54e9969e9'; // Safety & Crime
    }
    
    // For QFES incidents, categorize based on GroupedType and other properties
    const groupedType = props.GroupedType?.toLowerCase() || '';
    const eventType = props.Event_Type?.toLowerCase() || '';
    const description = (props.description || '').toLowerCase();
    const title = (incident.title || '').toLowerCase();
    
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

  const getMarkerColor = (eventType: string) => {
    const colors = {
      'crash': '#ef4444',
      'hazard': '#f59e0b',
      'roadworks': '#f97316',
      'special event': '#f97316',
      'incident': '#dc2626',
      'crime': '#9333ea',
      'suspicious': '#f59e0b',
      'emergency': '#4f46e5',
      'weather': '#10b981'
    };
    return colors[eventType as keyof typeof colors] || '#6b7280';
  };

  const createCustomMarker = (markerType: string, color: string) => {
    const getIconSvg = (type: string) => {
      switch(type.toLowerCase()) {
        // Traffic events - all get car/traffic icon
        case 'crash':
        case 'hazard': 
        case 'restriction':
        case 'incident':
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18.7 10H15l2.9-1.9c.5-.3.8-.8.8-1.4 0-.8-.7-1.4-1.5-1.4H12c-.8 0-1.5.6-1.5 1.4 0 .6.3 1.1.8 1.4L14.3 10H10.7L8.9 8.1c.5-.3.8-.8.8-1.4 0-.8-.7-1.4-1.5-1.4H3.8c-.8 0-1.5.6-1.5 1.4 0 .6.3 1.1.8 1.4L5 10.3C4.2 11 3.5 12 3.5 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`;
        // Community reports get specific icons
        case 'crime':
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>`;
        case 'suspicious':
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;
        case 'emergency':
          return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
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
      html: `<div style="background-color: white; width: 24px; height: 24px; border-radius: 50%; border: 2px solid ${color}; box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center;">${getIconSvg(markerType)}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  };

  const createEventPopup = (properties: any) => {
    // Get event type and limit to 25 characters with ellipsis
    const eventType = properties.event_type || properties.description || 'Traffic Event';
    const shortTitle = eventType.length > 25 ? eventType.substring(0, 25) + '...' : eventType;
    const roadName = properties.road_summary?.road_name || properties.location || 'Unknown Road';
    
    return `
      <div class="p-3 min-w-[280px] max-w-[320px] bg-white rounded-lg shadow-lg border border-gray-200 font-sans">
        <!-- Simple Header -->
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-sm">
            <span class="text-white font-bold text-xs">TMR</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-gray-900 text-sm">TMR Queensland</div>
            <div class="flex items-center gap-1 text-xs text-gray-500">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
              </svg>
              <span>2h ago</span>
            </div>
          </div>
        </div>
        
        <!-- Simple Content -->
        <div class="mb-3">
          <h4 class="font-semibold text-gray-900 text-sm mb-2">${shortTitle}</h4>
          <div class="flex items-center gap-1 text-xs text-gray-600">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
            </svg>
            <span>${roadName}</span>
          </div>
        </div>
        
        <!-- Simple Footer -->
        <div class="flex items-center justify-between py-2 border-t border-gray-100">
          <div class="flex items-center gap-3">
            <button class="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg>
            </button>
            <button onclick="window.showIncidentDetails('${properties.id}', 'traffic')" class="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
            </button>
            <button class="flex items-center gap-1 text-gray-500 hover:text-green-500 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
              </svg>
              <span class="text-sm">Share</span>
            </button>
          </div>
          <button onclick="window.showIncidentDetails('${properties.id}', 'traffic')" class="text-xs bg-orange-500 hover:bg-orange-600 text-white font-medium px-3 py-1 rounded-full transition-colors">
            View More
          </button>
        </div>
      </div>
    `;
  };


  const createIncidentPopup = (properties: any) => {
    // Check if this is a user-reported incident
    if (properties?.userReported) {
      const photoUrl = properties?.photoUrl;
      const compressedPhotoUrl = photoUrl ? `/api/compress-image?path=${encodeURIComponent(photoUrl)}` : null;
      const photoThumbnail = compressedPhotoUrl ? `
        <div class="mb-3 rounded-lg overflow-hidden border border-gray-200">
          <img src="${compressedPhotoUrl}" alt="Incident photo" class="w-full h-24 object-cover hover:scale-105 transition-transform cursor-pointer" onclick="window.showIncidentDetails('${properties.id}', 'user-reported')" />
        </div>
      ` : '';
      
      const typeColor = getIncidentTypeColor(properties.incidentType);
      const priorityText = properties?.severity || 'Community Report';
      
      return `
        <div class="p-4 min-w-[300px] max-w-[350px] bg-white rounded-xl shadow-lg border border-gray-200 font-sans">
          <!-- User Header -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <span class="text-white font-bold text-xs">${(properties.reporterName || 'User').slice(0, 2).toUpperCase()}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-gray-900 text-sm mb-1">${properties.reporterName || 'Community Reporter'}</div>
                <div class="flex items-center gap-1 text-xs text-gray-500">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                  </svg>
                  <span>4h ago</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Content -->
          <div class="mb-4">
            <div class="p-3 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 mb-3">
              <h4 class="font-semibold text-sm mb-2 leading-relaxed">${(properties.title || properties.incidentType || 'Community Report').length > 25 ? (properties.title || properties.incidentType || 'Community Report').substring(0, 25) + '...' : (properties.title || properties.incidentType || 'Community Report')}</h4>
              <div class="flex items-center gap-2 text-xs text-purple-700">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
                </svg>
                <span class="font-medium">${properties.locationDescription || 'Community Location'}</span>
              </div>
            </div>
            
            ${properties.description ? `
              <div class="text-xs text-gray-700 bg-gray-50 p-3 rounded-md border-l-2 border-purple-400">
                <div class="font-medium text-gray-800 mb-1">Description:</div>
                <div class="leading-relaxed">${properties.description.substring(0, 120) + (properties.description.length > 120 ? '...' : '')}</div>
              </div>
            ` : ''}
          </div>
          
          <!-- Photo if available -->
          ${photoThumbnail ? `
            <div class="mb-4">
              ${photoThumbnail.replace('class="mb-3', 'class="mb-0')}
            </div>
          ` : ''}
          
          <!-- Interactive Footer -->
          <div class="flex items-center justify-between pt-3 border-t border-gray-100">
            <div class="flex items-center gap-4">
              <button class="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors group">
                <div class="p-1 rounded-full group-hover:bg-red-50 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                  </svg>
                </div>
              </button>
              <button onclick="window.showIncidentDetails('${properties.id}', 'user-reported')" class="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors group">
                <div class="p-1 rounded-full group-hover:bg-blue-50 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                  </svg>
                </div>
              </button>
              <button class="flex items-center gap-2 text-gray-600 hover:text-green-500 transition-colors group">
                <div class="p-1 rounded-full group-hover:bg-green-50 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                  </svg>
                </div>
              </button>
            </div>
            <button onclick="window.showIncidentDetails('${properties.id}', 'user-reported')" class="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs font-medium px-4 py-2 rounded-full transition-all shadow-md hover:shadow-lg">
              View More
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
    
    const agencyInfo = getAgencyInfo(properties.GroupedType || '');
    const shortIncidentDesc = (properties.GroupedType || 'Emergency Incident')
      .substring(0, 60) + ((properties.GroupedType || '').length > 60 ? '...' : '');
    
    return `
      <div class="p-4 min-w-[300px] max-w-[350px] bg-white rounded-xl shadow-lg border border-gray-200 font-sans">
        <!-- Agency Header -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br ${agencyInfo.color} flex items-center justify-center shadow-sm">
              <span class="text-white font-bold text-xs">${agencyInfo.avatar}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-gray-900 text-sm mb-1">${agencyInfo.name}</div>
              <div class="flex items-center gap-1 text-xs text-gray-500">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>
                <span>30m ago</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Content -->
        <div class="mb-4">
          <div class="p-3 rounded-lg bg-red-50 text-red-900 border border-red-200 mb-3">
            <h4 class="font-semibold text-sm mb-2 leading-relaxed">${shortIncidentDesc.length > 25 ? shortIncidentDesc.substring(0, 25) + '...' : shortIncidentDesc}</h4>
            <div class="flex items-center gap-2 text-xs text-red-700">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
              </svg>
              <span class="font-medium">${properties.Location || properties.Locality || 'Emergency Location'}</span>
            </div>
          </div>
          
          <!-- Emergency Details -->
          ${properties.Priority && properties.Priority !== 'Unknown' ? `
            <div class="text-xs bg-amber-50 p-3 rounded-md border-l-2 border-red-400 mb-2">
              <div class="font-medium text-gray-800 mb-1">Priority Level:</div>
              <div class="text-amber-700 font-semibold">${properties.Priority}</div>
            </div>
          ` : ''}
          
          ${properties.Status && properties.Status !== 'Unknown' ? `
            <div class="text-xs text-gray-700 bg-gray-50 p-2 rounded-md">
              <span class="font-medium">Status:</span> ${properties.Status}
            </div>
          ` : ''}
        </div>
        
        <!-- Interactive Footer -->
        <div class="flex items-center justify-between pt-3 border-t border-gray-100">
          <div class="flex items-center gap-4">
            <button class="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors group">
              <div class="p-1 rounded-full group-hover:bg-red-50 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                </svg>
              </div>
            </button>
            <button onclick="window.showIncidentDetails('${properties.Master_Incident_Number || properties.id}', 'emergency')" class="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors group">
              <div class="p-1 rounded-full group-hover:bg-blue-50 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
              </div>
            </button>
            <button class="flex items-center gap-2 text-gray-600 hover:text-green-500 transition-colors group">
              <div class="p-1 rounded-full group-hover:bg-green-50 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                </svg>
              </div>
            </button>
          </div>
          <button onclick="window.showIncidentDetails('${properties.Master_Incident_Number || properties.id}', 'emergency')" class="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-medium px-4 py-2 rounded-full transition-all shadow-md hover:shadow-lg">
            View More
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
