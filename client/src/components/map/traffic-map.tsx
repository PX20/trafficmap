import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getTrafficEvents, getTrafficCameras, getIncidents } from "@/lib/traffic-api";
import type { FilterState } from "@/pages/home";

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface TrafficMapProps {
  filters: FilterState;
  onEventSelect: (eventId: string) => void;
  onCameraSelect: (cameraId: string) => void;
}

export function TrafficMap({ filters, onEventSelect, onCameraSelect }: TrafficMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/traffic/events"],
    refetchInterval: filters.autoRefresh ? 30000 : false,
  });

  const { data: camerasData, isLoading: camerasLoading } = useQuery({
    queryKey: ["/api/traffic/cameras"],
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

    const map = L.map(mapRef.current).setView([-27.4698, 153.0251], 10);
    
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
  }, []);

  // Update loading state
  useEffect(() => {
    setIsLoading(eventsLoading || camerasLoading || incidentsLoading);
  }, [eventsLoading, camerasLoading, incidentsLoading]);

  // Update markers when data or filters change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current?.removeLayer(marker);
    });
    markersRef.current = [];

    const newMarkers: L.Marker[] = [];

    // Add event markers
    if ((eventsData as any)?.features) {
      (eventsData as any).features.forEach((feature: any) => {
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
              icon: createCustomMarker(getMarkerColor(eventType))
            });

            const popupContent = createEventPopup(feature.properties);
            marker.bindPopup(popupContent);

            marker.addTo(mapInstanceRef.current!);
            newMarkers.push(marker);
          }
        }
      });
    }

    // Add camera markers
    if (filters.cameras && (camerasData as any)?.features) {
      (camerasData as any).features.forEach((feature: any) => {
        if (feature.geometry?.coordinates) {
          const coords = feature.geometry.coordinates;
          const marker = L.marker([coords[1], coords[0]], {
            icon: createCustomMarker(getMarkerColor('camera'))
          });

          const popupContent = createCameraPopup(feature.properties);
          marker.bindPopup(popupContent);

          marker.addTo(mapInstanceRef.current!);
          newMarkers.push(marker);
        }
      });
    }

    // Add incident markers
    if (filters.incidents && (incidentsData as any)?.features) {
      (incidentsData as any).features.forEach((feature: any) => {
        if (feature.geometry?.coordinates) {
          let coords: [number, number] | null = null;
          
          // Handle different geometry types for incidents
          if (feature.geometry.type === 'Point') {
            coords = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
          } else if (feature.geometry.type === 'MultiPoint' && feature.geometry.coordinates?.[0]) {
            const point = feature.geometry.coordinates[0];
            coords = [point[1], point[0]];
          }
          
          if (coords) {
            const marker = L.marker(coords, {
              icon: createCustomMarker(getMarkerColor('incident'))
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
  }, [eventsData, camerasData, incidentsData, filters]);

  const getMarkerColor = (eventType: string) => {
    const colors = {
      'crash': '#ef4444',
      'hazard': '#f59e0b',
      'roadworks': '#f97316',
      'special event': '#f97316',
      'camera': '#3b82f6',
      'incident': '#dc2626'
    };
    return colors[eventType as keyof typeof colors] || '#6b7280';
  };

  const createCustomMarker = (color: string) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  };

  const createEventPopup = (properties: any) => {
    return `
      <div class="p-2 min-w-[250px]">
        <h4 class="font-semibold text-foreground mb-2">${properties.description || properties.event_type}</h4>
        <p class="text-sm text-muted-foreground mb-2">${properties.information || ''}</p>
        <div class="text-xs text-muted-foreground space-y-1">
          <div><span class="font-medium">Location:</span> ${properties.road_summary?.road_name || 'Unknown'}</div>
          <div><span class="font-medium">Impact:</span> 
            <span class="${getPriorityColor(properties.event_priority)} font-medium">
              ${properties.event_priority || 'Unknown'}
            </span>
          </div>
          <div><span class="font-medium">Status:</span> ${properties.status || 'Unknown'}</div>
        </div>
        <button onclick="window.showEventDetails('${properties.id}')" class="mt-3 w-full px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90">
          View Details
        </button>
      </div>
    `;
  };

  const createCameraPopup = (properties: any) => {
    return `
      <div class="p-2 min-w-[200px]">
        <h4 class="font-semibold text-foreground mb-2">${properties.name || 'Traffic Camera'}</h4>
        <p class="text-sm text-muted-foreground mb-2">${properties.location || ''}</p>
        <div class="text-xs text-muted-foreground mb-3">
          <div><span class="font-medium">Status:</span> 
            <span class="text-green-600 font-medium">${properties.status || 'Active'}</span>
          </div>
        </div>
        <button onclick="window.showCameraFeed('${properties.id}')" class="w-full px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90">
          View Live Feed
        </button>
      </div>
    `;
  };

  const createIncidentPopup = (properties: any) => {
    const vehiclesTotal = (properties.VehiclesAssigned || 0) + (properties.VehiclesOnRoute || 0) + (properties.VehiclesOnScene || 0);
    
    // Determine status color based on status
    const status = properties.CurrentStatus?.toLowerCase();
    let statusColor = 'text-gray-600';
    if (status === 'going' || status === 'active') statusColor = 'text-red-600';
    else if (status === 'patrolled' || status === 'monitoring') statusColor = 'text-yellow-600';
    else if (status === 'completed' || status === 'closed') statusColor = 'text-green-600';
    
    return `
      <div class="p-2 min-w-[250px]">
        <h4 class="font-semibold text-foreground mb-2">${properties.GroupedType || 'Emergency Incident'}</h4>
        <p class="text-sm text-muted-foreground mb-2">Incident #${properties.Master_Incident_Number || 'Unknown'}</p>
        <div class="text-xs text-muted-foreground space-y-1">
          <div><span class="font-medium">Location:</span> ${properties.Location || 'Unknown'}</div>
          <div><span class="font-medium">Locality:</span> ${properties.Locality || 'Unknown'}</div>
          <div><span class="font-medium">Status:</span> 
            <span class="${statusColor} font-medium">
              ${properties.CurrentStatus || 'Active'}
            </span>
          </div>
          <div><span class="font-medium">Region:</span> ${properties.Jurisdiction || 'Unknown'}</div>
          ${vehiclesTotal > 0 ? `<div><span class="font-medium">Vehicles:</span> ${vehiclesTotal} responding</div>` : ''}
          ${properties.Response_Date ? `<div><span class="font-medium">Reported:</span> ${new Date(properties.Response_Date).toLocaleString()}</div>` : ''}
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

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'going' || s === 'active') return 'text-red-600';
    if (s === 'patrolled' || s === 'monitoring') return 'text-yellow-600';
    if (s === 'completed' || s === 'closed') return 'text-green-600';
    return 'text-gray-600';
  };

  // Setup global functions for popup interactions
  useEffect(() => {
    (window as any).showEventDetails = (eventId: string) => {
      onEventSelect(eventId);
    };
    (window as any).showCameraFeed = (cameraId: string) => {
      onCameraSelect(cameraId);
    };
  }, [onEventSelect, onCameraSelect]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full z-10" data-testid="map-container" />
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-30">
          <div className="bg-card p-6 rounded-lg shadow-lg flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin"></div>
            <span className="text-foreground">Loading traffic data...</span>
          </div>
        </div>
      )}
    </div>
  );
}
