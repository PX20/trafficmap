import { useQuery } from "@tanstack/react-query";
import type { FilterState } from "@/pages/home";
import { findRegionBySuburb } from '@/lib/regions';

export interface ProcessedTrafficData {
  events: any[]; // All Queensland data for map
  incidents: any[]; // All Queensland data for map
  regionalEvents: any[]; // User's region data for feed
  regionalIncidents: any[]; // User's region data for feed
  counts: {
    total: number;
    trafficEvents: number;
    emergencyIncidents: number;
    qfesIncidents: number;
    userSafetyCrime: number;
    userWildlife: number;
    userCommunity: number;
    userTraffic: number;
  };
  filteredEvents: any[];
  filteredIncidents: any[];
}

// Shared helper function to identify QFES incidents
const isQFESIncident = (incident: any) => {
  const incidentType = incident.properties?.incidentType?.toLowerCase() || '';
  const groupedType = incident.properties?.GroupedType?.toLowerCase() || '';
  const description = incident.properties?.description?.toLowerCase() || '';
  
  return incidentType.includes('fire') || 
         incidentType.includes('smoke') || 
         incidentType.includes('chemical') || 
         incidentType.includes('hazmat') ||
         groupedType.includes('fire') || 
         groupedType.includes('smoke') || 
         groupedType.includes('chemical') || 
         groupedType.includes('hazmat') ||
         description.includes('fire') || 
         description.includes('smoke');
};

export function useTrafficData(filters: FilterState): ProcessedTrafficData {
  // UNIFIED DATA PIPELINE: Single API call for all incident data
  const { data: unifiedData } = useQuery({
    queryKey: ["/api/unified"],
    queryFn: async () => {
      // Use fetch with extended timeout for large datasets
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
      
      try {
        const response = await fetch('/api/unified', {
          credentials: 'include',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('Failed to fetch unified incidents');
        return response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    select: (data: any) => {
      console.log('🔄 UNIFIED PIPELINE: Events:', data?.features?.filter((f: any) => f.properties?.source === 'tmr')?.length || 0, 'Incidents:', data?.features?.length || 0);
      return data || { type: 'FeatureCollection', features: [] };
    },
    refetchInterval: filters.autoRefresh ? 30000 : 60 * 1000, // Auto-refresh every 1 minute
  });

  // Extract and process all unified features
  const allFeatures = unifiedData?.features || [];
  
  // Separate by source type for backward compatibility
  const allEventsData = allFeatures.filter((feature: any) => {
    const source = feature.properties?.source;
    return source === 'tmr'; // Traffic events from TMR source
  });
  
  const allIncidentsData = allFeatures.filter((feature: any) => {
    const source = feature.properties?.source;
    return source === 'emergency' || source === 'user'; // Emergency services + user reports
  });

  // CLIENT-SIDE PROXIMITY-BASED FILTERING - Primary filtering method
  const defaultRadius = 50; // Default 50km radius
  const filterRadius = typeof filters.radius === 'number' ? filters.radius : defaultRadius;
  
  // Debug proximity filtering
  console.log('🏠 HOME LOCATION:', filters.homeLocation, 'COORDINATES:', filters.homeCoordinates, 'RADIUS:', filterRadius + 'km');
  
  // PROXIMITY-BASED FILTERING: Use distance calculation as primary and only method
  const isWithinProximity = (feature: any) => {
    // Require home coordinates for filtering
    if (!filters.homeCoordinates) return false;
    
    // Derive userReported status for debugging
    const isUser = feature.properties?.source === 'user';
    
    // Debug user incidents
    if (isUser) {
      console.log('👤 USER INCIDENT:', {
        id: feature.id,
        title: feature.properties?.title,
        location: feature.properties?.location,
        hasCoordinates: !!feature.geometry?.coordinates
      });
    }
    
    // Extract coordinates from incident
    let lng, lat;
    
    // First try to use pre-computed centroid from properties
    if (feature.properties?.centroidLng && feature.properties?.centroidLat) {
      lng = feature.properties.centroidLng;
      lat = feature.properties.centroidLat;
    } else if (feature.geometry?.coordinates) {
      // Fallback to extracting from geometry
      if (feature.geometry.type === 'Point') {
        [lng, lat] = feature.geometry.coordinates;
      } else if (feature.geometry.type === 'MultiPoint' && feature.geometry.coordinates[0]) {
        [lng, lat] = feature.geometry.coordinates[0];
      } else if (feature.geometry.type === 'MultiLineString' && feature.geometry.coordinates[0]?.[0]) {
        [lng, lat] = feature.geometry.coordinates[0][0];
      } else if (feature.geometry.type === 'LineString' && feature.geometry.coordinates[0]) {
        [lng, lat] = feature.geometry.coordinates[0];
      } else {
        return false;
      }
    } else {
      return false;
    }
    
    // Validate extracted coordinates
    if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
      return false;
    }
    
    const homeLng = filters.homeCoordinates.lon;
    const homeLat = filters.homeCoordinates.lat;
    
    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (lat - homeLat) * Math.PI / 180;
    const dLng = (lng - homeLng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(homeLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Check if within configured radius
    const withinRadius = distance <= filterRadius;
    return withinRadius;
  };

  // Apply proximity-based filtering for feed data
  const regionalEventsData = filters.homeCoordinates ? allEventsData.filter(isWithinProximity) : [];
  const regionalIncidentsData = filters.homeCoordinates ? allIncidentsData.filter(isWithinProximity) : [];

  // All data for map display (shows everything)
  const allEvents = Array.isArray(allEventsData) ? allEventsData : [];
  const allIncidents = Array.isArray(allIncidentsData) ? allIncidentsData : [];
  
  // Regional data for feed and counts
  const regionalEvents = Array.isArray(regionalEventsData) ? regionalEventsData : [];
  const regionalIncidents = Array.isArray(regionalIncidentsData) ? regionalIncidentsData : [];
  
  // Categorize REGIONAL incidents for counting in sidebar (user's area only)
  const regionalNonUserIncidents = regionalIncidents.filter((i: any) => !i.properties?.userReported);
  const regionalQfesIncidents = regionalNonUserIncidents.filter(isQFESIncident);
  const regionalEsqIncidents = regionalNonUserIncidents.filter(incident => !isQFESIncident(incident));
  
  // Calculate counts based on REGIONAL data (for filter sidebar)
  const trafficEvents = regionalEvents.length;
  const emergencyIncidents = regionalEsqIncidents.length;
  const qfesIncidentsCount = regionalQfesIncidents.length;
  const userSafetyCrime = regionalIncidents.filter((i: any) => 
    i.properties?.userReported && i.properties?.categoryId === '792759f4-1b98-4665-b14c-44a54e9969e9'
  ).length;
  const userWildlife = regionalIncidents.filter((i: any) => 
    i.properties?.userReported && i.properties?.categoryId === 'd03f47a9-10fb-4656-ae73-92e959d7566a'
  ).length;
  const userCommunity = regionalIncidents.filter((i: any) => 
    i.properties?.userReported && i.properties?.categoryId === 'deaca906-3561-4f80-b79f-ed99561c3b04'
  ).length;
  const userTraffic = regionalIncidents.filter((i: any) => 
    i.properties?.userReported && i.properties?.categoryId === '9b1d58d9-cfd1-4c31-93e9-754276a5f265'
  ).length;
  const userLostFound = regionalIncidents.filter((i: any) => 
    i.properties?.userReported && i.properties?.categoryId === 'd1dfcd4e-48e9-4e58-9476-4782a2a132f3'
  ).length;
  const userPets = regionalIncidents.filter((i: any) => 
    i.properties?.userReported && i.properties?.categoryId === '4ea3a6f0-c49e-4baf-9ca5-f074ca2811b0'
  ).length;
  
  const counts = {
    total: trafficEvents + emergencyIncidents + qfesIncidentsCount + userSafetyCrime + userWildlife + userCommunity + userTraffic + userLostFound + userPets,
    trafficEvents,
    emergencyIncidents,
    qfesIncidents: qfesIncidentsCount,
    userSafetyCrime,
    userWildlife,
    userCommunity,
    userTraffic,
    userLostFound,
    userPets,
  };

  // Apply filtering for display based on ALL data (for map)
  const filteredEvents = filters.showTrafficEvents ? allEvents : [];
  
  const filteredIncidents = allIncidents.filter((incident: any) => {
    const isUserReported = incident.properties?.userReported;
    
    if (isUserReported) {
      const categoryId = incident.properties?.categoryId;
      
      if (categoryId === '792759f4-1b98-4665-b14c-44a54e9969e9') { // Safety & Crime
        return filters.showUserSafetyCrime === true;
      } else if (categoryId === 'd03f47a9-10fb-4656-ae73-92e959d7566a') { // Wildlife & Nature
        return filters.showUserWildlife === true;
      } else if (categoryId === '9b1d58d9-cfd1-4c31-93e9-754276a5f265') { // Infrastructure & Hazards (Traffic)
        return filters.showUserTraffic === true;
      } else if (categoryId === 'deaca906-3561-4f80-b79f-ed99561c3b04') { // Community Issues
        return filters.showUserCommunity === true;
      } else if (categoryId === 'd1dfcd4e-48e9-4e58-9476-4782a2a132f3') { // Lost & Found
        return filters.showUserLostFound === true;
      } else if (categoryId === '4ea3a6f0-c49e-4baf-9ca5-f074ca2811b0') { // Pets
        return filters.showUserPets === true;
      } else {
        // Fallback for unknown categories - show with community issues
        return filters.showUserCommunity === true;
      }
    } else {
      // Official incidents
      const isQFES = isQFESIncident(incident);
      if (isQFES) {
        return filters.showQFES === true;
      } else {
        return filters.showIncidents === true;
      }
    }
  });

  // 🎯 UNIFIED DATA PIPELINE: Both map and feed use the same source data
  // Feed will filter this data at the component level for personalization
  const unifiedEvents = allEvents;
  const unifiedIncidents = allIncidents;
  
  console.log('🔄 UNIFIED PIPELINE: Events:', unifiedEvents.length, 'Incidents:', unifiedIncidents.length);
  console.log('📍 REGIONAL: Events:', regionalEvents.length, 'Incidents:', regionalIncidents.length);

  return {
    // UNIFIED: Both map and feed get the same source data
    events: unifiedEvents,
    incidents: unifiedIncidents,
    // Legacy support for regional data (now used only for filtering)
    regionalEvents,
    regionalIncidents,
    counts,
    filteredEvents,
    filteredIncidents,
    // NEW: Flag to indicate which data should be used  
    // dataSource: 'unified' as const
  };
}