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
      const response = await fetch('/api/incidents');
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
    i.properties?.userReported && i.properties?.incidentType === 'crime'
  ).length;
  const userWildlife = regionalIncidents.filter((i: any) => 
    i.properties?.userReported && i.properties?.incidentType === 'wildlife'
  ).length;
  const userCommunity = regionalIncidents.filter((i: any) => 
    i.properties?.userReported && !['crime', 'wildlife', 'traffic'].includes(i.properties?.incidentType)
  ).length;
  const userTraffic = regionalIncidents.filter((i: any) => 
    i.properties?.userReported && i.properties?.incidentType === 'traffic'
  ).length;
  
  const counts = {
    total: trafficEvents + emergencyIncidents + qfesIncidentsCount + userSafetyCrime + userWildlife + userCommunity + userTraffic,
    trafficEvents,
    emergencyIncidents,
    qfesIncidents: qfesIncidentsCount,
    userSafetyCrime,
    userWildlife,
    userCommunity,
    userTraffic,
  };

  // Apply filtering for display based on ALL data (for map)
  const filteredEvents = allEvents.filter(() => filters.showTrafficEvents === true);
  
  const filteredIncidents = allIncidents.filter((incident: any) => {
    const isUserReported = incident.properties?.userReported;
    
    if (isUserReported) {
      const incidentType = incident.properties?.incidentType;
      
      if (incidentType === 'crime') {
        return filters.showUserSafetyCrime === true;
      } else if (incidentType === 'wildlife') {
        return filters.showUserWildlife === true;
      } else if (incidentType === 'traffic') {
        return filters.showUserTraffic === true;
      } else {
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