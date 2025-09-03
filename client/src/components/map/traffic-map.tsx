import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getTrafficEvents, getIncidents } from "@/lib/traffic-api";
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

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/traffic/events"],
    refetchInterval: filters.autoRefresh ? 30000 : false,
  });


  const { data: incidentsData, isLoading: incidentsLoading } = useQuery({
    queryKey: ["/api/incidents"],
    queryFn: getIncidents,
    refetchInterval: filters.autoRefresh ? 60000 : false,
  });


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
    
    // Apply regional filtering if enabled
    let filteredEventsData = eventsData;
    let filteredIncidentsData = incidentsData;
    
    if (filters.locationFilter && filters.homeLocation) {
      const region = findRegionBySuburb(filters.homeLocation);
      
      if (region) {
        // Filter traffic events by region
        if (eventsData && typeof eventsData === 'object' && 'features' in eventsData && Array.isArray((eventsData as any).features)) {
          const regionalEvents = (eventsData as any).features.filter((feature: any) => {
            const locality = feature.properties?.road_summary?.locality || '';
            const roadName = feature.properties?.road_summary?.road_name || '';
            const locationText = `${locality} ${roadName}`.toLowerCase();
            
            return region.suburbs.some(suburb => {
              const suburbLower = suburb.toLowerCase();
              return locationText.includes(suburbLower) ||
                     suburbLower.includes(locationText) ||
                     locationText.includes('sunshine') ||
                     locationText.includes('caloundra') ||
                     locationText.includes('maroochydore') ||
                     locationText.includes('nambour') ||
                     locationText.includes('noosa');
            });
          });
          
          filteredEventsData = {
            ...(eventsData as any),
            features: regionalEvents
          };
        }
        
        // Filter incidents by region
        if (incidentsData && typeof incidentsData === 'object' && 'features' in incidentsData && Array.isArray((incidentsData as any).features)) {
          const regionalIncidents = (incidentsData as any).features.filter((feature: any) => {
            const locality = feature.properties?.Locality || '';
            const location = feature.properties?.Location || '';
            const locationDesc = feature.properties?.locationDescription || '';
            const locationText = `${locality} ${location} ${locationDesc}`.toLowerCase();
            
            return region.suburbs.some(suburb => {
              const suburbLower = suburb.toLowerCase();
              return locationText.includes(suburbLower) ||
                     suburbLower.includes(locationText) ||
                     locationText.includes('sunshine') ||
                     locationText.includes('caloundra') ||
                     locationText.includes('maroochydore') ||
                     locationText.includes('nambour') ||
                     locationText.includes('noosa');
            });
          });
          
          filteredIncidentsData = {
            ...(incidentsData as any),
            features: regionalIncidents
          };
        }
      }
    }

    // Add event markers
    if ((filteredEventsData as any)?.features) {
      (filteredEventsData as any).features.forEach((feature: any) => {
        const eventType = feature.properties.event_type?.toLowerCase();
        let shouldShow = false;

        if (eventType === "crash" && filters.crashes) shouldShow = true;
        if (eventType === "hazard" && filters.hazards) shouldShow = true;
        if ((eventType === "roadworks" || eventType === "special event") && filters.restrictions) shouldShow = true;

        // Apply impact filter
        if (shouldShow && filters.impactLevel !== 'all') {
          const priority = feature.properties.event_priority?.toLowerCase();
          if (filters.impactLevel === 'high' && priority !== 'high' && priority !== 'red alert') {
            shouldShow = false;
          }
          if (filters.impactLevel === 'medium' && priority !== 'high' && priority !== 'medium' && priority !== 'red alert') {
            shouldShow = false;
          }
        }

        if (shouldShow && feature.geometry) {
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


    // Add incident markers
    if ((filteredIncidentsData as any)?.features) {
      (filteredIncidentsData as any).features.forEach((feature: any) => {
        if (feature.geometry?.coordinates) {
          let coords: [number, number] | null = null;
          let shouldShow = false;
          let markerType = 'incident';
          
          // Determine incident category and if it should be shown
          const properties = feature.properties;
          const isUserReported = properties?.userReported;
          
          
          if (isUserReported) {
            // User-reported incidents - show them based on incident type
            const incidentType = properties?.incidentType;
            const description = properties?.description?.toLowerCase() || '';
            const title = properties?.title?.toLowerCase() || '';
            
            // Always show user-reported incidents for now (we can add filtering later)
            shouldShow = true;
            
            // Determine marker type based on incident content
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
            // Official emergency incidents
            if (filters.incidents) {
              shouldShow = true;
              markerType = 'incident';
            }
          }
          
          if (shouldShow) {
            // Handle different geometry types for incidents
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
        }
      });
    }

    markersRef.current = newMarkers;
  }, [eventsData, incidentsData, filters]);

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
    // Get short description (max 80 chars)
    const shortDesc = (properties.description || properties.event_type || 'Traffic Event')
      .substring(0, 80) + ((properties.description || '').length > 80 ? '...' : '');
    
    return `
      <div class="p-3 min-w-[280px] max-w-[320px] bg-white rounded-lg shadow-sm border">
        <!-- User Header -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <span class="text-white font-bold text-xs">TMR</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium text-sm truncate">TMR Queensland</span>
                <span class="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Official</span>
              </div>
              <div class="flex items-center gap-1 text-xs text-gray-600">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>
                <span>2h ago</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Content -->
        <div class="mb-3">
          <h4 class="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">${shortDesc}</h4>
          <div class="flex items-center gap-1 text-xs text-gray-600">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
            </svg>
            <span class="truncate">${properties.road_summary?.road_name || 'Unknown Road'}</span>
          </div>
        </div>
        
        <!-- Social Bar -->
        <div class="flex items-center justify-between py-2 border-t border-gray-100">
          <div class="flex items-center space-x-3">
            <button class="flex items-center space-x-1 text-gray-500 hover:text-red-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg>
              <span class="text-sm font-medium">8</span>
            </button>
            <button onclick="window.showIncidentDetails('${properties.id}', 'traffic')" class="flex items-center space-x-1 text-gray-500 hover:text-blue-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
              <span class="text-sm font-medium">3</span>
            </button>
            <button class="flex items-center space-x-1 text-gray-500 hover:text-green-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
              </svg>
              <span class="text-sm">Share</span>
            </button>
          </div>
          <button onclick="window.showIncidentDetails('${properties.id}', 'traffic')" class="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">
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
        <div class="p-3 min-w-[280px] max-w-[320px] bg-white rounded-lg shadow-sm border">
          <!-- User Header -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <span class="text-white font-bold text-xs">${(properties.reporterName || 'User').slice(0, 2).toUpperCase()}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-sm truncate">${properties.reporterName || 'Anonymous'}</span>
                  <span class="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Community</span>
                </div>
                <div class="flex items-center gap-1 text-xs text-gray-600">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                  </svg>
                  <span>4h ago</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Content -->
          <div class="mb-3">
            <h4 class="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">${properties.title || properties.incidentType || 'Community Report'}</h4>
            <div class="flex items-center gap-1 text-xs text-gray-600 mb-2">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
              </svg>
              <span class="truncate">${properties.locationDescription || 'Unknown location'}</span>
            </div>
          </div>
          ${photoThumbnail}
          
          <!-- Social Bar -->
          <div class="flex items-center justify-between py-2 border-t border-gray-100">
            <div class="flex items-center space-x-3">
              <button class="flex items-center space-x-1 text-gray-500 hover:text-red-500">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                </svg>
                <span class="text-sm font-medium">12</span>
              </button>
              <button onclick="window.showIncidentDetails('${properties.id}', 'user-reported')" class="flex items-center space-x-1 text-gray-500 hover:text-blue-500">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
                <span class="text-sm font-medium">6</span>
              </button>
              <button class="flex items-center space-x-1 text-gray-500 hover:text-green-500">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                </svg>
              </button>
            </div>
            <button onclick="window.showIncidentDetails('${properties.id}', 'user-reported')" class="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">
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
    const shortIncidentDesc = (properties.GroupedType || 'Emergency Incident')\n      .substring(0, 60) + ((properties.GroupedType || '').length > 60 ? '...' : '');
    
    return `
      <div class="p-3 min-w-[280px] max-w-[320px] bg-white rounded-lg shadow-sm border">
        <!-- Agency Header -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br ${agencyInfo.color} flex items-center justify-center">
              <span class="text-white font-bold text-xs">${agencyInfo.avatar}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium text-sm truncate">${agencyInfo.name}</span>
                <span class="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Official</span>
              </div>
              <div class="flex items-center gap-1 text-xs text-gray-600">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                </svg>
                <span>30m ago</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Content -->
        <div class="mb-3">
          <h4 class="font-semibold text-red-700 text-sm mb-1 line-clamp-2">${shortIncidentDesc}</h4>
          <div class="flex items-center gap-1 text-xs text-gray-600">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path>
            </svg>
            <span class="truncate">${properties.Location || properties.Locality || 'Unknown location'}</span>
          </div>
        </div>
        
        <!-- Social Bar -->
        <div class="flex items-center justify-between py-2 border-t border-gray-100">
          <div class="flex items-center space-x-3">
            <button class="flex items-center space-x-1 text-gray-500 hover:text-red-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg>
              <span class="text-sm font-medium">18</span>
            </button>
            <button onclick="window.showIncidentDetails('${properties.Master_Incident_Number || properties.id}', 'emergency')" class="flex items-center space-x-1 text-gray-500 hover:text-blue-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
              <span class="text-sm font-medium">4</span>
            </button>
            <button class="flex items-center space-x-1 text-gray-500 hover:text-green-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
              </svg>
            </button>
          </div>
          <button onclick="window.showIncidentDetails('${properties.Master_Incident_Number || properties.id}', 'emergency')" class="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">
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
