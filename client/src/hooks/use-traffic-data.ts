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
      const response = await fetch('/api/unified');
      if (!response.ok) throw new Error('Failed to fetch unified incidents');
      return response.json();
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

  // CLIENT-SIDE REGIONAL FILTERING for feed data using pre-computed regionIds
  const targetRegion = findRegionBySuburb(filters.homeLocation || '');
  const targetRegionId = targetRegion?.id;
  
  // Debug regional filtering
  console.log('🏠 HOME LOCATION:', filters.homeLocation, 'TARGET REGION:', targetRegionId);
  
  // Regional filtering function using regionIds with text fallback
  const isInRegion = (feature: any) => {
    if (!targetRegionId) return false;
    
    // Derive userReported status and debug first
    const isUser = feature.properties?.source === 'user';
    const userReported = feature.properties?.userReported ?? isUser;
    const regionIds = feature.properties?.regionIds || feature.regionIds || [];
    
    // Debug ALL user incidents before any returns
    if (isUser) {
      console.log('👤 USER INCIDENT:', {
        id: feature.id,
        title: feature.properties?.title,
        location: feature.properties?.location,
        regionIds: regionIds,
        userReported: userReported,
        targetRegionId: targetRegionId
      });
    }
    
    // Use pre-computed regionIds for accurate filtering
    if (Array.isArray(regionIds) && regionIds.includes(targetRegionId)) {
      return true;
    }
    
    // Fallback to text-based matching for any features missing regionIds
    const text = `${feature.properties?.location ?? ''} ${feature.properties?.description ?? ''} ${feature.properties?.title ?? ''}`.toLowerCase();
    const textMatch = (targetRegion?.suburbs || []).some(suburb => text.includes(suburb.toLowerCase()));
    
    return textMatch;
  };

  // Apply regional filtering for feed data
  const regionalEventsData = targetRegionId ? allEventsData.filter(isInRegion) : [];
  const regionalIncidentsData = targetRegionId ? allIncidentsData.filter(isInRegion) : [];

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