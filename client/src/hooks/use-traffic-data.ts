import { useQuery } from "@tanstack/react-query";
import type { FilterState } from "@/pages/home";

export interface ProcessedTrafficData {
  events: any[];
  incidents: any[];
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
  // Fetch ALL traffic events (no location filtering for map display)
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
    refetchInterval: filters.autoRefresh ? 30000 : 2 * 60 * 1000, // Auto-refresh every 2 minutes by default
  });

  // Fetch ALL incidents (no location filtering for map display)
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
    refetchInterval: filters.autoRefresh ? 60000 : 3 * 60 * 1000, // Auto-refresh every 3 minutes by default
  });

  // Fetch location-filtered data for counting (filter sidebar)
  const { data: localEventsData } = useQuery({
    queryKey: ["/api/traffic/events", filters.homeLocation],
    queryFn: async () => {
      const suburb = filters.homeLocation?.split(' ')[0] || '';
      const url = suburb 
        ? `/api/traffic/events?suburb=${encodeURIComponent(suburb)}`
        : '/api/traffic/events';
      
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

  const { data: localIncidentsData } = useQuery({
    queryKey: ["/api/incidents", filters.homeLocation],
    queryFn: async () => {
      const suburb = filters.homeLocation?.split(' ')[0] || '';
      const url = suburb 
        ? `/api/incidents?suburb=${encodeURIComponent(suburb)}`
        : '/api/incidents';
      
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

  // All data for map display
  const allEvents = Array.isArray(allEventsData) ? allEventsData : [];
  const allIncidents = Array.isArray(allIncidentsData) ? allIncidentsData : [];
  
  // Local data for counting in sidebar
  const localEvents = Array.isArray(localEventsData) ? localEventsData : [];
  const localIncidents = Array.isArray(localIncidentsData) ? localIncidentsData : [];
  
  // Categorize LOCAL incidents for counting in sidebar
  const localNonUserIncidents = localIncidents.filter((i: any) => !i.properties?.userReported);
  const localQfesIncidents = localNonUserIncidents.filter(isQFESIncident);
  const localEsqIncidents = localNonUserIncidents.filter(incident => !isQFESIncident(incident));
  
  // Calculate counts based on LOCAL data (for filter sidebar)
  const trafficEvents = localEvents.length;
  const emergencyIncidents = localEsqIncidents.length;
  const qfesIncidents = localQfesIncidents.length;
  const userSafetyCrime = localIncidents.filter((i: any) => 
    i.properties?.userReported && i.properties?.incidentType === 'crime'
  ).length;
  const userWildlife = localIncidents.filter((i: any) => 
    i.properties?.userReported && i.properties?.incidentType === 'wildlife'
  ).length;
  const userCommunity = localIncidents.filter((i: any) => 
    i.properties?.userReported && !['crime', 'wildlife', 'traffic'].includes(i.properties?.incidentType)
  ).length;
  const userTraffic = localIncidents.filter((i: any) => 
    i.properties?.userReported && i.properties?.incidentType === 'traffic'
  ).length;
  
  const counts = {
    total: trafficEvents + emergencyIncidents + qfesIncidents + userSafetyCrime + userWildlife + userCommunity + userTraffic,
    trafficEvents,
    emergencyIncidents,
    qfesIncidents,
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
    events: allEvents,
    incidents: allIncidents,
    counts,
    filteredEvents,
    filteredIncidents
  };
}