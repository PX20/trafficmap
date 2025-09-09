import { useQuery } from "@tanstack/react-query";
import type { FilterState } from "@/pages/home";

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
  // Fetch ALL events for map display (big picture view)
  const { data: allEventsData } = useQuery({
    queryKey: ["/api/traffic/events"],
    queryFn: async () => {
      const response = await fetch('/api/traffic/events');
      if (!response.ok) throw new Error('Failed to fetch traffic events');
      return response.json();
    },
    select: (data: any) => {
      const features = data?.features || [];
      return Array.isArray(features) ? features : [];
    },
    refetchInterval: filters.autoRefresh ? 30000 : 2 * 60 * 1000, // Auto-refresh every 2 minutes
  });

  // Fetch ALL incidents for map display (big picture view)
  const { data: allIncidentsData } = useQuery({
    queryKey: ["/api/incidents"],
    queryFn: async () => {
      const response = await fetch('/api/incidents?limit=200');
      if (!response.ok) throw new Error('Failed to fetch incidents');
      return response.json();
    },
    select: (data: any) => {
      const features = data?.features || [];
      return Array.isArray(features) ? features : [];
    },
    refetchInterval: filters.autoRefresh ? 60000 : 3 * 60 * 1000, // Auto-refresh every 3 minutes
  });

  // Fetch FILTERED data for feed and counts (user's region only)
  const { data: regionalEventsData } = useQuery({
    queryKey: ["/api/traffic/events", filters.homeLocation],
    queryFn: async () => {
      const suburb = filters.homeLocation?.split(' ')[0] || '';
      
      // If no location set, return empty instead of all QLD
      if (!suburb) {
        return { features: [] };
      }
      
      const url = `/api/traffic/events?suburb=${encodeURIComponent(suburb)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch traffic events');
      return response.json();
    },
    select: (data: any) => {
      const features = data?.features || [];
      return Array.isArray(features) ? features : [];
    },
    refetchInterval: filters.autoRefresh ? 30000 : false,
  });

  const { data: regionalIncidentsData } = useQuery({
    queryKey: ["/api/incidents", filters.homeLocation],
    queryFn: async () => {
      const suburb = filters.homeLocation?.split(' ')[0] || '';
      
      // If no location set, return empty instead of all QLD
      if (!suburb) {
        return { features: [] };
      }
      
      const url = `/api/incidents?suburb=${encodeURIComponent(suburb)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch incidents');
      return response.json();
    },
    select: (data: any) => {
      const features = data?.features || [];
      return Array.isArray(features) ? features : [];
    },
    refetchInterval: filters.autoRefresh ? 60000 : false,
  });

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

  return {
    // Map gets ALL Queensland data (big picture)
    events: allEvents,
    incidents: allIncidents,
    // Feed gets REGIONAL data only (personalized)
    regionalEvents,
    regionalIncidents,
    counts,
    filteredEvents,
    filteredIncidents
  };
}