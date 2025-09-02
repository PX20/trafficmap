import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getTrafficEvents, getIncidents } from "@/lib/traffic-api";
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
    setIsLoading(eventsLoading || incidentsLoading);
  }, [eventsLoading, incidentsLoading]);

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


    // Add incident markers
    if ((incidentsData as any)?.features) {
      (incidentsData as any).features.forEach((feature: any) => {
        if (feature.geometry?.coordinates) {
          let coords: [number, number] | null = null;
          let shouldShow = false;
          let markerType = 'incident';
          
          // Determine incident category and if it should be shown
          const properties = feature.properties;
          const isUserReported = properties?.userReported;
          
          if (isUserReported) {
            // User-reported incidents
            const incidentType = properties?.incidentType;
            if (['Crime', 'Theft', 'Violence', 'Vandalism'].includes(incidentType) && filters.crime) {
              shouldShow = true;
              markerType = 'crime';
            } else if (incidentType === 'Suspicious' && filters.suspicious) {
              shouldShow = true;
              markerType = 'suspicious';
            } else if (['Public Safety', 'Fire', 'Utility', 'Road Hazard'].includes(incidentType) && filters.emergency) {
              shouldShow = true;
              markerType = 'emergency';
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
                icon: createCustomMarker(getMarkerColor(markerType))
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
        <button onclick="window.showIncidentDetails('${properties.id}', 'traffic')" class="mt-3 w-full px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90">
          View Details & Comments
        </button>
      </div>
    `;
  };


  const createIncidentPopup = (properties: any) => {
    // Check if this is a user-reported incident
    if (properties?.userReported) {
      return `
        <div class="p-2 min-w-[250px]">
          <h4 class="font-semibold text-foreground mb-2">${properties.incidentType || 'Community Report'}</h4>
          <p class="text-sm text-muted-foreground mb-2">${properties.description || 'No description provided'}</p>
          <div class="text-xs text-muted-foreground space-y-1">
            <div><span class="font-medium">Location:</span> ${properties.locationDescription || 'Unknown'}</div>
            <div><span class="font-medium">Reported:</span> ${new Date(properties.createdAt).toLocaleString()}</div>
            <div><span class="font-medium">Source:</span> <span class="text-blue-600 font-medium">Community Report</span></div>
          </div>
          <button onclick="window.showIncidentDetails('${properties.id}', 'user-reported')" class="mt-3 w-full px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90">
            View Details & Comments
          </button>
        </div>
      `;
    }
    
    // Official emergency incident
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
          <div><span class="font-medium">Source:</span> <span class="text-green-600 font-medium">Official</span></div>
        </div>
        <button onclick="window.showIncidentDetails('${properties.Master_Incident_Number || properties.id}', 'emergency')" class="mt-3 w-full px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90">
          View Details & Comments
        </button>
      </div>
    `;
  };

  const getPriorityColor = (priority: string) => {
    const p = priority?.toLowerCase();
    if (p === 'high' || p === 'red alert') return 'text-red-600';
    if (p === 'medium') return 'text-yellow-600';
    return 'text-green-600';
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
