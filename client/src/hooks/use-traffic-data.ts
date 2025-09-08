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
  // Only fetch what the user needs - either their region or all QLD
  const { data: eventsData } = useQuery({
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
    refetchInterval: filters.autoRefresh ? 30000 : 2 * 60 * 1000, // Auto-refresh every 2 minutes
  });

  const { data: incidentsData } = useQuery({
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
    refetchInterval: filters.autoRefresh ? 60000 : 3 * 60 * 1000, // Auto-refresh every 3 minutes
  });

  // Use the fetched data directly
  const allEvents = Array.isArray(eventsData) ? eventsData : [];
  const allIncidents = Array.isArray(incidentsData) ? incidentsData : [];
  
  // Categorize incidents for counting in sidebar
  const nonUserIncidents = allIncidents.filter((i: any) => !i.properties?.userReported);
  const qfesIncidents = nonUserIncidents.filter(isQFESIncident);
  const esqIncidents = nonUserIncidents.filter(incident => !isQFESIncident(incident));
  
  // Calculate counts based on fetched data (for filter sidebar)
  const trafficEvents = allEvents.length;
  const emergencyIncidents = esqIncidents.length;
  const qfesIncidentsCount = qfesIncidents.length;
  const userSafetyCrime = allIncidents.filter((i: any) => 
    i.properties?.userReported && i.properties?.incidentType === 'crime'
  ).length;
  const userWildlife = allIncidents.filter((i: any) => 
    i.properties?.userReported && i.properties?.incidentType === 'wildlife'
  ).length;
  const userCommunity = allIncidents.filter((i: any) => 
    i.properties?.userReported && !['crime', 'wildlife', 'traffic'].includes(i.properties?.incidentType)
  ).length;
  const userTraffic = allIncidents.filter((i: any) => 
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
    events: allEvents,
    incidents: allIncidents,
    counts,
    filteredEvents,
    filteredIncidents
  };
}